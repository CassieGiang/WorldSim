// Stage 4: named families followed through history. Their lives are read off the province they live in.
import { NAME_PARTS, TECH_INDEX as T } from './scenario.js';

const START = [
  { lon: 112.4, lat: 34.6, label: 'the Yellow River plain' },   // near Luoyang
  { lon: 14.2, lat: 40.9, label: 'Campania' },                  // near Neapolis
  { lon: 85.1, lat: 25.6, label: 'the Ganges plain' },          // near Pataliputra
];

// jobs, newest first: [tech needed (or null), condition, job]
const JOBS = [
  ['computers', c => c.urban > 0.5, 'programmer'], ['internet', c => c.urban > 0.4, 'engineer'],
  ['antibiotics', c => c.urban > 0.3, 'nurse'], ['public_education', c => c.urban > 0.3, 'teacher'],
  ['electricity', c => c.urban > 0.35, 'electrician'], ['railways', c => c.urban > 0.25, 'railway worker'],
  ['industry', c => c.urban > 0.25, 'factory worker'], ['industry', c => c.coal, 'coal miner'],
  ['ocean_navigation', c => c.coastal && c.urban > 0.15, 'sailor'], ['printing', c => c.city, 'printer'],
  ['banking', c => c.city && c.trade, 'merchant'], ['writing', c => c.city, 'scribe'],
  ['iron', c => c.iron && c.urban > 0.1, 'smith'], [null, c => c.city, 'weaver'], [null, c => c.trade, 'trader'],
  [null, c => c.coastal && c.fish, 'fisher'], [null, c => c.pastoral, 'herder'], [null, () => true, 'farmer'],
];

export function installFamilies(World) {
  const P = World.prototype;

  P._famInit = function () {
    this.families = START.map((s, k) => {
      const c = this._nearest(s.lon, s.lat);
      const fam = { id: k, culture: this.culture[c], surname: null, cell: c, gen: 1, head: null, log: [], alive: true, home: s.label, lastOwner: this.owner[c], lastKnown: 0, sackSeen: 0 };
      fam.surname = this._surname(fam.culture);
      this._newHead(fam, 1 - this.rng.int(25), true);
      return fam;
    });
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
    };
  };
  P._jobFor = function (c) {
    const f = this._famFacts(c), bits = this.cellTech[c];
    const pool = JOBS.filter(([t, cond]) => (!t || bits[T[t]]) && cond(f));
    // most modern fitting job is likely, but not certain
    for (const j of pool) if (this.rng.next() < 0.55) return j[2];
    return pool.length ? pool[pool.length - 1][2] : 'farmer';
  };
  P._place = function (c) {
    const f = this._famFacts(c);
    return f.city ? f.city : f.state ? `a village in ${f.state.name}` : `the lands of the ${this._tribeName(c)}`;
  };
  P._newHead = function (fam, born, first = false) {
    const r = this.rng, sex = r.next() < 0.5 ? 'f' : 'm';
    const given = this._personName(fam.culture).split(' ')[0];
    const job = this._jobFor(fam.cell);
    fam.head = { given, sex, born, job, lifespan: 0 };
    const exp = 1 / Math.max(0.008, 0.0395 - (this.cellFx[fam.cell] ? this.cellFx[fam.cell].death : 0));
    fam.head.lifespan = Math.max(30, Math.min(95, exp * (0.9 + r.next() * 0.9) + 25));
    const where = this._place(fam.cell);
    if (first) this._famLog(fam, `${given} ${fam.surname}, a ${job}, lives in ${where}, in ${fam.home}.`, 'start');
    else this._famLog(fam, `Generation ${fam.gen}: ${given} ${fam.surname} takes over the family; ${sex === 'f' ? 'she' : 'he'} is a ${job} in ${where}.`, 'gen');
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
        if (r.next() < famine * 6) died = `${h.given} starves in the famine of ${y}`;
        else if (r.next() < 0.35) this._famLog(fam, r.pick([`Famine in ${this._place(c)}. ${h.given}'s family eats the seed grain to survive.`, `The harvest fails around ${this._place(c)}; ${h.given} sells the ox to buy grain.`, `Hunger in ${this._place(c)}. ${h.given} sends the youngest child to relatives.`, `A lean year: ${h.given}'s family lives on roots and bark until spring.`]), 'famine');
      }
      if (!died && war) {
        if (r.next() < 0.04) died = `${h.given} is killed when war reaches ${this._place(c)}`;
        else if (r.next() < 0.25) this._famLog(fam, r.pick([`Armies march through ${this._place(c)}; ${h.given}'s fields are burned.`, `Soldiers take ${h.given}'s grain and ${pos} eldest son.`, `War comes to ${this._place(c)}. ${h.given} hides the family's savings under the hearth.`]), 'war');
      }
      // city sacked
      const ck = this.cityAt[c];
      if (ck >= 0 && this.cities[ck].sacked > fam.sackSeen) { fam.sackSeen = this.cities[ck].sacked; this._famLog(fam, `${this.cityLabel(this.cities[ck])} is sacked. ${h.given} hides ${pos} children in a cellar while the city burns.`, 'war'); }
      // new rulers
      const o = this.owner[c];
      if (o !== fam.lastOwner) {
        if (o >= 0 && fam.lastOwner >= 0 && this.polities[fam.lastOwner]) this._famLog(fam, `${this._place(c)} now belongs to ${this.polities[o].name}; ${h.given} pays taxes to new masters.`, 'rule');
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
      if (this.rel && fam.lastRel !== undefined && this.rel[c] !== fam.lastRel && r.next() < 0.6) this._famLog(fam, `${h.given} and ${pos} household take up ${this.faiths[this.rel[c]].name}, like their neighbours.`, 'faith');
      if (this.rel) fam.lastRel = this.rel[c];
      if (!died && age >= h.lifespan) died = `${h.given} dies at ${age}`;
      // hard times: move away (to better-fed land, or to a city)
      if (!died && (this.nour[c] < 0.9 || war) && r.next() < (war ? 0.12 : 0.06)) {
        let best = c, bv = this.nour[c] - (war ? 0.3 : 0);
        const cand = [...this.nb[c]]; for (const j of this.nb[c]) for (const k of this.nb[j]) cand.push(k);
        for (const j of cand) { const v = this.nour[j] + (this.cityAt[j] >= 0 ? 0.08 : 0) - (this.warZone[j] ? 0.4 : 0); if (v > bv && this.pop[j] > 1000) { bv = v; best = j; } }
        if (best !== c) {
          const from = this._place(c); fam.cell = best; fam.lastOwner = this.owner[best];
          this._famLog(fam, `${h.given} ${war ? 'flees the fighting' : 'leaves the hungry land'} around ${from} and settles in ${this._place(best)}.`, 'flee');
        }
      }
      if (died) {
        this._famLog(fam, `${died}.`, 'death');
        fam.gen++;
        // the oldest surviving child carries on (if the line breaks, a cousin takes the name)
        const childAge = Math.max(0, Math.min(age - 18, 15 + r.int(15)));
        if (age < 18 && r.next() < 0.6) this._famLog(fam, `${h.given} leaves no children; a cousin carries on the ${fam.surname} name.`, 'gen');
        this._newHead(fam, y - (age < 18 ? 16 + r.int(10) : childAge));
        if (this.culture[fam.cell] !== fam.culture && r.next() < 0.3) fam.culture = this.culture[fam.cell];
      } else if (y % 30 === 0 && r.next() < 0.3) {
        // ordinary years still get a line now and then
        const job = this._jobFor(c);
        if (job !== h.job && r.next() < 0.5) { h.job = job; this._famLog(fam, `${h.given} becomes a ${job}.`, 'job'); }
      }
    }
  };
  P._epidemicName = function (c) { const e = this.epidemics.find(e => e.hit.has(c) && this.year - e.start < 30); return e ? e.name : null; };
  P.familyStory = function (fam) { return fam.log.map(e => `${e.y}: ${e.text}`).join('\n'); };
}
