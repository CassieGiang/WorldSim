// Generated flags: each state gets one from its people's tradition, faith and government.
// The flag changes when the government changes (a revolution) or a new house takes the throne.
const PALETTES = {
  latin: ['#8b1a1a', '#d4a017', '#f2efe6', '#5a1e5e'], greek: ['#1f4e9c', '#f2efe6', '#c99a2e'], celtic: ['#2e6b3a', '#f2efe6', '#b8860b', '#1f3f7a'],
  germanic: ['#111111', '#c8102e', '#f2c80f', '#f2efe6'], norse: ['#1d3c8f', '#f2c80f', '#c8102e', '#f2efe6'], slavic: ['#f2efe6', '#1f4ea3', '#c8102e'],
  finnic: ['#1d4f9c', '#f2efe6', '#2b2b2b'], dacian: ['#1f3f8f', '#e0b400', '#c8102e'], persian: ['#1e7a46', '#f2efe6', '#c8102e', '#d4a017'],
  arabic: ['#0b6b3a', '#111111', '#f2efe6', '#b22222'], egyptian: ['#c8102e', '#f2efe6', '#111111', '#d4a017'], berber: ['#1f5fa8', '#3a8f3a', '#f2c80f'],
  turkic: ['#38a9d9', '#d4a017', '#c8102e'], mongolic: ['#1f4ea3', '#c8102e', '#e0b400'], sinitic: ['#c8102e', '#f2c80f', '#111111'],
  tibetan: ['#c8102e', '#1f4ea3', '#f2c80f', '#f2efe6'], korean: ['#f2efe6', '#c8102e', '#1f3f8f', '#111111'], japanese: ['#f2efe6', '#bc002d'],
  seasian: ['#c8102e', '#f2c80f', '#1f3f8f'], austronesian: ['#c8102e', '#f2efe6', '#1f4ea3'], indic: ['#f28c28', '#f2efe6', '#138808', '#1f2f8f'],
  dravidian: ['#c8102e', '#111111', '#f2c80f'], ethiopic: ['#1f8f3a', '#f2c80f', '#c8102e'], sudanic: ['#1f8f3a', '#c8102e', '#111111'],
  westafrican: ['#1f8f3a', '#f2c80f', '#c8102e'], bantu: ['#1f8f3a', '#111111', '#f2c80f', '#c8102e'], maya: ['#1f8f6a', '#c8102e', '#f2c80f'],
  mesoamerican: ['#2e8b57', '#c8102e', '#f2efe6'], andean: ['#c8102e', '#f2c80f', '#1f8f3a'], amazonian: ['#1f8f3a', '#f2c80f', '#1f4ea3'],
  northamerican: ['#8b4513', '#f2efe6', '#1f4ea3'], australian: ['#111111', '#c8102e', '#f2c80f'], siberian: ['#1f4ea3', '#f2efe6', '#2e8b57'],
};
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const cache = new Map();
export function flagSVG(world, p, w = 30, h = 20) {
  const dyn = p.ruler && !p.ruler.elected ? p.ruler.dynasty : '';
  const design = `${world.seed}|${p.id}|${p.gov}|${dyn}`, key = design + '|' + w;
  if (cache.has(key)) return cache.get(key);
  const r = rng(hash(design));
  const pal = PALETTES[p.culture] || PALETTES.latin;
  const faith = p.rel >= 0 && world.faiths ? world.faiths[p.rel].color : null;
  const pick = (ex = []) => { const c = pal.filter(x => !ex.includes(x)); return c.length ? c[Math.floor(r() * c.length)] : pal[0]; };
  const a = pick(), b = pick([a]), c = r() < 0.4 && faith ? faith : pick([a, b]);
  const W = 30, H = 20;
  let body = '';
  const kind = Math.floor(r() * 9);
  if (kind === 0) body = `<rect width="${W}" height="${H}" fill="${a}"/><rect y="${H / 3}" width="${W}" height="${H / 3}" fill="${b}"/>`;
  else if (kind === 1) body = `<rect width="${W}" height="${H}" fill="${a}"/><rect x="${W / 3}" width="${W / 3}" height="${H}" fill="${b}"/>`;
  else if (kind === 2) body = `<rect width="${W}" height="${H / 3}" fill="${a}"/><rect y="${H / 3}" width="${W}" height="${H / 3}" fill="${b}"/><rect y="${2 * H / 3}" width="${W}" height="${H / 3}" fill="${c}"/>`;
  else if (kind === 3) body = `<rect width="${W}" height="${H}" fill="${a}"/><rect x="9" width="4" height="${H}" fill="${b}"/><rect y="8" width="${W}" height="4" fill="${b}"/>`;
  else if (kind === 4) body = `<rect width="${W}" height="${H}" fill="${a}"/><circle cx="${W / 2}" cy="${H / 2}" r="5.5" fill="${b}"/>`;
  else if (kind === 5) body = `<rect width="${W}" height="${H}" fill="${a}"/><path d="M0 0L${W} ${H}M${W} 0L0 ${H}" stroke="${b}" stroke-width="3.5"/>`;
  else if (kind === 6) body = `<rect width="${W}" height="${H}" fill="${a}"/><rect y="${H / 2}" width="${W}" height="${H / 2}" fill="${b}"/><path d="M0 0L12 ${H / 2}L0 ${H}Z" fill="${c}"/>`;
  else if (kind === 7) body = `<rect width="${W}" height="${H}" fill="${a}"/><rect width="13" height="10" fill="${b}"/>`;
  else body = `<rect width="${W}" height="${H}" fill="${a}"/><path d="M0 ${H}L${W} 0V${H}Z" fill="${b}"/>`;
  // a charge in the middle: a crown for monarchies, a star for republics, a disc of the faith for theocracies
  const g = p.gov || 'kingdom', cx = kind === 3 || kind === 7 ? 6.5 : W / 2, cy = kind === 7 ? 5 : H / 2, ink = kind === 4 ? a : c === a ? b : c;
  if (['kingdom', 'empire', 'constitutional'].includes(g) && r() < 0.6) body += `<path d="M${cx - 4} ${cy + 2.5}L${cx - 4} ${cy - 2}L${cx - 2} ${cy}L${cx} ${cy - 3}L${cx + 2} ${cy}L${cx + 4} ${cy - 2}L${cx + 4} ${cy + 2.5}Z" fill="${ink}" stroke="#0006" stroke-width=".4"/>`;
  else if (['republic', 'democracy'].includes(g)) { const s = 3.2, pts = [...Array(10)].map((_, k) => { const ang = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? s * 0.45 : s; return `${(cx + rr * Math.cos(ang)).toFixed(2)},${(cy + rr * Math.sin(ang)).toFixed(2)}`; }).join(' '); body += `<polygon points="${pts}" fill="${ink}"/>`; }
  else if (g === 'theocracy' && faith) body += `<circle cx="${cx}" cy="${cy}" r="3.2" fill="${faith}" stroke="#fff8" stroke-width=".6"/>`;
  else if (g === 'khanate') body += `<path d="M${cx - 3} ${cy + 3}L${cx} ${cy - 3.5}L${cx + 3} ${cy + 3}Z" fill="${ink}"/>`;
  else if (g === 'dictatorship') body += `<rect x="${cx - 3}" y="${cy - 3}" width="6" height="6" fill="${ink}" transform="rotate(45 ${cx} ${cy})"/>`;
  const svg = `<svg class="flag" width="${w}" height="${h}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;border:1px solid #0008;border-radius:1px">${body}</svg>`;
  if (cache.size > 4000) cache.clear();
  cache.set(key, svg);
  return svg;
}
