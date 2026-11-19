// Custom worlds: build a world from your own heightmap (and optional climate map), then run history on it.
// buildGeo() runs in the page and makes the same shape of data as prep2.py makes for Earth.
// installCustom() adds the start for such a world: generated peoples, faiths, cradles of farming and first states.
import { PACKAGES, TECHS, NAME_PARTS } from './scenario.js';

export const TW = 4096, TH = 2048;
const D2R = Math.PI / 180;

// ---------------- map building (in the page) ----------------
function fib(N) {
  const lat = new Float32Array(N), lon = new Float32Array(N), xyz = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / N), th = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
    const la = 90 - phi / D2R, lo = (((th / D2R) + 180) % 360 + 360) % 360 - 180;
    lat[i] = la; lon[i] = lo;
    xyz[i * 3] = Math.cos(la * D2R) * Math.cos(lo * D2R); xyz[i * 3 + 1] = Math.cos(la * D2R) * Math.sin(lo * D2R); xyz[i * 3 + 2] = Math.sin(la * D2R);
  }
  return { lat, lon, xyz };
}
// a bucket grid on lat/lon for nearest-point lookups
function buckets(P, N, step) {
  const W = Math.ceil(360 / step), H = Math.ceil(180 / step), b = Array.from({ length: W * H }, () => []);
  for (let i = 0; i < N; i++) b[Math.min(H - 1, Math.floor((90 - P.lat[i]) / step)) * W + Math.min(W - 1, Math.floor((P.lon[i] + 180) / step))].push(i);
  return { b, W, H, step };
}
function nearestK(P, B, x, y, z, la, lo, k, filter) {
  const r = Math.min(B.H - 1, Math.floor((90 - la) / B.step)), c = Math.min(B.W - 1, Math.floor((lo + 180) / B.step));
  const best = [];
  const span = Math.abs(la) > 75 ? B.W : Math.ceil(2 / Math.max(0.15, Math.cos(la * D2R)));
  for (let dr = -2; dr <= 2; dr++) {
    const rr = r + dr; if (rr < 0 || rr >= B.H) continue;
    for (let dc = -span; dc <= span; dc++) {
      for (const i of B.b[rr * B.W + ((c + dc) % B.W + B.W) % B.W]) {
        if (filter && !filter(i)) continue;
        const d = x * P.xyz[i * 3] + y * P.xyz[i * 3 + 1] + z * P.xyz[i * 3 + 2];
        if (best.length < k) { best.push([d, i]); best.sort((a, b2) => b2[0] - a[0]); } else if (d > best[k - 1][0]) { best[k - 1] = [d, i]; best.sort((a, b2) => b2[0] - a[0]); }
      }
    }
  }
  return best;
}
// image -> height (0..1) sampler; climate sampler from an optional painted map
function sampler(img, w, h) {
  return (lo, la) => {
    const x = ((lo + 180) / 360 * w - 0.5 + w) % w, y = Math.max(0, Math.min(h - 1, (90 - la) / 180 * h - 0.5));
    const x0 = Math.floor(x), y0 = Math.floor(y), x1 = (x0 + 1) % w, y1 = Math.min(h - 1, y0 + 1), fx = x - x0, fy = y - y0;
    const v = (xx, yy) => img[yy * w + xx];
    return (v(x0, y0) * (1 - fx) + v(x1, y0) * fx) * (1 - fy) + (v(x0, y1) * (1 - fx) + v(x1, y1) * fx) * fy;
  };
}
// a painted climate map: blue water, white ice, yellow/tan desert, light green temperate, dark green forest or jungle
function classifyColor(r, g, b, la) {
  if (b > r + 30 && b > g) return 0;
  if (r > 200 && g > 200 && b > 200) return 5;
  if (r > 150 && g > 120 && b < 110 && r >= g) return 2;
  if (g >= r && g >= b) return Math.abs(la) < 22 ? 1 : Math.abs(la) > 48 ? 4 : 3;
  return Math.abs(la) > 50 ? 4 : 3;
}

export async function buildGeo({ height, hw, hh, climate, cw, ch, sea = 0.5, N = 40000, onProgress = () => {} }) {
  const P = fib(N), H = sampler(height, hw, hh);
  const spacing = Math.sqrt(4 * Math.PI / N) / D2R, rad = spacing * 0.55;
  onProgress('Sampling the map…');
  const fr = [], el = new Float32Array(N), rg = new Float32Array(N), land = new Uint8Array(N);
  const C = climate ? (lo, la) => { const x = Math.floor(((lo + 180) / 360) * cw) % cw, y = Math.max(0, Math.min(ch - 1, Math.floor((90 - la) / 180 * ch))), k = (y * cw + x) * 4; return classifyColor(climate[k], climate[k + 1], climate[k + 2], la); } : null;
  for (let i = 0; i < N; i++) {
    const la = P.lat[i], lo = P.lon[i], sl = Math.max(0.15, Math.cos(la * D2R));
    let water = 0, n = 0, sum = 0, sq = 0; const cls = new Float32Array(6);
    for (let a = 0; a < 7; a++) {
      const ang = a * Math.PI / 3, rr = a ? rad * 0.8 : 0, sla = la + rr * Math.sin(ang), slo = lo + rr * Math.cos(ang) / sl;
      const h = H(slo, sla); n++;
      if (h < sea) water++; else { const m = (h - sea) / (1 - sea) * 6000; sum += m; sq += m * m; }
      if (C) cls[C(slo, sla)]++;
    }
    const lf = (n - water) / n;
    land[i] = lf >= 0.3 ? 1 : 0;
    el[i] = n - water ? sum / (n - water) : 0; rg[i] = n - water ? Math.sqrt(Math.max(0, sq / (n - water) - el[i] * el[i])) : 0;
    fr.push(C ? cls : null);
    fr[i] = fr[i] || new Float32Array(6); fr[i][0] = water / n;
  }
  onProgress('Finding neighbours…');
  const B = buckets(P, N, 2.5), nb = new Array(N);
  for (let i = 0; i < N; i++) nb[i] = nearestK(P, B, P.xyz[i * 3], P.xyz[i * 3 + 1], P.xyz[i * 3 + 2], P.lat[i], P.lon[i], 7).slice(1).filter(([d]) => d > Math.cos(spacing * 1.6 * D2R)).map(([, j]) => j);
  // distance to the sea, in steps
  const coastD = new Int16Array(N).fill(-1), q = [];
  for (let i = 0; i < N; i++) if (!land[i]) { coastD[i] = 0; q.push(i); }
  for (let h = 0; h < q.length; h++) { const i = q[h]; for (const j of nb[i]) if (coastD[j] < 0) { coastD[j] = coastD[i] + 1; q.push(j); } }
  // climate: painted, or worked out from latitude, height and distance to the sea
  for (let i = 0; i < N; i++) {
    if (!land[i]) continue;
    const f = fr[i], lf = 1 - f[0], al = Math.abs(P.lat[i]), d = Math.max(0, coastD[i]), e = el[i];
    if (C) { let t = 0; for (let k = 1; k < 6; k++) t += f[k]; if (t > 0) { for (let k = 1; k < 6; k++) f[k] = f[k] / t * lf; continue; } }
    const w = [0, 0, 0, 0, 0, 0];
    const cold = al + e / 150;   // height counts as latitude
    if (cold > 64) w[5] += 1;
    else if (cold > 52) w[4] += 1;
    else if (cold > 38) { w[d > 6 ? 4 : 3] += 1; if (d > 10) w[2] += 0.6; }
    else if (cold > 18) { if ((al > 16 && al < 34 && d > 3) || d > 10) w[2] += 1; else w[3] += 1; }
    else { if (d > 9) w[2] += 0.7; w[1] += 1; }
    const t = w.reduce((a, b) => a + b, 0);
    for (let k = 1; k < 6; k++) f[k] = w[k] / t * lf;
  }
  // rivers: water runs downhill to the sea; big catchments become rivers
  onProgress('Running the rivers…');
  const down = new Int32Array(N).fill(-1), acc = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (!land[i]) continue;
    let best = -1, bv = el[i] + (coastD[i] || 0) * 2;
    for (const j of nb[i]) { const v = land[j] ? el[j] + coastD[j] * 2 : -1; if (v < bv) { bv = v; best = j; } }
    down[i] = best;
    const f = fr[i]; acc[i] = 0.4 + f[1] + f[3] + 0.6 * f[4] + 0.15 * f[2];
  }
  const order = [...Array(N).keys()].filter(i => land[i]).sort((a, b) => el[b] + coastD[b] * 2 - el[a] - coastD[a] * 2);
  for (const i of order) if (down[i] >= 0 && land[down[i]]) acc[down[i]] += acc[i];
  let amax = 0; for (let i = 0; i < N; i++) if (land[i]) amax = Math.max(amax, acc[i]);
  // land cells in the shape the engine expects
  const idx = new Int32Array(N).fill(-1), cells = [];
  for (let i = 0; i < N; i++) if (land[i]) { idx[i] = cells.length; cells.push(i); }
  const out = cells.map(i => {
    const sea = nb[i].filter(j => !land[j]).length, riv = Math.min(1, Math.sqrt(acc[i] / Math.max(1, amax * 0.08)));
    return { lat: +P.lat[i].toFixed(2), lon: +P.lon[i].toFixed(2), f: Array.from(fr[i], v => +v.toFixed(3)), n: nb[i].filter(j => land[j]).map(j => idx[j]), sea, riv: riv > 0.4 ? +riv.toFixed(2) : 0, rn: null, e: Math.round(el[i]), rg: Math.round(rg[i]) };
  });
  // short sea crossings
  const coastal = out.map((c, k) => c.sea > 0 || c.f[0] > 0.15 ? k : -1).filter(k => k >= 0), links = [];
  const CB = buckets({ lat: Float32Array.from(coastal, k => out[k].lat), lon: Float32Array.from(coastal, k => out[k].lon), xyz: Float32Array.from(coastal.flatMap(k => [P.xyz[cells[k] * 3], P.xyz[cells[k] * 3 + 1], P.xyz[cells[k] * 3 + 2]])) }, coastal.length, 5);
  const CP = { lat: Float32Array.from(coastal, k => out[k].lat), lon: Float32Array.from(coastal, k => out[k].lon), xyz: Float32Array.from(coastal.flatMap(k => [P.xyz[cells[k] * 3], P.xyz[cells[k] * 3 + 1], P.xyz[cells[k] * 3 + 2]])) };
  for (let a = 0; a < coastal.length; a++) for (const [d, b] of nearestK(CP, CB, CP.xyz[a * 3], CP.xyz[a * 3 + 1], CP.xyz[a * 3 + 2], CP.lat[a], CP.lon[a], 8)) { const deg = Math.acos(Math.min(1, d)) / D2R; if (b > a && deg > 0 && deg < 4.5 && !out[coastal[a]].n.includes(coastal[b])) links.push([coastal[a], coastal[b], +deg.toFixed(1)]); }
  // textures: which province each pixel shows, relief shading, rivers
  onProgress('Painting the globe…');
  await new Promise(r => setTimeout(r, 0));
  const id = new Uint16Array(TW * TH), shade = new Uint8Array(TW * TH), rivers = new Uint8Array(TW * TH);
  const LB = buckets({ lat: Float32Array.from(cells, i => P.lat[i]), lon: Float32Array.from(cells, i => P.lon[i]) }, cells.length, 2.5);
  const LP = { lat: Float32Array.from(cells, i => P.lat[i]), lon: Float32Array.from(cells, i => P.lon[i]), xyz: Float32Array.from(cells.flatMap(i => [P.xyz[i * 3], P.xyz[i * 3 + 1], P.xyz[i * 3 + 2]])) };
  const far = Math.cos(spacing * 1.6 * D2R);
  // coarse pass: the nearest province on a 1024x512 grid, then each fine pixel picks among the nearby candidates
  const CW = 1024, CH = 512, coarse = new Int32Array(CW * CH);
  for (let y = 0; y < CH; y++) {
    const la = 90 - (y + 0.5) / CH * 180, cl = Math.cos(la * D2R), z = Math.sin(la * D2R);
    for (let x = 0; x < CW; x++) { const lo = (x + 0.5) / CW * 360 - 180, rr = nearestK(LP, LB, cl * Math.cos(lo * D2R), cl * Math.sin(lo * D2R), z, la, lo, 1); coarse[y * CW + x] = rr.length ? rr[0][1] : -1; }
    if (y % 64 === 0) { onProgress(`Painting the globe… ${Math.round(y / CH * 40)}%`); await new Promise(r => setTimeout(r, 0)); }
  }
  const cand = new Set();
  for (let y = 0; y < TH; y++) {
    const la = 90 - (y + 0.5) / TH * 180, cl = Math.cos(la * D2R), z = Math.sin(la * D2R), cy = y >> 2;
    for (let x = 0; x < TW; x++) {
      const lo = (x + 0.5) / TW * 360 - 180, h = H(lo, la), k = y * TW + x;
      const hx = H(lo + 0.1, la) - H(lo - 0.1, la), hy = H(lo, la + 0.1) - H(lo, la - 0.1);
      shade[k] = Math.max(0, Math.min(255, 175 + (-hx + hy) * 1400 * (h >= sea ? 1 : 0.15)));
      if (h < sea) { id[k] = 65535; continue; }
      const cx = x >> 2; cand.clear();
      for (let dy = -1; dy <= 1; dy++) { const yy = cy + dy; if (yy < 0 || yy >= CH) continue; for (let dx = -1; dx <= 1; dx++) { const c = coarse[yy * CW + ((cx + dx + CW) % CW)]; if (c >= 0) cand.add(c); } }
      const px = cl * Math.cos(lo * D2R), py = cl * Math.sin(lo * D2R);
      let best = -1, bd = -2;
      for (const c of cand) { const d = px * LP.xyz[c * 3] + py * LP.xyz[c * 3 + 1] + z * LP.xyz[c * 3 + 2]; if (d > bd) { bd = d; best = c; } }
      id[k] = best >= 0 && bd > far ? best : 65533;
    }
    if (y % 128 === 0) { onProgress(`Painting the globe… ${40 + Math.round(y / TH * 60)}%`); await new Promise(r => setTimeout(r, 0)); }
  }
  // rivers drawn along the flow
  for (const i of cells) {
    const r = Math.sqrt(acc[i] / Math.max(1, amax * 0.08)); if (r < 0.55 || down[i] < 0 || !land[down[i]]) continue;
    const a = [P.lon[i], P.lat[i]], b = [P.lon[down[i]], P.lat[down[i]]]; if (Math.abs(a[0] - b[0]) > 180) continue;
    const steps = 40, wpx = r > 1 ? 1 : 0;
    for (let s = 0; s <= steps; s++) { const lo = a[0] + (b[0] - a[0]) * s / steps, la = a[1] + (b[1] - a[1]) * s / steps, px = Math.floor((lo + 180) / 360 * TW), py = Math.floor((90 - la) / 180 * TH); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (Math.abs(dx) + Math.abs(dy) > wpx) continue; const xx = (px + dx + TW) % TW, yy = py + dy; if (yy >= 0 && yy < TH) rivers[yy * TW + xx] = Math.min(255, 140 + 60 * r); } }
  }
  return { geo: { cells: out, seaLinks: links, spacingDeg: spacing, nTotal: N, custom: true }, idmap: id, shade: { w: TW, h: TH, data: shade }, rivers: { w: TW, h: TH, data: rivers } };
}

// ---------------- the start on a custom world (engine side) ----------------
const KEYS = ['latin', 'greek', 'celtic', 'germanic', 'slavic', 'finnic', 'persian', 'arabic', 'berber', 'turkic', 'mongolic', 'sinitic', 'tibetan', 'korean', 'japanese', 'seasian', 'austronesian', 'indic', 'dravidian', 'ethiopic', 'bantu', 'westafrican', 'maya', 'mesoamerican', 'andean', 'northamerican', 'siberian'];
const FAMS = ['Northern', 'Eastern', 'Western', 'Southern', 'River', 'Mountain', 'Island', 'Steppe', 'Forest', 'Coastal', 'Desert', 'Old'];
export function installCustom(World) {
  const P = World.prototype;
  P._genRoot = function (key) {
    const parts = NAME_PARTS[key] || NAME_PARTS.latin, r = this.rng;
    const w = parts[1].length ? r.pick(parts[0]) + r.pick(parts[1]) + (r.next() < 0.5 ? '' : r.pick(parts[2])) : r.pick(parts[0]);
    return w.charAt(0).toUpperCase() + w.slice(1);
  };
  P._customPeoples = function () {
    const N = this.N, r = this.rng;
    // seeds: about one people per 20 provinces, more where land is rich
    const nSeeds = Math.max(12, Math.min(160, Math.round(N / 20)));
    const seeds = [];
    for (let t = 0; seeds.length < nSeeds && t < nSeeds * 50; t++) { const i = r.int(N); if (this.arable[i] > 0 || r.next() < 0.3) if (!seeds.some(s => this.distDeg(s, i) < 4)) seeds.push(i); }
    // languages come in families: neighbouring seeds share a family
    const famOf = new Int16Array(seeds.length).fill(-1), fams = [];
    seeds.forEach((s, k) => {
      if (famOf[k] >= 0) return;
      const key = r.pick(KEYS), f = fams.length; famOf[k] = f; fams.push({ key, name: `${r.pick(FAMS)} ${this._genRoot(key)}ic` });
      seeds.forEach((s2, k2) => { if (famOf[k2] < 0 && this.distDeg(s, s2) < 14 && r.next() < 0.7) famOf[k2] = f; });
    });
    this.peoples = seeds.map((s, k) => {
      const fam = fams[famOf[k]], base = this._genRoot(fam.key);
      const name = base.replace(/[aeiouy]+$/, '') + r.pick(['ans', 'i', 'ites', 'ese', 'ians', 'ar']);
      return { name, lang: base, branch: fam.name, family: fam.name, key: fam.key, identity: 0.4 + r.next() * 0.35, states: [], curated: false, id: k, color: `hsl(${(k * 47) % 360},${45 + (k % 3) * 10}%,${42 + (k % 4) * 6}%)`, born: 0, parents: null, cells0: 0, cells: 0, pop: 0, ended: null, revolts: 0, statesUsed: 0, grievance: 0 };
    });
    this.langs = this.peoples.map(q => ({ name: q.lang, branch: q.branch, family: q.family, color: q.color }));
    this.peoples.forEach((q, k) => { q.li = k; });
    // each province belongs to the nearest seed over land (slower across mountains)
    const dist = new Float32Array(N).fill(1e9), who = new Int32Array(N).fill(0), heap = [];
    seeds.forEach((s, k) => { dist[s] = 0; who[s] = k; heap.push(s); });
    for (let h = 0; h < heap.length; h++) { const i = heap[h]; for (const j of this.nb[i]) { const d = dist[i] + 1 + this.rough[j] * 2; if (d < dist[j]) { dist[j] = d; who[j] = who[i]; heap.push(j); } } }
    this.custPpl = who;
    for (let i = 0; i < N; i++) this.culture[i] = this.peoples[who[i]].key;
  };
  P._customSetup = function () {
    const N = this.N, r = this.rng;
    this._customPeoples();
    // farming began in a few cradles: the richest river lands
    const score = i => this.arable[i] * (1 + this.riv[i] * 2) * (this.geo.cells[i].f[3] + this.geo.cells[i].f[1] * 0.8 + this.geo.cells[i].f[2] * 0.4);
    const order = [...Array(N).keys()].sort((a, b) => score(b) - score(a)), cradles = [];
    const want = Math.max(2, Math.min(6, Math.round(N / 2500)));
    for (const i of order) { if (cradles.length >= want) break; if (!cradles.some(c => this.distDeg(c, i) < 25)) cradles.push(i); }
    this.cradles = cradles;
    for (let i = 0; i < N; i++) {
      const d = Math.min(...cradles.map(c => this.distDeg(c, i))), f = this.geo.cells[i].f, lf = Math.max(1e-6, 1 - f[0]);
      let pkg = d < 12 ? 'core' : d < 30 ? 'barbarian' : (f[2] + f[4]) / lf > 0.5 ? 'steppe' : d < 50 ? 'africa' : 'americas';
      if ((f[5] / lf) > 0.5 || Math.abs(this.lat[i]) > 62) pkg = 'foragers';
      this._grant(this.cellTech[i], PACKAGES[pkg]);
    }
    // the first states around each cradle
    for (const c of cradles) {
      const nStates = 3 + r.int(3);
      for (let s = 0; s < nStates; s++) {
        let seed = c; for (let t = 0; t < 20; t++) { const j = r.int(N); if (this.distDeg(j, c) < 9 && this.owner[j] < 0 && this.arable[j] > 0) { seed = j; break; } }
        if (this.owner[seed] >= 0) continue;
        const key = this.culture[seed], p = this._newPolity(this._genName(key), key, null, false);
        p.aggression = 0.6 + r.next() * 0.8; p.legitBase = 0.1; this._grant(p.tech, PACKAGES.core);
        const q = [seed]; this.owner[seed] = p.id; let n = 1, want = 6 + r.int(14);
        for (let h = 0; h < q.length && n < want; h++) for (const j of this.nb[q[h]]) if (this.owner[j] < 0 && n < want && this.arable[j] > 0) { this.owner[j] = p.id; q.push(j); n++; }
        p.capital = seed;
      }
    }
    // people: as many as the land feeds, by how far farming has come
    this._refreshFx();
    for (let i = 0; i < N; i++) {
      const cap = this._fullCapacity(i), d = Math.min(...cradles.map(c => this.distDeg(c, i)));
      this.pop[i] = cap * (d < 12 ? 0.45 : d < 30 ? 0.28 : d < 50 ? 0.14 : 0.06);
      this.granary[i] = this.pop[i] * 0.3;
      const { farm, past } = this._landFood(i);
      const need = Math.max(0, this.pop[i] * 1.12 - past - this.fishK[i] * 0.12);
      this.cleared[i] = farm > 0 ? Math.min(1, Math.max(0.02, need / farm)) : 0.02;
    }
    for (const bits of [...this.cellTech, ...this.polities.map(p => p.tech)]) bits.forEach((v, k) => { if (v && !(TECHS[k].id in this.firstTech)) this.firstTech[TECHS[k].id] = { year: 0, by: 'start' }; });
    this._log('start', `Year 1 on a new world. ${Math.round(this.worldPop() / 1e6)} million people, ${this.polities.length} states around ${cradles.length} cradles of farming.`);
    this._record(0, 0, 0);
  };
  // faiths on a custom world: one folk faith for each language family
  P._customFaiths = function () {
    const fams = [...new Set(this.peoples.map(q => q.family))];
    this.faiths = [];
    fams.forEach((f, k) => this._addFaith({ name: `the ${f.split(' ')[1].replace(/ic$/, '')} gods`, color: `hsl(${(k * 67) % 360},40%,55%)`, miss: 0.1 }, 1));
    for (let i = 0; i < this.N; i++) this.rel[i] = fams.indexOf(this.peoples[this.custPpl[i]].family);
    for (const p of this.polities) p.rel = this._majorityFaith(p.id);
  };
}
