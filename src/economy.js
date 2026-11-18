// Stage B: economy and society.
// Crops and animals that spread on their own (the Columbian exchange as real movement),
// grain prices and silver, social classes and institutions, class revolts, and big works.
import { TECH_INDEX as T } from './scenario.js';

const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(2) + ' billion' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : n >= 1e3 ? Math.round(n / 1e3) + ',000' : String(Math.round(n));

// suitability from the climate fractions [water, tropical, arid, temperate, continental, polar] and latitude
const land = f => Math.max(1e-6, 1 - f[0]);
export const CROPS = [
  { id: 'wheat', name: 'wheat', world: 'old', staple: true, suit: (f, lat) => (f[3] * (Math.abs(lat) > 25 ? 1 : 0.4) + 0.8 * f[4] + 0.3 * f[2]) / land(f), bonus: 0.10 },
  { id: 'barley', name: 'barley', world: 'old', staple: true, suit: (f, lat) => (f[3] + f[4] + 0.4 * f[2] + 0.3 * f[5]) / land(f), bonus: 0.04 },
  { id: 'rice', name: 'rice', world: 'old', staple: true, suit: (f, lat) => (0.9 * f[1] + f[3] * (Math.abs(lat) < 36 ? 1 : 0.1)) / land(f), bonus: 0.07 },
  { id: 'millet', name: 'millet and sorghum', world: 'old', staple: true, suit: (f, lat) => (0.8 * f[1] + 0.7 * f[2] + 0.6 * f[3]) / land(f), bonus: 0.03 },
  { id: 'maize', name: 'maize', world: 'new', staple: true, suit: (f, lat) => (0.9 * f[1] + f[3] + 0.5 * f[4] + 0.2 * f[2]) / land(f), bonus: 0.13 },
  { id: 'potato', name: 'potatoes', world: 'new', staple: true, suit: (f, lat) => (f[3] * (Math.abs(lat) > 35 ? 1 : 0.35) + f[4] + 0.3 * f[5]) / land(f), bonus: 0.22 },
  { id: 'cassava', name: 'cassava', world: 'new', staple: true, suit: (f, lat) => (f[1] + 0.2 * f[3] * (Math.abs(lat) < 30 ? 1 : 0)) / land(f), bonus: 0.18 },
  { id: 'sweetpotato', name: 'sweet potatoes', world: 'new', staple: true, suit: (f, lat) => (0.8 * f[1] + 0.6 * f[3] * (Math.abs(lat) < 40 ? 1 : 0.2)) / land(f), bonus: 0.08 },
  { id: 'sugar', name: 'sugar cane', world: 'old', cash: true, suit: (f, lat) => f[1] / land(f) * (Math.abs(lat) < 30 ? 1 : 0) },
  { id: 'cotton', name: 'cotton', world: 'both', cash: true, suit: (f, lat) => (0.7 * f[1] + 0.6 * f[3] * (Math.abs(lat) < 38 ? 1 : 0) + 0.4 * f[2]) / land(f) },
  { id: 'tea', name: 'tea', world: 'old', cash: true, suit: (f, lat) => (f[3] * (Math.abs(lat) < 34 && Math.abs(lat) > 8 ? 1 : 0) + 0.5 * f[1]) / land(f) },
  { id: 'coffee', name: 'coffee', world: 'old', cash: true, suit: (f, lat) => f[1] / land(f) * (Math.abs(lat) < 25 ? 1 : 0) },
  { id: 'cacao', name: 'cacao', world: 'new', cash: true, suit: (f, lat) => f[1] / land(f) * (Math.abs(lat) < 18 ? 1 : 0) },
  { id: 'tobacco', name: 'tobacco', world: 'new', cash: true, suit: (f, lat) => (0.7 * f[1] + 0.8 * f[3]) / land(f) },
  { id: 'cattle', name: 'cattle', world: 'old', animal: true, suit: (f, lat) => (0.6 * f[1] + 0.6 * f[2] + f[3] + 0.8 * f[4]) / land(f), pasture: 0.18 },
  { id: 'sheep', name: 'sheep and goats', world: 'old', animal: true, suit: (f, lat) => (0.4 * f[1] + f[2] + f[3] + 0.8 * f[4] + 0.3 * f[5]) / land(f), pasture: 0.12 },
  { id: 'horse', name: 'horses', world: 'old', animal: true, suit: (f, lat) => (0.3 * f[1] + 0.8 * f[2] + f[3] + f[4]) / land(f), pasture: 0.05 },
  { id: 'camel', name: 'camels', world: 'old', animal: true, suit: (f, lat) => f[2] / land(f), pasture: 0.15 },
  { id: 'llama', name: 'llamas', world: 'new', animal: true, suit: (f, lat) => (f[5] + 0.3 * f[2]) / land(f), pasture: 0.04 },
];
export const CB = Object.fromEntries(CROPS.map((c, k) => [c.id, 1 << k]));
const inBox = (lon, lat, b) => lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3];
// where each crop grows in year 1 (Old World crops in the Old World, New World crops in the Americas)
const HOMES = {
  wheat: [[-12, 25, 92, 58]], barley: [[-12, 12, 105, 62]], rice: [[68, -10, 150, 42], [43, 25, 70, 40]], millet: [[-18, -20, 125, 48]],
  maize: [[-125, -35, -35, 45]], potato: [[-80, -40, -63, 5]], cassava: [[-82, -25, -35, 15]], sweetpotato: [[-100, -25, -35, 25], [140, -50, 180, 20]],
  sugar: [[68, -10, 125, 30], [140, -12, 180, 0]], cotton: [[60, 5, 90, 30], [25, 10, 40, 32], [-120, -30, -35, 33]], tea: [[95, 20, 122, 33]], coffee: [[33, 4, 46, 18]],
  cacao: [[-100, 0, -75, 22]], tobacco: [[-125, -35, -35, 50]],
  cattle: [[-18, -35, 150, 65]], sheep: [[-18, -35, 150, 65]], horse: [[-12, 15, 140, 60]], camel: [[-18, 12, 120, 50]], llama: [[-80, -40, -63, 5]],
};
// big works by kind
const WORKS = {
  wall: { label: 'wall', years: [25, 60], cost: 0.8, icon: '▬' }, canal: { label: 'canal', years: [15, 40], cost: 0.7, icon: '≈' },
  road: { label: 'road network', years: [20, 40], cost: 0.5, icon: '┼' }, port: { label: 'harbour', years: [8, 20], cost: 0.4, icon: '⚓' },
  temple: { label: 'great temple', years: [15, 50], cost: 0.5, icon: '⌂' }, palace: { label: 'palace', years: [8, 20], cost: 0.6, icon: '♜' },
  pyramid: { label: 'pyramid', years: [30, 80], cost: 0.7, icon: '▲' }, railway: { label: 'railway', years: [10, 25], cost: 1.0, icon: '═' },
  dam: { label: 'great dam', years: [6, 15], cost: 1.0, icon: '▣' },
};
export const WORK_ICONS = Object.fromEntries(Object.entries(WORKS).map(([k, v]) => [k, v.icon]));
const CLASS_W = { nobles: 30, clergy: 5, merchants: 10, artisans: 2, peasants: 1, serfs: 0.6, slaves: 0.3, workers: 1.6, middle: 4, professionals: 8 };
export const CLASS_LABEL = { nobles: 'nobles', clergy: 'clergy', merchants: 'merchants', artisans: 'artisans', peasants: 'free peasants', serfs: 'serfs', slaves: 'slaves', workers: 'workers', middle: 'middle class', professionals: 'professionals' };
export const INST_LABEL = { serfdom: 'serfdom', slavery: 'slavery', guilds: 'guilds', property: 'secure property rights', votes: 'votes for all', unions: 'trade unions', welfare: 'welfare state' };

export function installEconomy(World) {
  const P = World.prototype;

  P._ecoInit = function () {
    const N = this.N, cs = this.geo.cells;
    this.crops = new Uint32Array(N); this.cropF = new Float32Array(N).fill(1); this.pastF = new Float32Array(N).fill(1);
    this.suit = CROPS.map(cr => Float32Array.from(cs, c => Math.max(0, Math.min(1, cr.suit(c.f, c.lat)))));
    for (let i = 0; i < N; i++) {
      const c = cs[i];
      CROPS.forEach((cr, k) => { if (this.suit[k][i] > 0.15 && HOMES[cr.id].some(b => inBox(c.lon, c.lat, b)) && (cr.world === 'both' || (cr.world === 'new') === !!this.nw[i])) this.crops[i] |= 1 << k; });
      this._cropFx(i);
    }
    this.cropFirst = {};
    this.silver = 1; this.priceLevel = 1; this.priceHist = [];
    this.works = [];
    for (const p of this.polities) this._instInit(p);
  };
  // yield and pasture multipliers from what grows here, relative to year 1 (so year 1 is unchanged)
  P._cropFx = function (i) {
    const c = this.crops[i], nw = this.nw[i];
    let f = nw ? 1.25 : 1, pf = 1;   // the Americas start with maize, as before
    CROPS.forEach((cr, k) => {
      if (!(c & (1 << k))) return;
      const foreign = cr.world !== 'both' && (cr.world === 'new') !== !!nw;
      if (!foreign) return;
      if (cr.staple) f += cr.bonus * this.suit[k][i];
      if (cr.animal) pf += cr.pasture * this.suit[k][i] * (nw ? 2 : 1);
    });
    this.cropF[i] = Math.min(1.7, f); this.pastF[i] = Math.min(1.8, pf);
  };
  P.cropsHere = function (i) { return CROPS.filter((cr, k) => this.crops[i] & (1 << k)).map(cr => cr.name); };

  P._instInit = function (p) {
    p.inst = p.inst || {};
    if (p.gov === 'empire' || ['latin', 'greek', 'persian', 'sinitic', 'arabic', 'indic', 'egyptian'].includes(p.culture)) p.inst.slavery = this.year;
  };

  P._economyB = function (y) {
    if (!this.crops) return;
    if (y % 5 === 0) this._cropSpread(y);
    this._prices(y);
    if (y % 5 === 0) { for (const p of this.polities) if (p.alive) { this._institutions(p, y); this._classes(p); } }
    for (const p of this.polities) if (p.alive && p.classes) this._unrest(p, y);
    this._works(y);
    if (this._finance) this._finance(y);
    if (y % 5 === 0 && this._markets) this._markets(y);
  };

  // ---- crops and animals spread to neighbours where they grow; across the ocean only after contact ----
  P._cropSpread = function (y) {
    const N = this.N, r = this.rng, add = [];
    for (let i = 0; i < N; i++) {
      if (this.pop[i] < 500) continue;
      for (const j of this.nb[i]) {
        const have = this.crops[j] & ~this.crops[i]; if (!have) continue;
        if (this.nw[i] !== this.nw[j] && this.contactYear === null) continue;
        for (let k = 0; k < CROPS.length; k++) if (have & (1 << k) && this.suit[k][i] > 0.2 && r.next() < 0.05 * this.suit[k][i] * (this.cellTech[i][T.agriculture] ? 1 : 0.2)) add.push(i, k);
      }
    }
    // the Columbian exchange: empires and trade routes carry crops across the oceans
    if (this.contactYear !== null) {
      for (const p of this.polities) {
        if (!p.alive || p.cells < 2) continue;
        let nwc = -1, owc = -1;
        for (let n = 0; n < 6; n++) { const i = this._randomCellOf(p); if (i < 0) break; if (this.nw[i]) nwc = i; else owc = i; }
        if (nwc >= 0 && owc >= 0) { const [a, b] = r.next() < 0.5 ? [nwc, owc] : [owc, nwc]; const have = this.crops[a] & ~this.crops[b]; for (let k = 0; k < CROPS.length; k++) if (have & (1 << k) && this.suit[k][b] > 0.2 && r.next() < 0.5) add.push(b, k); }
      }
      for (const rt of this.routes || []) {
        if (this.nw[rt.a] === this.nw[rt.b] || r.next() > 0.15) continue;
        for (const [a, b] of [[rt.a, rt.b], [rt.b, rt.a]]) { const have = this.crops[a] & ~this.crops[b]; for (let k = 0; k < CROPS.length; k++) if (have & (1 << k) && this.suit[k][b] > 0.2 && r.next() < 0.3) add.push(b, k); }
      }
    }
    for (let n = 0; n < add.length; n += 2) {
      const i = add[n], k = add[n + 1];
      if (this.crops[i] & (1 << k)) continue;
      this.crops[i] |= 1 << k; this._cropFx(i);
      const cr = CROPS[k], o = this.owner[i];
      // the first time a crop crosses to the other half of the world is worth a line in the chronicle
      if (cr.world !== 'both' && (cr.world === 'new') !== !!this.nw[i] && !this.cropFirst[cr.id]) {
        this.cropFirst[cr.id] = y;
        this._log('tech', `${cr.name[0].toUpperCase() + cr.name.slice(1)} from the ${cr.world === 'new' ? 'Americas' : 'Old World'} ${cr.animal ? 'are' : 'is'} first ${cr.animal ? 'raised' : 'grown'} in ${o >= 0 ? this.polities[o].name : this._where(i)}.`, { cell: i, big: cr.staple || cr.animal });
      }
    }
  };
  P._randomCellOf = function (p) {
    if (p.capital < 0) return -1;
    let c = p.capital;
    for (let s = 0; s < 40; s++) { const nb = this.nb[c].filter(j => this.owner[j] === p.id); if (!nb.length) break; c = nb[this.rng.int(nb.length)]; if (this.rng.next() < 0.05) break; }
    // colonies far away: sometimes jump to any owned cell
    if (this.rng.next() < 0.4) { for (let t = 0; t < 30; t++) { const i = this.rng.int(this.N); if (this.owner[i] === p.id) return i; } }
    return c;
  };

  // ---- grain prices: hunger drives them up, silver from new mines drives all prices up ----
  P._prices = function (y) {
    // new silver: gold/silver deposits in the Americas worked by Old World powers after contact, plus slow mining everywhere
    let mined = 0;
    if (this.contactYear !== null && this.res) for (let i = 0; i < this.N; i++) if (this.nw[i] && this.res[i] & (1 << 6)) { const o = this.owner[i]; if (o >= 0 && this.polities[o].capital >= 0 && !this.nw[this.polities[o].capital]) mined += 1; }
    this.silver += 0.0006 + mined * 0.002 / this.K;
    const pop = this.history.length ? this.history.at(-1).pop : 2e8;
    const target = Math.pow(this.silver, 0.6) / Math.pow(Math.max(1, pop / 2.2e8), 0.25);
    this.priceLevel += 0.05 * (target - this.priceLevel);
    if (y % 10 === 0) { this.priceHist.push([y, +this.priceLevel.toFixed(3)]); const old = this.priceHist.find(h => h[0] === y - 60); if (old && this.priceLevel > old[1] * 1.9 && !this._priceRevLogged) { this._priceRevLogged = y; this._log('famine', `Prices across the world have doubled in sixty years as silver from new mines floods the markets.`, { big: true }); } }
    for (const p of this.polities) {
      if (!p.alive) continue;
      let fed = 0, n = 0; const N = this.N;
      // sample the state's provinces for speed
      if (p.capital >= 0) { fed += this.nour[p.capital] * this.pop[p.capital]; n += this.pop[p.capital]; }
      for (let s = 0; s < 8; s++) { const i = this._randomCellOfFast(p); if (i >= 0) { fed += this.nour[i] * this.pop[i]; n += this.pop[i]; } }
      const nour = n > 0 ? fed / n : 1;
      // prices answer to how fed people are compared with the last few decades
      p.nourBase = p.nourBase ? p.nourBase * 0.97 + nour * 0.03 : nour;
      const raw = Math.max(0.4, Math.min(12, Math.pow(Math.max(0.3, p.nourBase) / Math.max(0.3, nour), 4))) * this.priceLevel;
      p.grainPrice = (p.grainPrice || 1) * 0.6 + raw * 0.4;
      if (p.grainPrice > 2.8 * this.priceLevel && p.pop > 3e6 && !(p.priceLogged > y - 15)) { p.priceLogged = y; this._log('famine', `Bread costs ${Math.round(p.grainPrice / this.priceLevel)} times its usual price in ${p.name}; riots break out in the towns.`, { pol: p.id }); p.stability = Math.max(0, p.stability - 0.03); }
    }
  };
  P._randomCellOfFast = function (p) { for (let t = 0; t < 12; t++) { const i = this.rng.int(this.N); if (this.owner[i] === p.id) return i; } return -1; };

  // ---- institutions appear and are abolished ----
  P._institutions = function (p, y) {
    const r = this.rng, I = p.inst || (p.inst = {}), u = p.urban / Math.max(1, p.pop), g = p.gov, tech = p.tech;
    const free = g === 'democracy' || g === 'republic' || g === 'constitutional';
    const big = p.pop > 5e6;
    const on = (k, why) => { if (I[k]) return; I[k] = y; if (big) this._log('gov', `${p.name} ${why}.`, { pol: p.id }); };
    const off = (k, why) => { if (!I[k]) return; delete I[k]; if (big) this._log('gov', `${p.name} ${why}.`, { pol: p.id, big: p.pop > 20e6 }); };
    if (!I.serfdom && tech[T.heavy_plough] && (g === 'kingdom' || g === 'empire') && u < 0.15 && !tech[T.industry] && r.next() < 0.015) on('serfdom', 'binds its peasants to the land: serfdom takes hold');
    if (I.serfdom && ((tech[T.industry] && r.next() < 0.06) || (tech[T.printing] && u > 0.2 && r.next() < 0.01) || (free && r.next() < 0.05))) off('serfdom', 'abolishes serfdom');
    const colonial = this.contactYear !== null && p.capital >= 0 && !this.nw[p.capital] && p.fx && p.fx.ocean;
    if (!I.slavery && ((g === 'empire' && p.wars && r.next() < 0.004) || (colonial && r.next() < 0.03))) on('slavery', colonial ? 'turns to slave labour on its overseas plantations' : 'fills its fields and mines with war captives: slavery spreads');
    if (I.slavery && ((tech[T.public_education] && free && r.next() < 0.04) || (tech[T.printing] && this.faiths && p.rel >= 0 && this.faiths[p.rel].universal && r.next() < 0.002) || (tech[T.industry] && r.next() < 0.01))) off('slavery', 'abolishes slavery');
    if (!I.guilds && u > 0.12 && !tech[T.industry] && r.next() < 0.02) on('guilds', 'sees its craftsmen organise into guilds');
    if (I.guilds && tech[T.industry] && r.next() < 0.05) off('guilds', 'sweeps away the old guilds as factories rise');
    if (!I.property && tech[T.banking] && free && r.next() < 0.03) on('property', 'guarantees property and contracts in law');
    if (g === 'democracy') on('votes', 'gives every adult the vote'); else if (I.votes && g !== 'democracy') off('votes', 'takes away the vote');
    if (!I.unions && tech[T.industry] && free && r.next() < 0.02) on('unions', 'legalises trade unions');
    if (!I.welfare && tech[T.public_education] && tech[T.electricity] && g === 'democracy' && r.next() < 0.02) on('welfare', 'builds a welfare state: pensions, sick pay and free schools');
    // effects, read by research and stability
    p.instFx = { research: (I.serfdom ? 0.95 : 1) * (I.guilds ? 0.97 : 1) * (I.property ? 1.06 : 1) * (I.slavery && tech[T.industry] ? 0.97 : 1), stab: (I.welfare ? 0.04 : 0) + (I.votes ? 0.02 : 0) };
  };

  // ---- who people are and what they earn ----
  P._classes = function (p) {
    const u = Math.min(0.9, p.urban / Math.max(1, p.pop)), t = p.tech, I = p.inst || {}, g = p.gov;
    const c = {};
    c.nobles = ['democracy', 'republic', 'dictatorship'].includes(g) ? 0.004 : 0.02;
    c.clergy = 0.01 + (g === 'theocracy' ? 0.02 : 0);
    c.merchants = 0.015 + 0.08 * u * (t[T.banking] ? 1.5 : 1);
    c.workers = t[T.industry] ? 0.55 * u : 0;
    c.artisans = 0.5 * u * (t[T.industry] ? 0.25 : 1);
    c.middle = t[T.public_education] ? 0.05 + 0.25 * u : 0;
    c.professionals = t[T.computers] ? 0.1 : t[T.electricity] ? 0.04 : 0;
    c.slaves = I.slavery ? 0.06 : 0;
    c.serfs = I.serfdom ? 0.35 * (1 - u) : 0;
    const used = Object.values(c).reduce((a, b) => a + b, 0);
    c.peasants = Math.max(0.02, 1 - used);
    const tot = Object.values(c).reduce((a, b) => a + b, 0);
    for (const k in c) c[k] /= tot;
    p.classes = c;
    // Gini over the class groups
    const g2 = Object.entries(c).map(([k, s]) => [s, s * CLASS_W[k]]).sort((a, b) => a[1] / a[0] - b[1] / b[0]);
    const inc = g2.reduce((a, [, v]) => a + v, 0); let cum = 0, area = 0;
    for (const [s, v] of g2) { area += s * (cum + v / 2) / inc; cum += v; }
    p.gini = Math.max(0, Math.min(0.9, 1 - 2 * area));
  };

  // ---- grievances build up; class revolts follow ----
  P._unrest = function (p, y) {
    const r = this.rng, I = p.inst || {}, c = p.classes, t = p.tech;
    const hunger = Math.max(0, (p.grainPrice || 1) / this.priceLevel - 1.5) * 0.04;
    const peasant = (c.serfs + c.peasants * 0.3) * (hunger + (I.serfdom ? 0.006 : 0) + Math.max(0, p.gini - 0.45) * 0.02);
    const worker = c.workers * (I.unions ? 0.004 : 0.03) + c.workers * hunger;
    const middle = c.middle * (I.votes ? 0 : 0.03) + c.merchants * (I.property ? 0 : 0.01) * (t[T.printing] ? 1 : 0);
    const slave = c.slaves * 0.02;
    p.unrest = Math.max(0, Math.min(1.5, (p.unrest || 0) * 0.96 + peasant + worker + middle + slave - (I.welfare ? 0.01 : 0)));
    if (p.unrest < 0.5 || r.next() > 0.04 || p.pop < 1e6) return;
    const kind = [['peasants', peasant], ['workers', worker], ['middle', middle], ['slaves', slave]].sort((a, b) => b[1] - a[1])[0][0];
    const win = r.next() < 0.25 + 0.4 * (1 - p.stability);
    let dead = p.pop * (0.002 + r.next() * 0.006);
    for (let n = 0; n < 6; n++) { const i = this._randomCellOfFast(p); if (i >= 0) this.pop[i] = Math.max(0, this.pop[i] - dead / 6); }
    this.totals.war += dead; p.stability = Math.max(0, p.stability - 0.12); p.unrest *= 0.3;
    const big = p.pop > 10e6;
    if (kind === 'peasants') {
      if (win && I.serfdom) { delete I.serfdom; this._log('war', `A great peasant revolt shakes ${p.name}; ${fmt(dead)} die, and the lords give up serfdom.`, { pol: p.id, deaths: dead, big }); }
      else this._log('war', `Peasants rise against their lords in ${p.name}; the revolt is drowned in blood (${fmt(dead)} dead).`, { pol: p.id, deaths: dead, big: big && dead > 1e5 });
    } else if (kind === 'slaves') {
      if (win) { delete I.slavery; this._log('war', `Slaves rise up in ${p.name} and win their freedom; ${fmt(dead)} die.`, { pol: p.id, deaths: dead, big }); }
      else this._log('war', `A slave revolt in ${p.name} is crushed; ${fmt(dead)} die.`, { pol: p.id, deaths: dead });
    } else if (kind === 'workers') {
      if (win && r.next() < 0.4) { const old = p.name; p.gov = r.next() < 0.6 ? 'dictatorship' : 'republic'; p.name = `People's Republic of ${this._short(old)}`; I.unions = y; this._log('gov', `Workers' revolution in ${old}: it becomes the ${p.name}.`, { pol: p.id, big: true }); }
      else if (win) { I.unions = y; this._log('gov', `A wave of strikes forces ${p.name} to legalise trade unions.`, { pol: p.id, big }); }
      else this._log('war', `Strikes in ${p.name} are broken by the army; ${fmt(dead)} die.`, { pol: p.id, deaths: dead });
    } else {
      if (win) { const old = p.name; p.gov = t[T.public_education] ? 'democracy' : r.next() < 0.5 ? 'constitutional' : 'republic'; if (p.gov !== 'constitutional') p.name = `Republic of ${this._short(old)}`; this._log('gov', `Revolution in ${old}: the townsfolk force ${p.gov === 'constitutional' ? 'a constitution on the crown' : 'out the old order, and the ' + p.name + ' is proclaimed'}.`, { pol: p.id, big: true }); }
      else this._log('war', `Townsfolk demanding a say in government are fired on in ${p.name}; ${fmt(dead)} die.`, { pol: p.id, deaths: dead });
    }
  };

  // ---- big works: states with money to spare build ----
  P._works = function (y) {
    const r = this.rng;
    for (const w of this.works) {
      if (w.done || w.abandoned) continue;
      const p = this.polities[w.pol];
      if (!p.alive || this.owner[w.cell] !== p.id) { w.abandoned = y; continue; }
      p.treasury -= w.costYr;
      if ((p.treasury < -p.income * 2 && r.next() < 0.1)) { w.abandoned = y; if (p.pop > 5e6) this._log('gov', `${p.name} runs out of money and abandons ${w.name}.`, { pol: p.id }); continue; }
      if (y >= w.end) { w.done = y; this._workDone(p, w); }
    }
    if (y % 2) return;
    for (const p of this.polities) {
      if (!p.alive || p.capital < 0 || p.pop < 1e6 || p.stability < 0.45 || (p.treasury || 0) < (p.income || 0) * 2 || r.next() > 0.04) continue;
      if (this.works.some(w => w.pol === p.id && !w.done && !w.abandoned)) continue;
      const opts = this._workOptions(p); if (!opts.length) continue;
      const [kind, cell, name] = r.pick(opts), def = WORKS[kind];
      const years = def.years[0] + r.int(def.years[1] - def.years[0]) * (p.tech[T.industry] ? 0.4 : 1) | 0;
      this.works.push({ kind, name, cell, pol: p.id, start: y, end: y + years, costYr: (p.income || 0) * def.cost / Math.max(1, years) * 2.5 });
      if (p.pop > 8e6) this._log('gov', `${p.name} begins ${name}; it will take some ${years} years.`, { pol: p.id, cell });
    }
  };
  P._workOptions = function (p) {
    const t = p.tech, out = [], has = k => this.works.some(w => w.pol === p.id && w.kind === k && w.done && !w.ruined);
    const cap = p.capital, city = this.cityAt[cap] >= 0 ? this.cityLabel(this.cities[this.cityAt[cap]]) : this._short(p.name);
    const short = this._short(p.name);
    // a wall facing nomads
    if (t[T.masonry] && !t[T.firearms] && !has('wall')) {
      const nomadNb = [...p.neighbours].map(q => this.polities[q]).find(q => q.alive && q.nomad);
      if (nomadNb) { let c = -1; for (let i = 0; i < this.N && c < 0; i++) if (this.owner[i] === p.id && this.nb[i].some(j => this.owner[j] === nomadNb.id)) c = i; if (c >= 0) out.push(['wall', c, `the Great Wall of ${short}`]); }
    }
    if ((t[T.water_mills] || t[T.irrigation]) && this.riv[cap] > 0 && !has('canal')) out.push(['canal', cap, `the Grand Canal of ${short}`]);
    if (t[T.roads] && !has('road')) out.push(['road', cap, `the royal roads of ${short}`]);
    if (this.coastal[cap] && t[T.sailing] && !has('port')) out.push(['port', cap, `the harbour of ${city}`]);
    if (p.rel >= 0 && this.faiths && !has('temple')) out.push(['temple', cap, `${this.faiths[p.rel].universal ? 'the great cathedral' : 'the great temple'} of ${city}`]);
    if ((p.gov === 'empire' || p.gov === 'kingdom') && !has('palace')) out.push(['palace', cap, `the palace of ${city}`]);
    if (['mesoamerican', 'maya', 'egyptian', 'andean'].includes(p.culture) && !t[T.printing] && !has('pyramid')) out.push(['pyramid', cap, `the great pyramid of ${city}`]);
    if (t[T.railways] && !has('railway')) out.push(['railway', cap, `the ${short} railway`]);
    if (t[T.electricity] && this.riv[cap] > 0 && !has('dam')) out.push(['dam', cap, `the ${short} dam`]);
    return out;
  };
  P._workDone = function (p, w) {
    const fx = p.worksFx || (p.worksFx = { stab: 0, trade: 1, cap: 0, wall: 0, food: 1 });
    if (w.kind === 'wall') fx.wall = 1;
    else if (w.kind === 'canal') { fx.trade *= 1.08; fx.food *= 1.05; }
    else if (w.kind === 'road' || w.kind === 'railway') fx.cap += w.kind === 'road' ? 15 : 40;
    else if (w.kind === 'port') fx.trade *= 1.1;
    else if (w.kind === 'dam') fx.food *= 1.06;
    else fx.stab = Math.min(0.08, fx.stab + 0.025);
    if (p.pop > 3e6) this._log('city', `${p.name} completes ${w.name}${w.kind === 'pyramid' || w.kind === 'temple' || w.kind === 'palace' ? ', the pride of its people' : ''}.`, { pol: p.id, cell: w.cell, big: p.pop > 30e6 && ['wall', 'canal', 'pyramid'].includes(w.kind) });
  };
}

// ---------------- markets: goods, prices, trade by value, taxes and debt ----------------
export const GOODS = ['grain', 'livestock', 'fish', 'cloth', 'metal', 'timber', 'wine', 'silk', 'spices', 'porcelain', 'plantation goods', 'coal', 'oil', 'manufactures'];
const G = Object.fromEntries(GOODS.map((g, k) => [g, k]));
const LUX = new Set([G.wine, G.silk, G.spices, G.porcelain, G['plantation goods']]);
export function installMarkets(World) {
  const P = World.prototype;
  P._markets = function (y) {
    const N = this.N, NG = GOODS.length, np = this.polities.length;
    const S = new Float64Array(np * NG), D = new Float64Array(np * NG);
    const cs = this.geo.cells, bit = id => 1 << CROPS.findIndex(c => c.id === id);
    const cotton = bit('cotton'), sheep = bit('sheep'), sugar = bit('sugar') | bit('coffee') | bit('tea') | bit('tobacco') | bit('cacao');
    for (let i = 0; i < N; i++) {
      const o = this.owner[i]; if (o < 0) continue;
      const pop = this.pop[i]; if (pop < 100) continue;
      const p = this.polities[o], b = o * NG, u = this.urban[i], f = cs[i].f, cul = this.culture[i], t = this.cellTech[i], res = this.res ? this.res[i] : 0, crops = this.crops[i];
      const town = pop * u, rich = 1 + (p.fx && p.fx.industry ? 2 : 0);
      // supply
      S[b + G.grain] += this.prod[i] * 0.8;
      S[b + G.livestock] += this.pastureA[i] * this.pastureY[i] * this.pastF[i] * 0.2;
      S[b + G.fish] += this.fish[i] * 0.04;
      S[b + G.cloth] += town * 0.25 * (crops & (cotton | sheep) ? 1 : 0.3);
      S[b + G.metal] += (res & 1 || res & 2 ? Math.sqrt(pop) * 30 : 0);
      S[b + G.timber] += this.area[i] * (f[3] + f[4] + f[1] * 0.5) * 20;
      if (Math.abs(cs[i].lat) > 28 && Math.abs(cs[i].lat) < 47 && f[3] > 0.3 && (cul === 'latin' || cul === 'greek' || cul === 'persian' || cul === 'celtic' || cul === 'germanic')) S[b + G.wine] += pop * 0.02;
      if (cul === 'sinitic' || cul === 'korean' || cul === 'japanese') S[b + G.silk] += pop * 0.012;
      if (f[1] > 0.4 && this.coastal[i] && cs[i].lon > 70 && cs[i].lon < 135 && cs[i].lat < 22) S[b + G.spices] += pop * 0.02;
      if (cul === 'sinitic' && t[T.paper]) S[b + G.porcelain] += town * 0.05;
      if (crops & sugar) S[b + G['plantation goods']] += pop * 0.01 * (p.inst && p.inst.slavery ? 3 : 1);
      if (res & 16 && t[T.steam_engine]) S[b + G.coal] += Math.sqrt(pop) * 60;
      if (res & 32 && t[T.combustion]) S[b + G.oil] += Math.sqrt(pop) * 60;
      if (t[T.industry]) S[b + G.manufactures] += town * 0.4;
      // demand
      D[b + G.grain] += pop * 0.8; D[b + G.livestock] += pop * 0.1; D[b + G.fish] += pop * 0.03;
      D[b + G.cloth] += pop * 0.08; D[b + G.metal] += pop * 0.01 * rich; D[b + G.timber] += pop * 0.05;
      for (const g of LUX) D[b + g] += town * 0.012 * rich;
      if (t[T.steam_engine]) D[b + G.coal] += town * 0.3;
      if (t[T.combustion]) D[b + G.oil] += pop * 0.05;
      D[b + G.manufactures] += t[T.industry] || this.contactYear ? town * 0.2 : 0;
    }
    // supplies are scaled once, when a good first appears, so that the world starts near balance (later goods start scarce)
    this.goodScale = this.goodScale || new Array(NG).fill(0);
    for (let k = 0; k < NG; k++) {
      let s = 0, d = 0; for (let o = 0; o < np; o++) { s += S[o * NG + k]; d += D[o * NG + k]; }
      if (!this.goodScale[k] && s > 0 && d > 0) this.goodScale[k] = Math.max(1e-4, Math.min(1e4, d / s * (y < 50 ? 1 : 0.4)));
      const sc = this.goodScale[k] || 1; for (let o = 0; o < np; o++) S[o * NG + k] *= sc;
    }
    // world prices, then each state's own price
    this.goodPrice = GOODS.map((g, k) => { let s = 0, d = 0; for (let o = 0; o < np; o++) { s += S[o * NG + k]; d += D[o * NG + k]; } return s > 0 ? Math.max(0.2, Math.min(8, Math.pow(d / s, 0.5))) : 8; });
    for (const p of this.polities) {
      if (!p.alive) continue;
      const b = p.id * NG;
      p.prices = GOODS.map((g, k) => this.goodPrice[k] * Math.max(0.2, Math.min(5, Math.pow((D[b + k] + 1) / (S[b + k] + 1), 0.5))));
      const bal = GOODS.map((g, k) => [g, (S[b + k] - D[b + k]) / (D[b + k] + S[b + k] + 1)]);
      p.exports = bal.filter(x => x[1] > 0.1).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
      p.imports = bal.filter(x => x[1] < -0.1).sort((a, b) => a[1] - b[1]).slice(0, 3).map(x => x[0]);
    }
    // trade routes earn by the price gaps they close, so the routes that pay are the ones that carry what one end lacks
    if (!this.routes || !this.routes.length) return;
    const val = r => {
      const A = this.polities[r.pa], B = this.polities[r.pb]; if (!A.prices || !B.prices || r.pa === r.pb) return [1, null];
      let best = 0, bg = null, tot = 0;
      for (let k = 0; k < NG; k++) {
        const gap = Math.abs(A.prices[k] - B.prices[k]) / this.goodPrice[k];
        const vol = Math.sqrt((S[r.pa * NG + k] + 1) * (D[r.pb * NG + k] + 1)) + Math.sqrt((S[r.pb * NG + k] + 1) * (D[r.pa * NG + k] + 1));
        const v = gap * vol * (LUX.has(k) ? 3 : 1); tot += v; if (v > best) { best = v; bg = GOODS[k]; }
      }
      return [tot, bg];
    };
    const vals = this.routes.map(val), mean = vals.reduce((a, v) => a + v[0], 0) / vals.length || 1;
    this.routes.forEach((r, k) => { r.v *= 0.5 + Math.min(3, vals[k][0] / mean); r.good = vals[k][1]; });
    const maxV = this.routes.reduce((m, r) => Math.max(m, r.v), 1e-9);
    for (const r of this.routes) r.w = Math.sqrt(r.v / maxV);
    for (const p of this.polities) p.tradeValue = 0;
    for (const r of this.routes) { this.polities[r.pa].tradeValue += r.v; this.polities[r.pb].tradeValue += r.v; }
    // the first long luxury routes are worth a line
    this.routeFirst = this.routeFirst || {};
    for (const r of this.routes) {
      if (!r.good || !LUX.has(G[r.good]) || this.routeFirst[r.good] || this.distDeg(r.a, r.b) < 15) continue;
      this.routeFirst[r.good] = y;
      const ca = this.cities[this.cityAt[r.a]], cb = this.cities[this.cityAt[r.b]];
      this._log('contact', `Merchants open a ${r.good} route between ${ca ? this.cityLabel(ca) : this._where(r.a)} and ${cb ? this.cityLabel(cb) : this._where(r.b)}.`, { cell: r.a, big: r.good === 'silk' || r.good === 'spices' });
    }
  };

  // taxes rise with debt; debt carries interest; too much debt ends in default
  P._finance = function (y) {
    for (const p of this.polities) {
      if (!p.alive) continue;
      p.taxRate = p.taxRate || 1; p.debt = p.debt || 0;
      const inc = Math.max(0.01, p.income || 0), t = p.tech;
      if (p.treasury < 0) { p.debt += -p.treasury; p.treasury = 0; }
      const rate = Math.max(0.02, 0.05 + 0.03 * (p.defaults || 0) - (t[T.banking] ? 0.02 : 0) - (p.inst && p.inst.property ? 0.01 : 0));
      p.interest = rate;
      const due = p.debt * rate;
      if (p.treasury >= due) p.treasury -= due; else { p.debt += due - p.treasury; p.treasury = 0; }
      if (p.treasury > inc * 3 && p.debt > 0) { const pay = Math.min(p.debt, p.treasury * 0.3); p.debt -= pay; p.treasury -= pay; }
      if (y % 5 === 0) {
        if (p.debt > inc * 6 && p.taxRate < 1.6) p.taxRate = +(p.taxRate + 0.1).toFixed(2);
        else if (p.debt < inc && p.treasury > inc * 15 && p.taxRate > 0.9) p.taxRate = +(p.taxRate - 0.05).toFixed(2);
      }
      if (p.taxRate > 1.2) { p.stability -= (p.taxRate - 1.2) * 0.01; p.unrest = (p.unrest || 0) + (p.taxRate - 1.2) * 0.01; }
      if (p.debt > inc * (t[T.banking] ? 40 : 15) && inc > 0.05) {
        p.defaults = (p.defaults || 0) + 1; p.debt *= 0.2; p.stability = Math.max(0, p.stability - 0.15);
        if (p.pop > 3e6) this._log('famine', `${p.name} cannot pay its debts and defaults${p.defaults > 1 ? ` for the ${['', 'second', 'third', 'fourth'][Math.min(3, p.defaults - 1)] || p.defaults + 'th'} time` : ''}; lenders take heavy losses.`, { pol: p.id, big: p.pop > 40e6 });
      }
    }
  };
}
