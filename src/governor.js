// Play as a governor: rule a region inside someone else's state. Serve, skim, protect your people's
// ways, raise a militia, and rise when the time is right. A successful revolt makes you a ruler.
import { TECH_INDEX as T } from './scenario.js';

const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : n >= 1e3 ? Math.round(n / 1e3) + ',000' : String(Math.round(n));

export function installGovernor(World) {
  const P = World.prototype;

  P.startGovernor = function (cell, people) {
    const o = this.owner[cell]; if (o < 0) return null;
    const p = this.polities[o];
    const q = people != null ? people : this.ppl ? this.ppl[cell] : 0;
    const key = this.peoples ? this.peoples[q].key : this.culture[cell];
    const nm = this._personName(key).split(' '); if (nm.length < 2 && this._surname) nm.push(this._surname(key));
    const g = this.governor = { pol: o, seat: cell, people: q, given: nm[0], surname: nm[1] || nm[0], age: 28 + this.rng.int(15), since: this.year,
      trust: 0.6, suspicion: 0.1, militia: 0, purse: 0, policy: { taxes: false, customs: false, militia: false }, status: 'governor', log: [], gen: 1 };
    this._govRegion();
    this._govLog(`${this._govTitle()} ${g.given} ${g.surname} takes up the governorship of ${this._govPlace()} for ${p.name}.`);
    return g;
  };
  P._govTitle = function () { const g = this.governor, p = this.polities[g.pol]; return p.culture === 'sinitic' ? 'Grand Protector' : p.culture === 'persian' ? 'Satrap' : p.culture === 'latin' ? 'Governor' : p.culture === 'arabic' ? 'Emir' : p.culture === 'turkic' || p.culture === 'mongolic' ? 'Beg' : 'Governor'; };
  P._govPlace = function () { const g = this.governor, k = this.cityAt[g.seat]; return k >= 0 ? this.cityLabel(this.cities[k]) : this._place ? this._place(g.seat) : 'the province'; };
  P._govLog = function (text, big = false) { const g = this.governor; g.log.push({ y: this.year, text }); this._log('council', text, { pol: g.pol, cell: g.seat, big }); };
  // the region: the seat and nearby provinces of the same state, people of the governor's own people first
  P._govRegion = function () {
    const g = this.governor, lim = Math.round(5 * this.K), seen = new Set([g.seat]), queue = [g.seat], cells = [g.seat];
    while (queue.length && cells.length < lim) {
      const c = queue.shift();
      const nb = [...this.nb[c]].sort((a, b) => (this.ppl && this.ppl[b] === g.people ? 1 : 0) - (this.ppl && this.ppl[a] === g.people ? 1 : 0));
      for (const j of nb) if (!seen.has(j) && this.owner[j] === g.pol && cells.length < lim && (!this.ppl || this.ppl[j] === g.people || this.rng.next() < 0.35)) { seen.add(j); queue.push(j); cells.push(j); }
    }
    g.cells = cells;
  };
  P.governorInfo = function () {
    const g = this.governor; if (!g) return null;
    const p = this.polities[g.pol];
    let pop = 0, mine = 0, fed = 0;
    for (const c of g.cells) { pop += this.pop[c]; if (this.ppl && this.ppl[c] === g.people) mine += this.pop[c]; fed += (this.nour[c] || 1) * this.pop[c]; }
    // the emperor's soldiers near you, and how busy he is
    const army = (p.soldiers || 0) * Math.min(1, g.cells.length / Math.max(1, p.cells) * 4) / Math.max(1, p.wars + 1);
    const odds = this._govOdds();
    return { pop, mine: pop ? mine / pop : 0, fed: pop ? fed / pop : 1, army, odds, state: p, people: this.peoples ? this.peoples[g.people] : null };
  };
  P._govOdds = function () {
    const g = this.governor, p = this.polities[g.pol];
    let pop = 0, mine = 0; for (const c of g.cells) { pop += this.pop[c]; if (this.ppl && this.ppl[c] === g.people) mine += this.pop[c]; }
    const share = pop ? mine / pop : 0, q = this.peoples ? this.peoples[g.people] : { identity: 0.5 };
    const nearArmy = (p.soldiers || 0) * Math.min(1, g.cells.length / Math.max(1, p.cells) * 4) / Math.max(1, p.wars + 1);
    const force = g.militia / Math.max(1, nearArmy);
    const far = Math.min(1, this.distDeg(g.seat, p.capital) / 25);
    let o = 0.06 + 0.25 * Math.min(1.5, force / 2) + 0.25 * (1 - p.stability) + (p.wars ? 0.12 : 0) + 0.15 * far + 0.2 * share * q.identity;
    if (p.ruler && p.ruler.age < 16) o += 0.08;
    return Math.max(0.03, Math.min(0.85, o));
  };

  P._governorYear = function (y) {
    const g = this.governor; if (!g || g.status !== 'governor') return;
    const p = this.polities[g.pol], r = this.rng;
    // the state fell or lost the seat: you serve whoever holds it now
    if (this.owner[g.seat] !== g.pol) {
      const o = this.owner[g.seat];
      if (o < 0) { g.status = 'ended'; this._govLog(`${this._govPlace()} falls into chaos and the governorship of ${g.given} ${g.surname} ends.`); return; }
      const old = p.name; g.pol = o; g.trust = 0.4; g.suspicion = 0.25; this._govRegion();
      this._govLog(`${old} has lost ${this._govPlace()}. ${g.given} ${g.surname} now governs it for ${this.polities[o].name}.`);
      return;
    }
    if (y % 10 === 0) this._govRegion();
    g.age++;
    // income of the region and what you keep
    let pop = 0; for (const c of g.cells) pop += this.pop[c];
    const share = pop / Math.max(1, p.pop), regionIncome = (p.income || 0) * share;
    if (g.policy.taxes) { const keep = regionIncome * 0.4; g.purse += keep; p.treasury -= keep; g.suspicion += 0.012 + 0.03 * (g.purse > regionIncome * 20 ? 1 : 0); for (const c of g.cells) this.granary[c] += this.pop[c] * 0.002; }
    if (g.policy.customs) { g.suspicion += 0.008; if (this.peoples) { const q = this.peoples[g.people]; q.identity = Math.min(0.95, q.identity + 0.001); } }
    if (g.policy.militia) { const raise = pop * 0.0015 * (g.purse > 0 ? 1.5 : 1); g.militia += raise; g.purse = Math.max(0, g.purse - regionIncome * 0.1); g.suspicion += 0.015 + g.militia / Math.max(1, pop) * 0.3; }
    if (!g.policy.taxes && !g.policy.customs && !g.policy.militia) { g.suspicion = Math.max(0, g.suspicion - 0.03); g.trust = Math.min(1, g.trust + 0.02); }
    g.militia *= 0.97;   // men drift home
    // the capital checks on its governors, more closely when the ruler is paranoid
    const paranoid = p.ruler && p.ruler.traits && p.ruler.traits.includes('paranoid') ? 1.6 : 1;
    if (g.suspicion > 0.7 && r.next() < (g.suspicion - 0.6) * 0.25 * paranoid) { g.status = 'recalled'; this._govLog(`${p.name} recalls ${g.given} ${g.surname} to the capital to answer charges. Rise now or obey?`, true); return; }
    // death and an heir
    const dieP = 0.006 + 0.0009 * Math.exp((g.age - 20) / 13);
    if (r.next() < dieP) {
      const heir = this._personName(this.peoples ? this.peoples[g.people].key : 'latin').split(' ')[0];
      this._govLog(`${g.given} ${g.surname} dies at ${g.age}. ${heir} ${g.surname} inherits the governorship${p.gov === 'empire' ? ' with the emperor\'s blessing' : ''}.`);
      g.given = heir; g.age = 22 + r.int(12); g.gen++; g.trust = Math.max(0.3, g.trust - 0.15); g.suspicion *= 0.6;
    }
  };
  // a choice the player makes when called back to the capital
  P.governorObey = function () {
    const g = this.governor; if (!g || g.status !== 'recalled') return;
    if (this.rng.next() < 0.5) { g.status = 'governor'; g.suspicion = 0.2; g.purse *= 0.3; g.militia = 0; this._govLog(`${g.given} ${g.surname} answers the charges in person and is sent back, poorer but alive.`); }
    else { g.status = 'ended'; this._govLog(`${g.given} ${g.surname} is found guilty in the capital and executed. The family's governorship ends.`, true); }
  };
  // rise: success makes a new state named by its people; failure ends the family's line of governors
  P.governorRevolt = function () {
    const g = this.governor; if (!g || (g.status !== 'governor' && g.status !== 'recalled')) return null;
    const p = this.polities[g.pol], odds = this._govOdds(), q = this.peoples ? this.peoples[g.people] : null;
    if (this.rng.next() < odds) {
      const name = q ? this._peopleStateName(q) : this._genName(this.culture[g.seat]);
      const n = this._newPolity(name, q ? q.key : this.culture[g.seat], null, false);
      n.tech.set(p.tech); n.prog.set(p.prog); n.fx = p.fx; n.stability = 0.6; n.capital = g.seat; n.rel = this.rel ? this.rel[g.seat] : -1; n.gov = 'kingdom'; n.people = g.people; n.legitBase = 0.08; n.treasury = g.purse;
      for (const c of g.cells) if (this.owner[c] === g.pol && c !== p.capital) this.owner[c] = n.id;
      // the rising spreads to neighbouring provinces of the same people
      const queue = [...g.cells]; let extra = 0;
      while (queue.length && extra < 12 * this.K) { const c = queue.shift(); for (const j of this.nb[c]) if (this.owner[j] === g.pol && j !== p.capital && this.ppl && this.ppl[j] === g.people && this.rng.next() < 0.6) { this.owner[j] = n.id; queue.push(j); extra++; } }
      if (this._newRuler) { this._newRuler(n, true, true); n.ruler.name = `${g.given} ${g.surname}`; n.ruler.dynasty = g.surname; n.ruler.age = g.age; }
      if (this._ideoState) this._ideoState(n);
      if (this._instInit) this._instInit(n);
      if (p.stability > 0.3 && this._declare) this._declare(p, n, 'to crush the rebellion', true);
      g.status = 'ruler'; g.newState = n.id;
      this._log('rise', `${g.given} ${g.surname}, ${this._govTitle().toLowerCase()} of ${this._govPlace()}, rises against ${p.name} and proclaims ${n.name}${q ? ` for the ${q.name}` : ''}.`, { pol: n.id, cell: g.seat, big: true });
      return n;
    }
    let dead = 0; for (const c of g.cells) { const d = this.pop[c] * 0.03; this.pop[c] -= d; dead += d; }
    this.totals.war += dead;
    g.status = 'ended';
    this._log('war', `The revolt of ${g.given} ${g.surname} in ${this._govPlace()} is crushed by ${p.name}; ${fmt(dead)} die and the rebel governor is executed.`, { pol: p.id, cell: g.seat, deaths: dead, big: true });
    return null;
  };
  // the governor's peoples are spared assimilation while customs are protected
  P.governorShield = function (c) { const g = this.governor; return g && g.status === 'governor' && g.policy.customs && g.cells.includes(c); };
}
