// Peoples and languages: who lives in each province, how they assimilate, mix, migrate,
// form new peoples and rise against foreign rulers.
// Year-1 map: GREG modern ethnic map projected back with a correction layer (prep_peoples.py).
import PEOPLES from './peoples.json' with { type: 'json' };
import { TECH_INDEX as T } from './scenario.js';
const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(2) + ' billion' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : n >= 1e3 ? Math.round(n / 1e3) + ',000' : String(Math.round(n));

const NONE = 65535;
const FAMILY_COLORS = {
  'Indo-European': '#d9a441', 'Uralic': '#6fa8dc', 'Turkic': '#4fb39c', 'Mongolic': '#2f8f83', 'Tungusic': '#7bb0c9', 'Koreanic': '#c27ba0',
  'Japonic': '#e06666', 'Sino-Tibetan': '#cc4125', 'Kra-Dai': '#93c47d', 'Hmong-Mien': '#b6d7a8', 'Austroasiatic': '#6aa84f', 'Austronesian': '#45818e',
  'Dravidian': '#e69138', 'Afro-Asiatic': '#bf9000', 'Nilo-Saharan': '#a64d79', 'Niger-Congo': '#8e7cc3', 'Mande': '#b4a7d6', 'Khoisan': '#d5a6bd',
  'Kartvelian': '#f1c232', 'North Caucasian': '#ffd966', 'Paleo-Siberian': '#9fc5e8', 'Eskimo-Aleut': '#cfe2f3', 'Na-Dene': '#a2c4c9', 'Algic': '#76a5af',
  'North American (other)': '#5f8f9f', 'Uto-Aztecan': '#e6b8af', 'Mayan': '#dd7e6b', 'Mesoamerican (other)': '#c27b6b', 'Chibchan': '#b45f06',
  'Andean': '#a61c00', 'Amazonian': '#38761d', 'Papuan': '#999966', 'Australian': '#b08a5a', 'Isolates': '#999999',
};
// suffix for new ethnonyms, by the naming tradition of the people's tongue
const SUF = { latin: 'ani', greek: 'oi', celtic: 'i', germanic: 'ings', norse: 'ings', slavic: 'ichi', finnic: 'lased', dacian: 'i', persian: 'ians', arabic: 'is', egyptian: 'ites', berber: 'en', turkic: 'lar', mongolic: 'd', sinitic: 'ren', tibetan: 'pa', korean: 'in', japanese: 'bito', seasian: 'ians', austronesian: 'ians', indic: 'as', dravidian: 'ar', ethiopic: 'ites', sudanic: 'ians', westafrican: 'awa', bantu: 'ans', maya: 'ob', mesoamerican: 'ca', andean: 'kuna', amazonian: 'ians', northamerican: 'ians', australian: 'ians', siberian: 'ians' };
const LAND = { latin: 'ia', greek: 'ia', celtic: 'ia', dacian: 'ia', slavic: 'ia', finnic: 'maa', germanic: 'land', norse: 'land', persian: 'an', indic: 'desha', dravidian: 'nadu', turkic: ' Khaganate', mongolic: ' Khanate', tibetan: ' Kingdom', sinitic: '', korean: '', japanese: '', arabic: ' Kingdom', berber: ' Kingdom', egyptian: ' Kingdom', ethiopic: ' Kingdom' };

function hashColor(s) {
  let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h >>>= 0;
  const hue = h % 360, sat = 40 + (h >>> 9) % 35, lit = 38 + (h >>> 17) % 28;
  return `hsl(${hue},${sat}%,${lit}%)`;
}
const root = n => n.replace(/^the /i, '').replace(/ (peoples|people)$/i, '').replace(/(ians|ans|ese|ites|ings|ichi|oi|ae|es|s|i)$/, '') || n;

export function installPeoples(World) {
  const P = World.prototype;

  P._pplInit = function () {
    const N = this.N;
    this.peoples = PEOPLES.peoples.map((q, id) => ({ ...q, id, color: hashColor(q.name), born: q.curated !== undefined ? 0 : this.year, parents: null, cells0: 0, cells: 0, pop: 0, ended: null, revolts: 0, statesUsed: 0, grievance: 0 }));
    this.langs = []; const li = new Map();
    for (const q of this.peoples) { const k = q.lang + '|' + q.branch; if (!li.has(k)) { li.set(k, this.langs.length); this.langs.push({ name: q.lang, branch: q.branch, family: q.family, color: hashColor('L' + q.lang) }); } q.li = li.get(k); }
    this.ppl = new Uint16Array(N); this.ppl2 = new Uint16Array(N).fill(NONE); this.mix = new Float32Array(N); this.mixAge = new Uint16Array(N);
    const cells = PEOPLES.cells;
    for (let i = 0; i < N; i++) {
      const c = cells[i] || [0];
      this.ppl[i] = c[0];
      if (c.length > 2 && c[2] >= 0.08) { this.ppl2[i] = c[1]; this.mix[i] = Math.min(0.49, c[2]); }
      this.culture[i] = this.peoples[c[0]].key;
      this.peoples[c[0]].cells0++;
    }
    // a year-1 state's own people are its "state people": they start with a state tradition
    for (const p of this.polities) if (p.capital >= 0) { const q = this.peoples[this.ppl[p.capital]]; q.hadState = true; p.people = q.id; }
    this.usedStateNames = new Set(this.polities.map(p => p.name));
  };

  P.peopleOf = function (c) { return this.peoples[this.ppl[c]]; };
  P.rulerPeople = function (p) { return p.capital >= 0 ? this.ppl[p.capital] : -1; };

  // move m people from cell i to cell j: they bring their people with them
  P._carry = function (i, j, m) {
    if (!this.ppl || m <= 0) return;
    const a = this.ppl[i];
    if (a === this.ppl[j]) return;
    const share = Math.min(0.35, m / Math.max(1, this.pop[j] + m));
    if (share < 0.002) return;
    this._mixIn(j, a, share);
  };
  // shift cell c towards people q by share s
  P._mixIn = function (c, q, s) {
    if (this.ppl[c] === q) { if (this.ppl2[c] !== NONE) this.mix[c] = Math.max(0, this.mix[c] * (1 - s)); return; }
    if (this.ppl2[c] === q) this.mix[c] += s * (1 - this.mix[c]);
    else if (this.ppl2[c] === NONE || this.mix[c] < s) { this.ppl2[c] = q; this.mix[c] = s; this.mixAge[c] = 0; }
    else this.mix[c] -= s;
    if (this.mix[c] > 0.5) {
      const old = this.ppl[c];
      this.ppl[c] = this.ppl2[c]; this.ppl2[c] = old; this.mix[c] = 1 - this.mix[c];
      this.culture[c] = this.peoples[this.ppl[c]].key;
    }
  };

  P._peoples = function (y) {
    if (!this.ppl) return;
    const rng = this.rng, N = this.N;
    // refugees flee war zones, carrying their people
    for (let i = 0; i < N && !this.opts.xNoRefugee; i++) {
      if (!this.warZone[i] || this.pop[i] < 2000) continue;
      let best = -1, bv = -1;
      for (const j of this.nb[i]) if (!this.warZone[j] && this.nour[j] > bv) { bv = this.nour[j]; best = j; }
      if (best < 0) continue;
      const m = this.pop[i] * 0.01; this.pop[i] -= m; this.pop[best] += m; this._carry(i, best, m);
    }
    if (y % 5 === 0 && !this.opts.xNoAssim) this._assimilate(y);
    if (y % 10 === 0) this._ethnogenesis(y);
    if (!this.opts.xNoRevolt) this._identity(y);
    if (y % 25 === 0) this._peopleCensus(y);
  };

  // language and identity shift towards the ruling people
  P._assimilate = function (y) {
    const N = this.N;
    const prest = new Float32Array(this.polities.length);
    for (const p of this.polities) {
      if (!p.alive || p.capital < 0) continue;
      prest[p.id] = (0.5 + (p.fx && p.fx.known > 8 ? 0.3 : 0) + Math.min(0.6, p.urban / Math.max(1, p.pop) * 4)) * (p.tech[T.public_education] ? 2.2 : 1);
    }
    for (let i = 0; i < N; i++) {
      const o = this.owner[i]; if (o < 0) continue;
      const p = this.polities[o]; if (p.capital < 0) continue;
      const R = this.ppl[p.capital]; if (R === this.ppl[i] && this.ppl2[i] === NONE) continue;
      if (R === this.ppl[i]) { // the ruler's people absorb the minority in their own heartland
        this.mix[i] *= 0.97; if (this.mix[i] < 0.03) { this.ppl2[i] = NONE; this.mix[i] = 0; } continue;
      }
      const loc = this.peoples[this.ppl[i]];
      let touch = this.ppl2[i] === R ? 1 : 0; for (const j of this.nb[i]) if (this.ppl[j] === R) { touch = 1; break; }
      const d = this.distDeg(i, p.capital);
      const colonial = this.nw[i] && !this.nw[p.capital];
      let rate = 0.006 * prest[o] * (this.rel && this.rel[i] === p.rel ? 1.4 : 0.55) * (1 + this.urban[i] * 3) * (touch ? 1.3 : 0.35)
        * (1.5 - loc.identity) * (1 / (1 + d / 18)) * (p.tech[T.printing] && !p.tech[T.public_education] ? 0.7 : 1) * (colonial ? 3 : 1);
      // a big local majority holds on much better than a thin one
      if (this.pop[i] > 3e5 / this.K && !touch) rate *= 0.5;
      this._mixIn(i, R, rate * (this.nationFx ? this.nationFx(p).assim : 1) * (this.governor && this.governorShield(i) ? 0.15 : 1));
    }
  };

  // mixed provinces that stay mixed for generations form a new people
  P._ethnogenesis = function (y) {
    const rng = this.rng, N = this.N, cand = new Map();
    for (let i = 0; i < N; i++) {
      if (this.ppl2[i] === NONE || this.mix[i] < 0.22) { this.mixAge[i] = 0; continue; }
      this.mixAge[i] = Math.min(60000, this.mixAge[i] + 10);
      if (this.mixAge[i] < 150 || this.owner[i] < 0) continue;
      const k = this.owner[i] * 70000 + this.ppl[i] * 2 + 0; // per state and local people
      const e = cand.get(k) || { o: this.owner[i], loc: this.ppl[i], el: this.ppl2[i], cells: [], pop: 0 };
      e.cells.push(i); e.pop += this.pop[i]; cand.set(k, e);
    }
    for (const e of cand.values()) {
      if (e.cells.length < 3 * this.K || e.pop < 3e5 || rng.next() > 0.12) continue;
      const loc = this.peoples[e.loc], el = this.peoples[e.el], p = this.polities[e.o];
      if (loc.branch === el.branch) continue; // close kin simply merge
      if ((loc.born && y - loc.born < 250) || (el.born && y - el.born < 250)) continue; // a young people needs time to settle
      // the newcomers (rulers or settlers) give the name, the majority gives the tongue
      const tongue = this._majorityOf(e.cells, loc.id, el.id) === el.id ? el : loc;
      const nm = this._ethnonym(el, loc), lg = this._ethnonym(el, loc, tongue.lang);
      if (this.peoples.some(q => q.name === nm && !q.ended)) continue;
      const q = { id: this.peoples.length, name: nm, lang: lg, branch: tongue.branch, family: tongue.family, key: tongue.key, identity: Math.min(0.85, (loc.identity + el.identity) / 2 + 0.1), states: [], curated: false, born: y, parents: [loc.id, el.id], cells0: 0, cells: 0, pop: 0, ended: null, revolts: 0, statesUsed: 0, grievance: 0 };
      q.color = hashColor(q.name);
      const k = q.lang + '|' + q.branch; let li = this.langs.findIndex(l => l.name + '|' + l.branch === k);
      if (li < 0) { li = this.langs.length; this.langs.push({ name: q.lang, branch: q.branch, family: q.family, color: hashColor('L' + q.lang), born: y, from: tongue.lang }); }
      q.li = li;
      this.peoples.push(q);
      let n = 0;
      for (const c of e.cells) { this.ppl[c] = q.id; this.ppl2[c] = NONE; this.mix[c] = 0; this.mixAge[c] = 0; this.culture[c] = q.key; n++; }
      // the new identity spreads to the rest of the state's mixed lands
      for (let i = 0; i < N; i++) if (this.owner[i] === e.o && this.ppl2[i] !== NONE && (this.ppl[i] === e.loc || this.ppl[i] === e.el) && (this.ppl2[i] === e.loc || this.ppl2[i] === e.el) && this.mix[i] > 0.12) { this.ppl[i] = q.id; this.ppl2[i] = NONE; this.mix[i] = 0; this.culture[i] = q.key; n++; }
      this._log('people', `A new people, the ${q.name}, takes shape in ${p.name} from ${loc.name} and ${el.name}. They speak ${q.lang}, a form of ${tongue.lang}.`, { pol: p.id, cell: e.cells[0], big: e.pop > 3e6 });
    }
  };
  // combining form, as in Gallo-Roman or Sino-Tibetan: Goths + Latins -> Gotho-Latins
  P._ethnonym = function (a, b, tongue) {
    const last = s => s.split('-').pop();
    let r = root(last(a.name)).replace(/[ ']/g, '');
    if (r.length < 3) r = last(a.name).replace(/[ ']/g, '');
    const comb = /[aeiou]$/.test(r) ? r : r + 'o';
    return comb + '-' + (tongue ? last(tongue) : last(b.name));
  };
  P._majorityOf = function (cells, a, b) { let sa = 0, sb = 0; for (const c of cells) { const m = this.ppl2[c] !== NONE ? this.mix[c] : 0; if (this.ppl[c] === a) { sa += this.pop[c] * (1 - m); sb += this.pop[c] * m; } else { sb += this.pop[c] * (1 - m); sa += this.pop[c] * m; } } return sa >= sb ? a : b; };

  // peoples under foreign rule rise up; after printing, whole nations do
  P._identity = function (y) {
    const rng = this.rng, N = this.N;
    if (!this._idBuf || this._idBuf.length !== this.peoples.length) this._idBuf = null;
    const groups = new Map();
    for (let i = 0; i < N; i++) {
      const o = this.owner[i]; if (o < 0) continue;
      const p = this.polities[o]; if (p.capital < 0) continue;
      const q = this.ppl[i]; if (q === this.ppl[p.capital]) continue;
      const k = o * 70000 + q;
      let g = groups.get(k); if (!g) { g = { o, q, pop: 0, cells: 0, d: 0, faith: 0 }; groups.set(k, g); }
      g.pop += this.pop[i]; g.cells++; g.d += this.distDeg(i, p.capital); if (this.rel && this.rel[i] !== p.rel) g.faith += this.pop[i];
    }
    for (const g of groups.values()) {
      if (g.cells < 3 * this.K || g.pop < 2e5) continue;
      const p = this.polities[g.o], q = this.peoples[g.q];
      if (!p.alive || p.cells - g.cells < 2) continue;
      const share = g.pop / Math.max(1, p.pop);
      const nation = p.tech[T.printing] ? 1 : 0, mass = p.tech[T.public_education] ? 1 : 0;
      const far = Math.min(2, g.d / g.cells / 15), faith = g.faith / g.pop > 0.5 ? 1.6 : 1;
      q.grievance = Math.min(3, q.grievance + 0.002 * faith * (1 + nation));
      let pr = 0.0004 * q.identity * q.identity * 4 * (1.3 - p.stability) * (0.5 + far) * faith * (q.hadState ? 1.4 : 1) * (p.wars ? 1.6 : 1) * (1 + q.grievance)
        * (nation ? 2.5 : 1) * (mass ? 2 : 1) * Math.min(1, share * 6 + 0.3) * (p.overlord != null ? 1.3 : 1) * this.sK;
      if (p.id === this.playerId) pr *= 0.8;
      if (this.nationFx) { const nf = this.nationFx(p); pr *= nf.revolt; q.grievance = Math.min(3, q.grievance * (1 + (nf.grievance - 1) * 0.01)); }
      if (rng.next() > pr) continue;
      // will it succeed? the rebels' numbers against the state's grip
      const odds = 0.12 + 0.45 * (1 - p.stability) + 0.5 * share + (p.wars ? 0.15 : 0) - (p.fx ? Math.min(0.25, p.fx.stateCap / 1000) : 0);
      q.revolts++;
      const leader = nation ? (mass ? 'A national movement' : 'Nationalists') : (rng.next() < 0.05 ? 'Two sisters of a noble house' : rng.pick(['Local nobles', 'A rebel chief', 'A former governor', 'A war leader', 'Priests and nobles']));
      if (rng.next() < odds) {
        const n = this._secede(p, g.q);
        if (n) { q.grievance = 0; q.hadState = true; this._log('rise', `${leader} of the ${q.name} rise${leader.endsWith('s') || leader.startsWith('Two') ? '' : 's'} against ${p.name}: ${n.name} declares independence.`, { pol: n.id, cell: n.capital, big: g.pop > 2e6 }); }
      } else {
        let dead = 0;
        for (let i = 0; i < N; i++) if (this.owner[i] === g.o && this.ppl[i] === g.q) { const d = this.pop[i] * 0.02; this.pop[i] -= d; dead += d; }
        this.totals.war += dead; p.stability = Math.max(0, p.stability - 0.04); q.identity = Math.min(0.95, q.identity + 0.02); q.grievance += 0.3;
        if (g.pop > 5e5) this._log('war', `${p.name} crushes a revolt of the ${q.name}; ${fmt(dead)} die.`, { pol: p.id, deaths: dead });
      }
    }
  };

  // the people's land within p breaks away as a new state
  P._secede = function (p, qid) {
    const pool = []; for (let i = 0; i < this.N; i++) if (this.owner[i] === p.id && this.ppl[i] === qid && i !== p.capital) pool.push(i);
    if (!pool.length) return null;
    pool.sort((a, b) => this.pop[b] - this.pop[a]);
    const seed = pool.find(c => this.cityAt[c] >= 0) ?? pool[0];
    const q = this.peoples[qid];
    const n = this._newPolity(this._peopleStateName(q), q.key, null, p.nomad && this.pastureY[seed] < 1.2);
    n.tech.set(p.tech); n.prog.set(p.prog); n.fx = p.fx; n.stability = 0.6; n.capital = seed; n.rel = this.rel ? this.rel[seed] : -1; n.gov = p.gov === 'empire' ? 'kingdom' : p.gov; n.people = qid;
    n.legitBase = 0.08;
    const queue = [seed]; this.owner[seed] = n.id; let got = 1;
    while (queue.length) { const c = queue.shift(); for (const j of this.nb[c]) if (this.owner[j] === p.id && j !== p.capital && this.ppl[j] === qid) { this.owner[j] = n.id; queue.push(j); got++; } }
    // a war of independence follows unless the state is too weak to fight
    if (p.stability > 0.35 && this.rng.next() < 0.6 && this._declare) this._declare(p, n, 'to crush the rebellion');
    return n;
  };

  P._peopleStateName = function (q) {
    for (const s of q.states || []) if (!this.usedStateNames.has(s) || !this.polities.some(p => p.alive && p.name === s)) { this.usedStateNames.add(s); return s; }
    const r = root(q.name), key = q.key;
    let s;
    if (key in LAND && LAND[key] !== '' && this.rng.next() < 0.7) s = (r + LAND[key]).replace(/aia$/, 'ia').replace(/iia$/, 'ia');
    else s = this._genName(key).replace(/^(\S+)/, m => m) ;
    if (this.polities.some(p => p.alive && p.name === s)) s = this._genName(key);
    this.usedStateNames.add(s);
    return s;
  };

  P._peopleCensus = function (y) {
    for (const q of this.peoples) { q.cells = 0; q.pop = 0; }
    for (let i = 0; i < this.N; i++) {
      const a = this.peoples[this.ppl[i]], m = this.ppl2[i] !== NONE ? this.mix[i] : 0;
      a.cells++; a.pop += this.pop[i] * (1 - m);
      if (m) this.peoples[this.ppl2[i]].pop += this.pop[i] * m;
    }
    for (const q of this.peoples) if (!q.ended && q.pop < 1) {
      q.ended = y;
      if (q.cells0 >= 6 * this.K || q.born) this._log('people', `The last ${q.name} vanish into their neighbours; ${q.lang} is no longer spoken.`, {});
    }
  };

  // what the inspector shows
  P.peoplesHere = function (c) {
    const a = this.peoples[this.ppl[c]], out = [{ q: a, share: 1 - (this.ppl2[c] !== NONE ? this.mix[c] : 0) }];
    if (this.ppl2[c] !== NONE && this.mix[c] > 0.01) out.push({ q: this.peoples[this.ppl2[c]], share: this.mix[c] });
    return out;
  };
  P.familyColor = f => FAMILY_COLORS[f] || '#888';
  P.FAMILY_COLORS = FAMILY_COLORS;

  // generated places are named after the people who live there
  P._tribeName = function (c) { return this.ppl ? this.peoples[this.ppl[c]].name : 'local'; };

  // city names follow their people: conquerors and new majorities rename, old names come back
  P._renameCities = function (y) {
    if (y % 10 || !this.ppl) return;
    for (const ct of this.cities) {
      if (!ct.alive || ct.site >= 0) continue;
      const q = this.ppl[ct.cell];
      if (ct.people === undefined) { ct.people = q; continue; }
      if (q === ct.people) continue;
      if (this.rng.next() > 0.25) continue;
      ct.names = ct.names || [];
      const back = ct.names.find(x => x.people === q);
      const old = ct.name;
      ct.names.push({ name: old, people: ct.people, until: y });
      ct.name = back ? back.name : this._cityName(this.peoples[q].key);
      ct.people = q;
      if (ct.pop > 2e5) this._log('city', back ? `${old} is called ${ct.name} again by its ${this.peoples[q].name} people.` : `${old} becomes ${ct.name} as ${this.peoples[q].name} speech takes over.`, { cell: ct.cell });
    }
  };
}
