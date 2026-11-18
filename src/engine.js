// WorldSim engine: deterministic, one step = one year. Runs in the browser and in Node.
import {
  TECHS, TECH_INDEX, PACKAGES, STATES, POP_REGIONS, CULTURE_ZONES, NEW_WORLD_BOXES, NAME_PARTS, TITLES,
  EPIDEMICS, VOLCANOES, QUAKES, CLIMATE_ERAS, START_YEAR,
} from './scenario.js';
import { CITY_SITES, cityName } from './cities.js';
import { installSystems, GOVS, RES, RB } from './systems.js';
import { installPolitics, TRAITS } from './politics.js';
import { installFamilies } from './families.js';
import { installPeoples } from './peoples.js';
import { installWhatIf } from './whatif.js';
import { installEconomy, installMarkets } from './economy.js';

// ---------- seeded random (sfc32) ----------
export function makeRng(seed) {
  let a = 0x9e3779b9, b = 0x243f6a88, c = 0xb7e15162, d = (seed >>> 0) ^ 0xdeadbeef;
  const next = () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0; return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < 20; i++) next();
  const r = { next, int: n => Math.floor(next() * n), pick: arr => arr[Math.floor(next() * arr.length)],
    getState: () => [a, b, c, d], setState: st => { [a, b, c, d] = st; },
    normal: () => { let u = 0, v = 0; while (u === 0) u = next(); v = next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); } };
  return r;
}

const D2R = Math.PI / 180;
const NT = TECHS.length;
const T = TECH_INDEX;
function inPoly(lon, lat, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
const inBox = (lon, lat, b) => lon >= b[0] && lat >= b[1] && lon <= b[2] && lat <= b[3];
const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(2) + ' billion' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : n >= 1e3 ? Math.round(n / 1e3) + ',000' : String(Math.round(n));
export { fmt };

// tech bitsets are arrays of booleans packed in Uint8Array per owner (NT <= 64, simple and fast enough)
function techFx(bits) {
  const fx = { yield: 1, coolYield: 1, river: 1, pasture: 1, labor: 1, soilDep: 1, spoil: 1, redistrib: 0.03, research: 1, mil: 1,
    defense: 1, fish: 1, sea: 0, ocean: 0, trade: 0, stateCap: 0, death: 0, birth: 0, plague: 1, pox: 1, urban: 0, tax: 1, land: 1,
    noNomad: 0, bomb: 0, known: 0, agri: 0, industry: 0 };
  for (let i = 0; i < NT; i++) if (bits[i]) {
    fx.known++;
    const e = TECHS[i].fx;
    for (const k in e) {
      if (k === 'redistrib' || k === 'stateCap' || k === 'death' || k === 'birth' || k === 'urban' || k === 'sea') fx[k] += e[k];
      else if (k === 'ocean' || k === 'trade' || k === 'noNomad' || k === 'bomb') fx[k] = 1;
      else fx[k] *= e[k];
    }
  }
  fx.agri = bits[T.agriculture] ? 1 : 0;
  fx.industry = bits[T.industry] ? 1 : 0;
  fx.fert = bits[T.fertilizer] ? 1 : 0;
  return fx;
}

export class World {
  constructor(geo, seed = 1, opts = {}) {
    this.seed = seed;
    this.rng = makeRng(seed);
    this.opts = opts;
    this.year = START_YEAR;
    const cs = geo.cells;
    const N = this.N = cs.length;
    this.K = (geo.nTotal || 10000) / 10000;           // province-size scale vs the original 2-degree map
    this.sK = Math.sqrt(this.K);
    this.cellArea = 510e6 / (geo.nTotal || 10000);
    this.elev = new Float32Array(N); this.rough = new Float32Array(N);
    this.geo = geo;
    this.lat = new Float32Array(N); this.lon = new Float32Array(N);
    this.area = new Float32Array(N); this.arable = new Float32Array(N); this.pastureA = new Float32Array(N);
    this.pastureY = new Float32Array(N); this.coolShare = new Float32Array(N); this.riv = new Float32Array(N);
    this.fishK = new Float32Array(N); this.nw = new Uint8Array(N); this.culture = new Array(N);
    this.block = new Int16Array(N); this.coastal = new Uint8Array(N); this.mountain = new Float32Array(N);
    // neighbours
    this.nb = cs.map(c => c.n);
    this.sl = Array.from({ length: N }, () => []);
    for (const [a, b] of geo.seaLinks) { this.sl[a].push(b); this.sl[b].push(a); }
    for (let i = 0; i < N; i++) {
      const c = cs[i], f = c.f;
      this.lat[i] = c.lat; this.lon[i] = c.lon;
      const landF = 1 - f[0];
      this.area[i] = this.cellArea * landF;
      this.elev[i] = c.e || 0;
      this.rough[i] = Math.min(0.85, (c.rg || 0) / 900 + Math.max(0, (c.e || 0) - 1200) / 3500);
      const mtn = Math.abs(c.lat) < 55 ? f[5] : 0;
      this.mountain[i] = mtn;
      const aridShare = landF > 0 ? f[2] / landF : 0;
      let ar = this.cellArea * (0.13 * f[1] + 0.022 * f[2] + 0.27 * f[3] + 0.14 * f[4] + 0.003 * f[5]);
      ar += this.cellArea * c.riv * 0.07 * (1 + 2 * aridShare);
      ar *= Math.max(0.15, 1 - Math.max(0, (c.e || 0) - 1800) / 2500) * (1 - 0.4 * Math.min(1, (c.rg || 0) / 700));
      ar *= 1 - 0.6 * mtn;
      ar = Math.min(ar, this.area[i] * 0.6);
      this.arable[i] = ar;
      this.riv[i] = c.riv;
      this.coolShare[i] = landF > 0 ? (f[3] * (Math.abs(c.lat) > 35 ? 1 : 0.2) + f[4]) / landF : 0;
      this.pastureA[i] = Math.max(0, this.area[i] - ar);
      this.pastureY[i] = landF > 0 ? (1.0 * f[1] + 0.55 * f[2] + 1.8 * f[3] + 1.4 * f[4] + 0.12 * f[5]) / landF : 0;
      this.coastal[i] = c.sea > 0 || f[0] > 0.15 ? 1 : 0;
      this.fishK[i] = this.coastal[i] ? 90000 / this.K * (c.sea + 5 * f[0]) * (0.6 + Math.abs(c.lat) / 80) : 0;
      this.nw[i] = NEW_WORLD_BOXES.some(b => inBox(c.lon, c.lat, b)) ? 1 : 0;
      const z = CULTURE_ZONES.find(([, b]) => inBox(c.lon, c.lat, b));
      this.culture[i] = z ? z[0] : 'default';
      this.block[i] = Math.floor((c.lon + 180) / 10) + 36 * Math.floor((c.lat + 90) / 10);
    }
    this.cosLat = Float32Array.from(this.lat, l => Math.cos(l * D2R));
    // dynamic state
    this.pop = new Float64Array(N); this.soil = new Float32Array(N).fill(0.88); this.cleared = new Float32Array(N).fill(1); this.modern = new Float32Array(N); this.capCache = new Float32Array(N); this.fish = Float32Array.from(this.fishK);
    this.granary = new Float32Array(N); this.nour = new Float32Array(N).fill(1); this.owner = new Int32Array(N).fill(-1);
    this.prod = new Float32Array(N); this.famine = new Float32Array(N); this.plagueHit = new Float32Array(N);
    this.urban = new Float32Array(N); this.climate = new Float32Array(N).fill(1); this.warHit = new Float32Array(N); this.warZone = new Int32Array(N);
    this.cellTech = Array.from({ length: N }, () => new Uint8Array(NT));
    this.weather = new Float32Array(36 * 18);
    this.polities = [];
    this.wars = [];
    this.events = [];
    this.history = [];
    this.epidemics = [];
    this.firstTech = {};
    this.contactYear = null;
    this.fxCache = new Map();
    this.totals = { famine: 0, war: 0, plague: 0, disaster: 0 };
    // historic city sites -> province
    this.siteAt = new Int32Array(N).fill(-1);
    CITY_SITES.forEach((st, k) => { const c = this._nearest(st[1], st[2]); if (c >= 0 && this._dist2(c, st[1], st[2]) < 1.6) this.siteAt[c] = k; });
    this.cities = []; this.cityAt = new Int32Array(N).fill(-1);
    this.sched = opts.blind ? this._blindSchedule(seed) : { epidemics: EPIDEMICS, volcanoes: VOLCANOES, quakes: QUAKES, eras: CLIMATE_ERAS, prophets: null };
    this._setup();
    this._sysInit();
    this._polInit();
    this._pplInit();
    this._ecoInit();
    this._famInit();
    this._aggregate();
    this._initTowns();
  }

  // year 1 already has towns and cities: work out the town share and place them before the first step
  _initTowns() {
    this._refreshFx();
    for (let i = 0; i < this.N; i++) {
      const pop = this.pop[i]; if (pop < 1) continue;
      const fx = this.cellFx[i], { farm } = this._landFood(i, fx);
      const perFarmer = 1.2 * fx.labor, laborCap = pop * 0.92 * perFarmer, landF = farm + 1e-9;
      const farmOut = fx.agri ? landF * laborCap / Math.cbrt(landF * landF * landF + laborCap * laborCap * laborCap) : 0;
      this.urban[i] = Math.min(0.95, Math.max(0.01, (1 - Math.min(0.92, farmOut / perFarmer / pop)) * 0.42 + fx.urban));
    }
    this._aggregate();
    this._cities(true);
    this.history.pop(); this.shareHist = []; for (const p of this.polities) p.hist = []; this._record(0, 0, 0);
  }

  // ---------- setup ----------
  _setup() {
    const N = this.N, rng = this.rng;
    // tech packages by area
    for (let i = 0; i < N; i++) {
      const cul = this.culture[i], lat = this.lat[i], lon = this.lon[i];
      let pkg = 'barbarian';
      if (this.nw[i]) {
        if (inBox(lon, lat, [110, -50, 180, -10]) || cul === 'austronesian') pkg = lon > 150 || lon < -100 ? 'pacific' : 'foragers';
        else if (cul === 'mesoamerican' || cul === 'maya') pkg = 'meso';
        else if (cul === 'andean') pkg = 'andes';
        else if (lat > 55) pkg = 'foragers';
        else pkg = 'americas';
      } else if (cul === 'siberian' || cul === 'finnic') pkg = lat > 60 ? 'foragers' : 'barbarian';
      else if (cul === 'turkic' || cul === 'mongolic' || cul === 'tibetan') pkg = 'steppe';
      else if (cul === 'bantu' || cul === 'westafrican' || cul === 'sudanic') pkg = lat < -22 ? 'foragers' : 'africa';
      else if (cul === 'seasian' || cul === 'austronesian') pkg = 'seasia';
      else if (cul === 'japanese' || cul === 'korean') pkg = 'seasia';
      else if (['latin', 'greek', 'persian', 'arabic', 'egyptian', 'indic', 'dravidian', 'sinitic', 'ethiopic'].includes(cul)) pkg = 'core';
      this._grant(this.cellTech[i], PACKAGES[pkg]);
    }
    // states
    for (const s of STATES) {
      const p = this._newPolity(s.name, s.culture, s.color, s.nomad);
      p.aggression = 0.6 + rng.next() * 0.8;
      p.legitBase = 0.1;   // old, established states carry legitimacy
      this._grant(p.tech, PACKAGES[s.pkg]);
      for (let i = 0; i < N; i++) if (this.owner[i] < 0 && inPoly(this.lon[i], this.lat[i], s.poly)) this.owner[i] = p.id;
      p.capital = this._nearest(s.cap[0], s.cap[1], c => this.owner[c] === p.id);
      if (p.capital < 0) { p.capital = this._nearest(s.cap[0], s.cap[1]); this.owner[p.capital] = p.id; }
    }
    // population
    const assigned = new Int32Array(N).fill(-1);
    POP_REGIONS.forEach((r, k) => {
      const pid = r.state ? this.polities.find(p => p.name === r.state).id : null;
      for (let i = 0; i < N; i++) {
        if (assigned[i] >= 0) continue;
        if (pid !== null ? this.owner[i] === pid : inBox(this.lon[i], this.lat[i], r.box)) assigned[i] = k;
      }
    });
    this._refreshFx();
    const cap = new Float64Array(N);
    for (let i = 0; i < N; i++) cap[i] = this._fullCapacity(i);
    POP_REGIONS.forEach((r, k) => {
      let tot = 0; for (let i = 0; i < N; i++) if (assigned[i] === k) tot += Math.pow(cap[i], 1.2);
      for (let i = 0; i < N; i++) if (assigned[i] === k) this.pop[i] = r.pop * 1e6 * Math.pow(cap[i], 1.2) / (tot || 1);
    });
    for (let i = 0; i < N; i++) {
      if (assigned[i] < 0) this.pop[i] = cap[i] * 0.3;
      // don't start above what the land feeds
      this.pop[i] = Math.min(this.pop[i], cap[i] * 1.05);
      this.granary[i] = this.pop[i] * 0.3;
      // only as much land is cleared as the people need (plus a little slack)
      const { farm, past } = this._landFood(i);
      const needFarm = Math.max(0, this.pop[i] * 1.12 - past - this.fishK[i] * 0.12);
      this.cleared[i] = farm > 0 ? Math.min(1, Math.max(0.02, needFarm / farm)) : 0.02;
    }
    for (let i = 0; i < this.N; i++) for (let k = 0; k < NT; k++) if (this.cellTech[i][k] && !(TECHS[k].id in this.firstTech)) this.firstTech[TECHS[k].id] = { year: 0, by: 'start' };
    for (const p of this.polities) for (let k = 0; k < NT; k++) if (p.tech[k] && !(TECHS[k].id in this.firstTech)) this.firstTech[TECHS[k].id] = { year: 0, by: 'start' };
    this._log('start', `Year 1. ${fmt(this.worldPop())} people. ${this.polities.length} states, the largest ${this._largest().map(p => p.name).slice(0, 2).join(' and ')}.`);
    this._record(0, 0, 0);
  }

  _grant(bits, ids) { for (const id of ids) bits[T[id]] = 1; }
  _nearest(lon, lat, ok = () => true) {
    let best = -1, bd = 1e9;
    for (let i = 0; i < this.N; i++) { if (!ok(i)) continue; const d = this._dist2(i, lon, lat); if (d < bd) { bd = d; best = i; } }
    return best;
  }
  _dist2(i, lon, lat) { let dl = Math.abs(this.lon[i] - lon); if (dl > 180) dl = 360 - dl; const dx = dl * Math.cos(lat * D2R), dy = this.lat[i] - lat; return dx * dx + dy * dy; }
  distDeg(a, b) {
    const s = Math.sin(this.lat[a] * D2R) * Math.sin(this.lat[b] * D2R) + this.cosLat[a] * this.cosLat[b] * Math.cos((this.lon[a] - this.lon[b]) * D2R);
    return Math.acos(Math.max(-1, Math.min(1, s))) / D2R;
  }

  _newPolity(name, culture, color, nomad = false) {
    const rng = this.rng;
    const p = {
      id: this.polities.length, name, culture, color: color || this._color(), nomad: !!nomad,
      tech: new Uint8Array(NT), prog: new Float32Array(NT), rp: 0, target: -1, stability: 0.7, aggression: 0.5 + rng.next(), alive: true,
      founded: this.year, ended: null, capital: -1, cells: 0, pop: 0, urban: 0, army: 0, soldiers: 0, foreign: 0, faithPop: 0, over: 0, rpRate: 0, peakPop: 0, peakCells: 0,
      wars: 0, fx: null, neighbours: new Set(), rel: -1, gov: null, treasury: 0, income: 0, tradePartners: new Set(), overlord: null, ruler: null, famineDeaths: 0, plagueDeaths: 0, warLoss: 0, startCells: 0,
    };
    this.polities.push(p);
    return p;
  }
  _color() {
    this._hue = ((this._hue ?? this.rng.next() * 360) + 137.508) % 360;
    const h = this._hue, s = 32 + this.rng.next() * 22, l = 42 + this.rng.next() * 16;
    return `hsl(${h.toFixed(0)},${s.toFixed(0)}%,${l.toFixed(0)}%)`;
  }
  _genName(culture) {
    const parts = NAME_PARTS[culture] || NAME_PARTS.latin, rng = this.rng;
    let root;
    for (let tries = 0; tries < 20; tries++) {
      root = parts[1].length ? rng.pick(parts[0]) + rng.pick(parts[1]) + rng.pick(parts[2]) : rng.pick(parts[0]);
      root = root.charAt(0).toUpperCase() + root.slice(1);
      if (!this.polities.some(p => p.alive && p.name.includes(root))) break;
    }
    const titles = TITLES[culture] || TITLES.default;
    return rng.pick(titles).replace('{n}', root);
  }
  _fxOf(bits) {
    let key = '';
    for (let i = 0; i < NT; i++) key += bits[i];
    let fx = this.fxCache.get(key);
    if (!fx) { fx = techFx(bits); this.fxCache.set(key, fx); }
    return fx;
  }
  _refreshFx() {
    for (const p of this.polities) if (p.alive) p.fx = this._fxOf(p.tech);
    if (!this.cellFx) { this.cellFx = new Array(this.N); this.fxDirty = new Uint8Array(this.N).fill(1); }
    for (let i = 0; i < this.N; i++) {
      const o = this.owner[i];
      if (o >= 0) { this.cellTech[i].set(this.polities[o].tech); this.cellFx[i] = this.polities[o].fx; this.fxDirty[i] = 1; }
      else if (this.fxDirty[i]) { this.cellFx[i] = this._fxOf(this.cellTech[i]); this.fxDirty[i] = 0; }
    }
  }

  // food each cell could produce at climate 1 with unlimited labour (people fed per year)
  _landFood(i, fx) {
    fx = fx || this.cellFx[i];
    let farm = 0;
    if (fx.agri) {
      const y = 115 * fx.yield * (this.cropF ? this.cropF[i] : this.nw[i] ? 1.25 : 1) * (1 + this.coolShare[i] * (fx.coolYield - 1)) * (1 + this.riv[i] * 0.6 * (fx.river - 1) / 0.6);
      farm = Math.min(this.area[i] * 0.75, this.arable[i] * fx.land) * this.cleared[i] * y * this.soil[i];
    }
    const past = this.pastureA[i] * this.pastureY[i] * 0.45 * (this.pastF ? this.pastF[i] : 1) * (fx.agri ? 1 : 0.4) * fx.pasture * (fx.pasture > 1 ? 1 : 0.6);
    return { farm, past };
  }
  _capacity(i) { const { farm, past } = this._landFood(i); return farm + past + this.fishK[i] * 0.12; }
  _fullCapacity(i) { const c = this.cleared[i]; this.cleared[i] = 1; const v = this._capacity(i); this.cleared[i] = c; return v; }

  // ---------- one year ----------
  step() {
    const y = ++this.year, N = this.N, rng = this.rng;
    let famineD = 0, warD = 0, plagueD = 0;
    this.famine.fill(0); this.plagueHit.fill(0); this.warHit.fill(0);
    this._refreshFx();
    if (this.opts.council === 'rules' && y % (this.opts.councilEvery || 25) === 0) this.holdCouncilWithRules(this.opts.councilSize || 5);
    this._climate(y);
    this._scheduled(y);

    // ---- food: production ----
    const surplus = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const pop = this.pop[i];
      if (pop < 1) { this.pop[i] = 0; this.prod[i] = 0; this.urban[i] = 0; this.capCache[i] = this._capacity(i); continue; }
      const fx = this.cellFx[i];
      const { farm, past } = this._landFood(i, fx);
      const ow = this.owner[i], perFarmer = 1.2 * fx.labor * (ow >= 0 && this.polities[ow].resFx ? this.polities[ow].resFx.labor : 1);
      const laborCap = pop * 0.92 * perFarmer;
      const k = 3, landF = farm + 1e-9;
      const farmOut = fx.agri ? landF * laborCap / Math.cbrt(landF * landF * landF + laborCap * laborCap * laborCap) : 0;
      this.capCache[i] = farm + past + this.fishK[i] * 0.12;
      const farmShare = Math.min(0.92, farmOut / perFarmer / pop);
      this.urban[i] = Math.min(0.95, Math.max(0.01, (1 - farmShare) * 0.42 + fx.urban));
      // fishing: logistic stock, regrows fastest at half full
      let fishCatch = 0;
      if (this.fishK[i] > 0) {
        const fishers = pop * 0.05, st = this.fish[i], K = this.fishK[i];
        fishCatch = Math.min(fishers * 4 * fx.fish, st * 0.45);
        this.fish[i] = Math.max(K * 0.01, st + 0.55 * st * (1 - st / K) - fishCatch);
      }
      const c = this.climate[i] * (this.warZone[i] ? 0.72 : 1);
      const P = (farmOut + past) * c + fishCatch;
      this.prod[i] = P;
      // soil: worn by intensive farming, recovers when rested
      const intensity = farmOut / (landF + 1);
      this.soil[i] = Math.max(0.35, Math.min(1, this.soil[i] + 0.03 * (1 - this.soil[i]) - 0.0036 * intensity * intensity * fx.soilDep));
      // land clearing: well-fed farmers clear forest; empty land goes back to the wild
      if (fx.agri) {
        const coolCap = fx.coolYield > 1 ? 1 : 1 - 0.55 * this.coolShare[i];
        const clr = 0.00022 * (fx.labor) * (this.nour[i] > 1.0 ? 1 : 0.2) * (this._focus(this.owner[i]) === 'farming' ? 2.5 : 1);
        if (this.cleared[i] < coolCap) this.cleared[i] += clr * (coolCap - this.cleared[i]) * Math.min(1, pop / Math.max(1, farm * 0.5));
        const use = Math.min(1, laborCap / Math.max(1, landF));
        if (use < 0.7) this.cleared[i] = Math.max(0.02, this.cleared[i] - 0.01 * (0.7 - use));
      }
      // granary: store some surplus, it rots
      let s = P - pop;
      const spoil = 0.3 * fx.spoil;
      if (s > 0) { const put = Math.min(s * 0.5, pop * 1.0 - this.granary[i]); if (put > 0) { this.granary[i] += put; s -= put; } }
      else { const take = Math.min(this.granary[i], -s); this.granary[i] -= take; s += take; }
      this.granary[i] *= 1 - spoil;
      surplus[i] = s;
    }
    // ---- redistribution inside states (and world trade later) ----
    const pool = new Float64Array(this.polities.length), want = new Float64Array(this.polities.length);
    for (let i = 0; i < N; i++) {
      const o = this.owner[i]; if (o < 0) continue;
      const fo = this._focus(o), r = Math.min(0.85, (this.cellFx[i].redistrib + (fo === 'farming' || fo === 'trade' ? 0.1 : 0)) * (0.5 + this.polities[o].stability));
      if (surplus[i] > 0) { const g = surplus[i] * r; pool[o] += g; surplus[i] -= g; }
      else want[o] -= surplus[i];
    }
    let worldPool = 0, worldWant = 0;
    for (const p of this.polities) if (p.alive && p.fx.trade) {
      const extra = Math.max(0, pool[p.id] - want[p.id]); worldPool += extra * 0.6; pool[p.id] -= extra * 0.6;
      worldWant += Math.max(0, want[p.id] - pool[p.id]);
    }
    const worldShare = worldWant > 0 ? Math.min(1, worldPool / worldWant) : 0;
    for (const p of this.polities) if (p.alive && p.fx.trade) pool[p.id] += Math.max(0, want[p.id] - pool[p.id]) * worldShare;
    const fill = this.polities.map(p => (want[p.id] > 0 ? Math.min(1, pool[p.id] / want[p.id]) : 0));
    for (let i = 0; i < N; i++) { const o = this.owner[i]; if (o >= 0 && surplus[i] < 0) surplus[i] *= 1 - fill[o]; }

    // ---- demography ----
    const move = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const pop = this.pop[i]; if (pop < 1) continue;
      const fx = this.cellFx[i];
      const n = Math.max(0, Math.min(2, 1 + surplus[i] / pop));
      this.nour[i] = n;
      const death = Math.max(0.007, 0.0395 - fx.death) + (fx.industry ? 0 : 0.004 * this.urban[i]);
      let birth = Math.max(0.009, 0.0415 - fx.birth - (fx.birth > 0.01 ? 0.004 * this.urban[i] : 0));
      if (fx.birth > 0.01) { this.modern[i] = Math.min(80, this.modern[i] + 1); const m = this.modern[i] / 80; birth = Math.max(0.009, birth - 0.0125 * m); }
      const deathAged = death + (fx.birth > 0.01 ? 0.0025 * this.modern[i] / 80 : 0);
      let fam = 0;
      if (n < 1) { const g = Math.max(0, 1 - n - 0.04); fam = pop * Math.min(0.5, 0.15 * g + 0.9 * g * g) * (fx.trade ? 0.5 : 1) * (fx.redistrib > 0.25 ? 0.6 : 1) * (fx.fert ? 0.3 : 1); birth *= n * n * n * n; }
      let np = pop + pop * (birth - deathAged) - fam;
      this.famine[i] = fam;
      const wz = this.warZone[i];
      if (wz && fam > 0) { this.wars[wz - 1].deaths += fam; warD += fam; } else famineD += fam;
      if (this.owner[i] >= 0) this.polities[this.owner[i]].famineDeaths += fam;
      // hunger migration to better-fed neighbours
      if (n < 0.92) { const m = np * 0.1 * (0.92 - n); move[i] -= m; }
      this.pop[i] = Math.max(0, np);
    }
    for (let i = 0; i < N; i++) {
      if (move[i] >= 0) continue;
      const m = -move[i]; let tot = 0;
      for (const j of this.nb[i]) tot += Math.max(0, this.nour[j] - 0.97);
      if (tot <= 0) continue;
      this.pop[i] -= m;
      for (const j of this.nb[i]) { const w = Math.max(0, this.nour[j] - 0.97); if (w > 0) { this.pop[j] += m * w / tot; this._carry(i, j, m * w / tot); } }
    }
    // frontier settlement: well-fed farmers spill into empty farmland next door
    for (let i = 0; i < N; i++) {
      if (this.nour[i] < 1.02 || !this.cellFx[i].agri) continue;
      for (const j of this.nb[i]) {
        const capj = this.capCache[j];
        if (this.pop[j] < capj * 0.3) { const m = this.pop[i] * 0.004; this.pop[i] -= m; this.pop[j] += m; this._carry(i, j, m); }
      }
    }

    plagueD += this._epidemics(y);
    this._aggregate();
    this._cities();
    this._trade(y);
    this._resources();
    this._economy();
    this._economyB(y);
    this._religion(y);
    this._peoples(y);
    this._renameCities(y);
    this._government(y);
    this._rulers(y);
    this._diplomacy(y);
    this._research(y);
    this._stability(y);
    warD += this._warfare(y);
    this._expansion(y);
    this._contact(y);
    this._famineLog(y);
    this._families(y);
    this.totals.famine += famineD; this.totals.war += warD; this.totals.plague += plagueD;
    this._record(famineD, warD, plagueD);
  }

  // ---------- climate ----------
  _climate(y) {
    const w = this.weather, rng = this.rng;
    for (let b = 0; b < w.length; b++) w[b] = 0.45 * w[b] + 0.075 * rng.normal();
    let volc = 0;
    for (const v of this.sched.volcanoes) if (v.hit && y >= v.year && y < v.year + v.years) volc += v.hit * (1 - (y - v.year) / v.years * 0.5);
    let era = 0;
    for (const [a, b, an] of this.sched.eras) if (y >= a && y <= b) era += an;
    this.globalAnom = era - volc;
    for (let i = 0; i < this.N; i++) {
      const al = Math.abs(this.lat[i]);
      const eraF = this.lat[i] > 0 ? (al > 30 ? 1 : 0.3) : 0.4;
      const c = 1 + w[this.block[i]] + era * eraF - volc * (0.4 + al / 60);
      this.climate[i] = Math.max(0.35, Math.min(1.3, c));
    }
  }

  _scheduled(y) {
    for (const v of [...this.sched.volcanoes, ...this.sched.quakes]) {
      if (v.year !== y) continue;
      if (v.at) {
        const c = this._nearest(v.at[0], v.at[1]);
        const d = this.pop[c] * v.local; this.pop[c] -= d; this.totals.disaster += d;
        this._log('disaster', `${v.name}: ${fmt(d)} dead in ${this._where(c)}.`, { cell: c, ry: v.ry, deaths: d });
      } else this._log('climate', `${v.name}. Harvests fail across the northern world.`, { ry: v.ry });
    }
    for (const e of this.sched.epidemics) if (e.year === y) this._startEpidemic(e.name, e.at ? this._nearest(e.at[0], e.at[1]) : this._busyCity(), e.mort, e.reach, e.ry);
  }
  _where(c) { const o = this.owner[c]; return o >= 0 ? this.polities[o].name : `the lands of the ${this._tribeName(c)}`; }
  _tribeName(c) { const parts = NAME_PARTS[this.culture[c]] || NAME_PARTS.latin; const r = makeRng(c * 7919 + 13); const s = parts[0][r.int(parts[0].length)]; return s + (parts[2].length ? parts[2][r.int(parts[2].length)] : '') + ' peoples'; }

  // ---------- epidemics ----------
  _startEpidemic(name, cell, mort, reach, ry, pox = false) {
    const e = { name, mort, reach, pox, start: this.year, hit: new Set([cell]), front: [cell], deaths: 0, ry };
    this.epidemics.push(e);
    this._log('plague', `${name} breaks out in ${this._where(cell)}.`, { cell, ry });
  }
  _epidemics(y) {
    let total = 0;
    const rng = this.rng, hops = Math.max(1, Math.round(this.sK * 1.5));
    for (const e of this.epidemics) {
      if (!e.front.length) continue;
      for (let h = 0; h < hops && e.front.length; h++) {
        // deaths in newly infected provinces
        for (const c of e.front) {
          const fx = this.cellFx[c];
          const dens = this.pop[c] / Math.max(1, this.area[c]);
          let m = e.mort * (0.35 + 0.65 * Math.min(1, Math.sqrt(dens / 15))) * fx.plague;
          if (e.pox) m *= fx.pox * (this.nw[c] ? 1 : 0.15);
          m = Math.min(0.8, m * (0.8 + 0.4 * rng.next()));
          const d = this.pop[c] * m;
          this.pop[c] -= d; e.deaths += d; total += d; this.plagueHit[c] += m;
          if (this.owner[c] >= 0) this.polities[this.owner[c]].plagueDeaths += d;
        }
        // spread (mountains slow it)
        const next = [];
        const blocked = (a, b) => this.contactYear === null && this.nw[a] !== this.nw[b];
        for (const c of e.front) {
          const tryInfect = (j, p) => {
            if (e.hit.has(j) || blocked(c, j) || this.pop[j] < 500 / this.K) return;
            const dens = this.pop[j] / Math.max(1, this.area[j]);
            if (rng.next() < p * (1 - 0.5 * this.rough[j]) * Math.min(1, 0.3 + dens / 10)) { e.hit.add(j); next.push(j); }
          };
          for (const j of this.nb[c]) tryInfect(j, e.reach);
          for (const j of this.sl[c]) tryInfect(j, e.reach * 0.6);
          const tr = this.routeAt && this.routeAt.get(c); if (tr) for (const j of tr) tryInfect(j, e.reach * 0.7);
          if (e.reach > 0.8 && this.cellFx[c].trade && rng.next() < 0.3) {
            const j = rng.int(this.N); if (this.cellFx[j].trade) tryInfect(j, 1);
          }
        }
        e.front = next;
      }
      if (!e.front.length || y - e.start > 25) {
        e.front = [];
        this._log('plague', `${e.name} burns out after ${y - e.start + 1} years. ${fmt(e.deaths)} dead.`, { deaths: e.deaths, ry: e.ry, big: e.deaths > 1e6 });
      }
    }
    return total;
  }

  // ---------- states: totals ----------
  _aggregate() {
    for (const p of this.polities) { p.cells = 0; p.pop = 0; p.urban = 0; p.neighbours = new Set(); p.over = 0; p.farmland = 0; p.foreign = 0; p.faithPop = 0; }
    for (let i = 0; i < this.N; i++) {
      const o = this.owner[i]; if (o < 0) continue;
      const p = this.polities[o];
      p.cells++; p.pop += this.pop[i]; p.urban += this.pop[i] * this.urban[i];
      if (p.capital >= 0) { if (this.ppl && !this.opts.xOldForeign) { const a = this.ppl[i], R = this.ppl[p.capital]; if (a !== R) { const A = this.peoples[a], B = this.peoples[R]; p.foreign += this.pop[i] * (A.branch === B.branch ? 0.3 : A.family === B.family ? 0.65 : 1); } } else if (this.culture[i] !== this.culture[p.capital]) p.foreign += this.pop[i]; }
      if (this.rel && this.rel[i] === p.rel) p.faithPop += this.pop[i];
      for (const j of this.nb[i]) { const q = this.owner[j]; if (q >= 0 && q !== o) p.neighbours.add(q); }
      if (p.fx.sea) for (const j of this.sl[i]) { const q = this.owner[j]; if (q >= 0 && q !== o) p.neighbours.add(q); }
      if (p.capital >= 0) {
        const reach = 5 + p.fx.stateCap / 8;
        const d = this.distDeg(i, p.capital) / 2;
        if (d > reach) p.over += (d - reach) / reach;
      }
    }
    for (const p of this.polities) {
      if (!p.alive) continue;
      if (p.cells === 0) { this._endPolity(p, 'vanishes'); continue; }
      if (p.capital < 0 || this.owner[p.capital] !== p.id) this._newCapital(p);
      const nomad = p.nomad && !p.fx.noNomad ? 2.2 : 1;
      p.soldiers = p.pop * (p.fx.industry ? 0.03 : 0.012) * (0.5 + p.stability) * (this._focus(p.id) === 'army' ? 1.4 : 1) * (p.broke ? 0.7 : 1);
      p.army = p.soldiers * p.fx.mil * nomad * this._rulerFx(p).mil * (p.resFx ? p.resFx.mil : 1) * (p.nomad && p.resFx && !p.resFx.horses ? 0.6 : 1);
      p.peakPop = Math.max(p.peakPop, p.pop); p.peakCells = Math.max(p.peakCells, p.cells);
    }
  }
  _newCapital(p) {
    let best = -1, bp = -1;
    for (let i = 0; i < this.N; i++) if (this.owner[i] === p.id && this.pop[i] > bp) { bp = this.pop[i]; best = i; }
    p.capital = best;
  }
  _endPolity(p, how) {
    if (!p.alive) return;
    p.alive = false; p.ended = this.year;
    for (let i = 0; i < this.N; i++) if (this.owner[i] === p.id) { this.owner[i] = -1; }
    for (const w of this.wars) if (!w.end && (w.a === p.id || w.b === p.id)) this._endWar(w, 'ends with the fall of ' + p.name);
    if (p.peakPop > 2e6 || this.year - p.founded > 150) this._log('fall', `${p.name} ${how} after ${this.year - p.founded} years.`, { pol: p.id, big: p.peakPop > 10e6 });
  }

  // ---------- technology ----------
  _research(y) {
    const rng = this.rng;
    // own research capacity: towns x knowledge techs x stability
    for (const p of this.polities) {
      if (!p.alive) continue;
      const U = p.urban / 1e6;
      p.ownRp = 0.4 * Math.pow(Math.max(U, 0.001), 0.8) * p.fx.research * Math.pow(1.025, p.fx.known) * (0.4 + p.stability) * (this.opts.researchSpeed || 1.15) * (this._focus(p.id) === 'science' ? 1.35 : 1) * this._govFx(p).research * this._rulerFx(p).research * (p.resFx ? p.resFx.research : 1) * (p.instFx ? p.instFx.research : 1) * (1 + Math.min(0.25, Math.max(0, p.treasury || 0) / ((p.income || 0) * 30 + 1)));
    }
    for (const p of this.polities) {
      if (!p.alive) continue;
      const fx = p.fx;
      // diffusion from neighbours
      const nbTech = new Uint8Array(NT);
      for (const q of new Set([...p.neighbours, ...(p.tradePartners || [])])) { if (this.contactYear === null && this.nw[this.polities[q].capital] !== this.nw[p.capital]) continue; const t = this.polities[q].tech; for (let k = 0; k < NT; k++) if (t[k]) nbTech[k] = 1; }
      for (let k = 0; k < NT; k++) {
        if (p.tech[k] || !nbTech[k] || !this._prereqs(p.tech, k) || !this._crossOK(p, k)) continue;
        if (rng.next() < 0.035 * (1 + fx.trade) * (0.5 + p.stability)) this._learn(p, k, 'adopts');
      }
      // own research
      // ideas cross borders between literate neighbours (more so once both print books)
      let spill = 0;
      if (p.tech[T.writing]) for (const q of p.neighbours) {
        const Q = this.polities[q]; if (!Q.alive || !Q.tech[T.writing]) continue;
        if (this.contactYear === null && this.nw[Q.capital] !== this.nw[p.capital]) continue;
        spill += (Q.ownRp || 0) * (p.tech[T.printing] && Q.tech[T.printing] ? 0.5 : 0.25);
      }
      const rp = p.ownRp + spill;
      p.rp += rp; p.rpRate = rp;
      if (this.opts.forceHistory) continue;
      // every possible tech advances at once; knowing a neighbour has it makes it 3x easier
      if (!p.prog) p.prog = new Float32Array(NT);
      for (let k = 0; k < NT; k++) {
        if (p.tech[k] || TECHS[k].noResearch || !this._prereqs(p.tech, k)) continue;
        p.prog[k] += rp * (nbTech[k] ? 3 : 1);
        if (p.prog[k] >= TECHS[k].cost) this._learn(p, k, 'invents');
      }
    }
    if (this.opts.forceHistory) {
      const alive = this.polities.filter(p => p.alive && !this.nw[p.capital]);
      const lead = alive.reduce((a, p) => (!a || p.rpRate > a.rpRate ? p : a), null);
      this.leadRp = (this.leadRp || []); this.leadRp.push([y, lead ? lead.rpRate : 0, lead ? lead.name : '']);
      for (let k = 0; k < NT; k++) if (TECHS[k].ry === y && !TECHS[k].noResearch && lead) {
        for (const id of TECHS[k].pre || []) if (!lead.tech[T[id]]) this._learn(lead, T[id], 'invents');
        this._learn(lead, k, 'invents');
      }
    }
    // tribes: folk techs drift between neighbouring cells
    for (let i = 0; i < this.N; i++) {
      if (this.owner[i] >= 0 || this.pop[i] < 100) continue;
      const bits = this.cellTech[i];
      const j = this.rng.pick(this.nb[i]); if (j === undefined) continue;
      if (this.contactYear === null && this.nw[i] !== this.nw[j]) continue;
      const nb = this.cellTech[j];
      for (let k = 0; k < NT; k++) if (!bits[k] && nb[k] && TECHS[k].folk && this._prereqs(bits, k) && this.rng.next() < 0.04 * this.sK) { bits[k] = 1; this.fxDirty[i] = 1; }
    }
  }
  _crossOK(p, k) { return k !== T.new_world_crops || this.contactYear !== null || this.nw[p.capital]; }
  _prereqs(bits, k) { const pre = TECHS[k].pre; if (!pre) return true; for (const id of pre) if (!bits[T[id]]) return false; return true; }
  _pickTarget(p) {
    const opts = [];
    for (let k = 0; k < NT; k++) if (!p.tech[k] && !TECHS[k].noResearch && this._prereqs(p.tech, k)) opts.push(k);
    if (!opts.length) return -1;
    if (this.rng.next() < 0.7) return opts.reduce((a, k) => (TECHS[k].ry < TECHS[a].ry ? k : a), opts[0]);
    let tot = 0; const w = opts.map(k => { const v = 1 / Math.pow(TECHS[k].cost + 50, 2); tot += v; return v; });
    let r = this.rng.next() * tot;
    for (let i = 0; i < opts.length; i++) { r -= w[i]; if (r <= 0) return opts[i]; }
    return opts[opts.length - 1];
  }
  _learn(p, k, how) {
    p.tech[k] = 1; p.fx = this._fxOf(p.tech);
    const t = TECHS[k];
    if (!(t.id in this.firstTech)) {
      this.firstTech[t.id] = { year: this.year, by: p.name };
      if (t.ry > -500) {
        const diff = this.year - t.ry;
        const cmp = diff === 0 ? 'the same year as in our world' : `${Math.abs(diff)} years ${diff < 0 ? 'earlier' : 'later'} than in our world`;
        this._log('tech', `${p.name} ${how === 'invents' ? 'invents' : 'is first with'} ${t.name}, ${cmp} (${t.ry}).`, { pol: p.id, tech: t.id, big: true });
      }
    }
  }

  // ---------- stability, collapse, independence ----------
  _stability(y) {
    const rng = this.rng;
    for (const p of this.polities) {
      if (!p.alive) continue;
      const famineShare = p.famineDeaths / Math.max(1, p.pop), plagueShare = p.plagueDeaths / Math.max(1, p.pop);
      const target = 0.8 - Math.min(0.5, p.over / Math.max(1, p.cells) * 1.5) - 0.1 * Math.max(0, Math.log(p.cells / this.K / (30 + p.fx.stateCap * 0.8))) - Math.min(0.4, p.wars * 0.06) - (p.foreign / Math.max(1, p.pop)) * (p.tech[T.printing] ? 0.25 : 0.08) + (this._focus(p.id) === 'stability' ? 0.12 : 0) + this._govFx(p).stab + this._rulerFx(p).stab + Math.min(0.1, (y - p.founded) / 1500) + (p.legitBase || 0) * Math.max(0, 1 - (y - 1) / 600) + (p.overlord != null ? -0.04 : 0) + (p.instFx ? p.instFx.stab : 0) + (p.worksFx ? p.worksFx.stab : 0) - (this.rel ? (1 - p.faithPop / Math.max(1, p.pop)) * 0.15 : 0);
      p.stability += 0.06 * (target - p.stability) - famineShare * 3 - plagueShare * 1.2 - p.warLoss;
      if (rng.next() < 0.02) p.stability -= 0.1 + rng.next() * 0.15; // succession trouble
      p.stability = Math.max(0, Math.min(1, p.stability));
      p.famineDeaths = 0; p.plagueDeaths = 0; p.warLoss = 0;
      if (p.stability < 0.3 && p.cells >= 4 * this.K && rng.next() < 0.3) this._fragment(p);
    }
  }
  _fragment(p) {
    const rng = this.rng, cells = [];
    for (let i = 0; i < this.N; i++) if (this.owner[i] === p.id) cells.push(i);
    const k = Math.min(4, 1 + Math.floor(cells.length / this.K / 30));
    const made = [];
    for (let n = 0; n < k; n++) {
      const cand = cells.filter(c => this.owner[c] === p.id && c !== p.capital);
      if (!cand.length) break;
      // peoples of another culture break away first (nationalism); otherwise the far provinces go
      const ident = this.ppl || this.culture, capCul = ident[p.capital], byCul = new Map();
      const kin = c => this.ppl && this.peoples[this.ppl[c]].branch === this.peoples[capCul].branch;
      for (const c of cand) if (ident[c] !== capCul && !kin(c)) byCul.set(ident[c], (byCul.get(ident[c]) || 0) + this.pop[c]);
      let seed, sameCulture = null;
      if (byCul.size && rng.next() < (p.tech[T.printing] ? 0.85 : 0.5)) {
        sameCulture = [...byCul.entries()].sort((a, b) => b[1] - a[1])[0][0];
        const pool = cand.filter(c => ident[c] === sameCulture).sort((a, b) => this.pop[b] - this.pop[a]);
        seed = pool[0];
      } else {
        cand.sort((a, b) => this.distDeg(b, p.capital) - this.distDeg(a, p.capital));
        seed = cand[Math.floor(rng.next() * Math.min(cand.length, 1 + cand.length / 3))];
      }
      const size = sameCulture !== null ? cells.length : Math.max(1, Math.floor(cells.length * (0.15 + rng.next() * 0.25)));
      const culture = this.culture[seed];
      const q = this._newPolity(sameCulture !== null && this.ppl ? this._peopleStateName(this.peoples[sameCulture]) : this._genName(culture), culture, null, p.nomad);
      if (this.ppl) q.people = this.ppl[seed];
      q.tech.set(p.tech); q.prog.set(p.prog); q.fx = p.fx; q.stability = 0.55; q.capital = seed; q.rel = this.rel ? this.rel[seed] : -1; q.gov = p.gov === 'empire' ? 'kingdom' : p.gov;
      const queue = [seed]; this.owner[seed] = q.id; let got = 1;
      while (queue.length && got < size) {
        const c = queue.shift();
        for (const j of this.nb[c]) if (this.owner[j] === p.id && j !== p.capital && got < size && (sameCulture === null || ident[j] === sameCulture)) { this.owner[j] = q.id; queue.push(j); got++; }
      }
      made.push(q);
    }
    p.stability = 0.45;
    if (made.length) this._log('split', `Civil war breaks ${p.name} apart: ${made.map(q => q.name).join(', ')} ${made.length > 1 ? 'break' : 'breaks'} away.`, { pol: p.id, big: p.pop > 5e6 });
  }

  // ---------- war ----------
  _warfare(y) {
    const rng = this.rng; let deaths = 0;
    this.warZone.fill(0);
    for (const p of this.polities) p.wars = 0;
    for (const w of this.wars) if (!w.end) { this.polities[w.a].wars++; this.polities[w.b].wars++; }
    // declarations
    for (const p of this.polities) {
      if (!p.alive || p.wars >= 2 || p.cells < 2 || p.overlord != null) continue;
      const rf = this._rulerFx(p);
      if (rng.next() > 0.045 * p.aggression * rf.aggr * this._govFx(p).aggr * ({ army: 1.8, expansion: 1.3, stability: 0.4, science: 0.7 }[this._focus(p.id)] || 1) * (0.4 + p.stability)) continue;
      let best = null, bs = 0;
      for (const qid of p.neighbours) {
        const q = this.polities[qid];
        if (!q.alive || this.atWarWith(p.id, q.id) || this.allied(p.id, q.id) || q.overlord === p.id || p.overlord === q.id) continue;
        if (this.inTruce(p.id, q.id) && !(rf.aggr > 1.5 && rng.next() < 0.1)) continue;
        const holy = this.faiths && p.rel >= 0 && q.rel >= 0 ? (p.rel === q.rel ? 0.7 : this.faiths[p.rel].universal && this.faiths[q.rel].universal ? 1.4 * rf.holy : 1) : 1;
        const qAl = this.allianceOf(q.id), allyArmy = qAl ? [...qAl.members].reduce((s, m) => s + (m !== q.id ? this.polities[m].army * 0.5 : 0), 0) : 0;
        const demPeace = p.gov === 'democracy' && q.gov === 'democracy' ? 0.1 : 1;
        const s = p.army / ((q.army + allyArmy) * q.fx.defense + 1) * (1.6 - q.stability) * holy * demPeace;
        if (s > bs) { bs = s; best = q; }
      }
      if (best && bs > 0.9 + rng.next() * 0.8) {
        this._declare(p, best);
      }
    }
    // fighting
    for (let wi = 0; wi < this.wars.length; wi++) {
      const w = this.wars[wi];
      if (w.end) continue;
      const A = this.polities[w.a], B = this.polities[w.b];
      if (!A.alive || !B.alive) { this._endWar(w, ''); continue; }
      const ratio = (A.army || 0) / ((B.army || 0) * B.fx.defense + 1);
      const front = [], back = [];
      for (let i = 0; i < this.N; i++) {
        if (this.owner[i] === w.b && this.nb[i].some(j => this.owner[j] === w.a)) front.push(i);
        else if (this.owner[i] === w.a && this.nb[i].some(j => this.owner[j] === w.b)) back.push(i);
      }
      const nA = Math.floor(front.length * Math.max(0, Math.min(0.6, this.sK * ((ratio - 0.85) * 0.22 + (rng.next() - 0.5) * 0.25))));
      const nB = Math.floor(back.length * Math.max(0, Math.min(0.6, this.sK * ((1 / Math.max(ratio, 0.01) - 0.85) * 0.22 + (rng.next() - 0.5) * 0.25))));
      const flip = (cells, n, to) => {
        for (let k = 0; k < n && cells.length; k++) {
          let pick = rng.int(cells.length);
          if (rng.next() < this.rough[cells[pick]]) pick = rng.int(cells.length);   // mountains hold out longer
          if (rng.next() < this.rough[cells[pick]] * 0.7) continue;
          const c = cells.splice(pick, 1)[0];
          let loss = this.pop[c] * 0.04;
          const ck = this.cityAt[c];
          if (ck >= 0 && this.cities[ck].alive && this.cities[ck].pop > 5e4) {
            const ct = this.cities[ck]; loss += ct.pop * 0.15; ct.sacked++;
            if (ct.pop > 2e5) this._log('sack', `${this.polities[to].name} sacks ${this.cityLabel(ct)}.`, { cell: c, pol: to, deaths: ct.pop * 0.15, big: ct.pop > 5e5 });
          }
          this.pop[c] -= loss; w.deaths += loss; deaths += loss;
          this.granary[c] = 0; this.soil[c] = Math.max(0.35, this.soil[c] - 0.05); this.warHit[c] = 1;
          this.owner[c] = to;
          if (this.ppl && this.polities[to].nomad && this.polities[to].capital >= 0) this._mixIn(c, this.ppl[this.polities[to].capital], 0.1);
        }
      };
      for (const c of front) this.warZone[c] = wi + 1;
      for (const c of back) this.warZone[c] = wi + 1;
      flip(front, nA, w.a); flip(back, nB, w.b);
      w.taken += (nA - nB) / this.K;
      const fight = Math.min(A.soldiers || 0, B.soldiers || 0) * (0.05 + 0.03 * rng.next()) * (1 + 0.45 * Math.log(Math.sqrt(A.fx.mil * B.fx.mil)));
      w.deaths += fight; deaths += fight;
      A.pop -= fight / 2; B.pop -= fight / 2;
      this._spreadLoss(w.a, fight / 2); this._spreadLoss(w.b, fight / 2);
      A.warLoss += 0.01 + nB * 0.015 / this.K; B.warLoss += 0.01 + nA * 0.015 / this.K;
      w.exA += 0.05 + fight / Math.max(1, A.pop) * 12 + nB * 0.02 / this.K; w.exB += 0.05 + fight / Math.max(1, B.pop) * 12 + nA * 0.02 / this.K;
      // nuclear weapons
      if (A.fx.bomb && B.fx.bomb && (w.exA > 1 || w.exB > 1 || this.owner[A.capital] !== w.a || this.owner[B.capital] !== w.b) && rng.next() < 0.004) this._nuclear(w, A, B);
      // capital taken
      if (this.owner[B.capital] === w.a) {
        B.stability -= 0.3;
        if (B.cells < w.startCellsB * 0.35 || B.cells <= 3 * this.K) { this._annex(A, B); this._endWar(w, `${A.name} conquers ${B.name}`); continue; }
        this._newCapital(B);
      }
      if (rng.next() < 0.04 + 0.25 * Math.min(w.exA, w.exB) + 0.3 * Math.max(0, Math.max(w.exA, w.exB) - 1.2)) this._endWar(w, '');
    }
    return deaths;
  }
  _spreadLoss(pid, d) {
    const p = this.polities[pid]; if (p.pop <= 0) return;
    const f = d / (p.pop + d);
    for (let i = 0; i < this.N; i++) if (this.owner[i] === pid) this.pop[i] *= 1 - f;
  }
  _nuclear(w, A, B) {
    const cities = [];
    for (let i = 0; i < this.N; i++) if (this.owner[i] === w.b || this.owner[i] === w.a) cities.push(i);
    cities.sort((a, b) => this.pop[b] - this.pop[a]);
    let d = 0;
    for (const c of cities.slice(0, Math.round(6 * this.K))) { const k = this.pop[c] * 0.12; this.pop[c] -= k; d += k; }
    w.deaths += d; w.nuclear = true;
    this._log('nuclear', `Nuclear weapons are used in the ${w.name}. ${fmt(d)} dead.`, { big: true, deaths: d });
  }
  _annex(A, B) {
    for (let i = 0; i < this.N; i++) if (this.owner[i] === B.id) this.owner[i] = A.id;
    this._endPolity(B, 'is conquered');
  }
  _annexQuiet(A, B) { for (let i = 0; i < this.N; i++) if (this.owner[i] === B.id) this.owner[i] = A.id; B.alive = false; B.ended = this.year; for (const w of this.wars) if (!w.end && (w.a === B.id || w.b === B.id)) { w.end = this.year; if (this.warPairs) this._warEnded(w); } }
  _endWar(w, how) {
    if (w.end) return;
    w.end = this.year;
    if (this.truces) { this._warEnded(w); this._afterPeace(w); }
    const A = this.polities[w.a], B = this.polities[w.b];
    if (w.deaths > 50000 || how) {
      const km = Math.round(Math.abs(w.taken) * this.cellArea * this.K / 1000) * 1000;
      const res = how || (w.taken > 1 ? `${A.name} takes about ${km.toLocaleString('en')} km²` : w.taken < -1 ? `${B.name} takes about ${km.toLocaleString('en')} km²` : 'no real winner');
      this._log('peace', `${w.name} ends (${w.start}–${this.year}): ${res}. ${fmt(w.deaths)} dead.`, { deaths: w.deaths, big: w.deaths > 1e6 });
    }
  }
  _short(n) { return n.replace(/^(Kingdom|Republic|Principality|Duchy|Emirate|League|Realm|Shahdom|Altepetl|Chiefdom|Empire|Federation|Holy State|People's Republic) of /, '').replace(/ (Empire|Dynasty|Kingdom|Khaganate|Khanate|Horde|Caliphate|Sultanate|Confederacy|Confederation|Emirate|Republic|Theocracy|State)$/, '').replace(/^(Later|Northern|Southern) /, ''); }

  // ---------- growth of states ----------
  _expansion(y) {
    const rng = this.rng;
    // states absorb neighbouring tribal land
    for (let i = 0; i < this.N; i++) {
      if (this.owner[i] >= 0) continue;
      let best = -1;
      for (const j of this.nb[i]) { const o = this.owner[j]; if (o >= 0 && (best < 0 || this.polities[o].army > this.polities[best].army)) best = o; }
      if (best < 0) continue;
      const p = this.polities[best];
      const reach = 5 + (p.fx.stateCap + (p.worksFx ? p.worksFx.cap : 0)) / 8, d = this.distDeg(i, p.capital) / 2;
      const steppe = p.nomad && this.pastureY[i] < 1.2 && this.arable[i] < 3000;
      const prob = (1 - this.rough[i]) * this.sK * (this._focus(p.id) === 'expansion' ? 2.5 : 1) * 0.006 * (0.3 + p.stability) * (d < reach ? 1 : 0.1) * (steppe ? 2.5 : 1) * (this.pop[i] / this.area[i] > 20 ? 0.4 : 1) * (steppe || p.fx.stateCap > 150 ? 1 : Math.min(1, this.pop[i] * this.K / 2e5)) + (p.fx.stateCap > 150 ? 0.03 * this.sK : 0);
      if (rng.next() < prob) this.owner[i] = best;
    }
    // tiny states get swallowed by much stronger neighbours
    for (const B of this.polities) {
      if (!B.alive || B.cells > 6 * this.K || rng.next() > 0.02 + 0.0002 * B.fx.stateCap) continue;
      let A = null;
      for (const q of B.neighbours) { const P = this.polities[q]; if (P.alive && P.army > 4 * B.army && (!A || P.army > A.army)) A = P; }
      if (A) { if (B.pop > 1e6) this._log('annex', `${A.name} absorbs ${B.name}.`, { pol: A.id }); this._annexQuiet(A, B); }
    }
    // new states form where tribal farmland gets crowded
    for (let n = 0; n < 4 * this.K; n++) {
      const i = rng.int(this.N);
      if (this.owner[i] >= 0 || !this.cellTech[i][T.agriculture]) continue;
      const dens = this.pop[i] / Math.max(1, this.area[i]);
      if (dens < 10 || rng.next() > 0.3) continue;
      let near = 0; for (const j of this.nb[i]) if (this.owner[j] < 0) near += this.pop[j];
      if ((near + this.pop[i]) * this.sK < 4e5) continue;
      const culture = this.culture[i];
      const nomad = this.pastureY[i] < 1.2 && this.arable[i] < 2500 && this.cellTech[i][T.horses];
      const p = this._newPolity(this.ppl && rng.next() < 0.5 ? this._peopleStateName(this.peoples[this.ppl[i]]) : this._genName(culture), culture, null, nomad);
      if (this.ppl) p.people = this.ppl[i];
      p.tech.set(this.cellTech[i]); p.fx = this._fxOf(p.tech); p.capital = i; p.stability = 0.65; p.rel = this.rel ? this.rel[i] : -1;
      this.owner[i] = p.id;
      const queue = [i]; let got = 1, lim = Math.round((2 + rng.int(6)) * this.K);
      while (queue.length && got < lim) {
        const c = queue.shift();
        for (const j of this.nb[c]) if (this.owner[j] < 0 && this.pop[j] > 1000 / this.K && got < lim) { this.owner[j] = p.id; queue.push(j); got++; }
      }
      if (this.pop[i] > 3e5) this._log('rise', `${p.name} rises among the ${this._tribeName(i)}.`, { pol: p.id });
    }
  }

  // ---------- ocean contact and colonies ----------
  _contact(y) {
    const rng = this.rng;
    const sailors = this.polities.filter(p => p.alive && p.fx.ocean);
    if (!sailors.length) return;
    if (this.contactYear === null && rng.next() < 0.12) {
      const p = sailors.reduce((a, q) => (q.pop > a.pop ? q : a), sailors[0]);
      const nwCoast = []; for (let i = 0; i < this.N; i++) if (this.nw[i] && this.coastal[i] && this.pop[i] > 1000) nwCoast.push(i);
      const c = rng.pick(nwCoast);
      this.contactYear = y;
      this._log('contact', `${p.name} ships reach the far side of the ocean. The two halves of the world meet, ${y - 1492 >= 0 ? (y - 1492) + ' years after' : (1492 - y) + ' years before'} Columbus in our world.`, { cell: c, pol: p.id, big: true, ry: '1492' });
      p.tech[T.new_world_crops] = 1; p.fx = this._fxOf(p.tech);
      this.owner[c] = p.id;
      this._startEpidemic('Smallpox in the New World', c, 0.45, 0.8, '1520-1600: 50-90% of native Americans die', true);
      this.poxWaves = [y + 18, y + 40, y + 65];
    }
    if (this.poxWaves && this.poxWaves[0] === y) {
      this.poxWaves.shift();
      const cand = []; for (let i = 0; i < this.N; i++) if (this.nw[i] && this.pop[i] > 2000) cand.push(i);
      if (cand.length) this._startEpidemic('New smallpox wave', rng.pick(cand), 0.25, 0.7, null, true);
    }
    if (this.contactYear === null) return;
    // colonies: ocean powers grab weaker coasts far away
    for (const p of sailors) {
      if (rng.next() > Math.min(0.9, 0.18 * this.sK * (0.4 + p.stability))) continue;
      const myKnown = p.fx.known;
      for (let tries = 0; tries < 12; tries++) {
        const c = rng.int(this.N);
        if (!this.coastal[c] || this.owner[c] === p.id) continue;
        const o = this.owner[c];
        const theirKnown = o >= 0 ? this.polities[o].fx.known : this.cellFx[c].known;
        if (theirKnown > myKnown * 0.6) continue;
        const prev = o >= 0 ? this.polities[o].name : null;
        this.owner[c] = p.id;
        if (rng.next() < 0.15) this._log('colony', `${p.name} plants a colony in ${prev || 'the lands of the ' + this._tribeName(c)}.`, { pol: p.id, cell: c });
        break;
      }
    }
  }

  _famineLog(y) {
    const by = new Map();
    for (let i = 0; i < this.N; i++) if (this.famine[i] > 0) { const o = this.owner[i]; by.set(o, (by.get(o) || 0) + this.famine[i]); }
    for (const [o, d] of by) {
      const popRef = o >= 0 ? this.polities[o].pop : 1e9;
      if (d > 2e5 && d > popRef * 0.01) this._log('famine', `Famine in ${o >= 0 ? this.polities[o].name : 'tribal lands'}: ${fmt(d)} starve.`, { pol: o, deaths: d, big: d > 3e6 });
    }
  }

  // ---------- councils (rule-based or LLM) ----------
  _focus(pid) { if (pid < 0) return null; const p = this.polities[pid]; return p && p.policy ? p.policy.focus : null; }
  councilMembers(n = 5) { return this.polities.filter(p => p.alive && p.id !== this.playerId && p.cells >= 3 * this.K).sort((a, b) => b.pop - a.pop).slice(0, n); }
  brief(p) {
    const rank = this.polities.filter(q => q.alive && q.pop > p.pop).length + 1;
    let fed = 0, cells = 0, fam = 0;
    for (let i = 0; i < this.N; i++) if (this.owner[i] === p.id) { fed += this.nour[i] * this.pop[i]; cells++; fam += this.famine[i]; }
    fed /= Math.max(1, p.pop);
    const wars = this.wars.filter(w => !w.end && (w.a === p.id || w.b === p.id)).map(w => {
      const e = this.polities[w.a === p.id ? w.b : w.a];
      const winning = (w.a === p.id ? w.taken : -w.taken);
      return `${e.name} (since ${w.start}, ${winning > 0 ? 'we are winning' : winning < 0 ? 'we are losing' : 'stalemate'}, ${fmt(w.deaths)} dead so far)`;
    });
    const nbs = [...p.neighbours].map(q => this.polities[q]).filter(q => q.alive).sort((a, b) => b.army - a.army).slice(0, 6)
      .map(q => { const r = q.army / Math.max(1, p.army); return `${q.name}: army ${r < 1 ? Math.round(r * 100) + '% of ours' : r.toFixed(1) + 'x ours'}, stability ${Math.round(q.stability * 100)}%, ${q.fx.known} technologies`; });
    const known = TECHS.filter((t, k) => p.tech[k]).map(t => t.name);
    const recent = this.events.filter(e => e.y > this.year - 40 && e.type !== 'start' && (e.pol === p.id || (e.text && e.text.includes(p.name)))).slice(-6).map(e => `${e.y}: ${e.text}`);
    const best = this.polities.filter(q => q.alive).reduce((a, q) => (q.fx.known > a ? q.fx.known : a), 0);
    return [
      `State: ${p.name}, founded ${p.founded}. Year now: ${this.year}.`,
      this.ppl ? (() => { const t = new Map(); for (let i = 0; i < this.N; i++) if (this.owner[i] === p.id) t.set(this.ppl[i], (t.get(this.ppl[i]) || 0) + this.pop[i]); const top = [...t].sort((a, b) => b[1] - a[1]).slice(0, 4); const R = this.ppl[p.capital]; return `Peoples: ${top.map(([q, n]) => `${this.peoples[q].name} ${Math.round(n / Math.max(1, p.pop) * 100)}%${q === R ? ' (ruling people)' : ''}`).join(', ')}. Peoples other than the ruling one may rise up, especially when the state is weak, at war or of another faith.`; })() : '',
      `Population ${fmt(p.pop)} (rank ${rank} in the world), ${p.cells} provinces, ${Math.round(p.urban / Math.max(1, p.pop) * 100)}% live in towns.`,
      `Stability ${Math.round(p.stability * 100)}% (healthy states usually sit at 60-75%; below 30% risks civil war). Food: people are fed at ${Math.round(fed * 100)}% of need${fam > 0 ? `, ${fmt(fam)} starved this year` : ''}.`,
      `Government: ${(GOVS[p.gov] || GOVS.kingdom).label}. State faith: ${p.rel >= 0 ? this.faiths[p.rel].name : 'none'} (${Math.round(p.faithPop / Math.max(1, p.pop) * 100)}% of people share it). Treasury: ${p.treasury > 0 ? 'in surplus' : p.broke ? 'deep in debt' : 'tight'}; trade with ${(p.tradePartners || new Set()).size} foreign states.`,
      p.ruler ? `Ruler: ${this._rulerTitle(p)}, age ${p.ruler.age}, ${p.ruler.traits.map(t => TRAITS[t].label).join(' and ')}, of the House of ${p.ruler.dynasty}, reigning since ${p.ruler.since}.` : '',
      `Alliance: ${(() => { const al = this.allianceOf(p.id); return al ? al.name + ' with ' + [...al.members].filter(m => m !== p.id).map(m => this.polities[m].name).join(', ') : 'none'; })()}.${p.overlord != null ? ` We are a vassal of ${this.polities[p.overlord].name} and pay it tribute.` : ''}${(() => { const v = this.polities.filter(q => q.alive && q.overlord === p.id).map(q => q.name); return v.length ? ` Our vassals: ${v.join(', ')}.` : ''; })()}`,
      (() => { const t = [...p.neighbours].filter(q => this.inTruce(p.id, q)).map(q => this.polities[q].name); return t.length ? `Truces in force (breaking one is dishonourable): ${t.join(', ')}.` : ''; })(),
      `Army strength ${fmt(p.army)}. Technologies known: ${p.fx.known} (world best: ${best}). Latest: ${known.slice(-5).join(', ')}.`,
      `Wars: ${wars.length ? wars.join('; ') : 'none'}.`,
      `Neighbours: ${nbs.length ? nbs.join('; ') : 'none'}.`,
      recent.length ? `Recent events: ${recent.join(' | ')}` : '',
      p.policy ? `Previous priority: ${p.policy.focus}.` : '',
    ].filter(Boolean).join('\n');
  }
  ruleDecision(p) {
    const rng = this.rng;
    let fed = 0; for (let i = 0; i < this.N; i++) if (this.owner[i] === p.id) fed += this.nour[i] * this.pop[i];
    fed /= Math.max(1, p.pop);
    const losing = this.wars.some(w => !w.end && ((w.a === p.id && w.taken < -2) || (w.b === p.id && w.taken > 2)));
    const best = this.polities.filter(q => q.alive).reduce((a, q) => (q.fx.known > a ? q.fx.known : a), 0);
    let focus;
    if (losing) focus = 'army'; else if (fed < 0.95) focus = 'farming'; else if (p.stability < 0.4) focus = 'stability';
    else if (p.fx.known < best - 3) focus = 'science';
    else focus = rng.pick(['science', 'trade', 'farming', p.aggression > 1 ? 'expansion' : 'stability', p.aggression > 1.2 ? 'army' : 'science']);
    let war = null;
    if (focus === 'army' || focus === 'expansion') {
      const t = [...p.neighbours].map(q => this.polities[q]).filter(q => q.alive && q.army * 1.4 < p.army).sort((a, b) => a.army - b.army)[0];
      if (t && rng.next() < 0.5) war = t.name;
    }
    return { focus, war_target: war, peace_with: losing ? this.wars.filter(w => !w.end && (w.a === p.id || w.b === p.id)).map(w => this.polities[w.a === p.id ? w.b : w.a].name) : [], statement: '' };
  }
  applyDecision(p, d, source = 'rules') {
    const FOCI = ['science', 'farming', 'army', 'expansion', 'stability', 'trade'];
    const focus = FOCI.includes(d.focus) ? d.focus : 'stability';
    p.policy = { focus, since: this.year, source, statement: d.statement || '' };
    const find = name => name && [...p.neighbours].map(q => this.polities[q]).find(q => q.alive && q.name.toLowerCase() === String(name).toLowerCase());
    for (const n of d.peace_with || []) {
      const q = find(n); if (!q) continue;
      const w = this.wars.find(w => !w.end && ((w.a === p.id && w.b === q.id) || (w.b === p.id && w.a === q.id)));
      if (w) this._endWar(w, `${p.name} makes peace`);
    }
    const t = find(d.war_target);
    let warText = '';
    if (t && p.overlord == null && !this.atWarWith(p.id, t.id)) {
      const al = this.allianceOf(p.id); if (al && al.members.has(t.id)) { this._alDirty = true; al.members.delete(p.id); warText = ` and betrays the ${al.name}`; }
      this._declare(p, t, '', true);
      warText += ` and declares war on ${t.name}`;
      this.truces.delete([p.id, t.id].sort((a, b) => a - b).join(':'));
    }
    if (d.leave_alliance) { const al = this.allianceOf(p.id); if (al) { this._alDirty = true; al.members.delete(p.id); warText += ` and leaves the ${al.name}`; } }
    if (d.alliance_with) {
      const cands = new Set([...p.neighbours]); for (const q of p.neighbours) for (const r of this.polities[q].neighbours) cands.add(r);
      const q = [...cands].map(k => this.polities[k]).find(Q => Q.alive && Q.id !== p.id && Q.name.toLowerCase() === String(d.alliance_with).toLowerCase());
      if (q && !this.atWarWith(p.id, q.id) && q.overlord == null && !this.allied(p.id, q.id)) {
        // the other side accepts if it is not hostile and gains from it
        if (this.rng.next() < (q.rel === p.rel ? 0.8 : 0.5)) { this._ally(p, q, null, ' at the council\'s proposal'); warText += ` and allies with ${q.name}`; }
        else warText += ` and asks ${q.name} for an alliance, which is refused`;
      }
    }
    const label = { science: 'learning', farming: 'farming and granaries', army: 'the army', expansion: 'expansion', stability: 'order at home', trade: 'trade' }[focus];
    this._log('council', `${p.name}'s council chooses ${label}${warText}.${d.statement ? ` "${d.statement}"` : ''}`, { pol: p.id, source, why: d.reasoning || '', big: !!warText || source === 'llm' });
    p.policy.reasoning = d.reasoning || '';
  }
  // ---------- player actions (any time) ----------
  playerDeclareWar(p, q) { if (!p.alive || !q.alive || this.atWarWith(p.id, q.id)) return false; const al = this.allianceOf(p.id); if (al && al.members.has(q.id)) { this._alDirty = true; al.members.delete(p.id); } this.truces.delete([p.id, q.id].sort((a, b) => a - b).join(':')); this._declare(p, q); return true; }
  playerOfferPeace(p, q) {
    const w = this.wars.find(w => !w.end && ((w.a === p.id && w.b === q.id) || (w.b === p.id && w.a === q.id))); if (!w) return 'no war';
    const theirEx = w.a === q.id ? w.exA : w.exB, theirSide = w.a === q.id ? 1 : -1, winning = w.taken * theirSide > 1;
    const ratio = q.army / Math.max(1, p.army);
    const pAccept = Math.max(0.05, Math.min(0.95, 0.25 + theirEx * 0.5 - (winning ? 0.3 : 0) - (ratio > 1.5 ? 0.2 : 0)));
    if (this.rng.next() < pAccept) { this._endWar(w, `${q.name} accepts ${p.name}'s offer of peace`); return 'accepted'; }
    this._log('peace', `${q.name} rejects ${p.name}'s offer of peace.`, { pol: p.id }); return 'rejected';
  }
  playerProposeAlliance(p, q) {
    if (this.atWarWith(p.id, q.id) || this.allied(p.id, q.id) || q.overlord != null) return 'impossible';
    const pAccept = (q.rel === p.rel ? 0.55 : 0.3) + (q.gov === p.gov ? 0.1 : 0) + Math.min(0.25, p.army / Math.max(1, q.army) * 0.1);
    if (this.rng.next() < pAccept) { const n = this.alliances.length; this._ally(p, q, null, ''); return this.allianceOf(p.id) && this.allianceOf(p.id).members.has(q.id) ? 'accepted' : 'impossible'; }
    this._log('alliance', `${q.name} turns down ${p.name}'s offer of alliance.`, { pol: p.id }); return 'rejected';
  }
  playerLeaveAlliance(p) { const al = this.allianceOf(p.id); if (!al) return false; this._alDirty = true; al.members.delete(p.id); this._log('alliance', `${p.name} leaves the ${al.name}.`, { pol: p.id }); return true; }

  holdCouncilWithRules(n = 5) { for (const p of this.councilMembers(n)) this.applyDecision(p, this.ruleDecision(p), 'rules'); }

  // ---------- blind mode: shocks at random dates and places instead of our timeline ----------
  _blindSchedule(seed) {
    const r = makeRng(seed * 7919 + 1013), out = { epidemics: [], volcanoes: [], quakes: [], eras: [], prophets: [] };
    const poisson = (rate, from, to, fn) => { for (let y = from; y <= to; y++) if (r.next() < rate) fn(y); };
    const pest = ['Great Pestilence', 'Red Fever', 'Sweating Sickness', 'Black Cough', 'Spotted Plague', 'Wasting Fever', 'Grey Death', 'River Fever'];
    poisson(1 / 170, 60, 2026, y => out.epidemics.push({ year: y, name: `${r.pick(pest)} of ${y}`, mort: Math.min(0.42, 0.02 + Math.pow(r.next(), 2.2) * (y < 1850 ? 0.42 : 0.04)), reach: 0.4 + r.next() * 0.5 }));
    poisson(1 / 280, 2, 2026, y => { const hit = 0.03 + Math.pow(r.next(), 1.8) * 0.14; out.volcanoes.push({ year: y, hit, years: 2 + (hit > 0.1 ? 1 : 0), name: `A great eruption darkens the sky (${y})` }); });
    poisson(1 / 600, 2, 2026, y => out.quakes.push({ year: y, at: [-180 + r.next() * 360, -40 + r.next() * 100], local: 0.005 + r.next() * 0.06, name: 'A great earthquake' }));
    for (let k = 0; k < 2; k++) { const a = 200 + r.int(1600), len = 150 + r.int(400); out.eras.push([a, a + len, (r.next() < 0.5 ? -1 : 1) * (0.02 + r.next() * 0.03)]); }
    poisson(1 / 380, 5, 1900, y => out.prophets.push({ year: y, miss: 0.35 + r.next() * 0.8, conquest: r.next() < 0.3 ? 1 : 0, color: `hsl(${r.int(360)},55%,65%)` }));
    return out;
  }
  _busyCity() {
    const c = this.topCities(30); if (!c.length) return this.rng.int(this.N);
    return this.rng.pick(c).cell;
  }

  // ---------- cities ----------
  cityLabel(ct) { return ct.site >= 0 ? cityName(CITY_SITES[ct.site], this.year) : ct.name; }
  _cities(init = false) {
    const big = this.year < 1800 ? 1e6 : 1e7;
    init = init || this.year <= 3;
    const capBonus = new Float64Array(this.N);
    for (const p of this.polities) if (p.alive && p.capital >= 0) capBonus[p.capital] = p.urban * 0.15;
    for (let i = 0; i < this.N; i++) {
      const u = this.pop[i] * this.urban[i] + capBonus[i];
      let k = this.cityAt[i];
      if (k < 0) {
        if (u < (this.siteAt[i] >= 0 ? 25000 : 60000)) continue;
        const site = this.siteAt[i];
        const ct = { cell: i, site, name: site >= 0 ? null : this._cityName(this.culture[i]), founded: this.year, pop: u, peak: u, alive: true, sacked: 0, million: false };
        k = this.cities.push(ct) - 1; this.cityAt[i] = k;
        continue;
      }
      const ct = this.cities[k];
      ct.pop = u; if (u > ct.peak) ct.peak = u;
      if (!ct.alive && u > 30000) { ct.alive = true; }
      if (ct.alive && u < 6000) { ct.alive = false; if (ct.peak > 2e5 && !init) this._log('city', `${this.cityLabel(ct)} is abandoned; it once held ${fmt(ct.peak)} people.`, { cell: i }); }
      if (!ct.million && u >= big) { ct.million = true; if (!init) this._log('city', `${this.cityLabel(ct)} becomes a city of ${big >= 1e7 ? 'ten million' : 'a million'}.`, { cell: i, big: !this.firstMillion }); this.firstMillion = true; }
    }
  }
  _cityName(culture) {
    const parts = NAME_PARTS[culture] || NAME_PARTS.latin, rng = this.rng;
    for (let t = 0; t < 10; t++) {
      let n = parts[1].length ? rng.pick(parts[0]) + rng.pick(parts[1]) + rng.pick(parts[2]) : rng.pick(parts[0]) + rng.pick(['an', 'ling', 'zhou', 'yang', 'du', 'ping']);
      n = n.charAt(0).toUpperCase() + n.slice(1);
      if (!this.cities.some(c => c.name === n)) return n;
    }
    return 'New ' + rng.pick(parts[0]);
  }
  topCities(n = 40) { return this.cities.filter(c => c.alive).sort((a, b) => b.pop - a.pop).slice(0, n); }

  // ---------- bookkeeping ----------
  _log(type, text, extra = {}) { this.events.push({ y: this.year, type, text, ...extra }); }
  worldPop() { let s = 0; for (let i = 0; i < this.N; i++) s += this.pop[i]; return s; }
  _largest() { return this.polities.filter(p => p.alive).sort((a, b) => b.pop - a.pop); }
  _record(famineD, warD, plagueD) {
    let pop = 0, urb = 0, dr = 0;
    for (let i = 0; i < this.N; i++) { pop += this.pop[i]; urb += this.pop[i] * this.urban[i]; }
    const alive = this.polities.filter(p => p.alive);
    const lead = alive.reduce((a, p) => (p.fx && (!a || p.fx.known > a.fx.known) ? p : a), null);
    this.history.push({ y: this.year, pop, urban: urb / Math.max(1, pop), states: alive.length,
      wars: this.wars.filter(w => !w.end).length, famine: famineD, war: warD, plague: plagueD,
      techLead: lead ? lead.fx.known : 0, techLeader: lead ? lead.name : '' });
    // every 5 years: a line per state, and the world's faiths and language families
    if (this.year % 5 === 0 || this.year <= 1) {
      for (const p of alive) (p.hist || (p.hist = [])).push([this.year, Math.round(p.pop), p.cells, Math.round(p.army || 0), p.fx ? p.fx.known : 0, Math.round(p.treasury || 0), +(p.urban / Math.max(1, p.pop)).toFixed(3), +p.stability.toFixed(2)]);
      if (this.year % 10 === 0 || this.year <= 1) {
        const f = {}; if (this.rel) for (let i = 0; i < this.N; i++) { const r = this.rel[i]; if (r >= 0) f[r] = (f[r] || 0) + this.pop[i]; }
        const fam = {}; if (this.ppl) for (let i = 0; i < this.N; i++) { const q = this.peoples[this.ppl[i]].family; fam[q] = (fam[q] || 0) + this.pop[i]; }
        (this.shareHist || (this.shareHist = [])).push({ y: this.year, faith: f, fam });
      }
    }
  }
  run(toYear, cb) { while (this.year < toYear) { this.step(); cb && cb(this); } }
  summary() {
    const wars = this.wars.filter(w => w.end || true);
    return {
      seed: this.seed, year: this.year, pop: this.worldPop(), states: this.polities.filter(p => p.alive).length,
      deaths: { ...this.totals }, contactYear: this.contactYear, firstTech: this.firstTech,
      biggestWar: wars.reduce((a, w) => (!a || w.deaths > a.deaths ? w : a), null),
      warsOver1M: wars.filter(w => w.deaths > 1e6).length, nuclearWars: wars.filter(w => w.nuclear).length,
    };
  }
  cellInfo(i) {
    const o = this.owner[i], fx = this.cellFx[i];
    const { farm, past } = this._landFood(i);
    return {
      i, lat: this.lat[i], lon: this.lon[i], owner: o >= 0 ? this.polities[o] : null, tribe: o < 0 ? this._tribeName(i) : null,
      culture: this.culture[i], pop: this.pop[i], density: this.pop[i] / Math.max(1, this.area[i]), area: this.area[i],
      nour: this.nour[i], prod: this.prod[i], granary: this.granary[i], soil: this.soil[i], climate: this.climate[i],
      fish: this.fish[i], fishK: this.fishK[i], urban: this.urban[i], arable: this.arable[i], farmCap: farm, pastureCap: past,
      river: this.geo.cells[i].rn, elev: this.elev[i], faith: this.faiths ? this.faiths[this.rel[i]].name : '', resources: RES.filter((r, k) => this.res && (this.res[i] & (1 << k))),
      city: this.cityAt[i] >= 0 && this.cities[this.cityAt[i]].alive ? this.cityLabel(this.cities[this.cityAt[i]]) : null, techs: TECHS.filter((t, k) => this.cellTech[i][k]).map(t => t.name), known: fx.known,
    };
  }
}
installSystems(World);
installPolitics(World);
installFamilies(World);
installPeoples(World);
installWhatIf(World);
installEconomy(World);
installMarkets(World);
World.prototype._rngFactory = makeRng;
