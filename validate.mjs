// Hold-out validation: things the model was NEVER tuned to, against real history.
// Usage: node validate.mjs <worlds> [firstSeed] [blind 0|1] [workers]
import fs from 'fs';
import os from 'os';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { World } from './src/engine.js';

const CHECK = [1000, 1345, 1360, 1500, 1800, 1900, 1950, 2000, 2020];
const inEurope = (w, i) => w.lon[i] > -11 && w.lon[i] < 45 && w.lat[i] > 35 && w.lat[i] < 71;

function measure(seed, blind, geo) {
  const w = new World(geo, seed, { blind });
  const m = { seed, euro: {}, city: {}, urban: {}, life: {}, faith: {}, states1M: {}, demo: {} };
  w.run(2026, w => {
    const y = w.year;
    if (!CHECK.includes(y)) return;
    let ep = 0; for (let i = 0; i < w.N; i++) if (inEurope(w, i)) ep += w.pop[i];
    m.euro[y] = ep;
    const top = w.topCities(1)[0]; m.city[y] = top ? top.pop : 0;
    const h = w.history.at(-1); m.urban[y] = h.urban;
    // crude life expectancy: 1 / pop-weighted baseline death rate (no famine/plague/war)
    let d = 0, p = 0; for (let i = 0; i < w.N; i++) { const fx = w.cellFx[i]; d += w.pop[i] * Math.max(0.0125, 0.0395 - fx.death); p += w.pop[i]; }
    m.life[y] = p / d;
    if (w.faiths) { const tot = w.worldPop(), t = {}; for (let i = 0; i < w.N; i++) { const n = w.faiths[w.rel[i]].name; t[n] = (t[n] || 0) + w.pop[i]; } m.faith[y] = Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v / tot])); }
    const big = w.polities.filter(q => q.alive && q.pop > 1e6);
    m.states1M[y] = big.length;
    m.demo[y] = big.length ? big.filter(q => q.gov === 'democracy').length / big.length : 0;
  });
  const wars = w.wars.slice();
  const groups = (w.warGroups || []).map(g => ({ start: g.start, deaths: g.deaths + g.wars.filter(x => !x.end).reduce((s, x) => s + x.deaths, 0) }));
  const all = [...wars.map(x => ({ start: x.start, deaths: x.deaths })), ...groups];
  m.warPre1800 = Math.max(0, ...all.filter(x => x.start < 1800).map(x => x.deaths));
  m.war1900s = Math.max(0, ...all.filter(x => x.start >= 1900 && x.start < 2000).map(x => x.deaths));
  const empires = w.polities.filter(q => q.peakPop > 10e6);
  m.empireLife = empires.map(q => (q.ended || 2026) - q.founded);
  m.blackDeath = m.euro[1345] ? 1 - m.euro[1360] / m.euro[1345] : null;
  return m;
}

if (!isMainThread) {
  const geo = JSON.parse(fs.readFileSync(new URL('./src/world2.json', import.meta.url)));
  for (const s of workerData.seeds) parentPort.postMessage(measure(s, workerData.blind, geo));
} else {
  const n = +(process.argv[2] || 12), first = +(process.argv[3] || 1), blind = process.argv[4] === '1', nw = +(process.argv[5] || os.cpus().length);
  const seeds = Array.from({ length: n }, (_, k) => first + k), res = [];
  await Promise.all(Array.from({ length: nw }, (_, k) => new Promise(ok => {
    const wk = new Worker(new URL(import.meta.url), { workerData: { seeds: seeds.filter((_, j) => j % nw === k), blind } });
    wk.on('message', r => { res.push(r); process.stderr.write(`\r${res.length}/${n}`); }); wk.on('exit', ok);
  })));
  process.stderr.write('\n');
  const q = (a, p) => { a = a.filter(x => x != null && isFinite(x)).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : null; };
  const band = (a, f = x => x) => { const lo = q(a, 0.25), md = q(a, 0.5), hi = q(a, 0.75); return md == null ? '–' : `${f(md)} [${f(lo)}–${f(hi)}]`; };
  const M = x => (x / 1e6).toFixed(x < 1e7 ? 1 : 0) + 'M', P = x => (x * 100).toFixed(0) + '%', Y = x => x.toFixed(0);
  const rows = [];
  const add = (name, real, sim, pass, na = false) => rows.push({ name, real, sim, pass: na ? null : pass });
  const med = a => q(a, 0.5);
  const inRange = (v, lo, hi) => v != null && v >= lo && v <= hi;
  const bd = res.map(r => r.blackDeath);
  add('Black Death: share of Europe lost 1345-1360', '25-50%', blind ? 'n/a in blind mode' : band(bd, P), inRange(med(bd), 0.2, 0.55), blind);
  const w1 = res.map(r => r.warPre1800); add('Largest war before 1800', '10-40M', band(w1, M), inRange(med(w1), 5e6, 6e7));
  const w2 = res.map(r => r.war1900s); add('Largest war 1900-1999', '70-85M', band(w2, M), inRange(med(w2), 2e7, 1.5e8));
  const el = res.flatMap(r => r.empireLife); add('Lifespan of states that peak above 10M people (years)', 'a few centuries (150-500)', band(el, Y), inRange(med(el), 120, 600));
  for (const [y, lo, hi, real] of [[1000, 2e5, 1e6, '~0.45M (Cordoba/Kaifeng)'], [1500, 3e5, 1.5e6, '~0.7M (Beijing)'], [1800, 6e5, 2.5e6, '~1.1M (Beijing)'], [1900, 3e6, 1.2e7, '6.5M (London)'], [2000, 1.5e7, 6e7, '~35M (Tokyo)']]) {
    const a = res.map(r => r.city[y]); add(`Largest city in ${y}`, real, band(a, M), inRange(med(a), lo, hi));
  }
  for (const [y, lo, hi, real] of [[1800, 0.04, 0.12, '~7%'], [1900, 0.1, 0.25, '~16%'], [1950, 0.2, 0.4, '~30%'], [2000, 0.38, 0.58, '~47%']]) {
    const a = res.map(r => r.urban[y]); add(`Urban share ${y}`, real, band(a, P), inRange(med(a), lo, hi));
  }
  for (const [y, lo, hi, real] of [[1800, 24, 35, '~29'], [1950, 38, 55, '~46'], [2020, 64, 80, '~72']]) {
    const a = res.map(r => r.life[y]); add(`Life expectancy ${y} (crude)`, real, band(a, Y), inRange(med(a), lo, hi));
  }
  for (const [f, y, lo, hi, real] of [['Christianity', 2020, 0.2, 0.42, '31%'], ['Islam', 2020, 0.12, 0.35, '25%'], ['Hinduism', 2020, 0.08, 0.22, '15%'], ['Buddhism', 2020, 0.03, 0.15, '7%'], ['Christianity', 1500, 0.12, 0.28, '~19%'], ['Islam', 1500, 0.07, 0.2, '~13%']]) {
    const a = res.map(r => (r.faith[y] || {})[f] || 0); add(`${f} share of world ${y}`, real, blind ? 'n/a in blind mode' : band(a, P), inRange(med(a), lo, hi), blind);
  }
  { const a = res.map(r => { const v = Object.values(r.faith[2020] || {}).sort((x, y) => y - x); return (v[0] || 0) + (v[1] || 0); }); add('Two largest faiths together, 2020', '~56% (Christianity + Islam)', band(a, P), inRange(med(a), 0.35, 0.75)); }
  for (const [y, lo, hi, real] of [[1000, 15, 60, 'dozens'], [1800, 35, 110, '~60'], [2000, 90, 220, '~150']]) {
    const a = res.map(r => r.states1M[y]); add(`States above 1M people, ${y}`, real, band(a, Y), inRange(med(a), lo, hi));
  }
  for (const [y, lo, hi, real] of [[1900, 0.03, 0.2, '~10%'], [2000, 0.3, 0.65, '~50%']]) {
    const a = res.map(r => r.demo[y]); add(`Democracies among states above 1M, ${y}`, real, band(a, P), inRange(med(a), lo, hi));
  }
  const pass = rows.filter(r => r.pass).length;
  let md = `# Hold-out validation (${blind ? 'blind' : 'normal'} mode, ${n} worlds, seeds ${first}-${first + n - 1})\n\nNone of these were used for tuning. Median [middle half] of worlds vs real history. Pass = median inside a generous band around history.\n\n| Measure | Real history | Simulated | Pass |\n|---|---|---|---|\n`;
  for (const r of rows) md += `| ${r.name} | ${r.real} | ${r.sim} | ${r.pass === null ? '–' : r.pass ? '✅' : '❌'} |\n`;
  const scored = rows.filter(r => r.pass !== null).length;
  md += `\n**${pass} of ${scored} pass.**\n`;
  fs.mkdirSync('reports', { recursive: true });
  const file = `reports/validation_${blind ? 'blind' : 'normal'}_${first}-${first + n - 1}.md`;
  fs.writeFileSync(file, md);
  console.log(md); console.log('->', file);
  if (process.env.CI_STRICT && pass < rows.length * 0.6) process.exit(1);
}
