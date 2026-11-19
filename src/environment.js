// Stage D: environment. Forests cut and regrowing, erosion and salt, disease ecology (malaria, city
// immunity, cattle plague), floods, river course changes, droughts and locusts, and industrial
// emissions that warm the climate, shift harvests and raise the sea.
import { TECH_INDEX as T } from './scenario.js';

const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + ' million' : n >= 1e3 ? Math.round(n / 1e3) + ',000' : String(Math.round(n));

export function installEnvironment(World) {
  const P = World.prototype;

  P._envInit = function () {
    const N = this.N, cs = this.geo.cells;
    this.forestPot = new Float32Array(N); this.forest = new Float32Array(N);
    this.soilCap = new Float32Array(N).fill(1); this.salt = new Float32Array(N); this.malaria = new Float32Array(N);
    this.immune = new Float32Array(N); this.drought = new Uint16Array(N);
    for (let i = 0; i < N; i++) {
      const f = cs[i].f, land = Math.max(1e-6, 1 - f[0]);
      this.forestPot[i] = Math.max(0, Math.min(1, (0.9 * f[1] + 0.8 * f[3] + 0.85 * f[4] + 0.05 * f[2]) / land));
      const farmShare = Math.min(1, this.arable[i] / Math.max(1, this.area[i])) * this.cleared[i];
      this.forest[i] = Math.max(0, this.forestPot[i] * (1 - farmShare * 1.3));
      // malaria: warm, wet lowlands
      this.malaria[i] = Math.max(0, Math.min(1, (f[1] / land) * (this.elev[i] < 1200 ? 1 : 0.2) * (Math.abs(cs[i].lat) < 28 ? 1 : 0.3)));
    }
    this.carbon = 0; this.ppm = 280; this.warming = 0; this.seaRise = 0; this.envLogged = {};
  };

  P._environment = function (y) {
    if (!this.forest) return;
    const N = this.N, r = this.rng, cs = this.geo.cells;
    let malariaD = 0;
    const slow = y % 5 === 0;   // forests, soils and immunity change slowly: update every five years
    for (let i = 0; i < N; i++) {
      const pop = this.pop[i];
      if (this.drought[i] > 0) { this.drought[i]--; this.climate[i] *= 0.7; }
      // malaria: natives live with it; newcomers from healthier lands (colonists, conquerors) die of it
      if (this.malaria[i] > 0.2 && pop > 100) { const o = this.owner[i]; if (o >= 0 && this.polities[o].capital >= 0 && this.malaria[this.polities[o].capital] < 0.2 && !this.cellTech[i][T.germ_theory]) { const d = pop * 0.001 * this.malaria[i]; this.pop[i] -= d; malariaD += d; } }
      if (!slow) continue;
      // forests: cut for fields, fuel and ships; they come back when people leave
      const dens = pop / Math.max(1, this.area[i]), t = this.cellTech[i];
      const farmShare = Math.min(1, this.arable[i] / Math.max(1, this.area[i])) * this.cleared[i];
      const cap = Math.max(0, this.forestPot[i] * (1 - farmShare * 1.3));
      const cut = 5 * dens * 0.00012 * (t[T.iron] ? 1.3 : 1) * (t[T.steam_engine] ? 0.4 : 1) * (t[T.combustion] ? 0.5 : 1);
      this.forest[i] = Math.max(0, Math.min(cap, this.forest[i] - cut + 0.05 * (cap - this.forest[i]) * (dens < 5 ? 1.5 : 0.5)));
      if (pop < 1) continue;
      // erosion on cleared slopes, salt in irrigated dry land
      if (this.cleared[i] > 0.5 && this.rough[i] > 0.25 && this.forest[i] < 0.2) this.soilCap[i] = Math.max(0.45, this.soilCap[i] - 0.002 * this.rough[i] * (t[T.agri_revolution] ? 0.3 : 1));
      const arid = cs[i].f[2] / Math.max(1e-6, 1 - cs[i].f[0]);
      if (t[T.irrigation] && arid > 0.5 && this.riv[i] > 0 && this.cleared[i] > 0.4) this.salt[i] = Math.min(0.5, this.salt[i] + 0.003 * arid * (t[T.agri_revolution] ? 0.2 : 1));
      if (this.cleared[i] < 0.2) { this.salt[i] *= 0.975; this.soilCap[i] = Math.min(1, this.soilCap[i] + 0.01); }
      if (t[T.fertilizer]) { this.salt[i] *= 0.95; this.soilCap[i] = Math.min(1, this.soilCap[i] + 0.015); }
      const capS = this.soilCap[i] - this.salt[i];
      if (this.soil[i] > capS) this.soil[i] = Math.max(0.3, capS);
      // crowd diseases: city people build up immunity
      this.immune[i] += 0.1 * (Math.min(1, this.urban[i] * 3) - this.immune[i]);
    }
    this.totals.plague += malariaD;
    this._disasters(y);
    this._climateChange(y);
    if (y % 10 === 0) this._fuelShortage(y);
  };

  // floods, a river changing course, droughts, locusts and cattle plague
  P._disasters = function (y) {
    const r = this.rng, N = this.N, cs = this.geo.cells;
    // floods: a river province, worse without dykes and dams
    for (let n = 0; n < 25 * this.K; n++) {
      const i = r.int(N); if (this.riv[i] < 0.25 || this.pop[i] < 1e4) continue;
      const o = this.owner[i], dams = o >= 0 && this.polities[o].worksFx && this.polities[o].worksFx.food > 1.04 ? 0.3 : 1;
      if (r.next() > 0.03 * this.riv[i] * dams * (1 + this.warming * 0.3)) continue;
      const big = r.next() < 0.15, cells = [i];
      if (big) for (const j of this.nb[i]) if (this.riv[j] > 0.2) cells.push(j);
      let dead = 0; for (const c of cells) { const d = this.pop[c] * (big ? 0.02 : 0.005); this.pop[c] -= d; dead += d; this.climate[c] *= 0.5; this.granary[c] *= 0.5; }
      this.totals.disaster += dead;
      const rn = cs[i].rn;
      // the Yellow River's habit of bursting its dykes and moving its mouth
      if (big && rn && /Yellow|Huang/.test(rn)) { if (!(this.envLogged.yellow > y - 50)) { this.envLogged.yellow = y; this._log('disaster', `The Yellow River bursts its dykes and changes course across the plain; ${fmt(dead)} drown or starve.`, { cell: i, deaths: dead, big: dead > 1e5 }); } }
      else if (dead > 3e4) this._log('disaster', `${rn ? `The ${rn}` : 'A great river'} floods ${this._where(i)}; ${fmt(dead)} die.`, { cell: i, deaths: dead, big: dead > 3e5 });
    }
    // droughts and locusts, a few times a century somewhere
    if (r.next() < 0.08) {
      const i = r.int(N); if (this.pop[i] > 5e4) {
        const arid = cs[i].f[2] / Math.max(1e-6, 1 - cs[i].f[0]), locust = arid > 0.3 && Math.abs(cs[i].lat) < 35 && r.next() < 0.5;
        const reach = locust ? 2 : 3, years = locust ? 1 : 1 + r.int(3);
        const set = new Set([i]); let front = [i];
        for (let k = 0; k < reach; k++) { const nx = []; for (const c of front) for (const j of this.nb[c]) if (!set.has(j)) { set.add(j); nx.push(j); } front = nx; }
        for (const c of set) this.drought[c] = Math.max(this.drought[c], years);
        let pop = 0; for (const c of set) pop += this.pop[c];
        if (pop > 2e6) this._log('famine', locust ? `Locust swarms strip the fields of ${this._where(i)}.` : `A ${years > 1 ? years + '-year ' : ''}drought grips ${this._where(i)}.`, { cell: i });
      }
    }
    // cattle plague: herds die across a region
    if (this.pastF && r.next() < 0.01) {
      const i = r.int(N); if (this.pop[i] > 1e4 && this.pastureA[i] > 0) {
        const set = new Set([i]); let front = [i]; for (let k = 0; k < 4; k++) { const nx = []; for (const c of front) for (const j of this.nb[c]) if (!set.has(j)) { set.add(j); nx.push(j); } front = nx; }
        for (const c of set) this.pastF[c] *= 0.75;
        this._herdPlague = this._herdPlague || []; this._herdPlague.push({ cells: [...set], until: y + 15 });
        this._log('famine', `A cattle plague sweeps through the herds of ${this._where(i)}.`, { cell: i });
      }
    }
    if (this._herdPlague) this._herdPlague = this._herdPlague.filter(h => { if (y < h.until) return true; for (const c of h.cells) if (this._cropFx) this._cropFx(c); return false; });
  };

  // without timber, fuel gets dear: a push towards coal
  P._fuelShortage = function (y) {
    for (const p of this.polities) {
      if (!p.alive || p.cells < 3) continue;
      let fo = 0, pot = 0; for (let n = 0; n < 12; n++) { const i = this._randomCellOfFast ? this._randomCellOfFast(p) : -1; if (i >= 0) { fo += this.forest[i]; pot += this.forestPot[i]; } }
      p.forestLeft = pot > 0 ? fo / pot : 1;
      const short = p.forestLeft < 0.25 && p.tech[T.iron] && p.urban / Math.max(1, p.pop) > 0.12;
      if (short && !p.fuelLogged && p.pop > 10e6) p.fuelLogged = y, this._log('famine', `${p.name} has cut down most of its forests; wood for fuel and ships grows scarce${this.res ? ', and people dig for coal' : ''}.`, { pol: p.id });
      p.fuelShort = short;
      // scarce wood makes coal worth inventing: research pressure towards the steam engine
      if (short && !p.tech[T.steam_engine] && p.prog) p.prog[T.steam_engine] *= 1.0 + 0.02;
    }
  };

  // emissions, warming, harvests and the sea
  P._climateChange = function (y) {
    let em = 0;
    for (const p of this.polities) if (p.alive && p.fx && p.fx.industry) em += p.urban * (1 + (p.tech[T.combustion] ? 1.5 : 0)) * 0.9e-9;
    this.emissions = em; this.carbon += em;
    this.ppm = 280 + this.carbon * 0.21;
    const eq = 3 * Math.log2(this.ppm / 280);
    this.warming += (eq - this.warming) * 0.03;
    this.seaRise += Math.max(0, this.warming) * 0.003;   // metres per year per degree, slowly
    const T0 = this.warming; if (T0 < 0.05) return;
    for (let i = 0; i < this.N; i++) {
      const al = Math.abs(this.lat[i]);
      const shift = al < 25 ? -0.05 * T0 : al < 45 ? -0.015 * T0 : 0.03 * T0;
      this.climate[i] = Math.max(0.3, this.climate[i] * (1 + shift) - (((i * 2654435761 + y * 97) >>> 0) % 1000 < 10 * T0 ? 0.3 : 0));
      // the sea takes low coasts
      if (this.coastal[i] && this.elev[i] < this.seaRise * 3 && this.pop[i] > 100) { const m = this.pop[i] * 0.01; this.pop[i] -= m; const j = this.nb[i].find(k => this.elev[k] > this.seaRise * 3) ?? -1; if (j >= 0) { this.pop[j] += m; if (this._carry) this._carry(i, j, m); } this.arable[i] *= 0.995; }
    }
    for (const [k, t, msg] of [[1, 1, 'The world is now 1°C warmer than before the factories; harvests in the tropics begin to suffer.'], [2, 2, 'The world has warmed by 2°C; storms, droughts and floods grow more common, and low coasts are lost to the sea.'], [3, 3, 'At 3°C of warming, the old farming belts are moving towards the poles.']]) if (T0 >= t && !this.envLogged['w' + k]) { this.envLogged['w' + k] = y; this._log('climate', msg, { big: true }); }
  };
  // epidemics hit city-dwellers less where crowd diseases are endemic
  P.immunityAt = function (c) { return this.immune ? this.immune[c] : 0; };
}
