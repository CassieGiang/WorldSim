// Stage C, second part: war goals and peace treaties, navies and blockades,
// explorers and what each state knows of the world, piracy and banditry.
import { TECH_INDEX as T } from './scenario.js';

const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : n >= 1e3 ? Math.round(n / 1e3) + ',000' : String(Math.round(n));
export const GOAL_LABEL = { unite: 'to unite its people', provinces: 'to take provinces', tribute: 'for tribute', faith: 'for the faith', independence: 'for independence', regime: 'to overthrow its government', throne: 'for the throne' };
const BLOCKS = 36 * 18;
const blockOf = (lon, lat) => Math.min(35, Math.floor((lon + 180) / 10)) + 36 * Math.min(17, Math.floor((lat + 90) / 10));

export function installWarfare2(World) {
  const P = World.prototype;

  // ---------- war goals and treaties ----------
  P._warGoal = function (a, b, why) {
    if (/claim to the throne/.test(why || '')) return 'throne';
    if (/rebellion|independence/.test(why || '')) return 'independence';
    if (this.irred && this.irredentClaim(a, b) > 0 && this.rng.next() < 0.6) return 'unite';
    const f = this.faiths;
    if (f && a.rel >= 0 && b.rel >= 0 && a.rel !== b.rel && f[a.rel].universal && f[b.rel].universal && this.rng.next() < 0.35) return 'faith';
    if (this.ideoHostility && this.ideoHostility(a, b) > 1.2 && this.rng.next() < 0.5) return 'regime';
    if (a.pop > b.pop * 4 && this.rng.next() < 0.12) return 'tribute';
    return 'provinces';
  };
  P._treaty = function (w) {
    if (this.opts.xNoW2) return;
    const A = this.polities[w.a], B = this.polities[w.b];
    if (!A.alive || !B.alive) return;
    const aWon = w.taken > 1 || w.exB > w.exA * 1.3, bWon = w.taken < -1 || w.exA > w.exB * 1.3;
    if (!aWon && !bWon) return;
    const [W, L] = aWon ? [A, B] : [B, A];
    const place = W.capital >= 0 && this.cityAt[W.capital] >= 0 ? this.cityLabel(this.cities[this.cityAt[W.capital]]) : this._short(W.name);
    const terms = [];
    const goal = w.goal || 'provinces';
    if (goal === 'tribute' || this.rng.next() < 0.3) {
      const pay = Math.max(0, (L.income || 0) * (2 + this.rng.int(4)));
      L.treasury = (L.treasury || 0) - pay; W.treasury = (W.treasury || 0) + pay; L.reparations = { to: W.id, until: this.year + 15, per: (L.income || 0) * 0.1 };
      terms.push(`${L.name} pays reparations`);
    }
    if (goal === 'faith' && W.rel >= 0 && aWon) {
      let n = 0; for (let i = 0; i < this.N; i++) if (this.owner[i] === W.id && this.warHit[i] && this.rel[i] !== W.rel && this.rng.next() < 0.5) { this.rel[i] = W.rel; n++; }
      if (n) terms.push(`the conquered lands are made to accept ${this.faiths[W.rel].name}`);
    }
    if (goal === 'regime' && aWon && L.ideo !== undefined && W.ideo !== undefined && L.ideo !== W.ideo) {
      L.ideo = W.ideo; L.gov = W.gov; if (L.ideoFx !== undefined) L.ideoFx = W.ideoFx;
      terms.push(`${L.name} must take a ${this.ideoAdj ? this.ideoAdj(W.ideo) : 'new'} government`);
    }
    if (this._exchange && (goal === 'unite' || Math.abs(w.taken) > 1)) { const m = this._exchange(W, L); if (m > 1e5) terms.push(`a population exchange moves ${Math.round(m / 1e5) / 10} million people across the new border`); }
    if (Math.abs(w.taken) > 1) terms.push(`${L.name} cedes about ${(Math.round(Math.abs(w.taken) * this.cellArea * this.K / 1000) * 1000).toLocaleString('en')} km²`);
    if (terms.length && (A.pop + B.pop > 5e6)) this._log('peace', `Treaty of ${place}: ${terms.join('; ')}.`, { pol: W.id, big: A.pop + B.pop > 60e6 });
  };
  P._reparations = function () {
    for (const p of this.polities) {
      const r = p.reparations; if (!r || !p.alive) continue;
      if (this.year > r.until || !this.polities[r.to].alive) { delete p.reparations; continue; }
      p.treasury -= r.per; this.polities[r.to].treasury += r.per;
    }
  };

  // ---------- navies ----------
  P._navyOf = function (p) {
    if (!p.fx || !p.fx.sea) return 0;
    let coast = p.coastPop; if (coast === undefined) return 0;
    return coast * 0.01 * (p.fx.ocean ? 3 : 1) * (p.tech[T.steamships] ? 3 : 1) * (p.tech[T.flight] ? 1.5 : 1) * (p.focusNavy || 1);
  };
  P._coastPop = function () {
    for (const p of this.polities) p.coastPop = 0;
    for (let i = 0; i < this.N; i++) { const o = this.owner[i]; if (o >= 0 && this.coastal[i]) this.polities[o].coastPop += this.pop[i]; }
    for (const p of this.polities) if (p.alive) p.navy = this._navyOf(p);
  };
  P._naval = function (w) {
    if (this.opts.xNoW2) return 0;
    const A = this.polities[w.a], B = this.polities[w.b];
    if (!(A.navy > 0) || !(B.navy > 0) || this.rng.next() > 0.35) return 0;
    // the fleets meet off the coast of the weaker side
    const sa = A.navy * (0.6 + this.rng.next() * 0.8), sb = B.navy * (0.6 + this.rng.next() * 0.8);
    const [W, L] = sa > sb ? [A, B] : [B, A];
    const dead = Math.min(W.navy, L.navy) * (0.05 + this.rng.next() * 0.1);
    L.navy *= 0.7; L.blockaded = this.year + 3; w.seaControl = W.id;
    let c = -1; for (let t = 0; t < 30 && c < 0; t++) { const i = this.rng.int(this.N); if (this.owner[i] === L.id && this.coastal[i]) c = i; }
    if (c >= 0 && dead > 1000 && (A.pop + B.pop) > 10e6) this._log('war', `Naval battle off ${this._battlePlace(c)}: the fleet of ${W.name} beats ${L.name}'s; ${L.name}'s ports are blockaded.`, { cell: c, pol: W.id, deaths: dead, big: dead > 30000 });
    // sea control lets the winner land troops on the enemy coast
    if (c >= 0 && W.navy > L.navy * 2 && this.rng.next() < 0.3) { this.owner[c] = W.id; this.warHit[c] = 1; }
    return dead;
  };

  // ---------- explorers and fog of war ----------
  P._knownInit = function () { this.known = new Map(); };
  P.knownBlocks = function (p) {
    let k = this.known.get(p.id);
    if (!k) { k = new Uint8Array(BLOCKS); this.known.set(p.id, k); }
    return k;
  };
  // what a state knows: its own lands and neighbours, its trading partners' lands, and what its explorers have seen
  P._updateKnown = function () {
    for (const p of this.polities) if (p.alive && p.capital >= 0) this.knownBlocks(p);
    const blk = this.block;
    for (let i = 0; i < this.N; i++) {
      const o = this.owner[i]; if (o < 0) continue;
      const k = this.known.get(o); if (!k) continue;
      const b = blockOf(this.lon[i], this.lat[i]);
      k[b] = 1; for (const d of [-1, 1, -36, 36]) if (b + d >= 0 && b + d < BLOCKS) k[b + d] = 1;
    }
    for (const p of this.polities) {
      if (!p.alive) continue; const k = this.known.get(p.id); if (!k) continue;
      for (const q of p.tradePartners || []) { const kq = this.known.get(q); if (kq && this.rng.next() < 0.2) for (let b = 0; b < BLOCKS; b++) if (kq[b] && this.rng.next() < 0.1) k[b] = 1; }
    }
    for (const id of [...this.known.keys()]) if (!this.polities[id].alive) this.known.delete(id);
  };
  P._explore = function (y) {
    const r = this.rng;
    for (const p of this.polities) {
      if (!p.alive || p.capital < 0 || p.pop < 2e6 || r.next() > (p.fx.ocean ? 0.06 : p.fx.sea ? 0.02 : 0.008)) continue;
      const k = this.knownBlocks(p);
      // set out from a coast (or the capital) towards the nearest unknown place
      const start = p.capital, sb = blockOf(this.lon[start], this.lat[start]);
      let best = -1, bd = 1e9;
      for (let b = 0; b < BLOCKS; b++) { if (k[b]) continue; const dx = Math.min(Math.abs((b % 36) - (sb % 36)), 36 - Math.abs((b % 36) - (sb % 36))), dy = Math.abs(Math.floor(b / 36) - Math.floor(sb / 36)); const d = Math.hypot(dx, dy) + r.next() * 2; if (d < bd) { bd = d; best = b; } }
      if (best < 0) continue;
      const reach = p.fx.ocean ? 12 : p.fx.sea ? 4 : 2.5;
      if (bd > reach) continue;
      // reveal a patch around the target
      const bx = best % 36, by = Math.floor(best / 36); let found = 0, met = null;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const b = ((bx + dx + 36) % 36) + 36 * Math.max(0, Math.min(17, by + dy)); if (!k[b]) { k[b] = 1; found++; } }
      // who lives there?
      for (let t = 0; t < 40 && !met; t++) { const i = r.int(this.N); if (blockOf(this.lon[i], this.lat[i]) === best && this.pop[i] > 1000) met = i; }
      const name = this._personName(p.culture || 'latin');
      if (met !== null && (p.pop > 10e6 || bd > 5)) {
        const o = this.owner[met], who = o >= 0 ? this.polities[o].name : `the ${this.ppl ? this.peoples[this.ppl[met]].name : 'local peoples'}`;
        this._log('contact', `The explorer ${name}, ${p.fx.ocean || p.fx.sea ? 'sailing' : 'travelling'} for ${p.name}, reaches ${who}${bd > 6 ? ', far beyond any map of home' : ''}.`, { cell: met, pol: p.id, big: bd > 8 && p.pop > 20e6 });
        if (o >= 0 && o !== p.id && this.polities[o].alive) { p.tradePartners = p.tradePartners || new Set(); p.metBy = p.metBy || new Set(); p.metBy.add(o); }
      }
    }
  };
  P.knows = function (pid, c) { const k = this.known && this.known.get(pid); return !k || !!k[blockOf(this.lon[c], this.lat[c])]; };

  // ---------- pirates and bandits ----------
  P._lawless = function (y) {
    if (y % 5) return;
    const r = this.rng;
    // pirates: busy sea routes that no strong navy guards
    for (const rt of this.routes || []) {
      if (!rt.sea) continue;
      const A = this.polities[rt.pa], B = this.polities[rt.pb];
      const guard = Math.max(A.navy || 0, B.navy || 0) / Math.max(1, Math.sqrt((A.pop || 0) + (B.pop || 0)));
      rt.pirates = guard < 0.6 && r.next() < 0.25;
      if (rt.pirates) { rt.v *= 0.75; if (!this._pirLog || this._pirLog < y - 40) { this._pirLog = y; const c = rt.a; this._log('war', `Pirates prey on ships off ${this._battlePlace(c)}; trade between ${A.name} and ${B.name} suffers.`, { cell: c }); } }
    }
    // bandits: weakly held land far from the capital
    for (const p of this.polities) {
      if (!p.alive || p.pop < 2e6 || p.stability > 0.4) { if (p) p.bandits = 0; continue; }
      p.bandits = (0.4 - p.stability) * 2;
      p.treasury -= (p.income || 0) * p.bandits * 0.3;
      if (p.bandits > 0.4 && r.next() < 0.05 && p.pop > 10e6) this._log('famine', `Bandits rule the roads in the far provinces of ${p.name}; taxes go uncollected.`, { pol: p.id });
    }
  };

  P._warfare2 = function (y) {
    if (this.opts.xNoW2) return;
    if (!this.known) this._knownInit();
    if (y % 5 === 0) { this._coastPop(); this._updateKnown(); }
    this._reparations();
    this._explore(y);
    this._lawless(y);
    for (const p of this.polities) if (p.blockaded && p.blockaded < y) p.blockaded = 0;
  };
}
