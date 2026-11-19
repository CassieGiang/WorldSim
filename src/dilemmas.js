// Dilemmas: every few years the real state of the player's country raises a choice with costs.
// Which dilemma comes depends on what is actually happening (a famine, a plague, a child on the throne,
// a strong neighbour, an empty treasury...). The effects are fixed rules; the text can be retold by the local AI.
// Only states a player controls get dilemmas, so worlds without players run exactly as before.

const pairKey = (a, b) => (a < b ? a + ':' + b : b + ':' + a);
const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(2) + ' billion' : n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : n >= 1e3 ? Math.round(n / 1e3) + ',000' : String(Math.round(n));

// each dilemma: when(world, p) -> context or null; text(ctx); options: [{ key, label, hint, apply(world, p, ctx) -> outcome text }]
export const DILEMMAS = {
  famine: {
    title: 'Hunger in the provinces',
    when: (w, p) => { const cells = w._cellsOf(p).filter(c => w.famine[c] > 0.04); return cells.length >= Math.max(2, p.cells * 0.12) ? { cells } : null; },
    text: (w, p, c) => `The harvest failed in ${c.cells.length} of our provinces. People are eating seed grain, and some are already on the roads.`,
    options: [
      { key: 'granaries', label: 'Open the state granaries', hint: 'costs a year of income; fewer deaths, the people remember', apply: (w, p, c) => { w._pay(p, 1); for (const i of c.cells) w.granary[i] += w.pop[i] * 0.25; w._stab(p, 0.05); return 'Grain carts reach the hungry provinces. The people bless the crown.'; } },
      { key: 'seize', label: 'Seize grain from the great estates', hint: 'free; fewer deaths, the nobles are angry for years', apply: (w, p, c) => { for (const i of c.cells) w.granary[i] += w.pop[i] * 0.2; w._boost(p, 'The nobles resent the seizures', { stab: -0.012 }, 8); return 'Soldiers empty the lords\' barns. The hungry eat; the lords plot.'; } },
      { key: 'nothing', label: 'Let the market decide', hint: 'free; many die, unrest', apply: (w, p) => { w._stab(p, -0.06); return 'Grain prices soar. The poor die in the lanes and the survivors do not forget.'; } },
    ],
  },
  plague: {
    title: 'Sickness at the ports',
    when: (w, p) => { const e = w.epidemics.find(e => e.front.length && e.front.some(c => w.owner[c] === p.id || w.distDeg(c, p.capital) < 15)); return e && !(p.quarantine >= w.year) ? { e } : null; },
    text: (w, p, c) => `${c.e.name} is spreading towards us. Ships and caravans arrive every day from the sick lands.`,
    options: [
      { key: 'close', label: 'Close the ports and roads', hint: 'trade income falls by a third for 4 years; the plague kills far fewer', apply: (w, p) => { p.quarantine = w.year + 4; w._boost(p, 'Ports closed against the plague', { money: 0.67 }, 4); return 'Guards turn back ships and caravans. Merchants curse; the sick lands are kept away.'; } },
      { key: 'pray', label: 'Call for prayers and processions', hint: 'cheap; faith grows stronger, crowds spread disease', apply: (w, p) => { w._stab(p, 0.03); p.plagueWorse = w.year + 3; return 'Processions fill the streets. The faithful are comforted; the sickness spreads among the crowds.'; } },
      { key: 'trade', label: 'Keep trading', hint: 'no cost now', apply: () => 'The markets stay open. Whatever comes, comes.' },
    ],
  },
  inventor: {
    title: 'An inventor at court',
    when: (w, p) => { if (p.rpRate <= 0 || w.rng.next() > 0.35) return null; const k = w._nextTechs(p)[0]; return k >= 0 ? { k } : null; },
    text: (w, p, c) => `A scholar asks for patronage. They claim to be close to mastering ${w._techName(c.k)}.`,
    options: [
      { key: 'fund', label: 'Fund the work generously', hint: 'half a year of income; that invention comes much sooner', apply: (w, p, c) => { w._pay(p, 0.5); p.prog[c.k] += w._techCost(c.k) * 0.45; return `The workshop gets its silver. Work on ${w._techName(c.k)} speeds ahead.`; } },
      { key: 'academy', label: 'Found an academy instead', hint: 'two years of income; all research +15% for 25 years', apply: (w, p) => { w._pay(p, 2); w._boost(p, 'The royal academy', { research: 1.15 }, 25); return 'An academy is founded in the capital. Scholars come from far away.'; } },
      { key: 'refuse', label: 'Send them away', hint: 'free', apply: () => 'The scholar leaves for a rival court.' },
    ],
  },
  heresy: {
    title: 'A preacher draws crowds',
    when: (w, p) => {
      if (!w.rel || p.rel < 0) return null;
      const tally = new Map(); let tot = 0;
      for (const c of w._cellsOf(p)) { tot += w.pop[c]; if (w.rel[c] >= 0 && w.rel[c] !== p.rel) tally.set(w.rel[c], (tally.get(w.rel[c]) || 0) + w.pop[c]); }
      let best = -1, bv = 0; for (const [k, v] of tally) if (v > bv) { bv = v; best = k; }
      return best >= 0 && bv > tot * 0.15 && w.rng.next() < 0.5 ? { f: best, share: bv / tot } : null;
    },
    text: (w, p, c) => `A preacher of ${w.faiths[c.f].name} draws great crowds. ${Math.round(c.share * 100)}% of our people already follow that faith, and the priests of ${w.faiths[p.rel].name} demand action.`,
    options: [
      { key: 'tolerate', label: 'Tolerate them', hint: 'calmer for decades; the other faith keeps spreading', apply: (w, p) => { w._boost(p, 'Religious tolerance', { stab: 0.006 }, 30); return 'An edict of tolerance is read in every town.'; } },
      { key: 'persecute', label: 'Persecute them', hint: 'converts many by force; unrest and fleeing scholars', apply: (w, p, c) => { let n = 0; for (const i of w._cellsOf(p)) if (w.rel[i] === c.f && w.rng.next() < 0.5) { w.rel[i] = p.rel; w.relStr[i] = 0.4; n++; } w._stab(p, -0.06); w._boost(p, 'Scholars flee the persecution', { research: 0.9 }, 15); return `The preacher is burned. ${n} provinces are forced back to the state faith; many flee.`; } },
      { key: 'convert', label: 'Convert the court to their faith', hint: 'the state changes faith; the old priests rage', apply: (w, p, c) => { const old = w.faiths[p.rel].name; p.rel = c.f; w._stab(p, -0.1); return `The ruler takes up ${w.faiths[c.f].name}. The priests of ${old} call it apostasy.`; } },
    ],
  },
  regency: {
    title: 'A child on the throne',
    when: (w, p) => p.ruler && p.ruler.age < 16 && !(p.regency >= p.ruler.since) ? {} : null,
    text: (w, p) => `${p.ruler.name} is only ${p.ruler.age}. Someone must rule until they come of age.`,
    options: [
      { key: 'council', label: 'A regency council of the great lords', hint: 'steady but slow', apply: (w, p) => { p.regency = w.year; w._boost(p, 'Regency council', { stab: 0.01, aggr: 0.6 }, 16 - p.ruler.age); return 'The great lords rule together, carefully and slowly.'; } },
      { key: 'general', label: 'Let the great general rule', hint: 'a stronger army; the general may take the throne', apply: (w, p) => { p.regency = w.year; w._boost(p, 'The general rules as regent', { mil: 1.2, aggr: 1.5, stab: -0.01 }, 16 - p.ruler.age); if (w.rng.next() < 0.35) { p.coupDue = w.year + 2 + w.rng.int(6); } return 'The general takes the seal of state and drills the army.'; } },
      { key: 'mother', label: 'The ruler\'s mother rules', hint: 'favours scholars and the court; nobles grumble', apply: (w, p) => { p.regency = w.year; w._boost(p, 'The queen mother rules', { research: 1.08, stab: -0.004 }, 16 - p.ruler.age); return 'The queen mother rules from behind a screen, and fills the court with scholars.'; } },
    ],
  },
  envoy: {
    title: 'An envoy arrives',
    when: (w, p) => {
      const ns = [...p.neighbours].map(q => w.polities[q]).filter(Q => Q.alive && !w.atWarWith(p.id, Q.id) && Q.id !== p.id);
      if (!ns.length || w.rng.next() > 0.4) return null;
      const Q = ns.sort((a, b) => b.army - a.army)[0];
      return { q: Q.id, strong: Q.army > p.army * 1.8 };
    },
    text: (w, p, c) => { const Q = w.polities[c.q]; return c.strong ? `An envoy from ${Q.name}, whose army is far larger than ours, demands yearly tribute "as a sign of friendship".` : `An envoy from ${Q.name} offers a marriage between our houses and a lasting friendship.`; },
    options: [
      { key: 'yes', label: 'Accept', hint: 'tribute: pay 2 years of income, peace for 25 years / marriage: peace and an alliance', apply: (w, p, c) => { const Q = w.polities[c.q]; w.truces.set(pairKey(p.id, Q.id), w.year + 25); if (c.strong) { w._pay(p, 2); Q.treasury += (p.income || 0) * 2; w._stab(p, -0.03); w.remember(Q.id, p.id, 15, 'paid us tribute'); return `Wagons of silver go to ${Q.name}. The border is quiet.`; } w._ally(p, Q, null, ' after a royal marriage'); w._stab(p, 0.02); w.remember(Q.id, p.id, 30, 'married into our house'); return `The wedding is celebrated in both capitals. ${Q.name} is now our friend.`; } },
      { key: 'no', label: 'Refuse', hint: 'tribute: they may attack / marriage: nothing changes', apply: (w, p, c) => { const Q = w.polities[c.q]; if (c.strong) { w._stab(p, 0.02); w.remember(Q.id, p.id, -15, 'refused us tribute'); if (w.rng.next() < 0.6) { w.truces.delete(pairKey(p.id, Q.id)); w._declare(Q, p, 'after we refused tribute'); return `The envoy leaves in anger. Within weeks the army of ${Q.name} crosses the border.`; } return `The envoy leaves in anger, but ${Q.name} does not march. Yet.`; } w.remember(Q.id, p.id, -5, 'turned down our marriage offer'); return 'The envoy is thanked and sent home.'; } },
      { key: 'insult', label: 'Insult the envoy', hint: 'pride at home; war is likely', apply: (w, p, c) => { const Q = w.polities[c.q]; w._stab(p, 0.04); w.rememberWithAllies(Q.id, p.id, -50, 'insulted our envoy', 'insulted our ally'); w.truces.delete(pairKey(p.id, Q.id)); if (w.rng.next() < 0.75) { w._declare(Q, p, 'after its envoy was insulted'); return `The envoy is sent home with a shaved beard. ${Q.name} declares war.`; } return `The envoy is sent home with a shaved beard. ${Q.name} swallows the insult, for now.`; } },
    ],
  },
  governor: {
    title: 'An over-mighty governor',
    when: (w, p) => { if (p.cells < 30 * w.K || w.rng.next() > 0.35) return null; let far = -1, fd = 0; for (const c of w._cellsOf(p)) { const d = w.distDeg(c, p.capital); if (d > fd && w.pop[c] > 1e4) { fd = d; far = c; } } return far >= 0 && fd > 12 ? { c: far } : null; },
    text: (w, p, c) => `The governor of ${w._placeName(c.c)}, far from the capital, keeps more of the taxes every year and has a guard of his own.`,
    options: [
      { key: 'autonomy', label: 'Make him a hereditary lord', hint: 'loyal for now; 10% less tax for 30 years', apply: (w, p) => { w._boost(p, 'Hereditary lords in the provinces', { money: 0.9, stab: 0.004 }, 30); return 'The governor kneels and swears loyalty as a lord of the realm.'; } },
      { key: 'recall', label: 'Recall him', hint: 'he may obey, or rise', apply: (w, p, c) => { if (w.rng.next() < 0.4) { const n = w._secedeAt ? w._secedeAt(p, c.c) : null; w._stab(p, -0.05); return n ? `The governor refuses and proclaims ${n.name}.` : 'The governor refuses; his province is in uproar.'; } w._stab(p, 0.03); return 'The governor obeys and comes home in chains. The provinces take note.'; } },
      { key: 'bribe', label: 'Buy his loyalty', hint: 'one year of income', apply: (w, p) => { w._pay(p, 1); return 'Gold and titles keep the governor loyal.'; } },
    ],
  },
  money: {
    title: 'The treasury is empty',
    when: (w, p) => (p.treasury < -(p.income || 0) * 1.5 || (p.debt || 0) > (p.income || 0) * 4) && p.income > 0 ? {} : null,
    text: (w, p) => `The treasury is empty and the lenders want their silver. The army has not been paid for months.`,
    options: [
      { key: 'tax', label: 'Raise taxes', hint: 'more income for 10 years; the people grumble', apply: (w, p) => { w._boost(p, 'Heavy taxes', { money: 1.25, stab: -0.01 }, 10); return 'New taxes on salt, doors and windows.'; } },
      { key: 'debase', label: 'Debase the coinage', hint: 'quick silver now; prices rise', apply: (w, p) => { p.treasury += (p.income || 0) * 2; if (w.priceLevel) w.priceLevel *= 1.05; w._stab(p, -0.03); return 'The mint mixes copper into the silver. The treasury fills; prices rise.'; } },
      { key: 'army', label: 'Disband part of the army', hint: 'saves money; a weaker army for years', apply: (w, p) => { p.treasury += (p.income || 0) * 1; w._boost(p, 'A smaller army', { mil: 0.8 }, 10); return 'Regiments are sent home unpaid. Some take to banditry.'; } },
    ],
  },
  surplus: {
    title: 'Full coffers',
    when: (w, p) => p.treasury > (p.income || 0) * 6 && p.income > 0 && w.rng.next() < 0.5 ? {} : null,
    text: () => 'Good years have filled the treasury. The court argues over what to do with it.',
    options: [
      { key: 'works', label: 'Roads and canals', hint: '3 years of income; more trade and stability for 40 years', apply: (w, p) => { w._pay(p, 3); w._boost(p, 'New roads and canals', { money: 1.1, stab: 0.003 }, 40); return 'Engineers lay out roads and canals across the realm.'; } },
      { key: 'army', label: 'A larger, better army', hint: '3 years of income; army +25% for 20 years', apply: (w, p) => { w._pay(p, 3); w._boost(p, 'The army is expanded', { mil: 1.25, aggr: 1.3 }, 20); return 'New regiments are raised and drilled.'; } },
      { key: 'feast', label: 'Feasts and alms', hint: '2 years of income; the people love the ruler', apply: (w, p) => { w._pay(p, 2); w._stab(p, 0.1); return 'Bread and wine for all. The ruler\'s name is cheered in every square.'; } },
    ],
  },
};
const URGENT = new Set(['famine', 'plague', 'usurped']);
const ORDER = ['usurped', 'restoration', 'famine', 'plague', 'regency', 'education', 'money', 'ultimatum', 'envoy', 'match', 'pact', 'heresy', 'governor', 'inventor', 'surplus'];

export function installDilemmas(World) {
  const P = World.prototype;
  // a far province breaks away under its governor
  P._secedeAt = function (p, c, name = null) {
    const cells = this.brushCells(c, 2).filter(i => this.owner[i] === p.id && i !== p.capital);
    if (!cells.length) return null;
    const n = this.newStateAt(cells[0], name, 'kingdom');
    for (const i of cells) this.owner[i] = n.id;
    this._declare(p, n, 'to bring the rebels back', true);
    this._afterEdit();
    this._log('revolt', `The governor of ${this._placeName(c)} rebels against ${p.name} and proclaims ${n.name}.`, { pol: n.id, big: true });
    return n;
  };
  P._cellsOf = function (p) { const out = []; for (let i = 0; i < this.N; i++) if (this.owner[i] === p.id) out.push(i); return out; };
  P._pay = function (p, years) { p.treasury = (p.treasury || 0) - (p.income || 0) * years; };
  P._stab = function (p, d) { p.stability = Math.max(0, Math.min(1, p.stability + d)); };
  // a lasting change: multipliers for money, research, mil, aggr; stab is added every year
  P._boost = function (p, label, fx, years) { (p.boosts = p.boosts || []).push({ label, fx, until: this.year + Math.max(1, Math.round(years)) }); };
  P._placeName = function (c) { const t = this.cities && this.cities.find(x => x.alive && x.cell === c); return t ? this.cityLabel(t) : `the lands of the ${this._tribeName(c)}`; };
  P._techName = function (k) { return this.constructor.TECHS ? this.constructor.TECHS[k].name : String(k); };
  P._techCost = function (k) { return this.constructor.TECHS[k].cost * (this.techX ? this.techX[k] : 1); };
  // inventions this state could make next, closest first
  P._nextTechs = function (p) {
    const T = this.constructor.TECHS, out = [];
    for (let k = 0; k < T.length; k++) if (!p.tech[k] && !T[k].noResearch && this._prereqs(p.tech, k) && !(this.techBan && this.techBan[k])) out.push(k);
    return out.sort((a, b) => (this._techCost(a) - p.prog[a]) - (this._techCost(b) - p.prog[b]));
  };
  // called once a year
  P._dilemmas = function () {
    const ids = this.playerIds && this.playerIds.length ? this.playerIds : this.playerId >= 0 ? [this.playerId] : [];
    if (!ids.length) return;
    if (!this.dilemmaQ) this.dilemmaQ = [];
    if (!this.dilemmaNext) this.dilemmaNext = {};
    if (this.year % 10 === 0) for (const id of ids) { const p = this.polities[id]; if (p && p.boosts) p.boosts = p.boosts.filter(b => b.until >= this.year); }
    for (const id of ids) {
      const p = this.polities[id];
      if (!p || !p.alive || this.dilemmaQ.some(d => d.pol === id)) continue;
      // a coup planned during a regency
      if (p.coupDue && this.year >= p.coupDue) { p.coupDue = 0; { this._newRuler(p, false, true); this._stab(p, -0.1); this._log('ruler', `The regent general seizes the throne of ${p.name}.`, { pol: p.id, big: true }); } }
      if (!(id in this.dilemmaNext)) { this.dilemmaNext[id] = this.year + 3; continue; }
      if (this.year - (p.dilemmaLast || -99) < 2) continue;
      const urgentOnly = this.year < this.dilemmaNext[id];
      const seen = p.dilemmaSeen || (p.dilemmaSeen = {});
      for (const key of ORDER) {
        if (urgentOnly && !URGENT.has(key)) continue;
        if ((seen[key] || -99) > this.year - 12) continue;   // the same kind of choice at most every 12 years
        const D = DILEMMAS[key]; if (!D) continue;
        const ctx = D.when(this, p);
        if (!ctx) continue;
        seen[key] = this.year;
        this.dilemmaQ.push({ pol: id, key, ctx, year: this.year, title: D.title, text: D.text(this, p, ctx), options: D.options.map(o => ({ key: o.key, label: o.label, hint: o.hint })) });
        this.dilemmaNext[id] = this.year + 4 + this.rng.int(5); p.dilemmaLast = this.year;
        break;
      }
    }
  };
  P.resolveDilemma = function (d, optKey) {
    this.dilemmaQ = (this.dilemmaQ || []).filter(x => x !== d);
    const p = this.polities[d.pol], D = DILEMMAS[d.key], o = D.options.find(x => x.key === optKey) || D.options[D.options.length - 1];
    if (!p || !p.alive) return '';
    const out = o.apply(this, p, d.ctx);
    (p.choices = p.choices || []).push({ y: this.year, title: D.title, choice: o.label, out });
    this._log('choice', `${p.name}: ${D.title.toLowerCase()}. ${o.label}. ${out}`, { pol: p.id });
    return out;
  };
  P.setBudget = function (p, b) { p.budget = b ? { tax: 1, army: 0.4, science: 0.2, works: 0.2, court: 0.2, ...p.budget, ...b } : null; return p.budget; };
  P.setOrder = function (p, kind, cell) {
    if (!kind) { p.order = null; return; }
    p.order = { kind, cell, since: this.year, until: this.year + 30 };
    this._log('war', kind === 'defend' ? `${p.name} orders its armies to hold ${this._placeName(cell)}.` : `${p.name} orders its armies to march on ${this._placeName(cell)}.`, { pol: p.id, cell });
  };
  P.activeBoosts = function (p) { return (p.boosts || []).filter(b => b.until >= this.year); };
}
