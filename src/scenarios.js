// Start scenarios: 1000, 1500, 1800 and 1914 with the real map of that time.
// Borders: historical-basemaps by André Ourednik (GPL-3.0). Peoples: the GREG map with the
// year-1 corrections that still applied at that date. Techs, population, faiths and governments
// are set from the real situation, then the simulation runs on freely.
import SCEN_STATES from '../data/scen_states.json' with { type: 'json' };
import SCEN_PEOPLE from '../data/scen_people.json' with { type: 'json' };
import { TECHS, TECH_INDEX as T, REAL_POP } from './scenario.js';
import { PROPHETS } from './systems.js';
import { CROPS } from './economy.js';

export const SCENARIO_YEARS = [1000, 1500, 1800, 1914];
const inBox = (lon, lat, b) => lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3];
// share of world population by big region (McEvedy & Jones, rounded)
const REGIONS = [
  ['china', [97, 18, 125, 42]], ['japan_korea', [124, 30, 146, 46]], ['india', [60, 5, 98, 36]], ['seasia', [92, -11, 155, 25]],
  ['europe', [-12, 35, 60, 72]], ['mena', [-18, 12, 62, 38]], ['central', [46, 35, 125, 56]], ['siberia', [45, 56, 180, 80]],
  ['americas', [-170, -56, -30, 80]], ['oceania', [110, -50, 180, -11]], ['africa', [-20, -36, 52, 12]],
];
const SHARES = {
  1000: { china: 0.20, japan_korea: 0.03, india: 0.27, seasia: 0.06, europe: 0.14, mena: 0.10, central: 0.02, siberia: 0.003, americas: 0.06, oceania: 0.004, africa: 0.11 },
  1500: { china: 0.23, japan_korea: 0.04, india: 0.25, seasia: 0.05, europe: 0.18, mena: 0.06, central: 0.015, siberia: 0.003, americas: 0.09, oceania: 0.003, africa: 0.085 },
  1800: { china: 0.33, japan_korea: 0.04, india: 0.20, seasia: 0.04, europe: 0.20, mena: 0.04, central: 0.01, siberia: 0.002, americas: 0.025, oceania: 0.002, africa: 0.09 },
  1914: { china: 0.24, japan_korea: 0.05, india: 0.17, seasia: 0.05, europe: 0.26, mena: 0.03, central: 0.01, siberia: 0.005, americas: 0.11, oceania: 0.004, africa: 0.06 },
};
const realPop = y => { let a = REAL_POP[0]; for (const b of REAL_POP) { if (b[0] >= y) { const t = (y - a[0]) / Math.max(1, b[0] - a[0]); return (a[1] + (b[1] - a[1]) * t) * 1e6; } a = b; } return a[1] * 1e6; };
// how far behind the leading regions each part of the world was, in years
function lagAt(lon, lat, nw, Y, owned) {
  if (nw) return Y >= 1600 && owned ? 0 : 9999;
  if (inBox(lon, lat, [110, -50, 180, -11])) return Y >= 1850 && owned ? 0 : 9999;
  if (inBox(lon, lat, [-12, 35, 32, 62])) return 0;
  if (inBox(lon, lat, [-12, 35, 60, 72])) return 120;
  if (inBox(lon, lat, [-18, 12, 62, 38])) return 0;
  if (inBox(lon, lat, [97, 18, 146, 50])) return 0;
  if (inBox(lon, lat, [60, 5, 98, 36])) return 40;
  if (inBox(lon, lat, [92, -11, 155, 25])) return 150;
  if (inBox(lon, lat, [45, 35, 125, 56])) return 200;
  if (lat > 56) return 500;
  return Y >= 1900 && owned ? 150 : 700;   // Africa south of the Sahara
}
// the scientific and industrial inventions spread out of north-western Europe: extra lag for them elsewhere
function modernLag(lon, lat, Y) {
  const B = b => inBox(lon, lat, b);
  if (B([-12, 46, 24, 62]) || B([-10, 37, 3.4, 46]) || B([6, 43.5, 14, 46]) || B([8, 41.9, 16.2, 43.5]) || B([8, 37.5, 18.6, 41.9])) return 0;   // western and central Europe, Iberia, Italy
  if (B([-12, 35, 32, 62])) return 45;                      // the Balkans and eastern Europe
  if (B([128, 30, 146, 46])) return Y >= 1900 ? 25 : 90;    // Japan (Meiji catch-up)
  if (B([97, 18, 146, 50])) return Y >= 1900 ? 60 : 95;    // China, Korea, Vietnam
  if (B([-18, 12, 62, 38])) return 70;                      // the Middle East and North Africa
  if (B([60, 5, 98, 36])) return 90;                        // India
  return 110;
}
// the main faith of a place at a date
function faithAt(lon, lat, Y, nw) {
  const B = b => inBox(lon, lat, b);
  if (nw) return Y >= 1600 ? 'Christianity' : null;
  if (B([110, -50, 180, -11])) return Y >= 1850 ? 'Christianity' : null;
  if (B([120, 5, 127, 19]) && Y >= 1600) return 'Christianity';
  if (B([35, 8, 43, 15.5])) return 'Christianity';                                  // Ethiopia
  if (B([39, 38.5, 48, 43.5])) return 'Christianity';                               // Armenia, Georgia
  if (B([-10, 35.5, -1.5, 41]) && Y < 1250) return 'Islam';                         // al-Andalus
  if (B([26, 36, 45, 42.5]) && Y >= 1150) return 'Islam';                           // Anatolia
  if (B([-12, 35, 60, 72]) && !B([45, 35, 60, 45])) return Y >= 1000 || lon < 25 ? 'Christianity' : null;
  if (B([-18, 15, 62, 38]) || B([34, 12, 60, 30])) return Y >= 700 || B([34, 12, 60, 34]) ? 'Islam' : null;
  if (B([44, 25, 63, 40])) return Y >= 900 ? 'Islam' : 'Zoroastrianism';
  if (B([50, 35, 80, 50])) return Y >= 1000 ? 'Islam' : null;
  if (B([60, 24, 72, 37])) return Y >= 1000 ? 'Islam' : null;
  if (B([-18, 9, 40, 16])) return Y >= 1300 ? 'Islam' : null;                       // the Sahel
  if (B([88, 21, 93, 26.5]) && Y >= 1500) return 'Islam';                           // east Bengal
  if (B([95, -9, 125, 7]) && !B([114.5, -9, 116, -8]) && Y >= 1500) return 'Islam'; // the Malay world
  if (B([72, 35, 90, 45]) && Y >= 1000) return 'Islam';                             // the Tarim
  if (B([68, 6, 90, 32]) || B([80, 26, 88.5, 30.5]) || B([114.5, -9, 116, -8])) return 'Hinduism';
  if (B([79.5, 5.5, 82, 10])) return 'Buddhism';
  if (B([92, 8, 108, 28]) && !B([102, 17, 109, 23.5])) return 'Buddhism';
  if (B([78, 27, 100, 37])) return 'Buddhism';
  if (B([88, 41, 120, 52]) && Y >= 1600) return 'Buddhism';
  if (B([124, 33, 131, 43])) return Y < 1400 ? 'Buddhism' : 'Chinese folk religion';
  if (B([129, 30, 146, 46])) return 'Shinto';
  if (B([97, 18, 125, 42]) || B([102, 17, 109, 23.5])) return 'Chinese folk religion';
  if (B([-20, -36, 52, 12])) return Y >= 1900 && lat < -22 ? 'Christianity' : null;
  return null;
}
const GOV_1914 = { 'United States': 'democracy', France: 'democracy', Switzerland: 'democracy', 'United Kingdom': 'constitutional', Portugal: 'republic', 'Republic of China': 'republic', Canada: 'constitutional', Australia: 'constitutional', 'New Zealand': 'constitutional', 'German Empire': 'empire', 'Austria-Hungary': 'empire', Russia: 'empire', 'Ottoman Empire': 'empire', 'Empire of Japan': 'empire', Italy: 'constitutional', Belgium: 'constitutional', Denmark: 'constitutional', Sweden: 'constitutional', Norway: 'constitutional', Spain: 'constitutional' };
const GOV_1800 = { 'United States of America': 'republic', France: 'republic', 'Helvetic Republic': 'republic', 'United Kingdom': 'constitutional', Netherlands: 'republic' };
function govFor(name, Y, cells) {
  if (Y === 1914 && GOV_1914[name]) return GOV_1914[name];
  if (Y === 1914 && /Argentina|Brazil|Mexico|Chile|Peru|Colombia|Bolivia|Venezuela|Uruguay|Paraguay|Ecuador|Guatemala|Honduras|Nicaragua|Salvador|Costa Rica|Panama|Cuba|Haiti|Dominican|Liberia/.test(name)) return 'republic';
  if (Y === 1800 && GOV_1800[name]) return GOV_1800[name];
  if (/Khanate|khaganate|Horde|Confederation|Oirat/.test(name)) return 'khanate';
  if (/Caliphate|Papal/.test(name)) return 'theocracy';
  if (/Republic|Venice|Commonwealth/.test(name)) return 'republic';
  if (/Empire|Emirates|Sultanate/.test(name) || cells > 150) return 'empire';
  return 'kingdom';
}

export function installScenarios(World) {
  const P = World.prototype;
  P._scenarioStart = function (Y) {
    const sc = SCEN_STATES[Y], ppl = SCEN_PEOPLE[Y]; if (!sc) return;
    const N = this.N, r = this.rng;
    this.year = Y; this.scenario = Y;
    // peoples of that time
    if (this.ppl) for (let i = 0; i < N; i++) { const q = ppl[i] ?? 0; this.ppl[i] = q; this.ppl2[i] = 65535; this.mix[i] = 0; this.culture[i] = this.peoples[q].key; }
    // clear the year-1 world
    this.polities = []; this.wars = []; this.events = []; this.history = []; this.shareHist = []; this.epidemics = []; this.armies = []; this.battles = []; this.works = [];
    this.alliances = []; this.truces = new Map(); this.warGroups = []; this.warPairs = new Map(); this._alDirty = true;
    this.owner.fill(-1);
    this.contactYear = Y >= 1500 ? 1492 : null;
    // states and their lands
    const idOf = sc.states.map(name => { const p = this._newPolity(name, 'latin', null, false); p.legitBase = 0.1; p.aggression = 0.6 + r.next() * 0.8; return p.id; });
    const cellsOf = sc.states.map(() => []);
    for (let i = 0; i < N; i++) { const o = sc.owner[i]; if (o >= 0) { this.owner[i] = idOf[o]; cellsOf[o].push(i); } }
    // technology by region and date
    for (let i = 0; i < N; i++) {
      const lag = lagAt(this.lon[i], this.lat[i], this.nw[i], Y, this.owner[i] >= 0), bits = this.cellTech[i];
      if (lag >= 9999) continue;
      const ml = this.nw[i] ? 40 : modernLag(this.lon[i], this.lat[i], Y), L = t => lag + (t.ry >= 1600 ? ml : 0);
      for (let k = 0; k < TECHS.length; k++) { const t = TECHS[k]; if (t.ry <= Y - L(t) && t.id !== 'new_world_crops' && (t.pre || []).every(p => bits[T[p]] || TECHS[T[p]].ry <= Y - L(TECHS[T[p]]))) bits[k] = 1; }
    }
    // a state knows what its most advanced province knows (cells inherit their state's techs)
    sc.states.forEach((name, k) => { const p = this.polities[idOf[k]]; let best = null, bn = -1; for (const c of cellsOf[k]) { let n = 0; for (const v of this.cellTech[c]) n += v; if (n > bn) { bn = n; best = c; } } if (best !== null) { p.tech.set(this.cellTech[best]); p.fx = this._fxOf(p.tech); } });
    if (Y >= 1800 && this.crops) for (let i = 0; i < N; i++) { CROPS.forEach((cr, k) => { if (this.suit[k][i] > 0.25) this.crops[i] |= 1 << k; }); this._cropFx(i); }
    this._refreshFx();
    // population: the real world total, shared out by region, then by what the land can feed
    const total = realPop(Y), cap = new Float64Array(N), reg = new Int8Array(N).fill(-1), regCap = new Float64Array(REGIONS.length);
    for (let i = 0; i < N; i++) {
      this.cleared[i] = 1; cap[i] = this._fullCapacity(i) * (this.cellTech[i][T.agriculture] ? 1 : 0.15);
      const k = REGIONS.findIndex(([, b]) => inBox(this.lon[i], this.lat[i], b)); reg[i] = k; if (k >= 0) regCap[k] += cap[i];
    }
    const sh = SHARES[Y];
    // fill each region up to its share, never past 80% of what a province can feed (spill the rest to its neighbours in the region)
    const want = REGIONS.map(([name]) => total * sh[name]);
    this.pop.fill(0);
    for (let pass = 0; pass < 4; pass++) {
      const left = new Float64Array(REGIONS.length), room = new Float64Array(REGIONS.length);
      for (let i = 0; i < N; i++) { const k = reg[i]; if (k < 0) continue; room[k] += Math.max(0, cap[i] * 0.8 - this.pop[i]); }
      for (let k = 0; k < REGIONS.length; k++) { let have = 0; for (let i = 0; i < N; i++) if (reg[i] === k) have += this.pop[i]; left[k] = Math.max(0, want[k] - have); }
      for (let i = 0; i < N; i++) { const k = reg[i]; if (k < 0 || room[k] <= 0) continue; const r0 = Math.max(0, cap[i] * 0.8 - this.pop[i]); this.pop[i] += Math.min(r0, left[k] * r0 / room[k]); }
    }
    for (let i = 0; i < N; i++) {
      const k = reg[i]; if (k < 0 || regCap[k] <= 0) { this.pop[i] = 0; continue; }
      this.granary[i] = this.pop[i] * 0.3;
      const { farm, past } = this._landFood(i);
      const need = Math.max(0, this.pop[i] * 1.12 - past - this.fishK[i] * 0.12);
      this.cleared[i] = farm > 0 ? Math.min(1, Math.max(0.02, need / farm)) : 0.02;
      this.soil[i] = 0.85;
    }
    // each state: capital, culture, techs, faith, government, ruler
    sc.states.forEach((name, k) => {
      const p = this.polities[idOf[k]], cells = cellsOf[k]; if (!cells.length) { p.alive = false; return; }
      let best = cells[0]; for (const c of cells) if (this.pop[c] * (this.siteAt[c] >= 0 ? 3 : 1) > this.pop[best] * (this.siteAt[best] >= 0 ? 3 : 1)) best = c;
      p.capital = best; p.culture = this.culture[best]; p.people = this.ppl ? this.ppl[best] : -1;
      p.gov = govFor(name, Y, cells.length); p.nomad = p.gov === 'khanate';
      p.treasury = 0; p.stability = 0.7;
    });
    // faiths: the world faiths founded before this date, spread as they were
    for (const pr of PROPHETS) if (pr.year < Y && !this.faiths.some(f => f.name === pr.name)) this._addFaith(pr, pr.year);
    const fid = n => this.faiths.findIndex(f => f.name === n);
    for (let i = 0; i < N; i++) { const n = faithAt(this.lon[i], this.lat[i], Y, this.nw[i]); if (n && fid(n) >= 0) this.rel[i] = fid(n); }
    for (const p of this.polities) if (p.alive) { p.rel = this._majorityFaith ? this._majorityFaith(p.id) : this.rel[p.capital]; p.faithPop = 0; }
    // rulers, institutions, ideas
    for (const p of this.polities) if (p.alive) { this._newRuler(p, true); if (this._instInit) { p.inst = {}; this._instInit(p); } p.ideo = undefined; if (this._ideoState) this._ideoState(p); }
    if (this.ideoBorn) {
      const born = { liberal: 1780, conservative: 1790, nationalist: 1800, socialist: 1848, fascist: 1920 };
      const K = this.ideoReach.length / N;
      ['tradition', 'theocracy', 'tribal', 'liberal', 'conservative', 'nationalist', 'socialist', 'fascist'].forEach((id, k) => { if (k >= 3 && born[id] <= Y) { this.ideoBorn[id] = { y: born[id], pol: -1 }; for (let i = 0; i < N; i++) if (this.cellTech[i][T.printing]) this.ideoReach[i * K + k] = Y >= 1900 ? 0.7 : 0.4; } });
    }
    if (this.known) this.known = new Map();
    for (let k = 0; k < TECHS.length; k++) if (TECHS[k].ry <= Y && !(TECHS[k].id in this.firstTech)) this.firstTech[TECHS[k].id] = { year: TECHS[k].ry, by: 'history' };
    this._aggregate();
    this._famInit();
    this._log('start', `The year ${Y}. ${(this.worldPop() / 1e6).toFixed(0)} million people. ${this.polities.filter(p => p.alive).length} states on the map of ${Y}, the largest ${this._largest().map(p => p.name).slice(0, 3).join(', ')}.`);
  };
}
