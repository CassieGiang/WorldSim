// What-if branching: freeze a world, copy it, change one thing, run both side by side.
import { TECHS, TECH_INDEX as T } from './scenario.js';

export const WHATIFS = [
  { id: 'luck', label: 'Same world, different luck', desc: 'Nothing changes except the dice from here on.' },
  { id: 'ruler_lives', label: 'This ruler lives 20 more years', needs: 'state' },
  { id: 'ruler_dies', label: 'This ruler dies now', needs: 'state' },
  { id: 'civil_war', label: 'Civil war breaks this state apart', needs: 'state' },
  { id: 'peace', label: 'This state makes peace with everyone', needs: 'state' },
  { id: 'tech', label: 'This state gets its next two inventions now', needs: 'state' },
  { id: 'plague', label: 'A deadly plague breaks out here', needs: 'cell' },
  { id: 'no_plague', label: 'A coming plague never happens', needs: 'plague' },
  { id: 'warm', label: 'No little ice age (no cold eras from now)' },
];

export function installWhatIf(World) {
  const P = World.prototype;
  // an exact copy that runs on from the same point
  P.fork = function () {
    const o = {};
    for (const [k, v] of Object.entries(this)) if (k !== 'geo' && k !== 'rng') o[k] = v;
    const c = structuredClone(o);
    c.geo = this.geo;
    Object.setPrototypeOf(c, World.prototype);
    c.rng = this._rngFactory(this.seed); c.rng.setState(this.rng.getState());
    return c;
  };
  P.upcomingPlagues = function () { return this.sched.epidemics.filter(e => e.year > this.year).slice(0, 12); };
  // apply one change; returns a short description for the chronicle
  P.whatIf = function (id, arg) {
    const y = this.year;
    let text = '';
    if (id === 'luck') { const st = this.rng.getState(); st[3] = (st[3] ^ (0x9e37 * (1 + (arg || 1)))) >>> 0; this.rng.setState(st); for (let k = 0; k < 20; k++) this.rng.next(); text = 'From here on, the dice fall differently.'; }
    else if (id === 'ruler_lives' || id === 'ruler_dies' || id === 'civil_war' || id === 'peace' || id === 'tech') {
      const p = this.polities[arg]; if (!p || !p.alive) return null;
      if (id === 'ruler_lives' && p.ruler) { p.ruler.spared = y + 20; text = `${this._rulerTitle(p)} of ${p.name} is spared: they will live at least 20 more years.`; }
      if (id === 'ruler_dies' && p.ruler) { const old = this._rulerTitle(p); this._newRuler(p); p.stability = Math.max(0, p.stability - 0.12); text = `${old} of ${p.name} dies suddenly. ${this._rulerTitle(p)} succeeds.`; }
      if (id === 'civil_war') { p.stability = 0.2; this._fragment(p); text = `Civil war tears ${p.name} apart.`; }
      if (id === 'peace') { const ws = this.wars.filter(w => !w.end && (w.a === p.id || w.b === p.id)); for (const w of ws) { w.end = y; if (this._warEnded) this._warEnded(w); } text = `${p.name} makes peace with all its enemies (${ws.length} wars end).`; }
      if (id === 'tech') {
        const got = [];
        for (let n = 0; n < 2; n++) { const k = TECHS.findIndex((t, i) => !p.tech[i] && !t.noResearch && (t.pre || []).every(r => p.tech[T[r]])); if (k < 0) break; p.tech[k] = 1; got.push(TECHS[k].name); if (!(TECHS[k].id in this.firstTech)) this.firstTech[TECHS[k].id] = { year: y, by: p.name }; }
        p.fx = this._fxOf(p.tech); text = `${p.name} suddenly knows ${got.join(' and ') || 'nothing new'}.`;
      }
    } else if (id === 'plague') { this._startEpidemic('A new plague', arg, 0.25, 0.6, null); text = `A deadly new plague breaks out in ${this._where(arg)}.`; }
    else if (id === 'no_plague') { const e = this.sched.epidemics.find(x => x.year > y && x.name === arg); this.sched = { ...this.sched, epidemics: this.sched.epidemics.filter(x => x !== e) }; text = `The ${arg} never comes.`; }
    else if (id === 'warm') { this.sched = { ...this.sched, eras: this.sched.eras.filter(([a, b, an]) => an > 0 || b < y) }; text = 'The coming cold centuries never arrive.'; }
    if (text) this._log('council', 'What if… ' + text, { big: true });
    this.branchNote = text; this.branchYear = y;
    return text;
  };
  // how similar are two worlds that split at the same point?
  P.compareWith = function (B) {
    let same = 0, land = 0;
    for (let i = 0; i < this.N; i++) { if (this.pop[i] < 1 && B.pop[i] < 1) continue; land++; if (this.owner[i] === B.owner[i]) same++; }
    return { sameMap: land ? same / land : 1 };
  };
}
