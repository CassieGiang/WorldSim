// Rivals with memory: other rulers remember what a player's state did to them, and act on it.
// Opinion runs from -100 (hatred) to +100 (friendship) and fades by 3% a year. It only exists
// toward player states, so worlds without players run exactly as before.
import { DILEMMAS } from './dilemmas.js';

const pairKey = (a, b) => (a < b ? a + ':' + b : b + ':' + a);

export function installRivals(World) {
  const P = World.prototype;
  const isP = (w, id) => w.isPlayer && w.isPlayer(id);
  // q's opinion of player state p
  P.opinion = function (q, p) { const m = this.memory && this.memory.get(q + '>' + p); return m ? m.v : 0; };
  P.opinionWhy = function (q, p) { const m = this.memory && this.memory.get(q + '>' + p); return m ? m.why.slice(-3) : []; };
  P.remember = function (q, p, d, why) {
    if (q === p || !isP(this, p) || !this.polities[q] || !this.polities[q].alive) return;
    if (!this.memory) this.memory = new Map();
    const k = q + '>' + p, m = this.memory.get(k) || { v: 0, why: [] };
    m.v = Math.max(-100, Math.min(100, m.v + d)); m.why.push({ y: this.year, d, why }); if (m.why.length > 8) m.why.shift();
    this.memory.set(k, m);
  };
  // the allies of q feel some of it too
  P.rememberWithAllies = function (q, p, d, why, allyWhy) {
    this.remember(q, p, d, why);
    const al = this.allianceOf(q); if (al) for (const m of al.members) if (m !== q && m !== p) this.remember(m, p, Math.round(d * 0.4), allyWhy);
  };
  P._rivalsYear = function () {
    if (!this.memory) return;
    for (const [k, m] of this.memory) { m.v *= 0.97; if (Math.abs(m.v) < 1 && m.why.length && this.year - m.why[m.why.length - 1].y > 60) this.memory.delete(k); }
  };
  // AI war appetite against a player: hatred makes war likelier, friendship rarer
  P.rivalWarFactor = function (p, q) { if (!this.memory || !isP(this, q.id)) return 1; const o = this.opinion(p.id, q.id); return Math.max(0.25, 1 - o / 120); };
  P.neighbourOpinions = function (p) {
    const ids = new Set([...p.neighbours]); if (this.memory) for (const k of this.memory.keys()) { const [q, t] = k.split('>').map(Number); if (t === p.id) ids.add(q); }
    return [...ids].map(q => this.polities[q]).filter(Q => Q && Q.alive && Q.id !== p.id).map(Q => ({ id: Q.id, name: Q.name, v: this.opinion(Q.id, p.id), why: this.opinionWhy(Q.id, p.id), border: p.neighbours.has(Q.id) })).sort((a, b) => Math.abs(b.v) - Math.abs(a.v) || (b.border - a.border));
  };
}

// letters from rivals, as dilemmas
DILEMMAS.ultimatum = {
  title: 'An ultimatum',
  when: (w, p) => {
    for (const qid of p.neighbours) {
      const Q = w.polities[qid]; if (!Q.alive || w.atWarWith(p.id, Q.id) || w.allied(p.id, Q.id)) continue;
      if (w.opinion(Q.id, p.id) > -30 || Q.army < p.army * 1.4) continue;
      const border = w._cellsOf(p).filter(c => c !== p.capital && w.nb[c].some(j => w.owner[j] === Q.id)).sort((a, b) => w.pop[a] - w.pop[b]);
      if (border.length) return { q: Q.id, cells: border.slice(0, Math.max(1, Math.round(2 * w.K))) };
    }
    return null;
  },
  text: (w, p, c) => { const Q = w.polities[c.q], why = w.opinionWhy(Q.id, p.id).at(-1); return `${w._rulerTitle(Q)} of ${Q.name} writes: "${why ? `We have not forgotten that you ${why.why} in ${why.y}. ` : ''}Give us ${w._placeName(c.cells[0])}${c.cells.length > 1 ? ' and the lands around it' : ''}, or we will take it."`; },
  options: [
    { key: 'cede', label: 'Give up the land', hint: 'lose the border provinces; they are satisfied for now', apply: (w, p, c) => { const Q = w.polities[c.q]; for (const i of c.cells) if (w.owner[i] === p.id) { w.owner[i] = Q.id; w.cellTech[i].set(Q.tech); } w._afterEdit(); w.remember(Q.id, p.id, 35, 'gave us land'); w._stab(p, -0.05); w.truces.set(pairKey(p.id, Q.id), w.year + 15); return `${Q.name} takes the border lands. Our nobles call it a shame.`; } },
    { key: 'silver', label: 'Offer silver instead', hint: 'a year and a half of income; they may still march', apply: (w, p, c) => { const Q = w.polities[c.q]; w._pay(p, 1.5); Q.treasury += (p.income || 0) * 1.5; w.remember(Q.id, p.id, 15, 'paid us silver'); if (w.rng.next() < 0.25) { w._declare(Q, p, 'after its demand was refused'); return `${Q.name} takes the silver and marches anyway.`; } return `${Q.name} takes the silver. The border stays quiet.`; } },
    { key: 'refuse', label: 'Refuse', hint: 'war is likely', apply: (w, p, c) => { const Q = w.polities[c.q]; w._stab(p, 0.03); w.remember(Q.id, p.id, -15, 'refused our demand'); if (w.rng.next() < 0.7) { w.truces.delete(pairKey(p.id, Q.id)); w._declare(Q, p, 'after its demand was refused'); return `${Q.name} declares war.`; } return `${Q.name} blusters but does not march.`; } },
  ],
};
DILEMMAS.pact = {
  title: 'A friend asks for help',
  when: (w, p) => {
    for (const qid of p.neighbours) {
      const Q = w.polities[qid]; if (!Q.alive || w.opinion(Q.id, p.id) < 20) continue;
      const war = w.wars.find(x => !x.end && (x.a === Q.id || x.b === Q.id) && p.neighbours.has(x.a === Q.id ? x.b : x.a) && !w.atWarWith(p.id, x.a === Q.id ? x.b : x.a));
      if (war) return { q: Q.id, r: war.a === Q.id ? war.b : war.a };
    }
    return null;
  },
  text: (w, p, c) => { const Q = w.polities[c.q], R = w.polities[c.r]; return `${w._rulerTitle(Q)} of ${Q.name}, our friend, is at war with ${R.name} and asks us to march with them.`; },
  options: [
    { key: 'join', label: 'March with them', hint: 'war with their enemy; a lasting friendship', apply: (w, p, c) => { const Q = w.polities[c.q], R = w.polities[c.r]; w.playerDeclareWar(p, R); w.remember(Q.id, p.id, 30, 'fought beside us'); if (!w.allied(p.id, Q.id)) w._ally(p, Q, R, ''); return `Our army marches against ${R.name}, beside ${Q.name}.`; } },
    { key: 'silver', label: 'Send silver, not soldiers', hint: 'half a year of income', apply: (w, p, c) => { const Q = w.polities[c.q]; w._pay(p, 0.5); Q.treasury += (p.income || 0) * 0.5; w.remember(Q.id, p.id, 10, 'sent us silver in our war'); return `Silver goes to ${Q.name}. They thank us, a little coolly.`; } },
    { key: 'no', label: 'Stay out of it', hint: 'they will remember', apply: (w, p, c) => { const Q = w.polities[c.q]; w.remember(Q.id, p.id, -20, 'left us alone in our war'); return `We stay out of it. ${Q.name} will not forget.`; } },
  ],
};
