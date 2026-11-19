// Stage 3: rulers and dynasties, alliances and great wars, vassals, truces.
import { NAME_PARTS } from './scenario.js';

const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(2) + ' billion' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : n >= 1e3 ? Math.round(n / 1e3) + ',000' : String(Math.round(n));

export const TRAITS = {
  ambitious: { aggr: 1.6, label: 'ambitious' },
  cautious: { aggr: 0.5, stab: 0.02, label: 'cautious' },
  wise: { research: 1.2, label: 'wise' },
  builder: { stab: 0.05, label: 'a builder' },
  cruel: { stab: -0.04, mil: 1.1, label: 'cruel' },
  pious: { holy: 1.6, stab: 0.02, label: 'pious' },
  lavish: { money: 0.85, stab: 0.02, label: 'lavish' },
  weak: { stab: -0.06, aggr: 0.7, label: 'weak' },
  conqueror: { aggr: 2.0, mil: 1.15, label: 'a conqueror' },
  reformer: { reform: 3, research: 1.05, label: 'a reformer' },
  just: { stab: 0.04, label: 'just' },
  paranoid: { stab: -0.02, aggr: 1.2, label: 'paranoid' },
};
const TRAIT_KEYS = Object.keys(TRAITS);
const ELECTED = new Set(['republic', 'democracy']);
const pairKey = (a, b) => (a < b ? a + ':' + b : b + ':' + a);

export function installPolitics(World) {
  const P = World.prototype;

  P._polInit = function () {
    this.alliances = [];
    this.truces = new Map();
    this.warGroups = [];
    this.warPairs = new Map(); for (const w of this.wars) if (!w.end) this._warStarted(w);
    for (const p of this.polities) if (p.alive) this._newRuler(p, true);
  };

  P._personName = function (culture) {
    const parts = NAME_PARTS[culture] || NAME_PARTS.latin, r = this.rng;
    let n = parts[1].length ? r.pick(parts[0]) + r.pick(parts[1]) + r.pick(['s', 'n', 'r', 'o', 'a', 'us', 'ar', 'in', 'ek', 'ai', 'em']) : r.pick(parts[0]) + ' ' + r.pick(['Gao', 'Wen', 'Jing', 'Wu', 'Xuan', 'Zhao', 'Ming', 'Hui', 'Ping', 'Cheng']);
    n = n.charAt(0).toUpperCase() + n.slice(1);
    n = n.replace(/(.)\1\1+/g, '$1$1');
    return n.length > 13 ? n.slice(0, 11) : n;
  };

  P._newRuler = function (p, initial = false, newDynasty = false) {
    const r = this.rng, cul = p.culture || 'latin';
    const prev = p.ruler;
    const dynasty = !prev || newDynasty || initial ? this._personName(cul).replace(/\s.*/, '') : prev.dynasty;
    const elected = ELECTED.has(p.gov);
    const traits = [];
    const n = r.next() < 0.35 ? 2 : 1;
    while (traits.length < n) { const t = r.pick(TRAIT_KEYS); if (!traits.includes(t)) traits.push(t); }
    const age = elected ? 40 + r.int(25) : initial ? 18 + r.int(40) : r.next() < 0.18 ? r.int(15) : 16 + r.int(30);
    let name = this._personName(cul);
    if (prev && !elected && !newDynasty && prev.name.split(' ')[0] === name.split(' ')[0]) name = name + ' II';
    if (prev) { const last = (p.reigns || (p.reigns = [])).at(-1); if (last && last.to == null) last.to = this.year; }
    p.ruler = { name, age, traits, since: this.year, dynasty, elected, term: elected ? 4 + r.int(6) : 0 };
    (p.reigns || (p.reigns = [])).push({ title: this._rulerTitle(p), from: this.year, to: null, dynasty, traits: traits.slice() });
    if (p.reigns.length > 400) p.reigns.splice(0, p.reigns.length - 400);
    return p.ruler;
  };

  P._rulerFx = function (p) {
    const fx = { aggr: 1, stab: 0, research: 1, mil: 1, holy: 1, money: 1, reform: 1 };
    if (!p.ruler) return fx;
    for (const t of p.ruler.traits) { const e = TRAITS[t]; for (const k in e) if (k !== 'label') fx[k] = k === 'stab' ? fx[k] + e[k] : fx[k] * e[k]; }
    if (p.ruler.age < 16) { fx.stab -= 0.08; fx.aggr *= 0.6; }
    if (p.boosts) { const b = this._boostFx(p); fx.stab += b.stab; fx.research *= b.research; fx.mil *= b.mil; fx.aggr *= b.aggr; }
    return fx;
  };
  // lasting effects of the player's choices (dilemmas)
  P._boostFx = function (p) {
    const fx = { stab: 0, research: 1, mil: 1, aggr: 1, money: 1 };
    if (!p.boosts) return fx;
    for (const b of p.boosts) if (b.until >= this.year) for (const k in b.fx) fx[k] = k === 'stab' ? fx[k] + b.fx[k] : fx[k] * b.fx[k];
    return fx;
  };
  P._rulerTitle = function (p) {
    if (!p.ruler) return '';
    const g = p.gov;
    const t = g === 'republic' || g === 'democracy' ? 'President' : g === 'dictatorship' ? 'Leader' : g === 'theocracy' ? 'High Priest' : g === 'khanate' ? 'Khan' : g === 'empire' ? 'Emperor' : g === 'chiefdom' ? 'Chief' : 'King';
    return `${t} ${p.ruler.name}`;
  };

  // ---------------- rulers age, die, are replaced ----------------
  P._rulers = function (y) {
    const r = this.rng;
    for (const p of this.polities) {
      if (!p.alive) continue;
      if (!p.ruler) this._newRuler(p, true);
      const R = p.ruler;
      R.age++;
      const big = p.pop > 5e6;
      if (R.elected) {
        if (y - R.since >= R.term) { const old = R.name; this._newRuler(p); if (p.pop > 50e6 && r.next() < 0.1) this._log('ruler', `${p.name} elects a new leader: ${p.ruler.name} succeeds ${old}.`, { pol: p.id }); }
        continue;
      }
      if (R.spared > y) continue;   // what-if: this ruler lives on
      const dieP = 0.006 + 0.0009 * Math.exp((R.age - 20) / 13) * (p.fx.death > 0.01 ? 0.5 : 1);
      const deposed = p.stability < 0.25 && r.next() < 0.04;
      if (r.next() >= dieP && !deposed) continue;
      const reign = y - R.since, oldName = this._rulerTitle(p);
      // succession
      const crisis = (p.stability < 0.45 ? 0.25 : 0.06) + (R.age < 25 ? 0.1 : 0) + (p.gov === 'dictatorship' ? 0.3 : 0);
      if (deposed || r.next() < crisis) {
        if (this._inheritance && p.marriedTo && r.next() < 0.5 && this._inheritance(p)) continue;
        if (r.next() < 0.45 && p.cells >= 6 * this.K) {
          this._newRuler(p, false, true);
          if (big) this._log('ruler', `${deposed ? 'Overthrown' : 'Succession crisis'} in ${p.name}: ${oldName} ${deposed ? 'is deposed' : 'dies without a clear heir'}. The usurper ${p.ruler.name} founds the House of ${p.ruler.dynasty}.`, { pol: p.id, big: p.pop > 20e6 });
          p.stability = Math.max(0, p.stability - 0.1);
          if (p.culture === 'sinitic' && p.pop > 5e6) { const old = p.name; p.name = this._genName('sinitic'); this._log('dynasty', `The ${old} falls. The ${p.name} takes the Mandate of Heaven.`, { pol: p.id, big: true }); }
        } else {
          this._newRuler(p, false, false);
          p.stability = Math.max(0, p.stability - 0.18);
          if (big) this._log('ruler', `${oldName} of ${p.name} dies after ${reign} years; rival heirs fight for the throne.`, { pol: p.id });
          if (p.stability < 0.3 && p.cells >= 4 * this.K && r.next() < 0.5) this._fragment(p);
        }
      } else {
        this._newRuler(p);
        if (p.ruler.age < 16) { p.stability -= 0.05; if (big) this._log('ruler', `${oldName} of ${p.name} dies after ${reign} years. The heir ${p.ruler.name} is ${p.ruler.age < 2 ? 'an infant' : 'only ' + p.ruler.age}; a regent rules.`, { pol: p.id }); }
        else if (p.pop > 20e6 && reign >= 40) this._log('ruler', `${oldName} of ${p.name} dies after a reign of ${reign} years. ${p.ruler.name} succeeds.`, { pol: p.id });
      }
    }
  };

  // ---------------- alliances, vassals, truces ----------------
  P.allianceOf = function (pid) {
    if (this._alDirty !== false || !this._alMap) { this._alMap = new Map(); for (const a of this.alliances) if (!a.ended) for (const m of a.members) this._alMap.set(m, a); this._alDirty = false; }
    return this._alMap.get(pid) || null;
  };
  P.allied = function (a, b) { const al = this.allianceOf(a); return !!al && al.members.has(b); };
  P.inTruce = function (a, b) { return (this.truces.get(pairKey(a, b)) || 0) > this.year; };
  P.atWarWith = function (a, b) { return (this.warPairs.get(pairKey(a, b)) || 0) > 0; };
  P._warStarted = function (w) { const k = pairKey(w.a, w.b); this.warPairs.set(k, (this.warPairs.get(k) || 0) + 1); };
  P._warEnded = function (w) { const k = pairKey(w.a, w.b); this.warPairs.set(k, Math.max(0, (this.warPairs.get(k) || 0) - 1)); };

  P._diplomacy = function (y) {
    const r = this.rng;
    // clean up
    for (const al of this.alliances) {
      if (al.ended) continue;
      for (const m of [...al.members]) if (!this.polities[m].alive) this._alDirty = true, al.members.delete(m);
      if (al.members.size < 2 || r.next() < 0.006) { al.ended = y; this._alDirty = true; if (al.members.size >= 2 && al.size >= 3) this._log('alliance', `The ${al.name} dissolves after ${y - al.since} years.`, {}); }
    }
    for (const p of this.polities) if (p.overlord != null && (!this.polities[p.overlord].alive)) p.overlord = null;
    if (y % 2) return;
    // threatened states look for friends
    for (const p of this.polities) {
      if (!p.alive || p.overlord != null || p.cells < 3 * this.K) continue;
      let threat = null, tv = 0;
      for (const q of p.neighbours) {
        const Q = this.polities[q]; if (!Q.alive || this.allied(p.id, q)) continue;
        const v = Q.army / Math.max(1, p.army) * this._rulerFx(Q).aggr * (Q.rel !== p.rel ? 1.3 : 1);
        if (v > tv) { tv = v; threat = Q; }
      }
      if (!threat || tv < 1.4 || r.next() > 0.06) continue;
      // candidate: another state that also borders the threat (or is threatened by it), prefers same faith / government
      let best = null, bs = 0;
      for (const q of threat.neighbours) {
        if (q === p.id) continue;
        const Q = this.polities[q]; if (!Q.alive || Q.overlord != null || this.atWarWith(p.id, q) || this.allied(p.id, q)) continue;
        let s = Q.army / Math.max(1, threat.army) * (this.ideoAffinity ? this.ideoAffinity(p, Q) : 1) * (Q.rel === p.rel ? 1.6 : 0.8) * (Q.gov === p.gov ? 1.2 : 1) * (p.neighbours.has(q) ? 1.2 : 1);
        if (this.atWarWith(q, threat.id)) s *= 2;
        if (s > bs) { bs = s; best = Q; }
      }
      if (best && bs > 0.15) this._ally(p, best, threat);
    }
    // vassals pay tribute, may break free
    for (const v of this.polities) {
      if (!v.alive || v.overlord == null) continue;
      const o = this.polities[v.overlord];
      const t = Math.max(0, (v.income || 0) * 0.2); v.treasury -= t; o.treasury += t;
      if ((v.army > o.army * 0.6 || o.stability < 0.25) && r.next() < 0.03) {
        v.overlord = null;
        if (v.pop > 2e6) this._log('vassal', `${v.name} throws off the rule of ${o.name}.`, { pol: v.id, big: v.pop > 15e6 });
        if (r.next() < 0.5) this._declare(o, v, 'to bring back its rebel vassal');
      } else if (v.culture === o.culture && y - (v.vassalSince || y) > 80 && r.next() < 0.004) {
        if (v.pop > 2e6) this._log('vassal', `${o.name} absorbs its vassal ${v.name}.`, { pol: o.id });
        this._annexQuiet(o, v);
      }
    }
  };

  P._ally = function (p, q, threat, why = '') {
    let al = this.allianceOf(p.id) || this.allianceOf(q.id);
    if (al && al.members.size >= 7) return;
    if (!al) {
      al = { id: this.alliances.length, members: new Set(), since: this.year, ended: null, size: 0, name: `${this._short(p.name)}–${this._short(q.name)} Alliance`, color: `hsl(${(this.alliances.length * 97) % 360},70%,60%)` };
      this.alliances.push(al);
    }
    const other = this.allianceOf(q.id); if (other && other !== al) return;
    // an alliance stays regional: newcomers must border a member (or the common threat)
    const borders = X => X.id === p.id && al.members.size === 0 || [...al.members].some(m => m === X.id || this.polities[m].neighbours.has(X.id)) || (threat && threat.neighbours.has(X.id));
    if (al.members.size && (!borders(p) || !borders(q))) return;
    const joined = [p, q].filter(X => !al.members.has(X.id));
    if (!joined.length) return;
    this._alDirty = true; al.members.add(p.id); al.members.add(q.id); al.size = Math.max(al.size, al.members.size);
    const names = joined.map(X => X.name).join(' and ');
    if (joined.reduce((s, X) => s + X.pop, 0) > 3e6) this._log('alliance', al.members.size > 2 ? `${names} ${joined.length > 1 ? 'join' : 'joins'} the ${al.name}${threat ? ` against ${threat.name}` : ''}${why}.` : `${p.name} and ${q.name} form an alliance${threat ? ` against ${threat.name}` : ''}${why}.`, { pol: p.id, big: p.pop + q.pop > 40e6 });
  };

  // declare war, pulling in allies on both sides; returns the war
  P._declare = function (A, B, why = '', silent = false) {
    if (!A.alive || !B.alive || A.id === B.id || this.atWarWith(A.id, B.id)) return null;
    const group = { id: this.warGroups.length, start: this.year, end: null, members: new Set([A.id, B.id]), wars: [], deaths: 0 };
    this.warGroups.push(group);
    const mk = (a, b) => {
      if (this.atWarWith(a.id, b.id) || a.id === b.id) return null;
      const w = { a: a.id, b: b.id, start: this.year, end: null, deaths: 0, taken: 0, exA: 0, exB: 0, startCellsB: b.cells, name: `${this._short(a.name)}–${this._short(b.name)} War`, group: group.id };
      w.goal = this._warGoal ? this._warGoal(a, b, why) : 'provinces';
      this.wars.push(w); this._warStarted(w); group.wars.push(w); group.members.add(a.id); group.members.add(b.id); a.wars++; b.wars++;
      return w;
    };
    const w = mk(A, B);
    if (!silent && A.pop + B.pop > 3e6) this._log('war', `War: ${A.name} attacks ${B.name}${why ? ' ' + why : w && w.goal !== 'provinces' ? ' ' + ({ tribute: 'to force it to pay tribute', faith: 'in a holy war', regime: 'to overthrow its government', independence: 'to win its independence', throne: 'for the throne' }[w.goal] || '') : ''}.`, { pol: A.id });
    // the defender's allies and overlord answer the call
    const callers = [];
    const alB = this.allianceOf(B.id);
    if (alB) for (const m of alB.members) if (m !== B.id && m !== A.id && this.rng.next() < 0.75) callers.push([this.polities[m], A, 'honours its alliance with ' + B.name]);
    if (B.overlord != null && B.overlord !== A.id) callers.push([this.polities[B.overlord], A, 'defends its vassal ' + B.name]);
    for (const v of this.polities) if (v.alive && v.overlord === B.id && v.id !== A.id) callers.push([v, A, 'follows its overlord ' + B.name]);
    // the attacker's allies may pile in
    const alA = this.allianceOf(A.id);
    if (alA) for (const m of alA.members) if (m !== A.id && m !== B.id && this.rng.next() < 0.35) callers.push([this.polities[m], B, 'joins its ally ' + A.name]);
    for (const [X, enemy, how] of callers) {
      if (!X.alive || this.allied(X.id, enemy.id) || X.id === enemy.id) continue;
      const ww = mk(X, enemy);
      if (ww && X.pop > 2e6) this._log('war', `${X.name} ${how} and declares war on ${enemy.name}.`, { pol: X.id });
    }
    if (group.members.size >= 4) {
      const total = [...group.members].reduce((s, m) => s + this.polities[m].pop, 0), world = this.worldPop();
      if (total > world * 0.12 && total > 30e6) {
        group.name = total > world * 0.35 ? `World War of ${this.year}` : `Great War of ${this.year}`;
        this._log('war', `The ${group.name} begins: ${group.members.size} states are drawn in.`, { big: true });
      }
    }
    return w;
  };

  P._afterPeace = function (w) {
    this.truces.set(pairKey(w.a, w.b), this.year + 15 + this.rng.int(11));
    const A = this.polities[w.a], B = this.polities[w.b];
    if (w.taken > 1) B.lostWar = this.year; else if (w.taken < -1) A.lostWar = this.year;
    // a badly beaten defender may become a vassal
    if (A.alive && B.alive && B.overlord == null && w.taken > 3 && B.army < A.army * 0.4 && this.rng.next() < 0.35) {
      B.overlord = A.id; B.vassalSince = this.year;
      const al = this.allianceOf(B.id); if (al) this._alDirty = true, al.members.delete(B.id);
      if (B.pop > 2e6) this._log('vassal', `${B.name} submits and becomes a vassal of ${A.name}.`, { pol: A.id, big: B.pop > 15e6 });
    }
    if (w.group != null) {
      const g = this.warGroups[w.group];
      g.deaths += w.deaths;
      if (!g.end && g.wars.every(x => x.end)) {
        g.end = this.year;
        if (g.name && g.deaths > 1e5) this._log('peace', `The ${g.name} ends (${g.start}–${this.year}): ${g.members.size} states fought, ${fmt(g.deaths)} dead.`, { deaths: g.deaths, big: true });
      }
    }
  };
}
