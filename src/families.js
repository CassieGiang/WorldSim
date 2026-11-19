// Stage 4: named families followed through history. Their lives are read off the province they live in.
import { NAME_PARTS, TECH_INDEX as T } from './scenario.js';

const START = [
  { lon: 112.4, lat: 34.6, label: 'the Yellow River plain' },   // near Luoyang
  { lon: 14.2, lat: 40.9, label: 'Campania' },                  // near Neapolis
  { lon: 85.1, lat: 25.6, label: 'the Ganges plain' },          // near Pataliputra
];

// what people actually did: weights by era. Most people farmed until the modern age.
// [job, weight function(facts, tech bits)]
const has = (bits, id) => bits[T[id]];
const an = j => (/^[aeiou]/i.test(j) ? 'an ' : 'a ') + j;
const JOBS = [
  ['farmer', (f, b) => (1 - f.urban) * (has(b, 'tractors') ? 0.15 : has(b, 'agri_revolution') ? 0.6 : 1) * 70 * (f.pastoral ? 0.3 : 1)],
  ['herder', (f) => f.pastoral ? 40 : 3],
  ['fisher', (f) => f.coastal && f.fish ? 8 : 0],
  ['potter', (f, b) => has(b, 'industry') ? 0.5 : 3 + 6 * f.urban],
  ['carpenter', (f, b) => 3 + 6 * f.urban],
  ['weaver', (f, b) => has(b, 'industry') ? 1 : 3 + 10 * f.urban],
  ['smith', (f, b) => has(b, 'iron') ? (f.iron ? 6 : 3) * (has(b, 'industry') ? 0.3 : 1) : 0],
  ['mason', (f, b) => has(b, 'masonry') && f.urban > 0.08 ? 3 : 0],
  ['trader', (f) => f.trade ? 6 : 1.5 * f.urban],
  ['merchant', (f, b) => has(b, 'banking') && f.city ? 6 : 0],
  ['soldier', (f) => f.war ? 18 : f.state ? 2.5 : 0.5],
  ['priest', (f) => f.state ? 1.5 : 0.8],
  ['monk', (f) => f.universal ? 1.5 : 0],
  ['scribe', (f, b) => has(b, 'writing') && f.city && !has(b, 'printing') ? 2.5 : 0],
  ['clerk', (f, b) => has(b, 'printing') && f.city ? 3 + 15 * (has(b, 'industry') ? f.urban : 0) : 0],
  ['printer', (f, b) => has(b, 'printing') && f.city && !has(b, 'computers') ? 2.5 : 0],
  ['sailor', (f, b) => f.coastal && has(b, 'sailing') ? (has(b, 'ocean_navigation') ? 6 : 2) : 0],
  ['miner', (f, b) => (f.coal || f.iron) ? (has(b, 'industry') ? 15 : 2) : 0],
  ['servant', (f, b) => f.city && !has(b, 'electricity') ? 6 : 0],
  ['factory worker', (f, b) => has(b, 'industry') ? 35 * f.urban : 0],
  ['railway worker', (f, b) => has(b, 'railways') ? 6 * f.urban : 0],
  ['shopkeeper', (f, b) => has(b, 'industry') ? 12 * f.urban : 2 * f.urban],
  ['teacher', (f, b) => has(b, 'public_education') ? 8 : 0],
  ['nurse', (f, b) => has(b, 'germ_theory') ? 6 * f.urban : 0],
  ['doctor', (f, b) => has(b, 'germ_theory') ? 2 * f.urban : 0],
  ['electrician', (f, b) => has(b, 'electricity') ? 5 * f.urban : 0],
  ['driver', (f, b) => has(b, 'combustion') ? 10 * f.urban : 0],
  ['engineer', (f, b) => has(b, 'electricity') ? 5 * f.urban : 0],
  ['office worker', (f, b) => has(b, 'computers') ? 30 * f.urban : 0],
  ['programmer', (f, b) => has(b, 'computers') ? 6 * f.urban : 0],
  ['nurse', (f, b) => has(b, 'antibiotics') ? 6 * f.urban : 0],
];

export const FAMILY_TRAITS = {
  stubborn: 'rarely moves, keeps the family trade',
  restless: 'moves often, drawn to cities',
  devout: 'clings to the old faith, often clergy',
  scholarly: 'drawn to books, schools and offices',
  brave: 'joins the army, survives it more often',
  frugal: 'survives famines better',
};
const TR = (fam, t) => fam.traits && fam.traits.includes(t);

export function installFamilies(World) {
  const P = World.prototype;

  P._famInit = function () {
    this.families = START.map((s, k) => {
      const c = this._nearest(s.lon, s.lat);
      const fam = { id: k, culture: this.culture[c], surname: null, cell: c, gen: 1, head: null, log: [], alive: true, home: s.label, lastOwner: this.owner[c], lastKnown: 0, sackSeen: 0, traits: [], builtin: true };
      fam.surname = this._surname(fam.culture);
      this._newHead(fam, 1 - this.rng.int(25), true);
      return fam;
    });
  };
  // a family the player creates, starting now in province c
  P.addFamily = function ({ surname, given, sex, job, traits = [], cell, guided = false }) {
    if (!this.families) this.families = [];
    if (!this.familyPrompts) this.familyPrompts = [];
    const c = cell;
    const fam = { id: this.families.length, culture: this.culture[c], surname: surname || this._surname(this.culture[c]), cell: c, gen: 1, head: null, log: [], alive: true, home: this._place(c), lastOwner: this.owner[c], lastKnown: 0, sackSeen: 0, traits: traits.slice(), guided, custom: true };
    this.families.push(fam);
    const age = 20 + this.rng.int(10);
    fam.head = { given: given || this._personName(fam.culture).split(' ')[0], sex: sex || (this.rng.next() < 0.5 ? 'f' : 'm'), born: this.year - age, job: job || this._jobFor(c), lifespan: 0 };
    const exp = 1 / Math.max(0.008, 0.0395 - this.cellFx[c].death);
    fam.head.lifespan = Math.max(age + 5, Math.min(95, exp * (0.9 + this.rng.next() * 0.9) + 25));
    fam.startCell = c; fam.firstHead = { ...fam.head }; fam.startTraits = traits.slice();
    this._famLog(fam, `${fam.head.given} ${fam.surname}, ${an(fam.head.job)}${traits.length ? ` (${traits.join(', ')})` : ''}, lives in ${this._place(c)}.`, 'start');
    return fam;
  };
  P.jobOptions = function (c) {
    const f = this._famFacts(c), bits = this.cellTech[c];
    return JOBS.map(([j, fn]) => [j, Math.max(0, fn(f, bits))]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([j]) => j).filter((j, k, a) => a.indexOf(j) === k);
  };
  // guided families: the engine asks instead of deciding
  P._ask = function (fam, kind, text, options) {
    if (!this.familyPrompts) this.familyPrompts = [];
    if (this.familyPrompts.some(q => q.fam === fam.id)) return;
    this.familyPrompts.push({ fam: fam.id, kind, text, options, year: this.year });
  };
  P.resolveFamily = function (prompt, key) {
    const fam = this.families[prompt.fam], h = fam.head, o = prompt.options.find(x => x.key === key) || prompt.options[0];
    this.familyPrompts = (this.familyPrompts || []).filter(q => q !== prompt);
    if (o.cell != null && o.cell !== fam.cell) {
      const from = this._place(fam.cell); fam.cell = o.cell; fam.lastOwner = this.owner[o.cell];
      this._famLog(fam, `${h.given} chooses to leave ${from} and settles in ${this._place(o.cell)}.`, 'flee');
    }
    if (o.job && o.job !== h.job) { const was = h.job; h.job = o.job; this._famLog(fam, `${h.given} chooses to become ${an(o.job)}${was ? ` instead of ${an(was)}` : ''}.`, 'job'); }
    if (o.stay) this._famLog(fam, `${h.given} chooses to stay in ${this._place(fam.cell)}.`, 'choice');
    if (o.hide) { fam.hideUntil = this.year + 3; this._famLog(fam, `${h.given} hides from the recruiters.`, 'choice'); }
    this._familyExtra(fam, o);
  };
  // the effects of the wider choices: schooling, marriage, faith, a trade, a new trait
  P._familyExtra = function (fam, o) {
    const h = fam.head;
    if (o.trait && !(fam.traits || []).includes(o.trait)) { (fam.traits || (fam.traits = [])).push(o.trait); }
    if (o.school) { fam.schooled = this.year; this._famLog(fam, `${h.given} pays for the children to learn their letters${this.cellTech[fam.cell][T.printing] ? ' at the new school' : ' with the priests'}.`, 'choice'); }
    if (o.marry) { fam.marriedUp = { kind: o.marry, y: this.year }; this._famLog(fam, `${h.given}'s eldest marries into a ${o.marry} family.`, 'choice'); }
    if (o.faith != null && this.faiths) { fam.lastRel = o.faith; fam.ownFaith = o.faith; this._famLog(fam, `${h.given} and the household ${o.faith === this.rel[fam.cell] ? 'take up' : 'hold on to'} ${this.faiths[o.faith].name}.`, 'faith'); }
    if (o.save) { fam.savings = (fam.savings || 0) + 1; this._famLog(fam, `${h.given} hides away a little silver for hard times.`, 'choice'); }
  };
  // what a guided family can do at any time
  P.familyActions = function (fam) {
    const c = fam.cell, h = fam.head, out = [];
    const city = this._nearestCityCell(c), best = this._bestRefuge(c, false);
    if (city >= 0 && this.cityAt[c] < 0) out.push({ key: 'city', group: 'Move', label: `Move to the city: ${this._place(city)}`, cell: city });
    if (best !== c) out.push({ key: 'better', group: 'Move', label: `Move to better land: ${this._place(best)}`, cell: best });
    // the frontier: empty farmland not far away
    let fr = -1, fv = 0; const ring = [...this.nb[c]]; for (const j of this.nb[c]) for (const k of this.nb[j]) for (const m of this.nb[k]) ring.push(m);
    for (const j of ring) { const v = this.capCache[j] / Math.max(1, this.pop[j]); if (this.pop[j] > 200 && v > fv && v > 1.3) { fv = v; fr = j; } }
    if (fr >= 0 && fr !== c) out.push({ key: 'frontier', group: 'Move', label: `Clear new fields on the frontier: ${this._place(fr)}`, cell: fr, job: 'farmer' });
    // abroad: the richest neighbouring state
    const o = this.owner[c];
    if (o >= 0) {
      const rich = [...this.polities[o].neighbours].map(q => this.polities[q]).filter(q => q.alive && q.capital >= 0 && (q.income || 0) / Math.max(1, q.pop) > (this.polities[o].income || 0) / Math.max(1, this.polities[o].pop)).sort((a, b) => b.pop - a.pop)[0];
      if (rich) out.push({ key: 'abroad', group: 'Move', label: `Emigrate to ${rich.name}`, cell: rich.capital });
      // overseas colonies, once the oceans are crossed
      if (this.contactYear !== null && this.polities[o].fx.ocean) { for (let t = 0; t < 60; t++) { const i = this.rng.int(this.N); if (this.owner[i] === o && this.nw[i] !== this.nw[c] && this.pop[i] > 1000) { out.push({ key: 'colony', group: 'Move', label: `Sail to the colonies: ${this._place(i)}`, cell: i }); break; } } }
    }
    out.push({ key: 'pick', group: 'Move', label: 'Move to a province I pick on the map…', pick: true });
    for (const j of this.jobOptions(c).filter(j => j !== "soldier").slice(0, 5)) if (j !== h.job) out.push({ key: 'job-' + j, group: 'Work', label: `Become ${an(j)}`, job: j });
    if (h.job !== 'soldier') out.push({ key: 'army', group: 'Work', label: 'Join the army', job: 'soldier', trait: 'brave' });
    out.push({ key: 'school', group: 'Family', label: 'Send the children to learn their letters', school: true, trait: 'scholarly' });
    out.push({ key: 'marry-m', group: 'Family', label: 'Marry the eldest into a merchant family', marry: 'merchant' });
    out.push({ key: 'marry-f', group: 'Family', label: 'Marry the eldest into a farming family nearby', marry: 'farming' });
    out.push({ key: 'save', group: 'Family', label: 'Put silver aside for hard times', save: true, trait: 'frugal' });
    if (this.rel && this.faiths) {
      const here = this.rel[c], own = fam.ownFaith ?? fam.lastRel;
      if (own != null && own !== here) { out.push({ key: 'convert', group: 'Faith', label: `Take up the local faith (${this.faiths[here].name})`, faith: here }); out.push({ key: 'keep', group: 'Faith', label: `Keep the old faith (${this.faiths[own].name})`, faith: own, trait: 'devout' }); }
      else out.push({ key: 'devout', group: 'Faith', label: `Become pillars of the ${this.faiths[here].name} community`, faith: here, trait: 'devout' });
    }
    return out;
  };
  P.familyAct = function (fam, act) { this.resolveFamily({ fam: fam.id, options: [act] }, act.key); };
  P._bestRefuge = function (c, war) {
    let best = c, bv = this.nour[c] - (war ? 0.3 : 0);
    const cand = [...this.nb[c]]; for (const j of this.nb[c]) for (const k of this.nb[j]) cand.push(k);
    for (const j of cand) { const v = this.nour[j] + (this.cityAt[j] >= 0 ? 0.08 : 0) - (this.warZone[j] ? 0.4 : 0); if (v > bv && this.pop[j] > 1000) { bv = v; best = j; } }
    return best;
  };
  P._nearestCityCell = function (c) {
    let best = -1, bd = 1e9;
    for (const ct of this.cities) { if (!ct.alive || ct.cell === c) continue; const d = this.distDeg(c, ct.cell); if (d < bd) { bd = d; best = ct.cell; } }
    return bd < 8 ? best : -1;
  };

  P._surname = function (culture) {
    const parts = NAME_PARTS[culture] || NAME_PARTS.latin, r = this.rng;
    if (culture === 'sinitic') return r.pick(['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Zhao', 'Huang', 'Zhou', 'Wu', 'Xu', 'Sun', 'Ma', 'Hu', 'Guo', 'Lin', 'He', 'Gao', 'Luo', 'Zheng']);
    const n = r.pick(parts[0]) + (parts[2].length ? r.pick(parts[2]) : '');
    return n.charAt(0).toUpperCase() + n.slice(1);
  };
  P._famFacts = function (c) {
    const o = this.owner[c], ct = this.cityAt[c] >= 0 && this.cities[this.cityAt[c]].alive ? this.cities[this.cityAt[c]] : null;
    return {
      urban: this.urban[c], city: ct ? this.cityLabel(ct) : null, coastal: this.coastal[c], fish: this.fishK[c] > 0,
      pastoral: this.arable[c] < this.area[c] * 0.05, trade: !!(this.routeAt && this.routeAt.get(c)),
      iron: this.res && (this.res[c] & 1), coal: this.res && (this.res[c] & 16), state: o >= 0 ? this.polities[o] : null,
      war: !!(this.warZone[c] || (o >= 0 && this.polities[o].wars)), universal: this.rel && this.faiths[this.rel[c]].universal,
    };
  };
  P._jobFor = function (c, parent = null) {
    const f = this._famFacts(c), bits = this.cellTech[c];
    const w = JOBS.map(([j, fn]) => [j, Math.max(0, fn(f, bits))]);
    // a child often follows the parent's trade, if it still exists here
    if (parent && this.rng.next() < 0.4) { const same = w.find(([j, v]) => j === parent && v > 0); if (same) return parent; }
    const tot = w.reduce((s, [, v]) => s + v, 0);
    let r = this.rng.next() * tot;
    for (const [j, v] of w) { r -= v; if (r <= 0) return j; }
    return 'farmer';
  };
  P._jobForFam = function (fam, c, parent) {
    if (TR(fam, 'stubborn') && parent && this.rng.next() < 0.5) return parent;
    const opts = this.jobOptions(c);
    if (fam.marriedUp && fam.marriedUp.kind === 'merchant' && this.year - fam.marriedUp.y < 40 && this.rng.next() < 0.6) { const m = opts.find(j => /merchant|trader|shopkeeper|banker/.test(j)); if (m) return m; }
    if (fam.schooled && this.year - fam.schooled < 40 && this.rng.next() < 0.6) { const m = opts.find(j => /scribe|clerk|teacher|priest|monk|doctor|engineer|printer|lawyer|programmer/.test(j)); if (m) return m; }
    for (let k = 0; k < 3; k++) {
      const j = this._jobFor(c, parent);
      if (TR(fam, 'scholarly') && !['scribe', 'clerk', 'teacher', 'printer', 'doctor', 'engineer', 'programmer', 'monk', 'priest'].includes(j) && k < 2) continue;
      if (TR(fam, 'devout') && !['priest', 'monk'].includes(j) && this.rng.next() < 0.15 && this._famFacts(c).state) return this._famFacts(c).universal ? 'monk' : 'priest';
      return j;
    }
    return this._jobFor(c, parent);
  };
  P._place = function (c) {
    const f = this._famFacts(c);
    if (f.city) return f.city;
    // name villages after the nearest city within a few provinces
    let best = null, bd = 1e9;
    for (const ct of this.cities) { if (!ct.alive) continue; const d = this.distDeg(c, ct.cell); if (d < bd) { bd = d; best = ct; } }
    if (best && bd < 4) return `a village near ${this.cityLabel(best)}`;
    return f.state ? `a village in ${f.state.name}` : `the lands of the ${this._tribeName(c)}`;
  };
  P._newHead = function (fam, born, first = false) {
    const r = this.rng, sex = r.next() < 0.5 ? 'f' : 'm';
    const given = this._personName(fam.culture).split(' ')[0];
    const job = this._jobForFam(fam, fam.cell, fam.head ? fam.head.job : null);
    fam.head = { given, sex, born, job, lifespan: 0 };
    const exp = 1 / Math.max(0.008, 0.0395 - (this.cellFx[fam.cell] ? this.cellFx[fam.cell].death : 0));
    fam.head.lifespan = Math.max(30, Math.min(95, exp * (0.9 + r.next() * 0.9) + 25));
    const where = this._place(fam.cell);
    if (first) this._famLog(fam, `${given} ${fam.surname}, ${an(job)}, lives in ${where}, in ${fam.home}.`, 'start');
    else this._famLog(fam, `Generation ${fam.gen}: ${given} ${fam.surname} takes over the family; ${sex === 'f' ? 'she' : 'he'} is ${an(job)} in ${where}.`, 'gen');
  };
  P._famLog = function (fam, text, kind, extra = {}) {
    const e = { y: this.year, fam: fam.id, kind, text };
    fam.log.push(e);
    this._log('family', `${fam.surname} family: ${text}`, { fam: fam.id, cell: fam.cell, big: kind === 'gen' || kind === 'flee' || kind === 'death', ...extra });
  };

  P._families = function (y) {
    if (!this.families) return;
    const r = this.rng;
    for (const fam of this.families) {
      if (!fam.alive) continue;
      const c = fam.cell, h = fam.head, pr = h.sex === 'f' ? 'she' : 'he', Pr = h.sex === 'f' ? 'She' : 'He', pos = h.sex === 'f' ? 'her' : 'his';
      const pop = this.pop[c] + 1, famine = this.famine[c] / pop, plague = this.plagueHit[c], war = this.warZone[c] || this.warHit[c];
      const age = y - h.born;
      let died = null;
      // what this year brings
      if (plague > 0.02) {
        if (r.next() < plague * 0.9) died = `${h.given} dies of the ${this._epidemicName(c) || 'plague'}`;
        else if (r.next() < 0.5) this._famLog(fam, r.pick([`Plague reaches ${this._place(c)}; ${h.given} buries neighbours but survives.`, `The sickness takes half the street in ${this._place(c)}. ${h.given} lives.`, `${h.given} nurses ${pos} family through the plague; not all of them recover.`]), 'plague');
      }
      if (!died && famine > 0.004) {
        if (age > 3 && r.next() < famine * 2 * (TR(fam, 'frugal') ? 0.5 : 1) * (fam.savings ? 0.5 : 1)) died = `${h.given} starves in the famine of ${y}`;
        else if (r.next() < 0.35) this._famLog(fam, r.pick([`Famine in ${this._place(c)}. ${h.given}'s family eats the seed grain to survive.`, `The harvest fails around ${this._place(c)}; ${h.given} sells the ox to buy grain.`, `Hunger in ${this._place(c)}. ${h.given} sends the youngest child to relatives.`, `A lean year: ${h.given}'s family lives on roots and bark until spring.`]), 'famine');
      }
      if (!died && war) {
        if (r.next() < 0.04 * (h.job === 'soldier' ? 2 : 1) * (TR(fam, 'brave') ? 0.6 : 1)) died = `${h.given} is killed when war reaches ${this._place(c)}`;
        else if (r.next() < 0.25) this._famLog(fam, r.pick([`Armies march through ${this._place(c)}; ${h.given}'s fields are burned.`, `Soldiers take ${h.given}'s grain and ${pos} eldest son.`, `War comes to ${this._place(c)}. ${h.given} hides the family's savings under the hearth.`]), 'war');
      }
      // city sacked
      const ck = this.cityAt[c];
      if (ck >= 0 && this.cities[ck].sacked > fam.sackSeen) { fam.sackSeen = this.cities[ck].sacked; this._famLog(fam, `${this.cityLabel(this.cities[ck])} is sacked. ${h.given} hides ${pos} children in a cellar while the city burns.`, 'war'); }
      // new rulers
      const o = this.owner[c];
      if (o !== fam.lastOwner) {
        if (o >= 0 && fam.lastOwner >= 0 && this.polities[fam.lastOwner]) this._famLog(fam, `${this.polities[o].name} takes ${this._place(c)} from ${this.polities[fam.lastOwner].name}; ${h.given} pays taxes to new masters.`, 'rule');
        fam.lastOwner = o;
      }
      // new things arrive
      const known = this.cellFx[c].known;
      if (known > fam.lastKnown && fam.lastKnown > 0) {
        const nt = Object.entries(T).filter(([id, k]) => this.cellTech[c][k]).map(([id]) => id);
        const notable = { printing: 'printed books reach', vaccination: 'vaccination comes to', railways: 'the railway reaches', electricity: 'electric light arrives in', radio: 'the first radio crackles in', antibiotics: 'antibiotics reach', computers: 'computers come to', internet: 'the internet reaches', industry: 'the first factory opens in', paper: 'paper comes to', compass: 'ships with compasses sail from' };
        const fresh = nt.filter(id => notable[id] && !fam['saw_' + id]);
        if (fresh.length) { const id = fresh[fresh.length - 1]; fam['saw_' + id] = true; if (r.next() < 0.7) this._famLog(fam, `${notable[id].charAt(0).toUpperCase() + notable[id].slice(1)} ${this._place(c)} in ${h.given}'s lifetime.`, 'tech'); }
      }
      fam.lastKnown = known;
      // the family's faith follows its neighbours
      if (this.rel && fam.lastRel !== undefined && this.rel[c] !== fam.lastRel && r.next() < (TR(fam, 'devout') ? 0.15 : 0.6)) this._famLog(fam, `${h.given} and ${pos} household take up ${this.faiths[this.rel[c]].name}, like their neighbours.`, 'faith');
      if (this.rel) fam.lastRel = this.rel[c];
      if (!died && age >= h.lifespan) died = `${h.given} dies at ${age}`;
      // hard times: move away (to better-fed land, or to a city)
      const moveRate = (war ? 0.12 : 0.06) * (TR(fam, 'stubborn') ? 0.35 : 1) * (TR(fam, 'restless') ? 2.5 : 1);
      if (!died && fam.guided && (this.nour[c] < 0.9 || war) && r.next() < (war ? 0.2 : 0.1)) {
        const best = this._bestRefuge(c, war), city = this._nearestCityCell(c), opts = [{ key: 'stay', label: 'Stay and endure', stay: true }];
        if (best !== c) opts.push({ key: 'flee', label: `Flee to ${this._place(best)}`, cell: best });
        if (city >= 0 && city !== best) opts.push({ key: 'city', label: `Go to the city: ${this._place(city)}`, cell: city });
        if (war && h.job !== 'soldier' && age > 15 && age < 45) opts.push({ key: 'enlist', label: 'Enlist in the army', job: 'soldier' });
        if (opts.length > 1) this._ask(fam, war ? 'war' : 'famine', war ? `War has come to ${this._place(c)}. What does ${h.given} do?` : `Hunger in ${this._place(c)}. What does ${h.given} do?`, opts);
      } else if (!died && !fam.guided && (this.nour[c] < 0.9 || war || (TR(fam, 'restless') && this.cityAt[c] < 0)) && r.next() < moveRate) {
        const best = TR(fam, 'restless') && !war && this.nour[c] >= 0.9 ? Math.max(-1, this._nearestCityCell(c)) : this._bestRefuge(c, war);
        if (best >= 0 && best !== c) {
          const from = this._place(c); fam.cell = best; fam.lastOwner = this.owner[best];
          if (this._place(best) !== from) this._famLog(fam, `${h.given} ${war ? 'flees the fighting' : 'leaves the hungry land'} around ${from} and settles in ${this._place(best)}.`, 'flee');
        }
      }
      if (died) {
        this._famLog(fam, `${died}.`, 'death');
        fam.gen++;
        // the oldest surviving child carries on (if the line breaks, a cousin takes the name)
        const childAge = Math.max(0, Math.min(age - 18, 15 + r.int(15)));
        if (age < 18 && r.next() < 0.6) this._famLog(fam, `${h.given} leaves no children; a cousin carries on the ${fam.surname} name.`, 'gen');
        this._newHead(fam, y - (age < 18 ? 16 + r.int(10) : childAge));
        if (fam.head.job !== h.job && r.next() < 0.5) this._famLog(fam, `Unlike ${pos} parent, ${fam.head.given} does not become ${an(h.job)}.`, 'job');
        if (this.culture[fam.cell] !== fam.culture && r.next() < 0.3) fam.culture = this.culture[fam.cell];
        // traits run in families, with the odd new one
        if (fam.traits && fam.traits.length) { fam.traits = fam.traits.filter(() => r.next() < 0.85); if (r.next() < 0.15) { const t = r.pick(Object.keys(FAMILY_TRAITS)); if (!fam.traits.includes(t)) fam.traits.push(t); } }
        if (fam.guided) { const opts = this.jobOptions(fam.cell).slice(0, 4).map(j => ({ key: j, label: j === fam.head.job ? `Stay ${an(j)}` : `Become ${an(j)}`, job: j })); const city = this._nearestCityCell(fam.cell); if (city >= 0 && this.cityAt[fam.cell] < 0) opts.push({ key: 'city', label: `Leave for the city: ${this._place(city)}`, cell: city }); for (const a of this.familyActions(fam).filter(a => ['frontier', 'abroad', 'colony', 'school', 'marry-m'].includes(a.key))) opts.push(a); if (opts.length > 1) this._ask(fam, 'age', `${fam.head.given} ${fam.surname} now heads the family. What will ${fam.head.sex === "f" ? "she" : "he"} do?`, opts); }
      } else {
        // careers change during a life: war, hard times, moving to a city, new trades arriving
        let change = 0;
        if (war && h.job !== 'soldier' && age > 16 && age < 40 && !(fam.hideUntil > y) && r.next() < 0.06 * (TR(fam, 'brave') ? 2 : 1)) { h.job = 'soldier'; this._famLog(fam, `${h.given} is pressed into the army.`, 'job'); change = 1; }
        else if (!war && h.job === 'soldier' && r.next() < 0.15) change = 2;
        else if (age > 15 && age < 50 && r.next() < 0.025) change = 2;
        if (change === 2 && TR(fam, 'stubborn') && r.next() < 0.6) change = 0;
        if (change === 2) {
          const job = this._jobForFam(fam, c, null);
          if (job !== h.job && job !== 'soldier') {
            if (fam.guided) this._ask(fam, 'job', `A chance for ${h.given}: work as ${an(job)}?`, [{ key: 'keep', label: `Stay ${an(h.job)}`, stay: true }, { key: 'new', label: `Become ${an(job)}`, job }]);
            else { const was = h.job; h.job = job; this._famLog(fam, `${h.given} gives up being ${an(was)} and becomes ${an(job)}.`, 'job'); }
          }
        }
      }
    }
  };
  P._epidemicName = function (c) { const e = this.epidemics.find(e => e.hit.has(c) && this.year - e.start < 30); return e ? e.name : null; };
  P.familyStory = function (fam) { return fam.log.map(e => `${e.y}: ${e.text}`).join('\n'); };
}
