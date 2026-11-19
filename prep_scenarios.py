# Build data/scen_states.json: who rules each province in 1000, 1500, 1800 and 1914.
# Source: historical-basemaps by André Ourednik (GPL-3.0), https://github.com/aourednik/historical-basemaps
# Usage: python prep_scenarios.py <folder with world_<year>.geojson>
import sys, json, re, collections
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
src = sys.argv[1] if len(sys.argv) > 1 else 'hb'
cells = json.load(open('src/world2.json'))['cells']
TRIBAL = re.compile(r'hunter|gatherer|tribes|peoples|culture|nomads|pastoral|herders|farmers|[(]|Aborig|Tasmanian|^Arabs$|claim|Inuit|Eskimo|city-states|chiefdoms|minor |kingdoms$|states$|^Islamic|settlements', re.I)
NOT_STATES = set('Khoisan Dorset Athabaskan Peshemegs Thule Siberians Samis Sámi Karelians Suom Taino Ainu Ainus Maori Boethuk Beothuk Innu Natchez Apache Cherokee Navajo Iroquois Crow Algonquin Huron Comanche Hopi Pomo Delaware Calusa Cheyenne Inupiaq Eyaq Suspiaq Coqs Africa Tlinoit'.split()) | {'Nez Perce', "Mi'kma'ki", "Yup'ik & Cup'ik", "T'atsaot'ine", 'Papua New Guinea', 'Rift Valley States', 'central Asian khanates'}
FIX = {"Rupert's Land": 'United Kingdom', 'UK': 'United Kingdom', 'Viceroyalty of the Río de la Plata': 'Spain', 'United Kingdom of Great Britain and Ireland': 'United Kingdom', 'German South-West Africa': 'German Empire', 'Kamerun': 'German Empire', 'Togoland': 'German Empire',
       'German East Africa': 'German Empire', 'Austro-Hungarian Empire': 'Austria-Hungary', 'Manchu Empire': 'Qing Empire', 'Empire of Japan': 'Empire of Japan', 'Imperial Japan (Fujiwara)': 'Japan (Fujiwara)'}
out = {}
for year in (1000, 1500, 1800, 1914):
    feats = json.load(open(f'{src}/hb_{year}.geojson' if __import__('os').path.exists(f'{src}/hb_{year}.geojson') else f'{src}/world_{year}.geojson'))['features']
    geoms, names = [], []
    for f in feats:
        p = f['properties']; n = p.get('SUBJECTO') or p.get('NAME')
        if not n or not f.get('geometry'): continue
        n = FIX.get(n, n)
        if year == 1914 and n == 'Qing Empire': n = 'Republic of China'
        if n in NOT_STATES or (TRIBAL.search(n) and n not in ('Hausa States', 'United States', 'United States of America', 'Papal States', 'Mossi States')): continue
        if year == 1800 and p.get('SUBJECTO') == p.get('NAME') and f['geometry'] and shape(f['geometry']).centroid.x > 110 and shape(f['geometry']).centroid.y < -10: continue
        g = shape(f['geometry'])
        if not g.is_valid: g = g.buffer(0)
        geoms.append(g); names.append(n)
    tree = STRtree(geoms)
    states, idx, owner = [], {}, []
    for c in cells:
        pt = Point(c['lon'], c['lat']); hit = None
        for gi in tree.query(pt):
            if geoms[gi].contains(pt): hit = names[gi]; break
        if hit is None: owner.append(-1); continue
        if hit not in idx: idx[hit] = len(states); states.append(hit)
        owner.append(idx[hit])
    cnt = collections.Counter(o for o in owner if o >= 0)
    # drop specks: states with a single province become tribal land
    keep = {k for k, v in cnt.items() if v >= 2}
    remap = {}; st2 = []
    for k in sorted(keep, key=lambda k: -cnt[k]): remap[k] = len(st2); st2.append(states[k])
    owner = [remap.get(o, -1) for o in owner]
    out[year] = {'states': st2, 'owner': owner}
    print(year, len(st2), 'states;', ', '.join(f'{st2[k]} {v}' for k, v in collections.Counter(o for o in owner if o >= 0).most_common(15)))
json.dump(out, open('data/scen_states.json', 'w'), separators=(',', ':'))
