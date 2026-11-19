# Build src/peoples.json: the peoples of year 1 in every province.
# Input: GREG (Geo-Referencing of Ethnic Groups, Weidmann et al. 2010, from the
# Soviet Atlas Narodov Mira, 1964) in greg/GREG.*, plus the correction layer in
# data/year1_peoples.py. Usage: python prep_peoples.py <greg dir>
import sys, json, math, collections
import shapefile
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
sys.path.insert(0, 'data'); sys.path.insert(0, '.')
from classify_modern import branch as modern_branch, FAMILY, KEY
from year1_peoples import P, R, RENAME, until as rule_until

gdir = sys.argv[1] if len(sys.argv) > 1 else 'greg'
rd = shapefile.Reader(gdir + '/GREG', encoding='latin1')
geoms, recs = [], []
for sr in rd.iterShapeRecords():
    if not sr.shape.points: continue
    g = shape(sr.shape.__geo_interface__)
    if not g.is_valid: g = g.buffer(0)
    rec = sr.record
    names = [rec['G1SHORTNAM'].strip(), rec['G2SHORTNAM'].strip(), rec['G3SHORTNAM'].strip()]
    names = [n for n in names if n]
    w = {1: [1], 2: [0.6, 0.4], 3: [0.5, 0.3, 0.2]}[len(names)]
    geoms.append(g); recs.append(list(zip(names, w, [rec['FIPS_CNTRY']] * 3)))
tree = STRtree(geoms)
cty = collections.defaultdict(collections.Counter)
for rr in recs:
    for n, w, c in rr: cty[n][c] += 1

world = json.load(open('src/world2.json'))
cells = world['cells']; N = len(cells); sp = world['spacingDeg']

def inbox(lon, lat, b): return b[0] <= lon <= b[2] and b[1] <= lat <= b[3]
YEAR = 1
def year1(name, lon, lat):
    br = modern_branch(name, [c for c, _ in cty[name].most_common(3)] or ['XX'])
    for key, box, match in R:
        if rule_until(key, box, match) <= YEAR: continue
        if not inbox(lon, lat, box): continue
        if match != '*' and br not in match: continue
        return key
    if name in RENAME and RENAME[name] and rule_until(RENAME[name], [0, 0, 0, 0], '*') > YEAR: return RENAME[name]
    if 'Arabs' in name and br == 'semitic': return 'arabs'
    return '=' + name

import re
def clean(n):
    n = re.sub(r'\s*\(.*?\)', '', n).replace(', etc.', '').strip().rstrip(',')
    n = n.replace('Bantu-speaking Pygmy tribes', 'Twa Pygmies').replace('Tibetan-speaking peoples of Bhutan', 'Bhutia')
    n = re.split(r',| and | or ', n)[0].strip()
    return n
peoples = {}   # key -> record
def people(key):
    if key in peoples: return peoples[key]['id']
    if key.startswith('='):
        n = key[1:]; br = modern_branch(n, [c for c, _ in cty[n].most_common(3)] or ['XX'])
        nm = clean(n); lg = re.sub(r'(ians)$', 'ian', nm); lg = lg[:-1] if lg.endswith('s') and not lg.endswith('ss') else lg
        rec = dict(name=nm, lang=lg, branch=br, identity=0.5, states=[], curated=False)
    else:
        name, lang, br, ident, states = P[key]
        rec = dict(name=name, lang=lang, branch=br, identity=ident, states=states, curated=True)
    rec['family'] = FAMILY.get(rec['branch'], 'Isolates'); rec['key'] = KEY.get(rec['branch'], 'latin'); rec['id'] = len(peoples)
    peoples[key] = rec
    return rec['id']

def assign():
    out = [None] * N
    rad = sp * 0.38
    for i, c in enumerate(cells):
        lat, lon = c['lat'], c['lon']
        pts = [(lon, lat)] + [(lon + rad * math.cos(a) / max(0.2, math.cos(math.radians(lat))), lat + rad * math.sin(a)) for a in [k * math.pi / 3 for k in range(6)]]
        acc = collections.Counter()
        for (x, y) in pts:
            pt = Point(x, y)
            for gi in tree.query(pt):
                if geoms[gi].contains(pt):
                    for n, w, _ in recs[gi]:
                        k = year1(n, lon, lat)
                        if k != 'DROP': acc[k] += w
                        else: acc['DROP'] += w * 0.001
                    break
        real = [(k, v) for k, v in acc.most_common() if k != 'DROP']
        if real:
            tot = sum(v for _, v in real[:2])
            out[i] = [people(real[0][0])] + ([people(real[1][0]), round(real[1][1] / tot, 3)] if len(real) > 1 else [])
        else:
            out[i] = 'drop' if acc else None

    # fill gaps (no GREG polygon, or dropped settler populations) from the nearest assigned cell
    from collections import deque
    q = deque(i for i in range(N) if isinstance(out[i], list))
    dist = [0 if isinstance(out[i], list) else -1 for i in range(N)]
    while q:
        i = q.popleft()
        for j in cells[i]['n']:
            if dist[j] < 0:
                dist[j] = dist[i] + 1; out[j] = [out[i][0]]; q.append(j)
    for i in range(N):
        if not isinstance(out[i], list): out[i] = [0]


    return out

out = assign()
scen_people = {}
for Y in (1000, 1500, 1800, 1914):
    YEAR = Y
    scen_people[Y] = assign()
plist = sorted(peoples.values(), key=lambda r: r['id'])
json.dump({str(Y): [c[0] if c else 0 for c in v] for Y, v in scen_people.items()}, open('data/scen_people.json', 'w'), separators=(',', ':'))
json.dump({'peoples': [{k: r[k] for k in ('name', 'lang', 'branch', 'family', 'key', 'identity', 'states', 'curated')} for r in plist], 'cells': out}, open('src/peoples.json', 'w'), ensure_ascii=False, separators=(',', ':'))
cnt = collections.Counter(o[0] for o in out)
print(len(plist), 'peoples;', sum(1 for r in plist if r['curated']), 'curated')
print('largest by cells:', ', '.join(f"{plist[k]['name']} {v}" for k, v in cnt.most_common(40)))
