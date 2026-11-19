// Goals, challenges and scores: something to aim for, a deadline, and an end card that measures you
// against what really happened. Plus the "since your last decision" report used by the pacing features.
import { TECHS, TECH_INDEX as T } from './scenario.js';

const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(2) + ' billion' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : n >= 1e3 ? Math.round(n / 1e3) + ',000' : String(Math.round(n));

// ambitions you can pick for any state; check(w, p, g) -> { done, fail, progress (0..1), text }
export const AMBITIONS = {
  unify: {
    label: 'Unite our people', years: 300,
    available: (w, p) => { const q = p.people >= 0 ? p.people : w.ppl[p.capital]; let tot = 0, mine = 0; for (let i = 0; i < w.N; i++) if (w.ppl[i] === q) { tot++; if (w.owner[i] === p.id) mine++; } return tot && mine / tot < 0.7; },
    describe: (w, p, g) => `Rule four fifths of the lands of the ${w.peoples[g.people].name} by ${g.deadline}.`,
    init: (w, p, g) => { g.people = p.people >= 0 ? p.people : w.ppl[p.capital]; },
    check: (w, p, g) => { let tot = 0, mine = 0; for (let i = 0; i < w.N; i++) if (w.ppl[i] === g.people) { tot++; if (w.owner[i] === p.id) mine++; } const f = tot ? mine / tot : 0; return { progress: Math.min(1, f / 0.8), done: f >= 0.8, text: `${Math.round(f * 100)}% of their lands` }; },
  },
  greatest: {
    label: 'The greatest power', years: 250,
    available: (w, p) => w._largest()[0].id !== p.id || true,
    describe: (w, p, g) => `Be the most populous state in the world in ${g.deadline}.`,
    check: (w, p, g) => { const top = w._largest()[0]; const rank = w._largest().findIndex(q => q.id === p.id) + 1; return { progress: Math.min(1, p.pop / Math.max(1, top.pop)), done: w.year >= g.deadline && top.id === p.id, fail: w.year >= g.deadline && top.id !== p.id, text: rank ? `ranked ${rank}` : 'not ranked' }; },
  },
  first: {
    label: 'First to an invention', years: 600,
    describe: (w, p, g) => `Be the first in the world to master ${TECHS[g.tech].name}.`,
    init: (w, p, g) => { const next = w._nextTechs(p).filter(k => !(TECHS[k].id in w.firstTech)); const pick = next.find(k => TECHS[k].ry > (w.year + 150)) ?? next[0] ?? T.printing; g.tech = pick; },
    check: (w, p, g) => { const f = w.firstTech[TECHS[g.tech].id]; if (f) return f.by === p.name ? { done: true, progress: 1, text: 'invented here first' } : { fail: true, progress: 0, text: `${f.by} got there first` }; const pr = p.prog ? p.prog[g.tech] / (TECHS[g.tech].cost * (w.techX ? w.techX[g.tech] : 1)) : 0; return { progress: Math.max(0, Math.min(1, pr)), text: p.tech[g.tech] ? 'known' : w._prereqs(p.tech, g.tech) ? `${Math.round(pr * 100)}% of the way` : 'still missing what it needs' }; },
  },
  survive: {
    label: 'Endure', years: 500,
    describe: (w, p, g) => `Still stand in ${g.deadline}, with the same capital.`,
    init: (w, p, g) => { g.capital = p.capital; },
    check: (w, p, g) => ({ progress: Math.min(1, (w.year - g.start) / (g.deadline - g.start)), done: w.year >= g.deadline && p.alive && w.owner[g.capital] === p.id, fail: !p.alive || (w.owner[g.capital] !== p.id && w.year - (g.lostAt || (g.lostAt = w.year)) > 30), text: w.owner[g.capital] === p.id ? (g.lostAt = 0, 'the capital is ours') : 'the old capital is lost' }),
  },
  outlast: {
    label: 'Outlast a rival', years: 400,
    describe: (w, p, g) => `See ${w.polities[g.rival].name} fall before ${g.deadline}.`,
    init: (w, p, g) => { const ns = [...p.neighbours].map(q => w.polities[q]).filter(Q => Q.alive).sort((a, b) => b.pop - a.pop); g.rival = (ns[0] || w._largest().find(q => q.id !== p.id)).id; },
    check: (w, p, g) => { const R = w.polities[g.rival]; return { progress: R.alive ? Math.max(0, 1 - R.pop / Math.max(1, R.peakPop)) : 1, done: !R.alive && p.alive, fail: !p.alive, text: R.alive ? `${R.name}: ${fmt(R.pop)}` : `${R.name} is no more` }; },
  },
  rich: {
    label: 'The richest land', years: 250,
    describe: (w, p, g) => `Have the highest income per person of any large state in ${g.deadline}.`,
    check: (w, p, g) => { const per = q => (q.income || 0) / Math.max(1, q.pop); const big = w.polities.filter(q => q.alive && q.pop > 2e6).sort((a, b) => per(b) - per(a)); const r = big.findIndex(q => q.id === p.id) + 1; return { progress: r ? 1 / r : 0, done: w.year >= g.deadline && r === 1, fail: w.year >= g.deadline && r !== 1, text: r ? `ranked ${r} of ${big.length}` : 'too small to rank' }; },
  },
};

// ready-made challenges: where you start, who you are, what you must do
export const CHALLENGES = [
  { id: 'viet', title: 'Đại Việt', text: 'You are a Viet governor in the Red River delta, ruled by the Han. Win independence and keep it until the year 1000.', start: 0, as: 'governor', at: [105.8, 21.0], goal: { kind: 'hold', at: [105.8, 21.0], until: 1000, independent: true } },
  { id: 'rome', title: 'Rome endures', text: 'Rule the Roman Empire. In the year 800 you must still hold both Rome and Constantinople.', start: 0, as: 'state', at: [12.5, 41.9], goal: { kind: 'holdAll', at: [[12.5, 41.9], [28.97, 41.01]], until: 800 } },
  { id: 'india', title: 'One India', text: 'Rule Magadha. Unite three quarters of India by 600.', start: 0, as: 'state', at: [85.1, 25.6], goal: { kind: 'region', box: [68, 7, 90, 30], share: 0.75, until: 600 } },
  { id: 'byz', title: 'The last Romans', text: 'Start in 1000 as the Byzantine Empire. Constantinople must still be yours in 1500.', start: 1000, as: 'state', at: [28.97, 41.01], goal: { kind: 'hold', at: [28.97, 41.01], until: 1500 } },
  { id: 'song', title: 'Song ingenuity', text: 'Start in 1000 as the Song. Invent the printing press before 1300, two lifetimes before Gutenberg.', start: 1000, as: 'state', at: [114.3, 34.8], goal: { kind: 'tech', tech: 'printing', until: 1300 } },
  { id: 'japan', title: 'Factories before Meiji', text: 'Start in 1800 as Japan. Build factories before 1860.', start: 1800, as: 'state', at: [139.7, 35.7], goal: { kind: 'tech', tech: 'industry', until: 1860 } },
  { id: 'poland', title: 'Poland restored', text: 'Start in 1800, when Poland has been carved up. Rule Warsaw as an independent state by 1900.', start: 1800, as: 'governor', at: [21.0, 52.2], goal: { kind: 'hold', at: [21.0, 52.2], until: 1900, independent: true, early: true } },
];

function checkChallenge(w, p, g) {
  const c = g.challenge, G = c.goal, past = w.year >= G.until;
  if (p && !p.alive) return { fail: true, progress: 0, text: `${p.name} has fallen` };
  if (G.kind === 'hold' || G.kind === 'holdAll') {
    if (!p && G.independent) return { progress: 0, text: 'not yet independent' };
    const cells = G.kind === 'hold' ? [g.cells[0]] : g.cells, mine = cells.filter(x => p && p.alive && w.owner[x] === p.id).length;
    const ok = mine === cells.length;
    if (G.early && ok) return { done: true, progress: 1, text: 'won' };
    return { done: past && ok, fail: past && !ok, progress: Math.min(1, (w.year - g.start) / (G.until - g.start)) * (ok ? 1 : 0.5), text: ok ? `held${G.kind === 'holdAll' ? ' (all)' : ''}` : `${cells.length - mine} lost` };
  }
  if (G.kind === 'region') {
    let tot = 0, mine = 0; for (let i = 0; i < w.N; i++) { const lo = w.lon[i], la = w.lat[i]; if (lo >= G.box[0] && la >= G.box[1] && lo <= G.box[2] && la <= G.box[3]) { tot++; if (p && w.owner[i] === p.id) mine++; } }
    const f = tot ? mine / tot : 0;
    return { done: f >= G.share, fail: past && f < G.share, progress: Math.min(1, f / G.share), text: `${Math.round(f * 100)}% of the region` };
  }
  if (G.kind === 'tech') {
    const k = T[G.tech], has = p && p.tech[k];
    return { done: !!has, fail: past && !has, progress: has ? 1 : p && p.prog ? Math.max(0, Math.min(1, p.prog[k] / TECHS[k].cost)) : 0, text: has ? 'achieved' : `${TECHS[k].name}: not yet` };
  }
  return { progress: 0, text: '' };
}

export function installGoals(World) {
  const P = World.prototype;
  // the province a challenge is about: the nearest one that someone rules
  P.challengeCell = function (c) { return this._nearest(c.at[0], c.at[1], i => this.owner[i] >= 0); };
  // set an ambition for a state (or a challenge goal); one per seat
  P.setGoal = function (pid, kind, opts = {}) {
    if (!this.goals) this.goals = [];
    this.goals = this.goals.filter(g => g.pol !== pid || g.status !== 'active');
    if (!kind) return null;
    const p = this.polities[pid];
    const g = { pol: pid, kind, start: this.year, status: 'active', progress: 0, text: '', snap: this._snapshot(p), ...opts };
    if (kind === 'challenge') { g.deadline = g.challenge.goal.until; g.cells = (g.challenge.goal.at && Array.isArray(g.challenge.goal.at[0]) ? g.challenge.goal.at : g.challenge.goal.at ? [g.challenge.goal.at] : []).map(([lo, la]) => this._nearest(lo, la, c => this.owner[c] >= 0)); g.describe = g.challenge.text; }
    else { const A = AMBITIONS[kind]; g.deadline = Math.min(2026, this.year + A.years); if (A.init) A.init(this, p, g); g.describe = A.describe(this, p, g); }
    this.goals.push(g);
    this._goalsYear();
    return g;
  };
  P._snapshot = function (p) { return { y: this.year, pop: p.pop, cells: p.cells, techs: p.tech.reduce((a, b) => a + b, 0), worldPop: this.worldPop() }; };
  P._goalsYear = function () {
    if (!this.goals) return;
    for (const g of this.goals) {
      if (g.status !== 'active') continue;
      let p = this.polities[g.pol];
      let r;
      if (g.kind === 'challenge') {
        // a governor's challenge: the goal belongs to the state they found, if they rise and win
        const gv = this.governor;
        if (gv && gv === g.gov) {
          if (gv.status === 'ruler') { g.pol = gv.newState; p = this.polities[g.pol]; }
          else if (gv.status === 'ended') { this._goalEnd(g, 'lost'); continue; }
          else p = null;
        } else if (this.playerId >= 0 && this.playerId !== g.pol && !gv) { g.pol = this.playerId; p = this.polities[g.pol]; }
        r = checkChallenge(this, p, g);
      } else r = AMBITIONS[g.kind].check(this, p, g);
      g.progress = r.progress || 0; g.text = r.text || '';
      if (r.done) this._goalEnd(g, 'won');
      else if (r.fail || (this.year >= g.deadline && !r.done)) this._goalEnd(g, 'lost');
    }
  };
  P._goalEnd = function (g, how) {
    const p = this.polities[g.pol];
    g.status = how; g.ended = this.year;
    g.score = this.goalScore(g);
    this._log('goal', how === 'won' ? `Ambition fulfilled: ${g.describe}` : `Ambition failed: ${g.describe}`, { pol: g.pol, big: true });
    (this.goalEnds || (this.goalEnds = [])).push(g);
  };
  // the end card: how the state fared, compared with the world and with real history
  P.goalScore = function (g) {
    const p = this.polities[g.pol], s = g.snap, now = this._snapshot(p);
    const growth = (now.pop / Math.max(1, s.pop)) / (now.worldPop / Math.max(1, s.worldPop));
    const won = g.status === 'won';
    const pts = Math.round((won ? 1000 : 300 * (g.progress || 0)) + 200 * Math.min(3, growth) + 20 * Math.max(0, now.techs - s.techs) + (p.alive ? 200 : 0) + (won ? Math.max(0, g.deadline - this.year) * 2 : 0));
    const ours = [];
    for (const t of TECHS) { const f = this.firstTech[t.id]; if (f && f.year > s.y && t.ry > s.y) ours.push({ name: t.name, here: f.year, real: t.ry, by: f.by }); }
    return { pts, growth, years: this.year - g.start, alive: p.alive, popFrom: s.pop, popTo: now.pop, cellsFrom: s.cells, cellsTo: now.cells, techs: now.techs - s.techs, inventions: ours.slice(-6) };
  };
  // what changed since a year: for the report before each decision
  P.reportSince = function (pid, since) {
    const p = this.polities[pid]; if (!p) return null;
    const h = (p.hist || []).find(x => x[0] >= since) || null;
    const evs = this.events.filter(e => e.y >= since && (e.pol === pid || (e.text && e.text.includes(p.name))));
    const wars = this.wars.filter(w => (w.a === pid || w.b === pid) && (w.start >= since || (w.end && w.end >= since)));
    const learned = this.events.filter(e => e.y >= since && e.type === 'tech' && e.pol === pid).map(e => e.text);
    return { since, popWas: h ? h[1] : null, popNow: p.pop, cellsWas: h ? h[2] : null, cellsNow: p.cells, learned, techsWas: h ? h[4] : null, techsNow: p.fx ? p.fx.known : 0, stab: p.stability, wars: wars.map(w => ({ name: w.name, start: w.start, end: w.end, them: this.polities[w.a === pid ? w.b : w.a].name })), events: evs.slice(-6) };
  };
  // things worth stopping for: they concern a player state directly
  P.playerAlerts = function (fromIdx) {
    const ids = this.playerIds && this.playerIds.length ? this.playerIds : this.playerId >= 0 ? [this.playerId] : [];
    if (!ids.length) return [];
    const names = ids.map(i => this.polities[i].name);
    return this.events.slice(fromIdx).filter(e => (e.type === 'war' && names.some(n => e.text.includes(`attacks ${n}`))) || (e.type === 'ruler' && ids.includes(e.pol)) || (e.type === 'revolt' && names.some(n => e.text.includes(n))) || e.type === 'goal' || (e.type === 'plague' && names.some(n => e.text.includes(n))));
  };
}
