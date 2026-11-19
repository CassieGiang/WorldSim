// Dynasty play: a player's state has a ruling house with an heir you raise and marry off.
// The heir really succeeds (with the traits their education gave them); a usurper can take the
// throne, and then you choose to serve, to rise, or to wait in exile for a chance to come back.
// Only player states have heirs, so other worlds run as before.
import { DILEMMAS } from './dilemmas.js';
import { TRAITS } from './politics.js';

const EDU = {
  scholars: { label: 'Philosophers and scholars', traits: ['wise', 'reformer', 'just'] },
  soldiers: { label: 'The army camp', traits: ['conqueror', 'ambitious', 'cruel'] },
  priests: { label: 'The temple and its priests', traits: ['pious', 'just', 'cautious'] },
  court: { label: 'The pleasures of the court', traits: ['lavish', 'builder', 'weak'] },
};

export function installDynasty(World) {
  const P = World.prototype;
  P._makeHeir = function (p) {
    const R = p.ruler; if (!R || R.elected) { p.heir = null; return null; }
    const r = this.rng, age = Math.max(0, Math.min(R.age - 17, 2 + r.int(14)));
    p.heir = { name: this._personName(p.culture || 'latin'), age, traits: [], educated: false, married: null, born: this.year - age };
    if (!p.house) p.house = R.dynasty;
    return p.heir;
  };
  // called after a ruler is replaced, for player states only
  P._dynastySuccession = function (p, how) {
    if (!this.isPlayer(p.id) || !p.ruler || p.ruler.elected) return;
    const h = p.heir;
    if (how === 'heir' && h && h.age >= 0) {
      p.ruler.name = h.name; p.ruler.age = h.age; p.ruler.dynasty = p.house || p.ruler.dynasty;
      if (h.traits.length) p.ruler.traits = h.traits.slice();
      if (p.reigns && p.reigns.length) { const last = p.reigns.at(-1); last.title = this._rulerTitle(p); last.traits = p.ruler.traits.slice(); last.dynasty = p.ruler.dynasty; }
      if (h.married && h.married.pol >= 0 && this.polities[h.married.pol] && this.polities[h.married.pol].alive) p.marriedTo = { pol: h.married.pol, house: h.married.house, y: this.year };
      this._log('ruler', `${this._rulerTitle(p)} of the House of ${p.ruler.dynasty} takes the throne of ${p.name}${h.traits.length ? `, ${h.traits.map(t => TRAITS[t].label).join(' and ')}` : ''}.`, { pol: p.id, big: true });
    } else if (how === 'usurper' && p.house && p.ruler.dynasty !== p.house) {
      p.exile = { house: p.house, since: this.year, from: p.id, heir: h ? h.name : null };
      (this.dynastyEvents || (this.dynastyEvents = [])).push({ pol: p.id, kind: 'usurped', y: this.year });
    }
    this._makeHeir(p);
  };
  P._dynastyYear = function () {
    const ids = this.playerIds && this.playerIds.length ? this.playerIds : this.playerId >= 0 ? [this.playerId] : [];
    for (const id of ids) {
      const p = this.polities[id]; if (!p || !p.alive || !p.ruler || p.ruler.elected) continue;
      if (!p.heir && !p.exile) this._makeHeir(p);
      if (p.heir) p.heir.age++;
    }
  };
  P.houseInfo = function (p) {
    if (!p.ruler) return null;
    return { house: p.house || p.ruler.dynasty, ruler: p.ruler, heir: p.heir, exile: p.exile, marriedTo: p.marriedTo && this.polities[p.marriedTo.pol] ? this.polities[p.marriedTo.pol].name : null };
  };
}

DILEMMAS.education = {
  title: 'The heir\'s education',
  when: (w, p) => p.heir && !p.heir.educated && p.heir.age >= 6 && p.heir.age <= 17 ? {} : null,
  text: (w, p) => `${p.heir.name}, heir to the House of ${p.house || p.ruler.dynasty}, is ${p.heir.age}. Who shall raise the future ruler?`,
  options: Object.entries(EDU).map(([k, e]) => ({
    key: k, label: e.label, hint: `likely ${e.traits.map(t => TRAITS[t].label).join(', ')}`,
    apply: (w, p) => { const h = p.heir, t = w.rng.next() < 0.75 ? e.traits[w.rng.int(2)] : e.traits[2]; h.traits = [t]; if (w.rng.next() < 0.3) { const t2 = e.traits.find(x => x !== t); if (t2) h.traits.push(t2); } h.educated = k; return `${h.name} grows up ${h.traits.map(x => TRAITS[x].label).join(' and ')}.`; },
  })),
};
DILEMMAS.match = {
  title: 'A match for the heir',
  when: (w, p) => {
    if (!p.heir || p.heir.married || p.heir.age < 16 || p.heir.age > 30) return null;
    const cands = [...p.neighbours].map(q => w.polities[q]).filter(Q => Q.alive && Q.ruler && !Q.ruler.elected && !w.atWarWith(p.id, Q.id)).sort((a, b) => b.pop - a.pop);
    return { q: cands.length ? cands[0].id : -1 };
  },
  text: (w, p, c) => `${p.heir.name} is ${p.heir.age} and must marry. ${c.q >= 0 ? `The House of ${w.polities[c.q].ruler.dynasty}, rulers of ${w.polities[c.q].name}, has a child of the right age.` : 'No foreign court will do; it must be someone at home.'}`,
  options: [
    { key: 'foreign', label: 'A foreign princess or prince', hint: 'friendship, and one day perhaps their throne', apply: (w, p, c) => { if (c.q < 0) return 'There is no suitable foreign match.'; const Q = w.polities[c.q]; p.heir.married = { pol: Q.id, house: Q.ruler.dynasty }; p.marriedTo = { pol: Q.id, house: Q.ruler.dynasty, y: w.year }; Q.marriedTo = { pol: p.id, house: p.house || p.ruler.dynasty, y: w.year }; w.remember(Q.id, p.id, 30, 'married into our house'); return `${p.heir.name} marries into the House of ${Q.ruler.dynasty} of ${Q.name}.`; } },
    { key: 'noble', label: 'A great house at home', hint: 'the nobles are content for a generation', apply: (w, p) => { p.heir.married = { pol: -1, house: 'nobles' }; w._boost(p, 'The nobles are bound to the crown by marriage', { stab: 0.004 }, 30); return `${p.heir.name} marries the daughter of the greatest lord in the realm.`; } },
    { key: 'money', label: 'A merchant fortune', hint: 'two years of income; the nobles sneer', apply: (w, p) => { p.heir.married = { pol: -1, house: 'merchants' }; p.treasury += (p.income || 0) * 2; w._stab(p, -0.03); return `${p.heir.name} marries into a banking family. The treasury fills; the nobles sneer.`; } },
  ],
};
DILEMMAS.usurped = {
  title: 'Your house has lost the throne',
  when: (w, p) => { const e = (w.dynastyEvents || []).find(x => x.pol === p.id && x.kind === 'usurped' && !x.done); if (!e) return null; e.done = true; return { house: p.exile.house }; },
  text: (w, p, c) => `${w._rulerTitle(p)} of the House of ${p.ruler.dynasty} has seized the throne of ${p.name}. The House of ${c.house} has fled. What do you do?`,
  options: [
    { key: 'serve', label: 'Play on as the new house', hint: 'you keep the state, under its new rulers', apply: (w, p) => { p.house = p.ruler.dynasty; p.exile = null; return `You serve the House of ${p.ruler.dynasty} now.`; } },
    { key: 'rise', label: 'Raise the loyal provinces', hint: 'civil war: your house rules the provinces that rise with it', apply: (w, p, c) => {
      let far = -1, fd = 0; for (const i of w._cellsOf(p)) { const d = w.distDeg(i, p.capital); if (d > fd && w.pop[i] > 1e4) { fd = d; far = i; } }
      const n = far >= 0 ? w._secedeAt(p, far, p.culture === 'sinitic' ? `Later ${c.house}` : `Realm of the ${c.house}`) : null;
      if (!n) return 'No province will rise for the old house.';
      for (const i of w.brushCells(far, 4)) if (w.owner[i] === p.id && i !== p.capital && w.rng.next() < 0.5) w.owner[i] = n.id;
      w._afterEdit();
      if (n.ruler) { n.ruler.dynasty = c.house; n.ruler.name = p.exile && p.exile.heir ? p.exile.heir : n.ruler.name; }
      n.house = c.house; p.exile = null;
      (w.switchTo || (w.switchTo = [])).push({ from: p.id, to: n.id });
      return `The loyal provinces rise for the House of ${c.house}: ${n.name} is proclaimed.`;
    } },
    { key: 'wait', label: 'Wait in exile', hint: 'keep playing the state; if the usurpers falter, your house may return', apply: (w, p) => { p.exile.waiting = true; return `The House of ${p.exile.house} waits in exile, counting the usurpers' mistakes.`; } },
  ],
};
DILEMMAS.restoration = {
  title: 'A chance to return',
  when: (w, p) => p.exile && p.exile.waiting && p.stability < 0.4 && w.year - p.exile.since >= 5 ? {} : null,
  text: (w, p) => `The House of ${p.ruler.dynasty} is weak and hated. Friends of the House of ${p.exile.house} say the capital would open its gates to you.`,
  options: [
    { key: 'return', label: 'Return and take back the throne', hint: 'likely to work while the usurpers are weak', apply: (w, p) => { if (w.rng.next() < 0.3 + (0.4 - p.stability)) { w._newRuler(p, false, true); p.ruler.dynasty = p.exile.house; if (p.exile.heir) p.ruler.name = p.exile.heir; p.house = p.exile.house; p.exile = null; w._stab(p, 0.1); w._makeHeir(p); w._log('ruler', `The House of ${p.ruler.dynasty} returns to the throne of ${p.name}.`, { pol: p.id, big: true }); return 'The gates open. Your house rules again.'; } w._stab(p, -0.05); p.exile.since = w.year; return 'The plot is betrayed. Your friends are hanged.'; } },
    { key: 'later', label: 'Not yet', hint: 'wait for a better moment', apply: (w, p) => { p.exile.since = w.year; return 'You wait.'; } },
    { key: 'give', label: 'Give up the claim', hint: 'play on as the new house', apply: (w, p) => { p.house = p.ruler.dynasty; p.exile = null; return 'The old house gives up its claim.'; } },
  ],
};
