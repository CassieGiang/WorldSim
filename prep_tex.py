"""Map textures for the globe: pixel->province map (4096x2048), hill shading and major rivers.
Needs: kg.tif (Koppen-Geiger, 1 km), elev01.npy (make_elev.py), the river polygons from
@geo-maps/earth-rivers-10m (npm), and the land-cell centres from prep2.py (src/world2.json)."""
import json, zlib, math
import numpy as np
import rasterio
from rasterio.enums import Resampling
from scipy.spatial import cKDTree
from scipy import ndimage
from PIL import Image, ImageDraw

TW, TH = 4096, 2048
geo = json.load(open('src/world2.json'))
cells = geo['cells']
spacing = geo['spacingDeg']
lat = np.array([c['lat'] for c in cells]); lon = np.array([c['lon'] for c in cells])
def xyz(la, lo):
    la, lo = np.radians(la), np.radians(lo)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], -1)
tree = cKDTree(xyz(lat, lon))

# land mask straight from the 1 km climate raster, read at the texture size (mode keeps classes)
kg = rasterio.open('kg.tif').read(1, out_shape=(TH, TW), resampling=Resampling.mode)
land = kg != 0
lon_px = (np.arange(TW) + 0.5) / TW * 360 - 180
lat_px = 90 - (np.arange(TH) + 0.5) / TH * 180
LON, LAT = np.meshgrid(lon_px, lat_px)
dist, nn = tree.query(xyz(LAT, LON).reshape(-1, 3))
ids = nn.astype(np.uint16).reshape(TH, TW)
ang = np.degrees(2 * np.arcsin(np.clip(dist / 2, 0, 1))).reshape(TH, TW)
ids[ang > spacing * 1.6] = 65533
ids[LAT < -60] = 65534
ids[~land] = 65535
open('src/idmap4k.bin', 'wb').write(zlib.compress(ids.astype('<u2').tobytes(), 9))

# hill shading at 0.1 degree, smoothed, light from the north-west; flat lowland kept quiet
e = np.load('elev01.npy').astype(np.float32)
kg01 = rasterio.open('kg.tif').read(1, out_shape=(1800, 3600), resampling=Resampling.mode)
e = ndimage.gaussian_filter(e, 1.6)
dy, dx = np.gradient(e)
coslat = np.clip(np.cos(np.radians(90 - (np.arange(1800) + 0.5) / 10)), 0.2, 1)[:, None]
dx = dx / coslat
k = np.clip((e - 300) / 900, 0.15, 1)
shade = 0.5 - (dx * 0.7 - dy * 0.7) * 0.0022 * k + e / 12000
shade[kg01 == 0] = 0.5
Image.fromarray((np.clip(shade, 0, 1) * 255).astype(np.uint8)).save('src/shade.jpg', quality=88)

# major rivers: rasterise Natural Earth river polygons, keep long connected systems
g = json.load(open('node_modules/@geo-maps/earth-rivers-10m/map.geo.json'))
W2, H2 = TW * 2, TH * 2
im = Image.new('L', (W2, H2), 0); d = ImageDraw.Draw(im)
for poly in g['geometries'][0]['coordinates']:
    pts = [((x + 180) / 360 * W2, (90 - y) / 180 * H2) for x, y in poly[0]]
    if len(pts) > 2: d.polygon(pts, fill=255)
b = np.asarray(im).astype(np.float32).reshape(TH, 2, TW, 2).mean((1, 3))
m = b > 40
lab, n = ndimage.label(m, structure=np.ones((3, 3)))
sizes = ndimage.sum(m, lab, range(1, n + 1))
keep = np.zeros(n + 1, bool); keep[1:] = sizes >= 160
riv = np.where(keep[lab], np.clip(b * 1.6, 0, 255), 0).astype(np.uint8)
Image.fromarray(riv).save('src/rivers.png', optimize=True)
import os
for f in ['src/idmap4k.bin', 'src/shade.jpg', 'src/rivers.png']: print(f, os.path.getsize(f))
