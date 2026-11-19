// Diasporas: merchant and refugee communities that keep their identity in foreign cities.
// Merchants follow the trade routes and settle in the cities at the other end; people fleeing war
// go to the cities their own city traded with. A community of another faith than its hosts holds on
// for centuries; one of the same faith melts away within a few generations.
// No randomness is used, and they do not change the rest of the simulation.
export function installDiaspora(World) {
  const P = World.prototype;
  P._diaspora = function (y) {
    if (y % 5 !== 0 || !this.ppl || !this.routes || this.opts.xNoDias) return;
    if (!this.dias) this.dias = new Map();
    const add = (c, q, s) => {
      if (q === this.ppl[c] || s <= 0) return;
      let m = this.dias.get(c); if (!m) { m = new Map(); this.dias.set(c, m); }
      let tot = 0; for (const v of m.values()) tot += v;
      const cur = m.get(q) || 0, room = Math.max(0, 1 - tot / 0.3) * Math.max(0, 1 - cur / 0.12);
      if (room > 0) m.set(q, cur + s * room);
    };
    // merchants along the routes
    for (const r of this.routes) {
      if (this.ppl[r.a] === this.ppl[r.b]) continue;
      const s = 0.008 * (r.w || 0.3) * (r.sea ? 1.5 : 1);
      add(r.b, this.ppl[r.a], s); add(r.a, this.ppl[r.b], s);
      // communities travel on: a diaspora in A also sends people to B
      const mA = this.dias.get(r.a); if (mA) for (const [q, sh] of mA) if (sh > 0.015) add(r.b, q, sh * 0.08);
    }
    // refugees from cities at war
    for (const ct of this.cities) {
      if (!ct.alive || ct.pop < 5e4 || !this.warZone[ct.cell]) continue;
      const dest = (this.routeAt && this.routeAt.get(ct.cell)) || [];
      let best = -1; for (const d of dest) if (!this.warZone[d] && (best < 0 || this.pop[d] > this.pop[best])) best = d;
      if (best >= 0) add(best, this.ppl[ct.cell], 0.02);
    }
    // assimilation: fast when the faith is shared, slow when it is not
    for (const [c, m] of this.dias) {
      const hostFaith = this.rel ? this.rel[c] : -1;
      for (const [q, sh] of m) {
        if (q === this.ppl[c]) { m.delete(q); continue; }
        const home = this._peopleFaith ? this._peopleFaith(q) : -1;
        const keep = home >= 0 && home !== hostFaith ? 0.99 : 0.95;
        const v = sh * keep * (this.cityAt[c] >= 0 ? 1 : 0.7);
        if (v < 0.002) m.delete(q); else m.set(q, v);
      }
      if (!m.size) this.dias.delete(c);
    }
    this._pplFaith = null;
  };
  // the main faith of a people: where most of them live (cached per diaspora pass)
  P._peopleFaith = function (q) {
    if (!this._pplFaith) {
      const t = new Map();
      for (let i = 0; i < this.N; i++) { const k = this.ppl[i] * 4096 + (this.rel[i] + 1); t.set(k, (t.get(k) || 0) + this.pop[i]); }
      const best = new Map();
      for (const [k, v] of t) { const p = Math.floor(k / 4096), f = (k % 4096) - 1; const b = best.get(p); if (!b || v > b[1]) best.set(p, [f, v]); }
      this._pplFaith = best;
    }
    const b = this._pplFaith.get(q); return b ? b[0] : -1;
  };
  P.diasporaAt = function (c) { const m = this.dias && this.dias.get(c); return m ? [...m].sort((a, b) => b[1] - a[1]) : []; };
  // how much two cities share a merchant network
  P.diaLink = function (a, b) {
    if (!this.dias) return 0;
    const ma = this.dias.get(a), mb = this.dias.get(b); let s = 0;
    if (mb) s += mb.get(this.ppl[a]) || 0;
    if (ma) s += ma.get(this.ppl[b]) || 0;
    if (ma && mb) for (const [q, v] of ma) { const w = mb.get(q); if (w) s += Math.min(v, w); }
    return Math.min(0.3, s * 2);
  };
  P.diasporaOf = function (q) {
    const out = [];
    if (this.dias) for (const [c, m] of this.dias) { const v = m.get(q); if (v) out.push([c, v]); }
    return out.sort((a, b) => b[1] * this.pop[b[0]] - a[1] * this.pop[a[0]]);
  };
}
