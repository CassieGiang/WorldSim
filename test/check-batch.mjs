// Fails the build if the median world drifts far from the calibration targets.
import fs from 'fs';
const f = fs.readdirSync('batches').filter(x => x.startsWith('batch_1-8_2026')).map(x => 'batches/' + x)[0];
const s = JSON.parse(fs.readFileSync(f)).summary;
const bands = { printing: [1250, 1700], industry: [1600, 1950], paper: [40, 250] };
let bad = 0;
for (const [k, [lo, hi]] of Object.entries(bands)) {
  const m = s.techYear[k].median;
  const ok = m != null && m >= lo && m <= hi;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${k}: median ${m} (allowed ${lo}-${hi}, real ${s.techYear[k].real})`);
  if (!ok) bad++;
}
const p = s.population['2026'].median;
const okp = p > 3e9 && p < 1.4e10; console.log(`${okp ? 'OK  ' : 'FAIL'} population 2026 median ${(p / 1e9).toFixed(2)}B (allowed 3-14B, real 8.2B)`);
if (!okp) bad++;
process.exit(bad ? 1 : 0);
