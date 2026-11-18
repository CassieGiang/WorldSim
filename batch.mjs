// Run many worlds headless and summarise. Usage: node batch.mjs <count> [firstSeed] [toYear] [workers]
import fs from 'fs';
import os from 'os';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { World } from './src/engine.js';
import { TECHS } from './src/scenario.js';

const KEY_TECHS = ['paper', 'printing', 'ocean_navigation', 'scientific_method', 'industry', 'railways', 'electricity', 'antibiotics', 'fission', 'computers', 'internet'];
const checkpoints = [500, 1000, 1350, 1500, 1800, 1900, 1950, 2000, 2026];

function runOne(seed, toYear, geo) {
  const w = new World(geo, seed, process.env.RS ? { researchSpeed: +process.env.RS } : {});
  const popAt = {};
  w.run(toYear, w => { if (checkpoints.includes(w.year)) popAt[w.year] = w.worldPop(); });
  const s = w.summary();
  const wars = w.wars.slice().sort((a, b) => b.deaths - a.deaths);
  const alive = w.polities.filter(p => p.alive).sort((a, b) => b.pop - a.pop);
  return {
    seed, popAt, deaths: w.totals, contact: w.contactYear,
    tech: Object.fromEntries(KEY_TECHS.map(k => [k, w.firstTech[k] ? w.firstTech[k].year : null])),
    techFirstBy: Object.fromEntries(KEY_TECHS.map(k => [k, w.firstTech[k] ? w.firstTech[k].by : null])),
    biggestWar: wars[0] ? { name: wars[0].name, start: wars[0].start, end: wars[0].end, deaths: wars[0].deaths } : null,
    warsOver1M: wars.filter(x => x.deaths > 1e6).length, warsOver10M: wars.filter(x => x.deaths > 10e6).length,
    nuclearWars: wars.filter(x => x.nuclear).length,
    states: alive.length, largest: alive[0] ? { name: alive[0].name, pop: alive[0].pop } : null,
  };
}

if (!isMainThread) {
  const geo = JSON.parse(fs.readFileSync(new URL(process.env.WORLD || './src/world2.json', import.meta.url)));
  for (const seed of workerData.seeds) parentPort.postMessage(runOne(seed, workerData.toYear, geo));
} else {
  const count = +(process.argv[2] || 20), first = +(process.argv[3] || 1), toYear = +(process.argv[4] || 2026);
  const nw = +(process.argv[5] || Math.max(1, os.cpus().length));
  const seeds = Array.from({ length: count }, (_, k) => first + k);
  const results = [];
  const t0 = Date.now();
  await Promise.all(Array.from({ length: nw }, (_, k) => new Promise(res => {
    const wk = new Worker(new URL(import.meta.url), { workerData: { seeds: seeds.filter((_, j) => j % nw === k), toYear } });
    wk.on('message', r => { results.push(r); process.stderr.write(`\r${results.length}/${count} worlds`); });
    wk.on('exit', res);
  })));
  results.sort((a, b) => a.seed - b.seed);
  const q = (arr, p) => { const a = arr.filter(x => x != null).sort((x, y) => x - y); if (!a.length) return null; return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
  const stat = arr => ({ min: q(arr, 0), p25: q(arr, 0.25), median: q(arr, 0.5), p75: q(arr, 0.75), max: q(arr, 0.999), missing: arr.filter(x => x == null).length });
  const summary = {
    worlds: count, toYear, seconds: Math.round((Date.now() - t0) / 1000),
    population: Object.fromEntries(checkpoints.filter(y => y <= toYear).map(y => [y, stat(results.map(r => r.popAt[y]))])),
    techYear: Object.fromEntries(KEY_TECHS.map(k => [k, { real: TECHS.find(t => t.id === k).ry, ...stat(results.map(r => r.tech[k])) }])),
    contactYear: { real: 1492, ...stat(results.map(r => r.contact)) },
    deaths: { famine: stat(results.map(r => r.deaths.famine)), war: stat(results.map(r => r.deaths.war)), plague: stat(results.map(r => r.deaths.plague)) },
    biggestWarDeaths: stat(results.map(r => r.biggestWar && r.biggestWar.deaths)),
    share: {
      worldsWithWarOver1M: results.filter(r => r.warsOver1M > 0).length / count,
      worldsWithWarOver10M: results.filter(r => r.warsOver10M > 0).length / count,
      worldsUsingNukes: results.filter(r => r.nuclearWars > 0).length / count,
      worldsWithIndustryBy1800: results.filter(r => r.tech.industry && r.tech.industry <= 1800).length / count,
      worldsWithoutIndustryBy2026: results.filter(r => !r.tech.industry).length / count,
    },
  };
  fs.mkdirSync('batches', { recursive: true });
  const file = `batches/batch_${first}-${first + count - 1}_${toYear}.json`;
  fs.writeFileSync(file, JSON.stringify({ summary, results }, null, 1));
  process.stderr.write('\n');
  const f = n => n == null ? '–' : n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(0) + 'M' : String(Math.round(n));
  console.log(`${count} worlds to ${toYear} in ${summary.seconds}s -> ${file}`);
  console.log('Population (median [25%-75%]):');
  for (const [y, s] of Object.entries(summary.population)) console.log(`  ${y}: ${f(s.median)} [${f(s.p25)}–${f(s.p75)}]`);
  console.log('Invention year (real | median [25%-75%], never):');
  for (const [k, s] of Object.entries(summary.techYear)) console.log(`  ${k.padEnd(18)} ${String(s.real).padEnd(5)} | ${s.median ?? '–'} [${s.p25 ?? '–'}–${s.p75 ?? '–'}] never:${s.missing}`);
  console.log(`  first contact      1492  | ${summary.contactYear.median ?? '–'} [${summary.contactYear.p25 ?? '–'}–${summary.contactYear.p75 ?? '–'}] never:${summary.contactYear.missing}`);
  console.log('Deaths, whole run (median): famine', f(summary.deaths.famine.median), 'war', f(summary.deaths.war.median), 'plague', f(summary.deaths.plague.median), '| biggest single war (median)', f(summary.biggestWarDeaths.median));
  console.log('Shares:', Object.entries(summary.share).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(', '));
}
