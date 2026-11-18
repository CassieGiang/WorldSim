import fs from 'fs';
import { World, fmt } from './src/engine.js';
import { REAL_POP, TECHS } from './src/scenario.js';
const geo = JSON.parse(fs.readFileSync(process.env.WORLD || './src/world2.json'));
const seed=+(process.argv[2]||1);
const w = new World(geo, seed, { forceHistory: true });
const real = y => { let a = REAL_POP[0]; for (const b of REAL_POP) { if (b[0] >= y) { const t = (y - a[0]) / Math.max(1, b[0] - a[0]); return a[1] + (b[1] - a[1]) * t; } a = b; } return a[1]; };
w.run(2026, w => { if (w.year % 100 === 0 || [1350,1450,1850,1950,1975,2026].includes(w.year)) { const h=w.history.at(-1); console.log(w.year, (h.pop/1e6).toFixed(0)+'M', 'real', real(w.year).toFixed(0), 'urb', (h.urban*100).toFixed(0)+'%', 'states', h.states, 'leadRp', w.leadRp.at(-1)[1].toFixed(1), w.leadRp.at(-1)[2]); }});
fs.writeFileSync('leadrp_'+seed+'.json', JSON.stringify(w.leadRp));
console.log(JSON.stringify(Object.fromEntries(Object.entries(w.totals).map(([k,v])=>[k,fmt(v)]))));
for (const e of w.events.filter(e=>e.type==='plague' && e.deaths)) console.log(e.y, e.text);
const H=w.history; for (const y of [1800,1850,1900,1950,2000]) { const h=H.find(h=>h.y===y); let f=0,p=0; for(let k=y-49;k<=y;k++){const hh=H.find(h=>h.y===k); f+=hh.famine;} console.log(y,'famine 50y',fmt(f)); }
