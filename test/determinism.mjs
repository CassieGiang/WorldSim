// The same seed must produce exactly the same history.
import fs from 'fs';
import { World } from '../src/engine.js';
const geo = JSON.parse(fs.readFileSync(new URL('../src/world2.json', import.meta.url)));
const run = () => { const w = new World(geo, 42); w.run(400); return JSON.stringify({ pop: Math.round(w.worldPop()), events: w.events.length, last: w.events.slice(-5).map(e => e.text), owners: Array.from(w.owner.slice(0, 2000)).join(',') }); };
const a = run(), b = run();
if (a !== b) { console.error('FAIL: same seed gave different histories'); process.exit(1); }
console.log('OK: seed 42 reproducible to year 400');
