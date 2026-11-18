import fs from 'fs';
import { World, fmt } from './src/engine.js';
import { REAL_POP } from './src/scenario.js';
const geo = JSON.parse(fs.readFileSync(new URL(process.env.WORLD || './src/world2.json', import.meta.url)));
const seed = +(process.argv[2] || 1), to = +(process.argv[3] || 2026);
const w = new World(geo, seed, { ...(process.env.RS ? { researchSpeed: +process.env.RS } : {}), ...(process.env.COUNCIL ? { council: 'rules' } : {}) });
const t0 = Date.now();
const real = y => { let a = REAL_POP[0]; for (const b of REAL_POP) { if (b[0] >= y) { const t = (y - a[0]) / Math.max(1, b[0] - a[0]); return a[1] + (b[1] - a[1]) * t; } a = b; } return a[1]; };
w.run(to, w => { if (w.year % (+process.argv[4]||100) === 0 || w.year === to) { const h = w.history.at(-1); console.log(w.year, 'pop', (h.pop/1e6).toFixed(0)+'M', 'real', real(w.year).toFixed(0)+'M', 'states', h.states, 'wars', h.wars, 'urban', (h.urban*100).toFixed(0)+'%', 'techs', h.techLead, h.techLeader); } });
console.log('time', Date.now() - t0, 'ms');
const s = w.summary(); console.log(JSON.stringify({ deaths: Object.fromEntries(Object.entries(s.deaths).map(([k,v])=>[k,fmt(v)])), contact: s.contactYear, warsOver1M: s.warsOver1M, nuclear: s.nuclearWars }));
console.log(Object.entries(s.firstTech).map(([k,v])=>k+':'+v.year).join(' '));
console.log(w._largest().slice(0,8).map(p=>p.name+' '+fmt(p.pop)).join(' | '));
const top = w._largest().slice(0,6); console.log(top.map(p=>`${p.name} rp=${p.rpRate?.toFixed(1)} known=${p.fx.known} urb=${fmt(p.urban)} stab=${p.stability.toFixed(2)} cells=${p.cells}`).join('\n'));
if (process.env.EV) { const big = w.events.filter(e => e.big || ['war','famine','fall','split','contact','colony','dynasty','rise'].includes(e.type)); const counts={}; for(const e of w.events) counts[e.type]=(counts[e.type]||0)+1; console.log(counts); for (const e of w.events.filter(e=>e.big)) console.log(e.y, e.type, e.text); }
