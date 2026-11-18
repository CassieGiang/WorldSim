import { World } from './engine.js';
const KEY = ['printing', 'ocean_navigation', 'industry', 'electricity', 'computers', 'internet'];
let geo = null;
self.onmessage = e => {
  const m = e.data;
  if (m.geo) geo = m.geo;
  for (const seed of m.seeds || []) {
    const w = new World(geo, seed);
    w.run(m.toYear, w => { if (w.year % 100 === 0) self.postMessage({ progress: true, seed, year: w.year }); });
    const wars = w.wars.slice().sort((a, b) => b.deaths - a.deaths);
    const alive = w.polities.filter(p => p.alive).sort((a, b) => b.pop - a.pop);
    self.postMessage({
      done: true, seed, pop: w.worldPop(), contact: w.contactYear, states: alive.length,
      tech: Object.fromEntries(KEY.map(k => [k, w.firstTech[k] ? w.firstTech[k].year : null])),
      deaths: w.totals, biggestWar: wars[0] ? { name: wars[0].name, start: wars[0].start, deaths: wars[0].deaths } : null,
      nukes: wars.filter(x => x.nuclear).length, largest: alive[0] ? alive[0].name : '',
    });
  }
};
