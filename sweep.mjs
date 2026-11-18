import fs from 'fs';
import { World } from './src/engine.js';
const geo = JSON.parse(fs.readFileSync(process.env.WORLD || './src/world2.json'));
const [rs, seed] = [+process.argv[2], +process.argv[3]];
const w = new World(geo, seed, { researchSpeed: rs });
w.run(1900);
const f = w.firstTech; const g = k => f[k] ? f[k].year : '-';
console.log(`rs=${rs} s=${seed} printing ${g('printing')} industry ${g('industry')} railways ${g('railways')} pop1900 ${(w.worldPop()/1e6).toFixed(0)}M`);
