"""Build world cells from the Koppen-Geiger raster (Beck et al. 2018, simplified 0-5 classes).
Output: src/world.json  (land cells only, with neighbours, polygons, climate fractions, rivers)."""
import json, math, os
import numpy as np
import rasterio
from rasterio.enums import Resampling
from scipy.spatial import ConvexHull, SphericalVoronoi

N = int(__import__("os").environ.get("NCELLS", 40000))
# --- climate raster at 0.1 deg (mode resampling keeps classes) ---
r = rasterio.open('kg.tif')
W, H = 3600, 1800
kg = r.read(1, out_shape=(H, W), resampling=Resampling.mode)  # row 0 = 90N
elev = np.load('elev01.npy')

# --- Fibonacci sphere ---
i = np.arange(N) + 0.5
phi = np.arccos(1 - 2 * i / N)
theta = math.pi * (1 + 5 ** 0.5) * i
lat = 90 - np.degrees(phi)
lon = (np.degrees(theta) + 180) % 360 - 180
xyz = np.stack([np.cos(np.radians(lat)) * np.cos(np.radians(lon)),
                np.cos(np.radians(lat)) * np.sin(np.radians(lon)),
                np.sin(np.radians(lat))], 1)

spacing = math.degrees(math.sqrt(4 * math.pi / N))  # ~2.03 deg
rad = spacing * 0.55
fr = np.zeros((N, 6)); el = np.zeros(N); rug = np.zeros(N)
for k in range(N):
    la, lo = lat[k], lon[k]
    r0 = int((90 - (la + rad)) * 10); r1 = int((90 - (la - rad)) * 10)
    r0 = max(r0, 0); r1 = min(r1, H - 1)
    dlon = rad / max(math.cos(math.radians(la)), 0.15)
    cols = (np.arange(int((lo - dlon + 180) * 10), int((lo + dlon + 180) * 10) + 1)) % W
    block = kg[r0:r1 + 1][:, cols]
    cnt = np.bincount(block.ravel(), minlength=6)[:6]
    fr[k] = cnt / max(cnt.sum(), 1)
    eb = elev[r0:r1 + 1][:, cols]
    landm = block != 0
    if landm.sum() > 0:
        ev = eb[landm]; el[k] = ev.mean(); rug[k] = ev.std()

land = (1 - fr[:, 0]) >= 0.3
# Antarctica: drop (nobody lives there before the 20th century)
land &= lat > -60

# --- Delaunay neighbours on the sphere ---
hull = ConvexHull(xyz)
nb = [set() for _ in range(N)]
for a, b, c in hull.simplices:
    nb[a].update((b, c)); nb[b].update((a, c)); nb[c].update((a, b))

# --- Voronoi polygons ---
sv = SphericalVoronoi(xyz, 1.0, np.zeros(3))
sv.sort_vertices_of_regions()
vlat = np.degrees(np.arcsin(np.clip(sv.vertices[:, 2], -1, 1)))
vlon = np.degrees(np.arctan2(sv.vertices[:, 1], sv.vertices[:, 0]))

# --- major rivers (lon, lat polylines, coarse) ---
RIVERS = {
 'Nile': [(31.2, 31.4), (31.3, 30.0), (32.9, 24.1), (32.6, 19.0), (32.5, 15.6), (31.6, 9.5), (32.0, 4.0)],
 'Euphrates': [(47.8, 30.6), (46.0, 31.3), (44.3, 32.6), (41.5, 34.4), (39.0, 36.0), (38.3, 37.6)],
 'Tigris': [(47.4, 31.0), (44.4, 33.3), (43.1, 36.3), (42.0, 37.4)],
 'Indus': [(67.6, 24.0), (68.4, 26.5), (70.0, 28.8), (71.5, 31.5), (72.6, 33.8)],
 'Ganges': [(88.5, 22.2), (88.0, 24.5), (85.1, 25.6), (83.0, 25.3), (80.3, 26.5), (78.0, 28.9), (77.5, 30.0)],
 'Brahmaputra': [(89.8, 24.8), (91.7, 26.2), (94.6, 27.5)],
 'Yellow': [(118.8, 37.7), (116.6, 35.8), (113.6, 34.9), (110.3, 34.6), (110.5, 37.5), (111.0, 40.3), (106.3, 39.6), (103.8, 36.1)],
 'Yangtze': [(121.6, 31.4), (118.8, 32.1), (116.2, 29.7), (114.3, 30.6), (112.2, 30.3), (110.0, 30.8), (106.5, 29.6), (104.6, 28.8)],
 'Pearl': [(113.5, 22.6), (111.5, 23.5), (108.3, 22.8)],
 'Mekong': [(106.5, 9.8), (105.0, 11.6), (105.8, 15.1), (104.8, 17.9), (102.1, 18.0), (100.1, 20.3)],
 'Irrawaddy': [(95.2, 16.3), (95.2, 19.0), (96.1, 21.9), (97.4, 25.4)],
 'Red': [(106.6, 20.3), (105.8, 21.0), (104.0, 22.5)],
 'AmuDarya': [(59.5, 43.5), (61.5, 41.0), (64.5, 38.8), (67.5, 37.2), (69.5, 37.1)],
 'SyrDarya': [(61.0, 46.0), (65.5, 44.8), (68.5, 42.5), (70.5, 40.8), (72.0, 41.0)],
 'Danube': [(29.6, 45.2), (26.0, 43.7), (22.6, 44.6), (20.5, 44.8), (19.0, 47.5), (16.4, 48.2), (12.0, 48.8), (9.0, 48.2)],
 'Rhine': [(4.2, 51.9), (6.6, 51.3), (7.6, 50.4), (8.5, 49.0), (7.6, 47.6)],
 'Po': [(12.4, 45.0), (10.5, 45.0), (8.0, 45.0)],
 'Volga': [(47.9, 46.4), (44.5, 48.7), (48.4, 54.3), (49.1, 55.8), (44.0, 56.3), (39.9, 57.6), (35.9, 56.9)],
 'Dnieper': [(32.6, 46.6), (35.1, 47.8), (32.1, 49.4), (30.5, 50.4), (30.6, 52.5), (31.0, 54.5)],
 'Niger': [(6.0, 4.5), (6.7, 7.8), (4.5, 10.5), (2.1, 13.5), (-3.0, 16.3), (-4.2, 14.5), (-8.0, 12.6), (-10.5, 9.5)],
 'Congo': [(12.3, -6.0), (15.3, -4.3), (17.5, -1.0), (18.3, 1.8), (21.5, 2.2), (24.5, 0.5), (25.2, -2.5)],
 'Zambezi': [(36.3, -18.8), (33.6, -16.5), (28.8, -16.0), (25.8, -17.9), (23.2, -15.5)],
 'Senegal': [(-16.5, 16.0), (-14.0, 16.6), (-12.0, 14.6)],
 'Mississippi': [(-89.3, 29.2), (-91.1, 30.4), (-90.9, 32.5), (-90.1, 35.1), (-89.2, 37.0), (-90.2, 38.6), (-91.2, 41.5), (-93.1, 44.9)],
 'Ohio': [(-89.2, 37.0), (-85.8, 38.2), (-84.5, 39.1), (-80.0, 40.4)],
 'Missouri': [(-90.2, 38.8), (-94.6, 39.1), (-96.0, 41.3), (-100.3, 44.4), (-104.0, 47.6)],
 'StLawrence': [(-69.0, 48.5), (-73.6, 45.5), (-76.5, 44.2)],
 'RioGrande': [(-97.2, 25.9), (-99.5, 27.5), (-104.5, 29.6), (-106.6, 35.1)],
 'Amazon': [(-50.0, -0.5), (-55.0, -2.0), (-60.0, -3.1), (-65.0, -3.5), (-70.0, -4.0), (-73.5, -4.5)],
 'Parana': [(-58.4, -34.0), (-60.7, -32.9), (-59.0, -27.5), (-55.0, -25.5)],
 'Orinoco': [(-61.0, 8.6), (-64.0, 8.1), (-67.5, 6.2)],
 'Murray': [(139.0, -35.5), (142.0, -34.2), (144.5, -36.0)],
 'Ob': [(66.5, 66.5), (65.0, 61.0), (73.4, 61.0), (82.9, 55.0), (84.0, 52.5)],
 'Yenisei': [(83.0, 69.5), (86.0, 63.0), (92.9, 56.0)],
 'Amur': [(140.5, 52.9), (135.1, 48.5), (127.5, 50.2), (122.0, 53.3)],
 'Tagus': [(-9.2, 38.7), (-6.5, 39.6), (-3.7, 40.0)],
 'Ebro': [(0.8, 40.7), (-1.0, 41.6), (-3.0, 42.6)],
 'Loire': [(-2.2, 47.3), (0.7, 47.4), (3.0, 46.9)],
 'Seine': [(0.1, 49.5), (2.3, 48.9), (4.0, 48.3)],
 'Elbe': [(8.8, 53.8), (10.0, 53.5), (12.0, 52.0), (14.3, 50.6)],
 'Vistula': [(18.7, 54.3), (19.0, 52.5), (21.0, 52.2), (20.0, 50.0)],
}

def gc(la1, lo1, la2, lo2):
    a = math.radians
    return math.degrees(math.acos(max(-1, min(1, math.sin(a(la1)) * math.sin(a(la2)) + math.cos(a(la1)) * math.cos(a(la2)) * math.cos(a(lo1 - lo2))))))

def seg_points(poly, step=0.5):
    out = []
    for (lo1, la1), (lo2, la2) in zip(poly, poly[1:]):
        d = max(abs(lo2 - lo1), abs(la2 - la1)); n = max(1, int(d / step))
        for t in range(n + 1):
            out.append((la1 + (la2 - la1) * t / n, lo1 + (lo2 - lo1) * t / n))
    return out

riv_pts = {k: seg_points(v) for k, v in RIVERS.items()}

land_idx = np.where(land)[0]
remap = {int(k): j for j, k in enumerate(land_idx)}
cells = []
for j, k in enumerate(land_idx):
    k = int(k)
    neigh = sorted(remap[n] for n in nb[k] if n in remap)
    sea_nb = sum(1 for n in nb[k] if n not in remap)
    best, rname = 0.0, None
    for nm, pts in riv_pts.items():
        d = min(gc(lat[k], lon[k], la, lo) for la, lo in pts)
        s = math.exp(-(d / (spacing * 0.75)) ** 2)
        if s > best: best, rname = s, nm
    poly = [[round(float(vlon[v]), 2), round(float(vlat[v]), 2)] for v in sv.regions[k]]
    cells.append({
        'lat': round(float(lat[k]), 2), 'lon': round(float(lon[k]), 2),
        'f': [round(float(x), 3) for x in fr[k]],  # water, tropical, arid, temperate, continental, polar
        'n': neigh, 'sea': sea_nb,
        'riv': round(best, 2) if best > 0.05 else 0, 'rn': rname if best > 0.3 else None,
        'e': int(el[k]), 'rg': int(rug[k]),
    })

# sea links: coastal cells whose Delaunay neighbours are sea; connect coastal cells within ~6 deg (short sea crossings)
coastal = [j for j, c in enumerate(cells) if c['sea'] > 0 or c['f'][0] > 0.15]
cxyz = xyz[land_idx[coastal]]
links = []
for a in range(len(coastal)):
    d = np.degrees(np.arccos(np.clip(cxyz @ cxyz[a], -1, 1)))
    for b in np.where((d > 0) & (d < 4.5))[0]:
        if b > a and coastal[b] not in cells[coastal[a]]['n']:
            links.append([coastal[a], int(coastal[b]), round(float(d[b]), 1)])

json.dump({'cells': cells, 'seaLinks': links, 'spacingDeg': spacing, 'nTotal': N}, open(__import__('os').environ.get('OUT', 'src/world.json'), 'w'), separators=(',', ':'))
print('land cells', len(cells), 'sea links', len(links), 'spacing', round(spacing, 2))

# ---------- pixel -> province map (2048x1024 equirectangular), plus elevation grid ----------
from scipy.spatial import cKDTree
import zlib
TW, TH = 2048, 1024
lon_px = (np.arange(TW) + 0.5) / TW * 360 - 180
lat_px = 90 - (np.arange(TH) + 0.5) / TH * 180
LON, LAT = np.meshgrid(lon_px, lat_px)
kr = ((90 - LAT) * 10).astype(int).clip(0, H - 1); kc = ((LON + 180) * 10).astype(int).clip(0, W - 1)
landpx = kg[kr, kc] != 0
lxyz = xyz[land_idx]
tree = cKDTree(lxyz)
P = np.stack([np.cos(np.radians(LAT)) * np.cos(np.radians(LON)), np.cos(np.radians(LAT)) * np.sin(np.radians(LON)), np.sin(np.radians(LAT))], -1).reshape(-1, 3)
dist, nn = tree.query(P)
ids = nn.astype(np.uint16).reshape(TH, TW)
ang = np.degrees(2 * np.arcsin(np.clip(dist / 2, 0, 1))).reshape(TH, TW)
ids[ang > spacing * 1.6] = 65533           # land far from any province (tiny islands)
ids[LAT < -60] = 65534                      # Antarctica
ids[~landpx] = 65535                        # water
open('src/idmap.bin', 'wb').write(zlib.compress(ids.astype('<u2').tobytes(), 9))
eg = np.load('elev01.npy')
eg = eg.reshape(900, 2, 1800, 2).mean((1, 3))           # 0.2 deg
e8 = np.clip(eg / 20, 0, 255).astype(np.uint8)
e8[~(kg[::2, ::2] != 0)] = 0
open('src/elev.bin', 'wb').write(zlib.compress(e8.tobytes(), 9))
print('idmap', os.path.getsize('src/idmap.bin'), 'elev', os.path.getsize('src/elev.bin'))
