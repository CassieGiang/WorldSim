// Stage B2: ideologies that spread like faiths, ideological states and blocs,
// nation-building, autonomy or repression, dynastic marriages, and a league after a world war.
import { TECH_INDEX as T } from './scenario.js';

// k: index. Old idea systems exist from the start; modern ones appear when their conditions first occur somewhere.
export const IDEOS = [
  { id: 'tradition', adj: 'traditionalist', badj: 'Old Order', name: 'Traditional monarchy', blind: 'Old Order', color: '#9a8a6a', old: true },
  { id: 'theocracy', adj: 'religious', badj: 'Sacred Law', name: 'Rule of the faithful', blind: 'Sacred Law', color: '#b07ad0', old: true },
  { id: 'tribal', adj: 'tribal', badj: 'Clan', name: 'Tribal confederation', blind: 'Clan Council', color: '#7aa36a', old: true },
  { id: 'liberal', adj: 'Liberal', badj: 'Freemind', name: 'Liberalism', blind: 'Freemindism', color: '#e8c547' },
  { id: 'conservative', adj: 'Conservative', badj: 'Rootist', name: 'Conservatism', blind: 'Rootism', color: '#5a7fb8' },
  { id: 'nationalist', adj: 'Nationalist', badj: 'Folkish', name: 'Nationalism', blind: 'Folkhood', color: '#d9823b' },
  { id: 'socialist', adj: 'Socialist', badj: 'Commonworker', name: 'Socialism', blind: 'Commonwork', color: '#d64545' },
  { id: 'fascist', adj: 'Fascist', badj: 'Ironway', name: 'Fascism', blind: 'Ironway', color: '#3b3b3b' },
];
const I = Object.fromEntries(IDEOS.map((x, k) => [x.id, k]));
const K = IDEOS.length;
// how each class leans (rows: classes; columns: ideologies)
const LEAN = {
  nobles: { tradition: 3, conservative: 3, theocracy: 1, fascist: 1 }, clergy: { theocracy: 4, conservative: 2, tradition: 1 },
  merchants: { liberal: 4, conservative: 1, nationalist: 1 }, artisans: { liberal: 1.5, socialist: 1.5, tradition: 1, nationalist: 1 },
  peasants: { tradition: 3, theocracy: 1.5, tribal: 1, nationalist: 0.8, socialist: 0.5 }, serfs: { tradition: 2, theocracy: 1.5, socialist: 1 },
  slaves: { theocracy: 1, socialist: 1 }, workers: { socialist: 2.2, nationalist: 1.3, liberal: 1, conservative: 0.6, fascist: 0.4 },
  middle: { liberal: 3, conservative: 2, nationalist: 1.5, fascist: 0.6 }, professionals: { liberal: 4, socialist: 1, conservative: 1 },
};
const GOV_IDEO = { kingdom: 'tradition', empire: 'tradition', chiefdom: 'tribal', khanate: 'tribal', theocracy: 'theocracy', constitutional: 'conservative', republic: 'liberal', democracy: 'liberal', dictatorship: 'nationalist' };
const FX = {
  tradition: { research: 1, aggr: 1, stab: 0.02 }, theocracy: { research: 0.92, aggr: 1.1, stab: 0.03 }, tribal: { research: 0.95, aggr: 1.2, stab: 0 },
  liberal: { research: 1.08, aggr: 0.8, stab: 0.02 }, conservative: { research: 1, aggr: 0.9, stab: 0.04 }, nationalist: { research: 1, aggr: 1.3, stab: 0.02 },
  socialist: { research: 1.04, aggr: 1.1, stab: 0 }, fascist: { research: 0.98, aggr: 1.8, stab: 0.03 },
};
const HOSTILE = new Set(['liberal|socialist', 'socialist|liberal', 'liberal|fascist', 'fascist|liberal', 'socialist|fascist', 'fascist|socialist', 'theocracy|liberal', 'liberal|theocracy']);
export const NATION_POLICY = { assimilate: 'build one nation (one language, one school)', autonomy: 'grant regions autonomy', repress: 'repress unrest by force' };

export function installIdeologies(World) {
  const P = World.prototype;
  P.ideoName = function (k) { return this.opts.blind ? IDEOS[k].blind : IDEOS[k].name; };
  P.ideoAdj = function (k) { return this.opts.blind ? IDEOS[k].badj : IDEOS[k].adj; };

  P._ideoInit = function () {
    const N = this.N;
    this.ideoReach = new Float32Array(N * K);  // how far each idea has spread to a province (0-1)
    this.ideoSup = new Float32Array(N * K);    // share of people who back it
    this.ideoBorn = {};
    for (let i = 0; i < N; i++) for (const k of [I.tradition, I.theocracy, I.tribal]) this.ideoReach[i * K + k] = 1;
    for (const p of this.polities) this._ideoState(p);
    this.leagues = [];
  };
  P._ideoState = function (p) { if (!p.ideo) p.ideo = I[GOV_IDEO[p.gov] || 'tradition']; p.ideoFx = FX[IDEOS[p.ideo].id]; p.nationPolicy = p.nationPolicy || 'assimilate'; p.nation = p.nation || 0; };

  P._ideologies = function (y) {
    if (!this.ideoReach) return;
    for (const p of this.polities) if (p.alive && p.ideo === undefined) this._ideoState(p);
    if (y % 5 === 0) { this._ideoBirth(y); this._ideoSpread(); this._ideoSupport(); this._ideoPolitics(y); this._nationBuilding(y); this._marriages(y); }
    this._league(y);
  };

  // an idea is born the first time its conditions exist somewhere
  P._ideoBirth = function (y) {
    const birth = (id, p, why) => {
      if (this.ideoBorn[id] || !p) return;
      const k = I[id]; this.ideoBorn[id] = { y, pol: p.id };
      const c = this.cityAt[p.capital] >= 0 ? p.capital : p.capital;
      for (let i = 0; i < this.N; i++) if (this.owner[i] === p.id) this.ideoReach[i * K + k] = Math.max(this.ideoReach[i * K + k], this.distDeg(i, c) < 8 ? 1 : 0.4);
      this._log('faith', `A new idea is born in ${p.name}: ${this.ideoName(k)}. ${why}`, { pol: p.id, cell: c, big: true });
    };
    const alive = this.polities.filter(p => p.alive && p.classes && p.pop > 1e6);
    const by = f => alive.filter(f).sort((a, b) => b.pop - a.pop)[0];
    birth('liberal', by(p => p.tech[T.printing] && p.tech[T.scientific_method] && p.classes.merchants > 0.04 && p.urban / p.pop > 0.15), 'Its writers argue that people are born free and that rulers answer to the ruled.');
    if (this.ideoBorn.liberal) birth('conservative', by(p => p.tech[T.printing] && this.ideoSup[p.capital * K + I.liberal] > 0.15), 'It answers the liberals: keep the old order, change slowly, honour faith and crown.');
    birth('nationalist', by(p => p.tech[T.public_education] || (p.tech[T.scientific_method] && p.tech[T.printing] && p.foreign / p.pop > 0.4 && p.pop > 5e6)), 'It teaches that every people should have its own state.');
    birth('socialist', by(p => p.tech[T.industry] && p.classes.workers > 0.12), 'It tells the workers in the new factories that the wealth they make should be theirs.');
    birth('fascist', by(p => p.tech[T.public_education] && p.tech[T.industry] && (p.lostWar || 0) > this.year - 25 && (p.unrest || 0) > 0.3), 'Born of defeat and hard times, it worships the nation, the leader and war.');
  };

  // ideas travel to neighbours, along trade routes and faster with printing and schools
  P._ideoSpread = function () {
    const N = this.N, R = this.ideoReach, nx = new Float32Array(R);
    for (let i = 0; i < N; i++) {
      if (this.pop[i] < 100) continue;
      const t = this.cellTech[i], speed = 0.04 * (t[T.printing] ? 2 : 0.5) * (t[T.public_education] ? 2 : 1) * (t[T.telegraph] ? 1.5 : 1) * (1 + this.urban[i] * 2);
      for (let k = 3; k < K; k++) {
        if (!this.ideoBorn[IDEOS[k].id]) continue;
        let m = 0; for (const j of this.nb[i]) if (R[j * K + k] > m) m = R[j * K + k];
        const rt = this.routeAt && this.routeAt.get(i); if (rt) for (const j of rt) if (R[j * K + k] * 0.8 > m) m = R[j * K + k] * 0.8;
        if (m > R[i * K + k]) nx[i * K + k] = Math.min(1, R[i * K + k] + (m - R[i * K + k]) * speed + 0.002);
      }
    }
    this.ideoReach = nx;
  };

  // who backs what: class leanings, how far an idea has reached, and crises that push people to the radicals
  P._ideoSupport = function () {
    const N = this.N, R = this.ideoReach, S = this.ideoSup, w = new Float32Array(K);
    for (let i = 0; i < N; i++) {
      const o = this.owner[i]; if (o < 0 || this.pop[i] < 100) continue;
      const p = this.polities[o], cl = p.classes; if (!cl) continue;
      const crisis = Math.min(1, Math.max(0, (p.grainPrice || 1) / (this.priceLevel || 1) - 1.3) + (p.unrest || 0) + ((p.lostWar || 0) > this.year - 20 ? 0.5 : 0));
      w.fill(0);
      for (const c in cl) { const lean = LEAN[c]; if (!lean) continue; for (const id in lean) w[I[id]] += cl[c] * lean[id]; }
      w[I.socialist] *= 1 + crisis * 0.6; w[I.fascist] *= 1 + crisis * 2; w[I.nationalist] *= 1 + crisis * 0.5 + (this.ppl && this.ppl[i] !== this.ppl[p.capital] ? 1 : 0);
      w[p.ideo] *= p.gov === 'democracy' ? 1.1 : 1.6;   // the state's own idea is taught and enforced
      let tot = 0; for (let k = 0; k < K; k++) { w[k] *= R[i * K + k]; tot += w[k]; }
      if (tot <= 0) continue;
      for (let k = 0; k < K; k++) S[i * K + k] += 0.3 * (w[k] / tot - S[i * K + k]);
    }
    for (const p of this.polities) { if (p.alive) p.support = new Float32Array(K); }
    for (let i = 0; i < N; i++) { const o = this.owner[i]; if (o < 0) continue; const p = this.polities[o]; if (!p.support) continue; for (let k = 0; k < K; k++) p.support[k] += S[i * K + k] * this.pop[i]; }
    for (const p of this.polities) if (p.alive && p.support) { const t = p.support.reduce((a, b) => a + b, 0) || 1; for (let k = 0; k < K; k++) p.support[k] /= t; }
  };

  // elections where there are votes, coups and revolutions where there are not
  P._ideoPolitics = function (y) {
    const r = this.rng;
    for (const p of this.polities) {
      if (!p.alive || !p.support) continue;
      const top = [...p.support].map((v, k) => [k, v]).sort((a, b) => b[1] - a[1]);
      const [k1, v1] = top[0];
      if (p.gov === 'democracy' || p.gov === 'republic') {
        if (k1 !== p.ideo && v1 > 0.3 && (k1 >= 3 && k1 !== I.fascist ? true : r.next() < 0.3)) {
          const old = p.ideo; p.ideo = k1;
          if (k1 === I.fascist || (k1 === I.socialist && r.next() < 0.3)) { p.gov = 'dictatorship'; if (p.pop > 5e6) this._log('gov', `${this.ideoName(k1)} wins power in ${p.name} at the ballot box, and the vote is soon abolished.`, { pol: p.id, big: p.pop > 30e6 }); }
          else if (p.pop > 20e6) this._log('gov', `${p.name} elects a ${this.ideoAdj(k1)} government; the ${this.ideoAdj(old)}s go into opposition.`, { pol: p.id });
        }
      } else {
        const radical = top.find(([k, v]) => k !== p.ideo && k >= 3 && v > 0.33);
        if (radical && p.stability < 0.45 && r.next() < 0.12) {
          const [k] = radical, old = p.name;
          p.ideo = k;
          if (k === I.liberal) { p.gov = p.tech[T.public_education] ? 'democracy' : 'republic'; p.name = `Republic of ${this._short(old)}`; }
          else if (k === I.socialist) { p.gov = 'dictatorship'; p.name = `People's Republic of ${this._short(old)}`; }
          else if (k === I.fascist || k === I.nationalist) { p.gov = 'dictatorship'; p.name = `${this._short(old)} State`; }
          else if (k === I.conservative) p.gov = 'constitutional';
          p.stability = 0.5; p.purge = y;
          this._log('gov', `${this.ideoName(k)} revolution in ${old}${p.name !== old ? `: it becomes the ${p.name}` : ''}.`, { pol: p.id, big: p.pop > 10e6 });
          // purges follow a revolution
          if (k === I.socialist || k === I.fascist) { const dead = p.pop * (0.002 + r.next() * 0.008); this.totals.war += dead; for (let n = 0; n < 6; n++) { const i = this._randomCellOfFast(p); if (i >= 0) this.pop[i] = Math.max(0, this.pop[i] - dead / 6); } if (dead > 1e5) this._log('war', `Purges in ${p.name}: ${this._fmt(dead)} are killed as enemies of the revolution.`, { pol: p.id, deaths: dead }); }
          // revolutions are exported: neighbours' radicals take heart
          for (const q of p.neighbours) { const Q = this.polities[q]; if (Q.alive && Q.support) for (let i = 0; i < this.N; i++) if (this.owner[i] === q) this.ideoSup[i * K + k] = Math.min(1, this.ideoSup[i * K + k] * 1.15 + 0.02); }
        } else if (p.ideo < 3 && GOV_IDEO[p.gov] && I[GOV_IDEO[p.gov]] !== p.ideo) p.ideo = I[GOV_IDEO[p.gov]];
      }
      p.ideoFx = FX[IDEOS[p.ideo].id];
      // policy toward the state's peoples
      if (!this.isPlayer(p.id)) p.nationPolicy = p.ideo === I.fascist || p.gov === 'dictatorship' ? 'repress' : p.ideo === I.liberal && p.gov === 'democracy' && p.foreign / Math.max(1, p.pop) > 0.3 ? 'autonomy' : 'assimilate';
    }
  };
  P._fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : Math.round(n / 1e3) + ',000';

  // schools, conscription, railways and a standard language turn subjects into a nation
  P._nationBuilding = function (y) {
    for (const p of this.polities) {
      if (!p.alive) continue;
      const t = p.tech;
      const drive = (t[T.printing] ? 0.004 : 0.001) + (t[T.public_education] ? 0.012 : 0) + (t[T.railways] ? 0.006 : 0) + (t[T.radio] ? 0.006 : 0) + (p.nationPolicy === 'assimilate' ? 0.004 : 0);
      const before = p.nation || 0;
      const cap = t[T.public_education] ? 1 : t[T.printing] ? 0.6 : 0.3;   // before print and schools, only the elite share one identity
      p.nation = Math.min(cap, before + drive * 5 * (1 - before));
      if (before < 0.5 && p.nation >= 0.5 && p.pop > 10e6) this._log('gov', `${p.name} has become a nation: schools, the army and the press now speak one language.`, { pol: p.id });
    }
  };
  // read by the peoples module
  P.nationFx = function (p) {
    const pol = p.nationPolicy || 'assimilate', n = p.nation || 0;
    return { assim: (pol === 'assimilate' ? 1 + 1.5 * n : pol === 'autonomy' ? 0.5 : 1), revolt: pol === 'autonomy' ? 0.4 : pol === 'repress' ? 0.6 : 1 + 0.3 * n, grievance: pol === 'repress' ? 1.6 : pol === 'autonomy' ? 0.5 : 1 };
  };
  P.ideoAffinity = function (p, q) { if (p.ideo === undefined || q.ideo === undefined) return 1; if (p.ideo === q.ideo) return p.ideo >= 3 ? 1.8 : 1.2; return HOSTILE.has(IDEOS[p.ideo].id + '|' + IDEOS[q.ideo].id) ? 0.4 : 1; };
  P.ideoHostility = function (p, q) { if (p.ideo === undefined || q.ideo === undefined) return 1; if (p.ideo === q.ideo && p.ideo >= 3) return 0.6; return HOSTILE.has(IDEOS[p.ideo].id + '|' + IDEOS[q.ideo].id) ? 1.5 : 1; };

  // royal houses marry; when a line dies out, a married house may inherit, or fight for the crown
  P._marriages = function (y) {
    const r = this.rng, mon = g => g === 'kingdom' || g === 'empire' || g === 'constitutional';
    for (const p of this.polities) {
      if (!p.alive || !p.ruler || !mon(p.gov) || p.ruler.spouseOf != null || r.next() > 0.05) continue;
      const cands = [...p.neighbours].map(q => this.polities[q]).filter(q => q.alive && q.ruler && mon(q.gov) && q.rel === p.rel && !this.atWarWith(p.id, q.id) && q.ruler.spouseOf == null);
      if (!cands.length) continue;
      const q = cands.sort((a, b) => b.pop - a.pop)[0];
      p.ruler.spouseOf = q.id; q.ruler.spouseOf = p.id; p.ruler.spouseHouse = q.ruler.dynasty; q.ruler.spouseHouse = p.ruler.dynasty;
      p.marriedTo = { pol: q.id, house: q.ruler.dynasty, y }; q.marriedTo = { pol: p.id, house: p.ruler.dynasty, y };
      if (p.pop + q.pop > 30e6) this._log('alliance', `The houses of ${p.ruler.dynasty} (${p.name}) and ${q.ruler.dynasty} (${q.name}) are joined by marriage.`, { pol: p.id });
    }
  };
  // called by the succession code when a line dies out
  P._inheritance = function (p) {
    const m = p.marriedTo; if (!m || this.year - m.y > 60) return false;
    const q = this.polities[m.pol]; if (!q || !q.alive || q.id === p.id || !q.ruler || q.ruler.dynasty !== m.house) return false;
    if (this.rng.next() < 0.5) {
      if (p.cells > q.cells * 2.5) return false;
      this._log('dynasty', `The line of ${p.name} dies out. By marriage, the crown passes to the House of ${m.house}: ${p.name} joins ${q.name} in a personal union.`, { pol: q.id, big: p.pop + q.pop > 20e6 });
      this._annexQuiet(q, p);
      return true;
    }
    if (this._declare) { this._declare(q, p, 'to press its claim to the throne'); this._log('war', `A war of succession: ${q.name} claims the throne of ${p.name} by marriage.`, { pol: q.id }); }
    return false;
  };

  // after a world war, a league of states may form to keep the peace
  P._league = function (y) {
    if (this.leagues.some(l => !l.ended)) { const L = this.leagues.find(l => !l.ended); for (const id of L.members) if (!this.polities[id].alive) L.members.delete(id); if (L.members.size < 3) { L.ended = y; this._log('alliance', `The ${L.name} collapses.`, {}); } return; }
    const ww = (this.warGroups || []).find(g => g.end && g.end >= y - 3 && g.end < y && g.deaths > 1e7 && !g.leagued);
    if (!ww) return;
    ww.leagued = true;
    const members = new Set(this.polities.filter(p => p.alive && p.pop > 2e6 && (p.gov === 'democracy' || p.gov === 'republic' || p.gov === 'constitutional' || this.rng.next() < 0.3)).map(p => p.id));
    if (members.size < 4) return;
    const L = { name: this.leagues.length ? 'United Nations' : 'League of Nations', start: y, members, ended: null };
    if (this.opts.blind) L.name = this.leagues.length ? 'Union of Peoples' : 'Concord of States';
    this.leagues.push(L);
    this._log('alliance', `After the slaughter of the great war, ${members.size} states found the ${L.name} to keep the peace.`, { big: true });
  };
  P.inLeague = function (a, b) { const L = this.leagues && this.leagues.find(l => !l.ended); return L && L.members.has(a) && L.members.has(b); };
}
