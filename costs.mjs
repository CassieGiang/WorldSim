import fs from 'fs';
import { TECHS, TECH_INDEX } from './src/scenario.js';
const runs=[1,2,3].map(s=>JSON.parse(fs.readFileSync(`leadrp_${s}.json`)));
const C={}; for (const r of runs){ let c=0; for (const [y,rp] of r){ c+=rp; C[y]=(C[y]||0)+c/runs.length; } }
const cum=y=>C[Math.max(2,Math.min(2026,y))]||0;
const out={};
for (const t of TECHS){ if(!(t.cost>0) || t.noResearch || t.ry<50) continue; const avail=Math.max(1,...(t.pre||[]).map(id=>TECHS[TECH_INDEX[id]].ry)); out[t.id]=Math.round(Math.max(30, cum(t.ry)-cum(avail))); }
console.log(JSON.stringify(out));
