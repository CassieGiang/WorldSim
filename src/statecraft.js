// Statecraft between states: tributary systems around a hegemon, customs unions that can grow into
// federations, and irredentism: in the age of nations, states want the lands where their own people
// live, and peace treaties may move whole populations.
import { TECH_INDEX as T } from './scenario.js';

export function installStatecraft(World) {
  const P = World.prototype;
  P._statecraft = function (y) {
    if (this.opts.xNoW2) return;
    const r = this.rng;
    // ---- tributaries: small neighbours of a great power send tribute missions for peace and trade ----
    if (!this.opts.xNoTrib) for (const q of this.polities) {
      if (!q.alive || q.tributary == null) continue;
      const H = this.polities[q.tributary];
      if (!H.alive || this.atWarWith(H.id, q.id)) { q.tributary = null; continue; }
      const pay = Math.max(0, (q.income || 0) * 0.02); q.treasury -= pay; H.treasury += pay;
      H.tradePartners.add(q.id); q.tradePartners.add(H.id);
      if ((H.army < q.army * 2 || H.stability < 0.25) && r.next() < 0.08 || r.next() < 0.01) {
        q.tributary = null;
        if (q.pop > 2e6) this._log('vassal', `${q.name} stops sending tribute to ${H.name}.`, { pol: q.id });
      } else if (q.culture === H.culture && r.next() < 0.006) {
        if (q.pop > 2e6) this._log('vassal', `${H.name} absorbs its tributary ${q.name}.`, { pol: H.id });
        this._annexQuiet(H, q);
      }
    }
    if (y % 2 === 0 && !this.opts.xNoTrib) for (const H of this.polities) {
      if (!H.alive || H.cells < 40 * this.K || H.overlord != null) continue;
      for (const qid of H.neighbours) {
        const q = this.polities[qid];
        if (!q.alive || q.tributary != null || q.overlord != null || this.isPlayer(q.id) || this.allied(H.id, q.id) || this.atWarWith(H.id, q.id)) continue;
        if (H.army < q.army * 4 || q.cells * 8 > H.cells || r.next() > 0.03) continue;
        q.tributary = H.id;
        if (H.pop > 10e6 && q.pop > 1e6) this._log('vassal', `${q.name} sends tribute missions to the court of ${H.name}.`, { pol: q.id });
      }
    }
    // ---- customs unions (industrial allies) and federations ----
    if (y % 5 === 0 && !this.opts.xNoUnion) {
      if (!this.unions) this.unions = [];
      for (const u of this.unions) { if (u.ended) continue; for (const m of [...u.members]) if (!this.polities[m].alive) u.members.delete(m); if (u.members.size < 2) u.ended = y; }
      for (const al of this.alliances || []) {
        if (al.ended) continue;
        const ind = [...al.members].filter(m => this.polities[m].alive && this.polities[m].tech[T.industry]);
        if (ind.length < 2 || ind.some(m => this.unionOf(m))) continue;
        if (r.next() > 0.2) continue;
        const names = ind.map(m => this._short(this.polities[m].name));
        const u = { id: this.unions.length, name: `${names.slice(0, 2).join('–')} Customs Union`, members: new Set(ind), since: y, ended: null };
        this.unions.push(u);
        this._log('alliance', `${ind.map(m => this.polities[m].name).join(', ')} form the ${u.name}: no tolls between them.`, { pol: ind[0] });
      }
      // a long union of kindred states may become one federation
      for (const u of this.unions) {
        if (u.ended || y - u.since < 40 || r.next() > 0.06) continue;
        const ms = [...u.members].map(m => this.polities[m]).filter(p => p.alive && !this.isPlayer(p.id)).sort((a, b) => b.pop - a.pop);
        if (ms.length < 2) continue;
        const big = ms[0], kin = ms.slice(1).filter(p => this.ppl && this.peoples[this.ppl[p.capital]].branch === this.peoples[this.ppl[big.capital]].branch && p.neighbours.has(big.id));
        if (!kin.length) continue;
        const old = big.name;
        for (const p of kin) { this._annexQuiet(big, p); u.members.delete(p.id); }
        const q = this.peoples[this.ppl[big.capital]];
        big.name = `Federation of ${this._short(old)}`; big.gov = big.gov === 'democracy' || big.gov === 'republic' ? big.gov : 'constitutional';
        this._log('rise', `${old} and ${kin.map(p => p.name).join(', ')} unite as the ${big.name}, one state for the ${q.name}.`, { pol: big.id, big: true });
      }
    }
    // ---- irredentism: which neighbours hold lands of our people (every 5 years, in the age of nations) ----
    if (y % 5 === 0 && !this.opts.xNoIrred && this.ideoBorn && this.ideoBorn.nationalist && this.ppl) {
      this.irred = new Map();
      for (let i = 0; i < this.N; i++) {
        const o = this.owner[i]; if (o < 0) continue;
        const q = this.ppl[i];
        for (const j of this.nb[i]) {
          const p = this.owner[j]; if (p < 0 || p === o) continue;
          const P0 = this.polities[p];
          if (P0.people === q && (P0.nation || 0) > 0.25) { let s = this.irred.get(p); if (!s) { s = new Map(); this.irred.set(p, s); } s.set(o, (s.get(o) || 0) + this.pop[i]); break; }
        }
      }
    }
  };
  P.unionOf = function (pid) { return (this.unions || []).find(u => !u.ended && u.members.has(pid)) || null; };
  P.sameUnion = function (a, b) { const u = this.unionOf(a); return !!u && u.members.has(b); };
  // how much of p's own people q holds along the border (0 when not in the age of nations)
  P.irredentClaim = function (p, q) { const m = this.irred && this.irred.get(p.id); return m ? m.get(q.id) || 0 : 0; };
  // after a war in the age of nations: minorities on the wrong side of the new border are moved
  P._exchange = function (W, L) {
    if (!this.ppl || !this.ideoBorn || !this.ideoBorn.nationalist || Math.max(W.nation || 0, L.nation || 0) < 0.5) return 0;
    let moved = 0;
    const toHome = (from, to) => {
      if (to.people == null || to.people < 0 || to.capital < 0) return;
      for (let i = 0; i < this.N; i++) {
        if (this.owner[i] !== from.id || this.ppl[i] !== to.people || i === from.capital || !this.nb[i].some(j => this.owner[j] === to.id)) continue;
        const m = this.pop[i] * 0.3; this.pop[i] -= m; moved += m;
        let dest = to.capital; for (const j of this.nb[i]) if (this.owner[j] === to.id) { dest = j; break; }
        this.pop[dest] += m; if (this._carry) this._carry(i, dest, m);
        if (from.people != null && from.people >= 0 && this._mixIn) this._mixIn(i, from.people, 0.3);
      }
    };
    toHome(W, L); toHome(L, W);
    return moved;
  };
}
