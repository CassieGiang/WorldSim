// Stage 2 systems: resources, trade routes, money, religion, culture assimilation, governments.
// Installed onto World.prototype; the engine calls the hooks each year.
import { TECH_INDEX as T, TITLES } from './scenario.js';
import { NAME_PARTS } from './scenario.js';

const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(2) + ' billion' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : n >= 1e3 ? Math.round(n / 1e3) + ',000' : String(Math.round(n));
const D2R = Math.PI / 180;

// ---------------- resources ----------------
export const RES = ['iron', 'tin', 'horses', 'timber', 'coal', 'oil', 'gold'];
const RB = Object.fromEntries(RES.map((r, k) => [r, 1 << k]));
// real major deposits [lon, lat, radius deg]
const DEPOSITS = {
  tin: [[-5, 50.3, 2], [-7, 42, 3], [13, 50.5, 2], [101, 4, 4], [103, 24, 3], [70, 39, 4], [-66, -19, 4], [8, 10, 3], [108, -3, 3]],
  coal: [[-2, 53.5, 3], [7, 51.5, 2], [18.5, 50.3, 2], [38, 48, 3], [112.5, 37.5, 4], [-80, 39, 5], [86, 23.8, 2], [151, -33, 3], [87, 54, 4], [3.5, 50.5, 1.5], [127, 45, 3], [-97, 39, 5], [29, -26, 3], [117, 34, 3]],
  oil: [[50, 28, 6], [49.8, 40.4, 2], [-98, 31, 6], [-67, 10, 4], [75, 61, 7], [6, 5, 3], [117, 1, 4], [53, 37, 3], [-150, 70, 4], [124, 47, 3], [17, 30, 6], [46, 33, 4]],
  gold: [[-6, 38, 3], [22, 45, 3], [-65.7, -19.6, 3], [-102, 23, 5], [-1, 6, 4], [-8, 12, 4], [32, 20, 3], [60, 55, 5], [-120, 39, 4], [28, -26, 3], [132, 35, 3], [145, -37, 3], [-60, 4, 4], [89, 26, 5], [77, 13, 3]],
  iron: [[10, 47, 4], [-1, 52, 3], [16, 64, 5], [114, 36, 5], [37, 50, 3], [-90, 47, 4], [85, 22, 4], [118, -22, 5], [-44, -20, 4], [7, 49.5, 2], [35, 37, 3], [4, 10, 6]],
};

// ---------------- religions ----------------
// missionary: how strongly it spreads (0 = only by birth). universal: converts other faiths.
export const START_FAITHS = [
  { name: 'Hellenic paganism', color: '#c9b37a', miss: 0.1, where: ['latin', 'greek', 'egyptian', 'berber', 'dacian'] },
  { name: 'Zoroastrianism', color: '#e0773a', miss: 0.25, universal: true, where: ['persian'] },
  { name: 'Hinduism', color: '#f2a03d', miss: 0.35, universal: true, where: ['indic', 'dravidian'] },
  { name: 'Buddhism', color: '#f5d14a', miss: 0.8, universal: true, where: [], seeds: [[80.4, 8.3, 2], [85, 25.5, 2], [70, 35, 3]] },
  { name: 'Judaism', color: '#6c8fd6', miss: 0.05, where: [], seeds: [[35.2, 31.8, 1.2]] },
  { name: 'Chinese folk religion', color: '#d84a3a', miss: 0.15, where: ['sinitic'] },
  { name: 'Shinto', color: '#e8eaf0', miss: 0, where: ['japanese'] },
  { name: 'Tengrism', color: '#7fb0d9', miss: 0.05, where: ['turkic', 'mongolic'] },
  { name: 'Bön', color: '#9b6bb5', miss: 0.05, where: ['tibetan'] },
  { name: 'Germanic paganism', color: '#8a9b6a', miss: 0.05, where: ['germanic', 'norse'] },
  { name: 'Celtic paganism', color: '#5d9a74', miss: 0.05, where: ['celtic'] },
  { name: 'Slavic paganism', color: '#a58b6b', miss: 0.05, where: ['slavic', 'finnic'] },
  { name: 'Arabian polytheism', color: '#c48a5a', miss: 0.05, where: ['arabic'] },
  { name: 'African traditional faiths', color: '#8b5a3c', miss: 0.05, where: ['bantu', 'westafrican', 'sudanic', 'ethiopic'] },
  { name: 'Mesoamerican faith', color: '#3fa58a', miss: 0.05, where: ['mesoamerican', 'maya'] },
  { name: 'Andean faith', color: '#c8a03c', miss: 0.05, where: ['andean'] },
  { name: 'Native faiths', color: '#6f7f5f', miss: 0, where: ['amazonian', 'northamerican', 'australian', 'siberian', 'austronesian', 'korean', 'seasian'] },
];
// prophets appear at real dates and places; whether their faith spreads is up to the simulation
export const PROPHETS = [
  { year: 30, name: 'Christianity', color: '#e8e8f8', miss: 1.0, at: [35.2, 31.8], ry: '30s AD: Jesus of Nazareth' },
  { year: 240, name: 'Manichaeism', color: '#9a7fd1', miss: 0.7, at: [44.5, 33.1], ry: '240s: Mani in Ctesiphon' },
  { year: 610, name: 'Islam', color: '#3fae5a', miss: 1.15, conquest: 1, at: [39.8, 21.4], ry: '610: Muhammad in Mecca' },
  { year: 1499, name: 'Sikhism', color: '#f0c419', miss: 0.3, at: [74.9, 31.6], ry: '1499: Guru Nanak in Punjab' },
];

// ---------------- governments ----------------
export const GOVS = {
  chiefdom: { label: 'Chiefdom', research: 0.8, aggr: 1.1, stab: -0.03, tax: 0.6 },
  kingdom: { label: 'Kingdom', research: 1, aggr: 1, stab: 0, tax: 1 },
  empire: { label: 'Empire', research: 1, aggr: 1.2, stab: 0.04, tax: 1.2 },
  khanate: { label: 'Khanate', research: 0.8, aggr: 1.5, stab: -0.02, tax: 0.8 },
  republic: { label: 'Republic', research: 1.15, aggr: 0.9, stab: 0.02, tax: 1.1 },
  theocracy: { label: 'Theocracy', research: 0.85, aggr: 1.2, stab: 0.05, tax: 0.9 },
  constitutional: { label: 'Constitutional monarchy', research: 1.12, aggr: 0.8, stab: 0.05, tax: 1.15 },
  democracy: { label: 'Democracy', research: 1.25, aggr: 0.5, stab: 0.06, tax: 1.2 },
  dictatorship: { label: 'Dictatorship', research: 0.95, aggr: 1.6, stab: -0.02, tax: 1.1 },
};
const GOV_TITLE = {
  chiefdom: ['{n}', 'Chiefdom of {n}'], kingdom: null, empire: ['{n} Empire', 'Empire of {n}'], khanate: ['{n} Khanate', '{n} Khaganate'],
  republic: ['Republic of {n}', '{n} Republic'], theocracy: ['Holy State of {n}', '{n} Theocracy'], constitutional: ['Kingdom of {n}', '{n} Kingdom'],
  democracy: ['Republic of {n}', 'Federation of {n}', '{n} Republic'], dictatorship: ['{n} State', "People's Republic of {n}", 'Republic of {n}'],
};

export function installSystems(World) {
  const P = World.prototype;

  P._sysInit = function () {
    const N = this.N, rng = this.rng;
    // resources
    this.res = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const c = this.geo.cells[i], f = c.f, landF = 1 - f[0] || 1;
      let m = 0;
      const near = list => list.some(([lo, la, r]) => this._dist2(i, lo, la) < r * r);
      if (near(DEPOSITS.iron) ? rng.next() < 0.6 : rng.next() < 0.06 + this.rough[i] * 0.25) m |= RB.iron;
      if (near(DEPOSITS.tin) ? rng.next() < 0.5 : rng.next() < 0.008) m |= RB.tin;
      if (this.pastureY[i] > 0.4 && (f[2] + f[4]) / landF > 0.4 && Math.abs(this.lat[i]) > 25 && Math.abs(this.lat[i]) < 58 && rng.next() < 0.7) m |= RB.horses;
      if ((f[1] + f[3] + f[4]) / landF > 0.6 && this.elev[i] < 2500) m |= RB.timber;
      if (near(DEPOSITS.coal) ? rng.next() < 0.55 : rng.next() < 0.01) m |= RB.coal;
      if (near(DEPOSITS.oil) ? rng.next() < 0.45 : rng.next() < 0.004) m |= RB.oil;
      if (near(DEPOSITS.gold) ? rng.next() < 0.35 : rng.next() < 0.006) m |= RB.gold;
      this.res[i] = m;
    }
    // religions
    this.faiths = [];
    this.rel = new Int16Array(N).fill(-1);
    this.relStr = new Float32Array(N).fill(1);
    START_FAITHS.forEach(f => this._addFaith(f, 1));
    for (let i = 0; i < N; i++) {
      const k = START_FAITHS.findIndex(f => f.where.includes(this.culture[i]));
      this.rel[i] = k >= 0 ? k : START_FAITHS.length - 1;
    }
    START_FAITHS.forEach((f, k) => (f.seeds || []).forEach(([lo, la, r]) => { for (let i = 0; i < N; i++) if (this._dist2(i, lo, la) < r * r) this.rel[i] = k; }));
    // starting state faiths
    for (const p of this.polities) { p.rel = this._majorityFaith(p.id); p.gov = p.nomad ? 'khanate' : p.cells > 60 * this.K ? 'empire' : 'kingdom'; }
    const rome = this.polities.find(p => p.name === 'Roman Empire'); if (rome) rome.gov = 'empire';
    const han = this.polities.find(p => p.name === 'Han Dynasty'); if (han) han.gov = 'empire';
    const anu = this.polities.find(p => p.name === 'Anuradhapura'); if (anu) anu.rel = this.faiths.findIndex(f => f.name === 'Buddhism');
    // money
    for (const p of this.polities) { p.treasury = 0; p.income = 0; }
    this.routes = [];
  };

  P._addFaith = function (f, year) {
    this.faiths.push({ id: this.faiths.length, name: f.name, color: f.color, miss: f.miss, universal: !!f.universal || f.miss >= 0.3, conquest: f.conquest || 0, founded: year, ry: f.ry, cells: 0, pop: 0 });
    return this.faiths.length - 1;
  };

  P._majorityFaith = function (pid) {
    const tally = new Map();
    for (let i = 0; i < this.N; i++) if (this.owner[i] === pid) tally.set(this.rel[i], (tally.get(this.rel[i]) || 0) + this.pop[i]);
    let best = -1, bv = -1; for (const [k, v] of tally) if (v > bv) { bv = v; best = k; }
    return best;
  };

  // resource access: own provinces plus trade partners
  P._resources = function () {
    for (const p of this.polities) { p.resOwn = 0; p.resAll = 0; }
    for (let i = 0; i < this.N; i++) { const o = this.owner[i]; if (o >= 0) this.polities[o].resOwn |= this.res[i]; }
    for (const p of this.polities) {
      if (!p.alive) continue;
      p.resAll = p.resOwn;
      for (const q of p.tradePartners || []) p.resAll |= this.polities[q].resOwn;
      const has = r => (p.resAll & RB[r]) !== 0;
      p.resFx = {
        mil: (p.tech[T.iron] && !has('iron') ? 0.85 : 1) * (p.tech[T.bronze] && !p.tech[T.iron] && !has('tin') ? 0.9 : 1) * (p.tech[T.horses] && !has('horses') ? 0.9 : 1) * (p.tech[T.combustion] && !has('oil') ? 0.75 : 1),
        labor: (p.tech[T.iron] && !has('iron') ? 0.92 : 1) * (p.tech[T.industry] && !has('coal') ? 0.8 : 1) * (p.tech[T.tractors] && !has('oil') ? 0.85 : 1),
        research: p.tech[T.industry] && !has('coal') ? 0.85 : 1,
        horses: has('horses'),
      };
    }
  };

  // ---------------- trade routes (every 5 years) ----------------
  P._trade = function (y) {
    if (y % 5 !== 0 && this.routes.length) return;
    const cities = this.cities.filter(c => c.alive && c.pop > 2e4).sort((a, b) => b.pop - a.pop).slice(0, 220);
    const routes = [], seen = new Set();
    const atWar = (a, b) => this.wars.some(w => !w.end && ((w.a === a && w.b === b) || (w.a === b && w.b === a)));
    for (const A of cities) {
      const oa = this.owner[A.cell]; if (oa < 0) continue;
      const fa = this.polities[oa].fx;
      const land = 7 + (fa.stateCap > 30 ? 3 : 0) + (fa.redistrib > 0.25 ? 15 : 0);
      const sea = !this.coastal[A.cell] ? 0 : fa.ocean ? 120 : fa.sea >= 2 ? 30 : fa.sea >= 1 ? 14 : 0;
      const cand = [];
      for (const B of cities) {
        if (B === A) continue;
        const ob = this.owner[B.cell]; if (ob < 0 || atWar(oa, ob)) continue;
        const d = this.distDeg(A.cell, B.cell);
        const bySea = sea > 0 && this.coastal[B.cell] && d <= sea;
        if (d > land && !bySea) continue;
        const cost = bySea && d > land * 0.6 ? d * 0.5 : d * (1 + 2 * Math.max(this.rough[A.cell], this.rough[B.cell]));
        cand.push({ B, ob, v: Math.sqrt(A.pop * B.pop) / Math.pow(cost + 2, 1.4) * (ob === oa ? 1.3 : 1), sea: bySea && d > land * 0.6 });
      }
      cand.sort((a, b) => b.v - a.v);
      for (const c of cand.slice(0, 3)) {
        const key = A.cell < c.B.cell ? A.cell + ':' + c.B.cell : c.B.cell + ':' + A.cell;
        if (seen.has(key)) continue; seen.add(key);
        routes.push({ a: A.cell, b: c.B.cell, pa: oa, pb: c.ob, v: c.v, sea: c.sea });
      }
    }
    this.routes = routes;
    const maxV = routes.reduce((m, r) => Math.max(m, r.v), 1e-9);
    for (const r of routes) r.w = Math.sqrt(r.v / maxV);
    for (const p of this.polities) { p.tradePartners = new Set(); p.tradeValue = 0; }
    this.routeAt = new Map();
    for (const r of routes) {
      const A = this.polities[r.pa], B = this.polities[r.pb];
      A.tradeValue += r.v; B.tradeValue += r.v;
      if (r.pa !== r.pb) { A.tradePartners.add(r.pb); B.tradePartners.add(r.pa); }
      if (!this.routeAt.has(r.a)) this.routeAt.set(r.a, []); this.routeAt.get(r.a).push(r.b);
      if (!this.routeAt.has(r.b)) this.routeAt.set(r.b, []); this.routeAt.get(r.b).push(r.a);
    }
  };

  // ---------------- money ----------------
  P._economy = function () {
    let maxTrade = 1e-9; for (const p of this.polities) if (p.alive) maxTrade = Math.max(maxTrade, p.tradeValue || 0);
    const goldCells = new Map();
    for (let i = 0; i < this.N; i++) if (this.res[i] & RB.gold) { const o = this.owner[i]; if (o >= 0) goldCells.set(o, (goldCells.get(o) || 0) + 1); }
    for (const p of this.polities) {
      if (!p.alive) continue;
      const g = GOVS[p.gov] || GOVS.kingdom;
      const tax = (p.taxRate || 1) * ((p.urban * 1.0 + (p.pop - p.urban) * 0.15) / 1e6) * p.fx.tax * g.tax * (0.4 + p.stability) * (p.fx.industry ? 3 : 1);
      const trade = (p.worksFx ? p.worksFx.trade : 1) * (p.tradeValue || 0) / maxTrade * 0.15 * Math.max(1, p.pop / 1e6) ** 0.5 * (p.fx.industry ? 4 : 1) + (p.tradeValue || 0) * 0;
      const gold = (goldCells.get(p.id) || 0) * 0.4 / this.K;
      const army = (p.soldiers || 0) / 1e6 * 13 * (p.fx.industry ? 2 : 1) * (p.policy && p.policy.focus === 'army' ? 1.3 : 1);
      p.income = tax + trade + gold; p.spend = army; p.tradeIncome = trade;
      p.treasury = (p.treasury || 0) * 0.97 + p.income - p.spend;
      if (p.treasury < -p.income * 3 && p.income > 0) { p.stability -= 0.02; p.broke = true; } else p.broke = false;
    }
  };

  // ---------------- religion ----------------
  P._religion = function (y) {
    const rng = this.rng, N = this.N;
    const prophets = this.sched && this.sched.prophets ? this.sched.prophets : PROPHETS;
    for (const pr0 of prophets) if (pr0.year === y) {
      const pr = { ...pr0 };
      let c;
      if (pr.at) c = this._nearest(pr.at[0], pr.at[1]);
      else {
        // blind mode: a prophet appears in a literate town somewhere
        const towns = this.cities.filter(t => t.alive && this.cellTech[t.cell][T.writing]);
        if (!towns.length) continue;
        c = this.rng.pick(towns).cell;
        const parts = NAME_PARTS[this.culture[c]] || NAME_PARTS.latin, root = this.rng.pick(parts[0]) + (parts[1][0] || 'a');
        pr.name = this.rng.next() < 0.5 ? root.charAt(0).toUpperCase() + root.slice(1) + 'ism' : `the Way of ${root.charAt(0).toUpperCase() + root.slice(1)}`;
      }
      const k = this._addFaith({ ...pr, universal: true }, y);
      this.rel[c] = k; this.relStr[c] = 0.3;
      for (const j of this.nb[c]) if (rng.next() < 0.4) { this.rel[j] = k; this.relStr[j] = 0.2; }
      this._log('faith', `A new faith, ${pr.name}, is born in ${this._where(c)}.`, { cell: c, ry: pr.ry, big: true });
      if (pr.conquest && this.owner[c] < 0) {
        // the believers unite the tribes around them into a new state
        const cul = this.culture[c];
        const q = this._newPolity(this._genName(cul).replace(/^.*?(\w+)$/, '$1') + ' Caliphate', cul, '#2e8b57', false);
        q.tech.set(this.cellTech[c]); q.fx = this._fxOf(q.tech); q.capital = c; q.stability = 0.8; q.aggression = 2.2; q.rel = k; q.gov = 'theocracy'; q.converted = y;
        const queue = [c]; this.owner[c] = q.id; let got = 1;
        while (queue.length && got < 25 * this.K) { const x = queue.shift(); for (const j of this.nb[x]) if (this.owner[j] < 0 && got < 25 * this.K) { this.owner[j] = q.id; this.rel[j] = k; queue.push(j); got++; } }
        this._log('rise', `The followers of ${pr.name} unite the tribes: ${q.name} is founded.`, { pol: q.id, big: true });
      }
    }
    // conversion pressure from neighbours, trade links and the state
    const newRel = this.rel.slice();
    for (let i = 0; i < N; i++) {
      if (this.pop[i] < 100) continue;
      const mine = this.faiths[this.rel[i]], o = this.owner[i], stateRel = o >= 0 ? this.polities[o].rel : -1;
      let best = -1, bp = 0;
      const consider = (k, w) => {
        if (k === this.rel[i] || k < 0) return;
        const f = this.faiths[k]; if (!f.universal) return;
        let pr = w * f.miss * (k === stateRel ? 2.5 : 1) * (mine.universal ? 0.25 : 1.4) * (1 - 0.5 * this.rough[i]);
        if (f.conquest && k === stateRel) pr *= 1.6;
        if (pr > bp) { bp = pr; best = k; }
      };
      const nb = this.nb[i];
      for (const j of nb) consider(this.rel[j], this.relStr[j] / nb.length * 2);
      const tr = this.routeAt && this.routeAt.get(i); if (tr) for (const j of tr) consider(this.rel[j], 0.5);
      if (stateRel >= 0 && stateRel !== this.rel[i]) consider(stateRel, 0.25);
      if (best >= 0 && rng.next() < 0.03 * this.sK * bp * (1.2 - this.relStr[i])) { newRel[i] = best; this.relStr[i] = 0.3; }
      else this.relStr[i] = Math.min(1, this.relStr[i] + 0.01);
    }
    this.rel = newRel;
    // rulers convert
    if (y % 2 === 0) for (const p of this.polities) {
      if (!p.alive || p.cells < 2) continue;
      const maj = this._majorityFaith(p.id);
      if (maj >= 0 && maj !== p.rel && (y - (p.converted || -999)) > 120 && p.faithPop / Math.max(1, p.pop) < 0.35 && rng.next() < 0.05) this._stateFaith(p, maj, 'follows its people and adopts');
      else if (rng.next() < 0.006) {
        // a ruler embraces a universal faith that is gaining ground (Ashoka, Constantine, Vladimir)
        const share = new Map(); let tot = 0;
        for (let i = 0; i < this.N; i++) if (this.owner[i] === p.id) { share.set(this.rel[i], (share.get(this.rel[i]) || 0) + this.pop[i]); tot += this.pop[i]; }
        for (const [k, v] of share) if (k !== p.rel && this.faiths[k].universal && v / tot > 0.12 && (!this.faiths[p.rel] || !this.faiths[p.rel].universal || rng.next() < 0.3)) { this._stateFaith(p, k, 'converts to'); break; }
      }
    }
    if (y % 10 === 0) { for (const f of this.faiths) { f.cells = 0; f.pop = 0; } for (let i = 0; i < N; i++) { const f = this.faiths[this.rel[i]]; f.cells++; f.pop += this.pop[i]; } }
  };
  P._stateFaith = function (p, k, how) {
    const old = p.rel; p.rel = k; p.converted = this.year;
    if (p.pop > 3e6 || this.faiths[k].founded > 1) this._log('faith', `${p.name} ${how} ${this.faiths[k].name}${old >= 0 && how !== 'converts to' ? '' : ''}.`, { pol: p.id, big: p.pop > 10e6 });
  };

  // ---------------- culture: slow assimilation under foreign rule ----------------
  P._culture = function (y) {
    if (y % 5) return;
    const rng = this.rng;
    for (let i = 0; i < this.N; i++) {
      const o = this.owner[i]; if (o < 0) continue;
      const p = this.polities[o]; if (p.capital < 0) continue;
      const cc = this.culture[p.capital]; if (this.culture[i] === cc) continue;
      let touch = false; for (const j of this.nb[i]) if (this.culture[j] === cc) { touch = true; break; }
      if (!touch) continue;
      const rate = 0.006 * (p.tech[T.printing] ? 1.6 : 1) * (p.tech[T.public_education] ? 1.6 : 1) * (this.rel[i] === p.rel ? 1.5 : 0.6) * this.sK;
      if (rng.next() < rate) this.culture[i] = cc;
    }
  };

  // ---------------- governments ----------------
  P._government = function (y) {
    const rng = this.rng;
    for (const p of this.polities) {
      if (!p.alive) continue;
      if (!p.gov) p.gov = p.nomad ? 'khanate' : p.tech[T.writing] ? 'kingdom' : 'chiefdom';
      const g0 = p.gov, urbanShare = p.urban / Math.max(1, p.pop), size = p.cells / this.K;
      let g = g0, why = '';
      if (g === 'chiefdom' && p.tech[T.writing] && size >= 5) g = 'kingdom';
      else if ((g === 'kingdom') && size >= 70 && p.foreign / Math.max(1, p.pop) > 0.25) { g = 'empire'; why = 'proclaims itself an empire'; }
      else if (g === 'empire' && size < 30) g = 'kingdom';
      else if (g === 'khanate' && p.fx.noNomad && size > 20) g = 'kingdom';
      if (g === g0 && p.stability < 0.32 && urbanShare > 0.18 && p.tech[T.printing] && rng.next() < 0.04) {
        g = p.tech[T.public_education] ? (p.wars && rng.next() < 0.45 ? 'dictatorship' : 'democracy') : 'republic';
        why = 'revolution';
      } else if (g === g0 && (g === 'kingdom' || g === 'empire') && p.tech[T.banking] && p.tech[T.printing] && p.stability > 0.55 && rng.next() < 0.004) { g = 'constitutional'; why = 'reform'; }
      else if (g === g0 && (g === 'republic' || g === 'constitutional') && p.tech[T.public_education] && p.stability > 0.5 && rng.next() < 0.01) { g = 'democracy'; why = 'reform'; }
      else if (g === g0 && g === 'dictatorship' && p.stability > 0.6 && rng.next() < 0.012) { g = 'democracy'; why = 'transition'; }
      else if (g === g0 && g === 'democracy' && p.stability < 0.2 && p.wars && rng.next() < 0.05) { g = 'dictatorship'; why = 'coup'; }
      else if (g === g0 && (g === 'kingdom' || g === 'chiefdom') && p.rel >= 0 && this.faiths[p.rel].universal && y - this.faiths[p.rel].founded < 250 && p.stability < 0.35 && rng.next() < 0.01) { g = 'theocracy'; why = 'clergy'; }
      if (g !== g0) {
        const old = p.name;
        p.gov = g;
        const tpl = GOV_TITLE[g];
        if (tpl && why && !(g === 'empire' && /Empire/.test(p.name))) p.name = rng.pick(tpl).replace('{n}', this._short(p.name));
        if (why === 'proclaims itself an empire' && p.name === old) why = '';
        if (why && p.pop > 1e6) {
          const txt = why === 'revolution' ? `Revolution in ${old}: ${GOVS[g].label.toLowerCase()} proclaimed as ${p.name}.`
            : why === 'coup' ? `Coup in ${old}: the army takes power. ${p.name} is now a dictatorship.`
            : why === 'proclaims itself an empire' ? `${old} proclaims itself an empire: ${p.name}.`
            : why === 'clergy' ? `The clergy take power in ${old}: ${p.name}.`
            : `${old} becomes a ${GOVS[g].label.toLowerCase()}${p.name !== old ? ` as ${p.name}` : ''}.`;
          this._log('gov', txt, { pol: p.id, big: p.pop > 10e6 });
        }
      }
    }
  };

  // effects other parts of the engine ask for
  P._govFx = function (p) { return GOVS[p.gov] || GOVS.kingdom; };
  P._faithUnity = function (p) {
    if (p.rel < 0) return 0;
    let same = 0, tot = 0;
    for (let i = 0; i < this.N; i++) if (this.owner[i] === p.id) { tot += this.pop[i]; if (this.rel[i] === p.rel) same += this.pop[i]; }
    return tot ? same / tot : 1;
  };
}
export { RB };
