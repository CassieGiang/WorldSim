// Design your own start: paint states, peoples, faiths and population on the live world,
// then save the result as a scenario file and load it again later.
// Rules and events: rename and reprice inventions (or forbid them), rename faiths and peoples,
// and schedule plagues, eruptions, earthquakes and prophets. These travel in the scenario file too.
import { TECHS, TECH_INDEX } from './scenario.js';
const NAME0 = TECHS.map(t => t.name);
export const EVENT_KINDS = {
  plague: { label: 'Plague', strength: 'share who die where it strikes' },
  eruption: { label: 'Volcanic winter', strength: 'harvest loss' },
  quake: { label: 'Earthquake', strength: 'share who die in the province' },
  prophet: { label: 'Prophet (new faith)', strength: 'missionary zeal' },
};
export function installEditor(World) {
  const P = World.prototype;
  P._modsInit = function () {
    if (!this.mods) this.mods = { techs: {}, faiths: {}, peoples: {}, events: [] };
    if (!this.techX) { this.techX = new Float32Array(TECHS.length).fill(1); this.techBan = new Uint8Array(TECHS.length); }
    return this.mods;
  };
  // invention names are shared by the whole page, so put them back before a new world
  World.resetTechNames = () => TECHS.forEach((t, k) => { t.name = NAME0[k]; });
  P.setTech = function (id, { name, costX, banned } = {}) {
    const m = this._modsInit(), k = TECH_INDEX[id], t = m.techs[id] = { ...(m.techs[id] || {}) };
    if (name !== undefined) { t.name = name && name !== NAME0[k] ? name : undefined; TECHS[k].name = name || NAME0[k]; }
    if (costX !== undefined) { t.costX = costX; this.techX[k] = costX; }
    if (banned !== undefined) { t.banned = banned; this.techBan[k] = banned ? 1 : 0; }
  };
  P.setFaith = function (k, { name, color, miss } = {}) {
    const f = this.faiths[k], m = this._modsInit(), r = m.faiths[f.name0 || f.name] = { ...(m.faiths[f.name0 || f.name] || {}) };
    if (!f.name0) f.name0 = f.name;
    if (name) { f.name = name; r.name = name; }
    if (color) { f.color = color; r.color = color; }
    if (miss !== undefined) { f.miss = miss; f.universal = f.universal || miss >= 0.3; r.miss = miss; }
  };
  P.setPeople = function (k, { name, identity } = {}) {
    const q = this.peoples[k], m = this._modsInit(), r = m.peoples[q.name0 || q.name] = { ...(m.peoples[q.name0 || q.name] || {}) };
    if (!q.name0) q.name0 = q.name;
    if (name) { q.name = name; r.name = name; }
    if (identity !== undefined) { q.identity = identity; r.identity = identity; }
  };
  // a scheduled event; cell may be -1 for "somewhere busy"
  P.addEvent = function (ev) {
    const m = this._modsInit(), e = { ...ev, id: (m.nextId = (m.nextId || 0) + 1) };
    m.events.push(e); this._schedule(e); return e;
  };
  P.removeEvent = function (id) {
    const m = this._modsInit(), e = m.events.find(x => x.id === id); if (!e) return;
    m.events = m.events.filter(x => x !== e);
    this.sched = { ...this.sched, epidemics: this.sched.epidemics.filter(x => x.modId !== id), volcanoes: this.sched.volcanoes.filter(x => x.modId !== id), quakes: this.sched.quakes.filter(x => x.modId !== id), prophets: this.sched.prophets ? this.sched.prophets.filter(x => x.modId !== id) : null };
  };
  P._schedule = function (e) {
    const at = e.cell >= 0 ? [this.lon[e.cell], this.lat[e.cell]] : null, s = this.sched = { ...this.sched };
    if (e.kind === 'plague') s.epidemics = [...s.epidemics, { year: e.year, name: e.name || `The plague of ${e.year}`, at, mort: e.strength, reach: 0.4 + e.strength, modId: e.id }];
    else if (e.kind === 'eruption') s.volcanoes = [...s.volcanoes, { year: e.year, hit: e.strength, years: e.strength > 0.1 ? 3 : 2, name: e.name || `A great eruption darkens the sky (${e.year})`, modId: e.id }];
    else if (e.kind === 'quake') s.quakes = [...s.quakes, { year: e.year, at: at || [this.lon[this._busyCity()], this.lat[this._busyCity()]], local: e.strength, name: e.name || 'A great earthquake', modId: e.id }];
    else if (e.kind === 'prophet') {
      if (!s.prophets) s.prophets = this._defaultProphets ? this._defaultProphets() : [];
      s.prophets = [...s.prophets, { year: e.year, at, name: e.name || undefined, miss: e.strength, conquest: e.conquest ? 1 : 0, color: e.color || `hsl(${(e.id * 83) % 360},55%,65%)`, modId: e.id }];
    }
  };
  // apply a saved set of rules and events to this world
  P.applyMods = function (mods) {
    if (!mods) return;
    for (const [id, t] of Object.entries(mods.techs || {})) if (id in TECH_INDEX) this.setTech(id, { name: t.name || '', costX: t.costX ?? 1, banned: !!t.banned });
    for (const [n, r] of Object.entries(mods.faiths || {})) { const k = this.faiths.findIndex(f => (f.name0 || f.name) === n); if (k >= 0) this.setFaith(k, r); }
    for (const [n, r] of Object.entries(mods.peoples || {})) { const k = this.peoples.findIndex(q => (q.name0 || q.name) === n); if (k >= 0) this.setPeople(k, r); }
    for (const e of mods.events || []) if (e.year > this.year) this.addEvent({ ...e, cell: e.lon !== undefined ? this._nearest(e.lon, e.lat) : -1 });
  };
  // cells within `rings` steps of c
  P.brushCells = function (c, rings) {
    const seen = new Set([c]); let front = [c];
    for (let k = 0; k < rings; k++) { const nx = []; for (const i of front) for (const j of this.nb[i]) if (!seen.has(j)) { seen.add(j); nx.push(j); } front = nx; }
    return [...seen];
  };
  P.newStateAt = function (c, name, gov = 'kingdom') {
    const key = this.culture[c];
    const p = this._newPolity(name || this._genName(key), key, null, gov === 'khanate');
    p.tech.set(this.cellTech[c]); p.fx = this._fxOf(p.tech); p.capital = c; p.gov = gov; p.stability = 0.7; p.legitBase = 0.1;
    p.rel = this.rel ? this.rel[c] : -1; p.people = this.ppl ? this.ppl[c] : -1;
    this.owner[c] = p.id;
    if (this._newRuler) this._newRuler(p, true);
    if (this._instInit) { p.inst = {}; this._instInit(p); }
    if (this._ideoState) this._ideoState(p);
    return p;
  };
  P.paint = function (cells, kind, value) {
    for (const c of cells) {
      if (kind === 'state') { this.owner[c] = value; if (value >= 0) this.cellTech[c].set(this.polities[value].tech); }
      else if (kind === 'people' && this.ppl) { this.ppl[c] = value; this.ppl2[c] = 65535; this.mix[c] = 0; this.culture[c] = this.peoples[value].key; }
      else if (kind === 'faith' && this.rel) this.rel[c] = value;
      else if (kind === 'pop') { this.pop[c] = value === 0 ? 0 : Math.max(this.pop[c], 200) * value; this.granary[c] = this.pop[c] * 0.3; }
    }
    this._afterEdit();
  };
  // keep states consistent: capitals, the dead, the living
  P._afterEdit = function () {
    const count = new Map();
    for (let i = 0; i < this.N; i++) { const o = this.owner[i]; if (o >= 0) count.set(o, (count.get(o) || 0) + 1); }
    for (const p of this.polities) {
      const n = count.get(p.id) || 0;
      if (!n) { if (p.alive) { p.alive = false; p.ended = this.year; } continue; }
      if (!p.alive) { p.alive = true; p.ended = null; }
      if (p.capital < 0 || this.owner[p.capital] !== p.id) { let best = -1; for (let i = 0; i < this.N; i++) if (this.owner[i] === p.id && (best < 0 || this.pop[i] > this.pop[best])) best = i; p.capital = best; }
    }
    this._aggregate();
  };
  // a scenario file: everything needed to rebuild this start
  P.exportStart = function (title) {
    const names = this.polities.map(p => p.name), used = new Set();
    for (let i = 0; i < this.N; i++) if (this.owner[i] >= 0) used.add(this.owner[i]);
    const ids = [...used], idx = new Map(ids.map((id, k) => [id, k]));
    return {
      worldsim: 1, title: title || `My world, ${this.year}`, year: this.year, seed: this.seed, base: this.scenario || 1, blind: !!this.opts.blind,
      states: ids.map(id => { const p = this.polities[id]; return { name: p.name, gov: p.gov, color: p.color, capital: p.capital, techs: [...p.tech].map((v, k) => v ? k : -1).filter(k => k >= 0) }; }),
      owner: Array.from(this.owner, o => o >= 0 ? idx.get(o) : -1),
      peoples: this.ppl ? this.peoples.map(q => q.name) : [], ppl: this.ppl ? Array.from(this.ppl) : [],
      faiths: this.faiths ? this.faiths.map(f => ({ name: f.name, color: f.color, miss: f.miss, universal: f.universal, conquest: f.conquest, founded: f.founded })) : [], rel: this.rel ? Array.from(this.rel) : [],
      pop: Array.from(this.pop, v => Math.round(v)),
      mods: this.mods ? { ...this.mods, events: this.mods.events.map(e => ({ ...e, ...(e.cell >= 0 ? { lon: this.lon[e.cell], lat: this.lat[e.cell] } : {}) })) } : undefined,
    };
  };
  P.importStart = function (s) {
    const N = this.N;
    if (!s || s.worldsim !== 1 || s.owner.length !== N) throw new Error('This is not a WorldSim scenario file for this map.');
    this.year = s.year;
    this.polities = []; this.wars = []; this.alliances = []; this.truces = new Map(); this.warGroups = []; this.warPairs = new Map(); this._alDirty = true; this.armies = []; this.works = [];
    // faiths and peoples by name, adding any the file brings
    if (this.faiths && s.faiths.length) { for (const f of s.faiths) if (!this.faiths.some(x => x.name === f.name)) this.faiths.push({ id: this.faiths.length, cells: 0, pop: 0, ...f }); }
    const fmap = s.faiths.map(f => this.faiths.findIndex(x => x.name === f.name));
    const pmap = s.peoples.map(n => this.peoples.findIndex(q => q.name === n));
    for (let i = 0; i < N; i++) {
      this.pop[i] = s.pop[i]; this.granary[i] = this.pop[i] * 0.3;
      if (this.ppl && s.ppl.length) { const q = pmap[s.ppl[i]]; if (q >= 0) { this.ppl[i] = q; this.ppl2[i] = 65535; this.mix[i] = 0; this.culture[i] = this.peoples[q].key; } }
      if (this.rel && s.rel.length) { const f = s.rel[i] >= 0 ? fmap[s.rel[i]] : -1; this.rel[i] = f; }
      this.owner[i] = -1;
    }
    const ids = s.states.map(st => {
      const c = st.capital >= 0 ? st.capital : s.owner.indexOf(s.states.indexOf(st));
      const p = this.newStateAt(c, st.name, st.gov); p.color = st.color || p.color;
      p.tech.fill(0); for (const k of st.techs) p.tech[k] = 1; p.fx = this._fxOf(p.tech);
      this.owner[c] = -1; return p.id;
    });
    for (let i = 0; i < N; i++) if (s.owner[i] >= 0) { this.owner[i] = ids[s.owner[i]]; this.cellTech[i].set(this.polities[ids[s.owner[i]]].tech); }
    for (const p of this.polities) if (this.rel && p.capital >= 0) p.rel = this.rel[p.capital];
    this.history = []; this.events = []; this.shareHist = [];
    this._afterEdit();
    if (s.mods) this.applyMods(s.mods);
    if (this._initTowns) this._initTowns();
    this._log('start', `${s.title}: the year ${s.year}, ${this.polities.filter(p => p.alive).length} states.`, { big: true });
  };
}
