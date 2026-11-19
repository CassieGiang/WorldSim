// Stage C: armies as units on the map. Each side of a war fields an army with a general;
// armies march over terrain, live off the land, fight named battles and besiege cities.
// The war's front then moves where the armies are.
import { TECH_INDEX as T } from './scenario.js';

const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : n >= 1e3 ? Math.round(n / 1e3) + ',000' : String(Math.round(n));
export const GENERAL_TRAITS = {
  brilliant: { label: 'brilliant', atk: 1.3, def: 1.3 }, bold: { label: 'bold', atk: 1.15, def: 0.95, loss: 1.2 }, cautious: { label: 'cautious', atk: 0.9, def: 1.2, loss: 0.8 },
  cruel: { label: 'cruel', atk: 1.05, def: 1, sack: 2 }, beloved: { label: 'beloved by the troops', atk: 1.05, def: 1.1, morale: 1.2 }, incompetent: { label: 'incompetent', atk: 0.75, def: 0.8 },
  logistician: { label: 'a master of supply', atk: 1, def: 1, supply: 1.5 }, old: { label: 'old', atk: 0.95, def: 1.05 },
};
const TK = Object.keys(GENERAL_TRAITS);
export function armyMix(p) {
  const t = p.tech;
  if (t[T.combustion] && t[T.flight]) return 'infantry, tanks and aircraft';
  if (t[T.railways]) return 'rifle infantry and artillery';
  if (t[T.firearms]) return 'musketeers, cannon and cavalry';
  if (t[T.gunpowder]) return 'pikemen, crossbowmen and early guns';
  if (p.nomad || t[T.stirrup]) return 'horse archers and heavy cavalry';
  if (t[T.iron]) return 'iron-armed infantry, archers and cavalry';
  return 'spearmen and archers';
}

export function installArmies(World) {
  const P = World.prototype;

  P._general = function (p) {
    const r = this.rng, traits = [r.pick(TK)];
    if (r.next() < 0.3) { const t = r.pick(TK); if (!traits.includes(t)) traits.push(t); }
    return { name: this._personName(p.culture || 'latin'), traits, wins: 0, losses: 0, famous: false };
  };
  P._gfx = function (g, k) { let v = 1; for (const t of g.traits) v *= GENERAL_TRAITS[t][k] ?? 1; return v; };

  // field armies for a war: one per side, sized from the soldiers the state can spare
  P._warArmies = function (w) {
    if (!this.armies) this.armies = [];
    for (const side of ['a', 'b']) {
      const pid = w[side], p = this.polities[pid];
      let a = this.armies.find(x => x.war === w && x.pol === pid && x.alive);
      const want = (p.soldiers || 0) / Math.max(1, p.wars) * 0.7;
      if (!a) {
        const home = p.capital >= 0 ? p.capital : -1; if (home < 0) continue;
        a = { pol: pid, war: w, cell: home, size: want * 0.6, morale: 1, supply: 1, gen: this._general(p), alive: true, trail: [home], side, raised: this.year };
        this.armies.push(a);
      }
      a.size += (want - a.size) * 0.2;   // conscription and recruits fill the ranks
      a.mix = armyMix(p);
    }
    return [this.armies.find(x => x.war === w && x.pol === w.a && x.alive), this.armies.find(x => x.war === w && x.pol === w.b && x.alive)];
  };

  // one step towards a target cell, slowed by mountains, faster on roads and railways
  P._march = function (a, target) {
    if (a.cell === target) return;
    const p = this.polities[a.pol], t = p.tech;
    let steps = 1 + (t[T.horses] || p.nomad ? 1 : 0) + (t[T.roads] ? 1 : 0) + (t[T.railways] ? 3 : 0) + (t[T.combustion] ? 2 : 0);
    const D = this._pathField(target, !!t[T.sailing], a.cell);
    while (steps-- > 0 && a.cell !== target) {
      let best = -1, bd = D[a.cell] >= 0 ? D[a.cell] : 1e9, br = 9;
      const step = j => { if (D[j] < 0) return; if (D[j] < bd || (D[j] === bd && best >= 0 && this.rough[j] < br)) { bd = D[j]; best = j; br = this.rough[j]; } };
      for (const j of this.nb[a.cell]) step(j);
      if (t[T.sailing]) for (const j of this.sl[a.cell]) step(j);
      if (best < 0) {   // no way there: fall back to heading straight for it
        let gd = this.distDeg(a.cell, target);
        for (const j of this.nb[a.cell]) { const d = this.distDeg(j, target) + this.rough[j] * 1.2; if (d < gd) { gd = d; best = j; } }
        if (best < 0) break;
      }
      if (this.rough[best] > 0.6 && this.rng.next() < 0.5) steps--;   // passes and mountains slow the march
      if (this.sl[a.cell].includes(best) && !this.nb[a.cell].includes(best)) steps -= 1;   // embarking takes time
      a.cell = best; a.trail.push(best); if (a.trail.length > 12) a.trail.shift();
    }
  };
  // steps from every province to a target over land and (for seafarers) short sea crossings; cached for the year
  // the search stops a little past the army's own province, which is all the march needs
  P._pathField = function (target, sea, from) {
    if (!this._pf || this._pfYear !== this.year) { this._pf = new Map(); this._pfYear = this.year; }
    const key = target * 2 + (sea ? 1 : 0);
    let D = this._pf.get(key); if (D && (D[from] >= 0 || D.full)) return D;
    D = new Int32Array(this.N).fill(-1); D[target] = 0; D.full = true;
    const q = [target];
    for (let h = 0; h < q.length; h++) {
      const i = q[h], d = D[i] + 1;
      if (D[from] >= 0 && D[i] > D[from] + 2) { D.full = false; break; }
      for (const j of this.nb[i]) if (D[j] < 0) { D[j] = d; q.push(j); }
      if (sea) for (const j of this.sl[i]) if (D[j] < 0) { D[j] = d + 1; q.push(j); }
    }
    this._pf.set(key, D);
    return D;
  };

  // the yearly campaign: move, forage, fight. Returns how the front should move.
  P._campaign = function (w) {
    const [aA, aB] = this._warArmies(w);
    const out = { mul: 1, focusA: -1, focusB: -1, deaths: 0 };
    if (!aA || !aB) return out;
    const A = this.polities[w.a], B = this.polities[w.b];
    const close = this.distDeg(aA.cell, aB.cell);
    // the stronger side marches on the enemy's capital; the weaker moves to meet the invader
    const sA = this._strength(aA, true), sB = this._strength(aB, false);
    let tA = close < 10 ? aB.cell : B.capital, tB = close < 10 ? aA.cell : (sB > sA * 1.3 ? A.capital : aA.cell);
    // a player's standing order overrides the general's plan
    const ord = (X, enemy) => { const o = X.order; if (!o || o.until < this.year) return -1; if (o.kind === 'defend') return o.cell; return this.owner[o.cell] === enemy ? o.cell : -1; };
    const oA = ord(A, B.id), oB = ord(B, A.id); if (oA >= 0) tA = oA; if (oB >= 0) tB = oB;
    if (tA >= 0) this._march(aA, tA); if (tB >= 0) this._march(aB, tB);
    // living off the land: a big army strips a province; hunger and disease thin the ranks
    for (const a of [aA, aB]) {
      const c = a.cell, own = this.owner[c] === a.pol, food = this.pop[c] * (this.nour[c] || 1);
      const need = a.size * 1.5, ratio = Math.min(1.5, food / Math.max(1, need));
      const sup = this._gfx(a.gen, 'supply');
      a.supply = Math.max(0.2, Math.min(1, a.supply * 0.6 + 0.4 * ratio * (own ? 1.3 : 0.9) * sup));
      const sick = a.size * (0.03 + (1 - a.supply) * 0.12 + (this.malaria && this.malaria[c] > 0.2 && !(this.polities[a.pol].capital >= 0 && this.malaria[this.polities[a.pol].capital] > 0.2) ? 0.08 * this.malaria[c] : 0)) * (this.polities[a.pol].fx.death > 0.01 ? 0.4 : 1);
      a.size -= sick; out.deaths += sick;
      if (!own) { const take = this.pop[c] * (a.supply < 0.7 ? 0.05 : 0.02); this.pop[c] -= take; out.deaths += take; this.granary[c] = 0; }
    }
    // battle
    if (this.distDeg(aA.cell, aB.cell) < 3) {
      const r = this.rng;
      const sa = this._strength(aA, true) * (0.7 + r.next() * 0.6), sb = this._strength(aB, false) * (0.7 + r.next() * 0.6) * (1 + this.rough[aB.cell] * 0.6);
      const win = sa > sb ? aA : aB, lose = win === aA ? aB : aA, odds = Math.max(sa, sb) / Math.max(1e-9, Math.min(sa, sb));
      const committed = Math.min(win.size, lose.size * 2.5);
      const lL = lose.size * Math.min(0.5, 0.08 + 0.12 * Math.log(1 + odds)) * this._gfx(lose.gen, 'loss');
      const lW = committed * Math.min(0.25, 0.04 + 0.06 / odds) * this._gfx(win.gen, 'loss');
      lose.size -= lL; win.size -= lW; out.deaths += lL + lW;
      lose.morale = Math.max(0.3, lose.morale - 0.3); win.morale = Math.min(1.3, win.morale + 0.1);
      win.gen.wins++; lose.gen.losses++;
      // the loser falls back towards home
      const home = this.polities[lose.pol].capital; for (let s = 0; s < 2 && home >= 0; s++) this._march(lose, home);
      out.mul = win === aA ? 1.8 : 0.55;
      const place = this._battlePlace(win.cell), dead = lL + lW;
      const wp = this.polities[win.pol], lp = this.polities[lose.pol];
      const b = { y: this.year, cell: win.cell, name: `Battle of ${place}`, war: w.name, winner: wp.name, loser: lp.name, dead, wg: win.gen.name, lg: lose.gen.name };
      (this.battles || (this.battles = [])).push(b); if (this.battles.length > 600) this.battles.splice(0, 100);
      if (dead > 2e4) this._log('war', `Battle of ${place} (${w.name}): ${wp.name}'s ${win.gen.name} defeats ${lp.name}'s ${lose.gen.name}. ${fmt(dead)} fall.`, { cell: win.cell, pol: win.pol, deaths: dead, big: dead > 2e5 });
      if (win.gen.wins >= 4 && !win.gen.famous && wp.pop > 10e6) { win.gen.famous = true; this._log('ruler', `${win.gen.name}, ${win.gen.traits.map(t => GENERAL_TRAITS[t].label).join(' and ')}, becomes the most celebrated general of ${wp.name}.`, { pol: win.pol }); if (wp.stability < 0.4 && wp.gov !== 'democracy' && this.rng.next() < 0.25 && wp.ruler) { const old = this._rulerTitle(wp); wp.ruler.name = win.gen.name; wp.ruler.dynasty = win.gen.name.split(' ')[0]; wp.ruler.since = this.year; this._log('ruler', `${win.gen.name} marches on the capital and overthrows ${old}.`, { pol: win.pol, big: wp.pop > 20e6 }); } }
      // a beaten army that falls below a fifth of what it should be is destroyed
      if (lose.size < (this.polities[lose.pol].soldiers || 0) * 0.05) { lose.alive = false; if (dead > 1e5) this._log('war', `The army of ${lp.name} is destroyed.`, { pol: lose.pol }); }
    }
    out.focusA = aA.cell; out.focusB = aB.cell;
    return out;
  };
  P._strength = function (a, attack) {
    const p = this.polities[a.pol];
    return a.size * Math.pow(p.fx.mil, 0.8) * a.morale * a.supply * this._gfx(a.gen, attack ? 'atk' : 'def') * (attack ? 1 : p.fx.defense);
  };
  P._battlePlace = function (c) {
    const k = this._nearestCityCell ? this._nearestCityCell(c) : -1;
    if (k >= 0 && this.distDeg(k, c) < 6) return this.cityLabel(this.cities[this.cityAt[k]]);
    return this.ppl ? `the ${this.peoples[this.ppl[c]].name} country` : 'the frontier';
  };
  // sieges: a walled city holds out until an army has sat before it long enough
  P._siegeHolds = function (w, c, attacker) {
    const ck = this.cityAt[c]; if (ck < 0) return false;
    const ct = this.cities[ck]; if (!ct.alive || ct.pop < 8e4) return false;
    const def = this.polities[this.owner[c]]; if (!def || !def.tech[T.masonry]) return false;
    const a = (this.armies || []).find(x => x.alive && x.war === w && x.pol === attacker);
    if (!a || this.distDeg(a.cell, c) > 2) return true;   // no army before the walls: the city holds
    w.sieges = w.sieges || {};
    const need = (2 + Math.log10(ct.pop / 8e4) * 3) * (this.polities[attacker].tech[T.gunpowder] ? 0.5 : 1) * (this.polities[attacker].tech[T.railways] ? 0.4 : 1);
    w.sieges[c] = (w.sieges[c] || 0) + 1;
    if (w.sieges[c] < need) { if (w.sieges[c] === 1 && ct.pop > 3e5) this._log('war', `${this.polities[attacker].name} lays siege to ${this.cityLabel(ct)}.`, { cell: c, pol: attacker }); return true; }
    if (ct.pop > 3e5) this._log('war', `${this.cityLabel(ct)} falls to ${this.polities[attacker].name} after a siege of ${w.sieges[c]} years.`, { cell: c, pol: attacker, big: ct.pop > 1e6 });
    delete w.sieges[c];
    return false;
  };
  P._warOverArmies = function (w) { for (const a of this.armies || []) if (a.war === w) a.alive = false; };
}
