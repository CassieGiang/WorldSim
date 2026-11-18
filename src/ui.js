import geo from './world2.json';
import idBin from './idmap4k.bin';
import shadeJpg from './shade.jpg';
import riversPng from './rivers.png';
import { Globe } from './globe.js';
import { World, fmt } from './engine.js';
import { GOVS, RES } from './systems.js';
import { TECHS, REAL_POP } from './scenario.js';
import { askCouncil, listModels, writeFamilyStory, writeChapter } from './council.js';
import { FAMILY_TRAITS } from './families.js';
import { WHATIFS } from './whatif.js';
import { flagSVG } from './flags.js';
import { CROPS, CLASS_LABEL, INST_LABEL, WORK_ICONS } from './economy.js';

// ---------- state ----------
const $ = id => document.getElementById(id);
let world, playing = false, speed = 10, mode = 'political', selected = -1, needsDraw = true, lastEventCount = 0;
let rot = [-60, -25], scale = 1;
const store = { get: (k, d) => { try { const v = localStorage.getItem('worldsim.' + k); return v === null ? d : v; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem('worldsim.' + k, v); } catch {} } };
const council = { mode: store.get('cmode', 'off'), every: +store.get('cevery', 25), size: +store.get('csize', 5), url: store.get('curl', 'http://localhost:11434'), model: store.get('cmodel', 'qwen2.5:7b'), busy: false, held: -1, errors: 0 };
function worldOpts() { return { blind: $('blind') && $('blind').checked, council: council.mode === 'rules' ? 'rules' : null, councilEvery: council.every, councilSize: council.size }; }
const canvas = $('overlay');
let globe = null, colorsDirty = true;
const player = { id: -1, held: -1, busy: false, fallen: false };
let branch = null;   // what-if: { A, B, active: 'A' | 'B' }
let globe2 = null, split = false, rec = null;
const famUI = { picking: false, saved: (() => { try { return JSON.parse(store.get('families', '[]')); } catch { return []; } })(), builtin: store.get('builtinFam', '1') === '1' };
const saveFamStore = () => store.set('families', JSON.stringify(famUI.saved));

function newWorld(seed) {
  branch = null; renderBranch();
  pplCache.clear(); langCache.clear();
  world = new World(geo, seed, worldOpts());
  council.held = -1; player.id = -1; player.held = -1; player.busy = false; world.playerId = -1; renderPlayer();
  selected = -1; lastEventCount = 0; $('log').innerHTML = ''; spin = null;
  $('seed').value = seed;
  if (!famUI.builtin) for (const f of world.families || []) { f.alive = false; f.removed = true; }
  for (const sf of famUI.saved.filter(x => x.auto)) world.addFamily({ ...sf, cell: world._nearest(sf.lon, sf.lat) });
  appendEvents(); updatePanels(); needsDraw = true; colorsDirty = true;
}

// ---------- colours (each mode returns [r, g, b]) ----------
const lerp = (a, b, t) => a + (b - a) * t;
function ramp(stops, t) {
  t = Math.max(0, Math.min(1, t || 0));
  const n = stops.length - 1, k = Math.min(n - 1, Math.floor(t * n)), u = t * n - k;
  const a = stops[k], b = stops[k + 1];
  return [lerp(a[0], b[0], u) | 0, lerp(a[1], b[1], u) | 0, lerp(a[2], b[2], u) | 0];
}
const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
const norm = document.createElement('canvas').getContext('2d');
const rgbCache = new Map();
function toRGB(str) {
  let v = rgbCache.get(str); if (v) return v;
  norm.fillStyle = '#000'; norm.fillStyle = str; const h = norm.fillStyle;
  v = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  rgbCache.set(str, v); return v;
}
const R_DENS = [[38, 52, 44], [84, 120, 70], [196, 180, 90], [226, 120, 60], [190, 40, 60]];
const R_FOOD = [[150, 20, 40], [220, 90, 50], [235, 205, 110], [120, 180, 90], [40, 130, 90]];
const R_TECH = [[60, 40, 70], [110, 60, 120], [80, 110, 190], [70, 190, 200], [240, 240, 200]];
const R_ELEV = [[70, 120, 70], [150, 160, 90], [190, 160, 110], [150, 110, 80], [220, 215, 210]];
const TRIBAL = [61, 74, 58];
function stateRGB(p) {
  const c = toRGB(p.color);
  if (p.overlord == null) return c;
  const o = toRGB(world.polities[p.overlord].color);
  return [(c[0] * 0.35 + o[0] * 0.65) | 0, (c[1] * 0.35 + o[1] * 0.65) | 0, (c[2] * 0.35 + o[2] * 0.65) | 0];
}
const GOV_COL = { chiefdom: [120, 110, 90], kingdom: [70, 110, 170], empire: [150, 60, 150], khanate: [180, 140, 70], republic: [60, 160, 150], theocracy: [210, 200, 120], constitutional: [100, 150, 210], democracy: [90, 200, 110], dictatorship: [200, 60, 50] };
const RES_ORDER = [['oil', [30, 30, 30]], ['coal', [90, 80, 80]], ['gold', [240, 200, 60]], ['tin', [170, 190, 210]], ['iron', [190, 90, 60]], ['horses', [200, 160, 110]], ['timber', [50, 110, 60]]];
const cultureCache = new Map();
const pplCache = new Map(), langCache = new Map(), famCache = new Map();
function pplRGB(k) { let v = pplCache.get(k); if (!v) { v = toRGB(world.peoples[k].color); pplCache.set(k, v); } return v; }
function langRGB(k) { let v = langCache.get(k); if (!v) { v = toRGB(world.langs[k].color); langCache.set(k, v); } return v; }
function famRGB(f) { let v = famCache.get(f); if (!v) { v = toRGB(world.FAMILY_COLORS[f] || '#888'); famCache.set(f, v); } return v; }
function topBy(fn, n = 10) { const t = new Map(); for (let i = 0; i < world.N; i++) { const k = fn(i); t.set(k, (t.get(k) || 0) + world.pop[i]); } return [...t].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k); }
function cultureColor(c) { let v = cultureCache.get(c); if (v) return v; let h = 0; for (const ch of c) h = (h * 31 + ch.charCodeAt(0)) >>> 0; v = toRGB(`hsl(${(h * 137.5) % 360},${40 + h % 25}%,${45 + (h >> 5) % 15}%)`); cultureCache.set(c, v); return v; }
const MODES = {
  political: { label: 'Political', color: i => world.owner[i] >= 0 ? stateRGB(world.polities[world.owner[i]]) : ramp([[52, 62, 50], [92, 100, 76]], Math.sqrt(world.pop[i] / world.area[i] / 20)) },
  density: { label: 'People per km²', color: i => ramp(R_DENS, Math.log10(1 + world.pop[i] / Math.max(1, world.area[i])) / 3), legend: ['0', '10', '100', '1000+'], legendColors: [0, 1 / 3, 2 / 3, 1].map(t => css(ramp(R_DENS, t))) },
  food: { label: 'Food (fed share)', color: i => world.pop[i] < 1 ? TRIBAL : ramp(R_FOOD, (world.nour[i] - 0.7) / 0.6), legend: ['starving', 'short', 'enough', 'surplus'], legendColors: [0, 0.33, 0.55, 0.9].map(t => css(ramp(R_FOOD, t))) },
  crisis: { label: 'Deaths this year', color: i => {
    const p = world.pop[i] + 1, f = world.famine[i] / p, pl = world.plagueHit[i], wa = world.warHit[i] || world.warZone[i];
    if (pl > 0.005) return [Math.min(255, 120 + pl * 600) | 0, 40, Math.min(240, 140 + pl * 400) | 0];
    if (wa) return [232, 72, 58];
    if (f > 0.0005) return [240, Math.max(80, 200 - f * 6000) | 0, 40];
    return world.owner[i] >= 0 ? [43, 51, 64] : [37, 44, 39];
  }, legend: ['plague', 'war', 'famine'], legendColors: ['rgb(220,40,220)', '#e8483a', 'rgb(240,150,40)'] },
  elevation: { label: 'Height', color: i => ramp(R_ELEV, world.elev[i] / 4500), legend: ['sea level', '1,000 m', '2,000 m', '3,500 m+'], legendColors: [0, 0.22, 0.45, 0.8].map(t => css(ramp(R_ELEV, t))) },
  soil: { label: 'Soil fertility', color: i => ramp([[120, 70, 40], [190, 150, 80], [90, 150, 70]], (world.soil[i] - 0.5) / 0.5), legend: ['worn', '', 'rich'], legendColors: ['rgb(120,70,40)', 'rgb(190,150,80)', 'rgb(90,150,70)'] },
  cleared: { label: 'Farmland cleared', color: i => ramp([[30, 70, 40], [110, 140, 60], [220, 200, 110]], world.cleared[i]), legend: ['wild', '', 'farmed'], legendColors: ['rgb(30,70,40)', 'rgb(110,140,60)', 'rgb(220,200,110)'] },
  climate: { label: 'This year\'s weather', color: i => ramp([[180, 50, 40], [225, 150, 70], [215, 215, 195], [110, 175, 110], [50, 130, 90]], 0.5 + (world.climate[i] - 1) * 3), legend: ['bad harvest', 'normal', 'good harvest'], legendColors: ['rgb(180,50,40)', 'rgb(215,215,195)', 'rgb(50,130,90)'] },
  tech: { label: 'Technologies known', color: i => ramp(R_TECH, world.cellFx[i].known / TECHS.length), legend: ['few', '', 'all'], legendColors: [0, 0.5, 1].map(t => css(ramp(R_TECH, t))) },
  religion: { label: 'Religion', color: i => { const f = world.faiths[world.rel[i]]; const c = toRGB(f.color), k = 0.55 + 0.45 * world.relStr[i]; return [c[0] * k | 0, c[1] * k | 0, c[2] * k | 0]; },
    legendFn: () => world.faiths.filter(f => f.pop > 0).sort((a, b) => b.pop - a.pop).slice(0, 9).map(f => [`${f.name} ${fmt(f.pop)}`, f.color]) },
  peoples: { label: 'Peoples', color: i => { const a = pplRGB(world.ppl[i]); if (world.ppl2[i] === 65535 || world.mix[i] < 0.15) return a; const b = pplRGB(world.ppl2[i]), m = world.mix[i]; return [lerp(a[0], b[0], m) | 0, lerp(a[1], b[1], m) | 0, lerp(a[2], b[2], m) | 0]; },
    legendFn: () => topBy(i => world.ppl[i]).map(k => [world.peoples[k].name, css(pplRGB(k))]) },
  language: { label: 'Languages', color: i => langRGB(world.peoples[world.ppl[i]].li),
    legendFn: () => topBy(i => world.peoples[world.ppl[i]].li).map(k => [world.langs[k].name, css(langRGB(k))]) },
  langfam: { label: 'Language families', color: i => famRGB(world.peoples[world.ppl[i]].family),
    legendFn: () => topBy(i => world.peoples[world.ppl[i]].family, 14).map(f => [f, css(famRGB(f))]) },
  crops: { label: 'Crops and animals', color: i => {
      const c = world.crops[i]; if (!c || world.pop[i] < 1) return [40, 46, 40];
      const has = id => c & (1 << CROPS.findIndex(x => x.id === id));
      const nw = world.nw[i], foreign = CROPS.some((cr, k) => c & (1 << k) && cr.world !== 'both' && (cr.world === 'new') !== !!nw && (cr.staple || cr.animal));
      let base = has('rice') ? [70, 150, 120] : has('maize') && nw ? [220, 190, 60] : has('wheat') ? [200, 160, 90] : has('millet') ? [170, 120, 80] : has('potato') || has('cassava') ? [180, 120, 160] : [110, 120, 100];
      if (foreign) base = [Math.min(255, base[0] + 40), Math.min(255, base[1] + 40), Math.min(255, base[2] + 90)];
      return base; },
    legend: ['rice', 'wheat', 'millet & sorghum', 'maize (Americas)', 'potatoes & cassava', 'brighter: crops or animals from the other half of the world'], legendColors: ['rgb(70,150,120)', 'rgb(200,160,90)', 'rgb(170,120,80)', 'rgb(220,190,60)', 'rgb(180,120,160)', 'rgb(200,200,255)'] },
  prices: { label: 'Bread prices', color: i => { const o = world.owner[i]; if (o < 0) return [44, 50, 44]; const p = world.polities[o]; return ramp([[60, 120, 80], [200, 190, 90], [210, 90, 50], [140, 20, 30]], Math.log2(Math.max(0.25, (p.grainPrice || 1) / world.priceLevel)) / 3 + 0.33); }, legend: ['cheap', 'usual', 'dear', 'famine prices'], legendColors: ['rgb(60,120,80)', 'rgb(200,190,90)', 'rgb(210,90,50)', 'rgb(140,20,30)'] },
  inequality: { label: 'Inequality', color: i => { const o = world.owner[i]; if (o < 0) return [44, 50, 44]; const g = world.polities[o].gini; return g == null ? [80, 80, 80] : ramp([[70, 130, 180], [220, 210, 120], [190, 50, 50]], (g - 0.25) / 0.45); }, legend: ['equal', '', 'unequal'], legendColors: ['rgb(70,130,180)', 'rgb(220,210,120)', 'rgb(190,50,50)'] },
  government: { label: 'Government', color: i => { const o = world.owner[i]; return o < 0 ? [45, 52, 44] : GOV_COL[world.polities[o].gov] || [120, 120, 120]; },
    legendFn: () => Object.entries(GOV_COL).map(([g, c]) => [GOVS[g].label, css(c)]) },
  resources: { label: 'Resources', color: i => { const r = world.res[i]; for (const [k, c] of RES_ORDER) if (r & (1 << RES.indexOf(k))) return c; return [48, 56, 48]; },
    legendFn: () => RES_ORDER.map(([k, c]) => [k, css(c)]) },
  trade: { label: 'Trade routes', color: i => { const o = world.owner[i]; if (o < 0) return [44, 50, 44]; const c = toRGB(world.polities[o].color); return [c[0] * 0.45 | 0, c[1] * 0.45 | 0, c[2] * 0.45 | 0]; } },
  wealth: { label: 'Wealth per person', color: i => { const o = world.owner[i]; if (o < 0) return [44, 50, 44]; const p = world.polities[o]; return ramp([[60, 50, 70], [120, 90, 140], [210, 170, 80], [250, 230, 150]], Math.log10(1 + (p.income || 0) / Math.max(1, p.pop) * 1e7) / 2.5); }, legend: ['poor', '', 'rich'], legendColors: ['rgb(60,50,70)', 'rgb(160,120,110)', 'rgb(250,230,150)'] },
  alliances: { label: 'Alliances', color: i => {
      const o = world.owner[i]; if (o < 0) return [40, 46, 40];
      const p = world.polities[o], top = p.overlord != null ? world.polities[p.overlord] : p, al = world.allianceOf(top.id);
      if (al) return toRGB(al.color);
      const c = toRGB(p.color); return [c[0] * 0.3 + 30 | 0, c[1] * 0.3 + 30 | 0, c[2] * 0.3 + 30 | 0];
    },
    legendFn: () => world.alliances.filter(a => !a.ended).map(a => [`${a.name} (${a.members.size})`, a.color]).slice(0, 8) },
  fish: { label: 'Fish stocks', color: i => world.fishK[i] > 0 ? ramp([[150, 40, 40], [210, 190, 90], [60, 140, 190]], world.fish[i] / world.fishK[i]) : [42, 49, 43], legend: ['fished out', 'half', 'full'], legendColors: ['rgb(150,40,40)', 'rgb(210,190,90)', 'rgb(60,140,190)'] },
};

// ---------- drawing ----------
let colBuf = null, ownBuf = null, labels = [];
function updateColors() {
  if (!colBuf) { colBuf = new Uint8Array(globe.colData.length); ownBuf = new Uint16Array(globe.ownData.length); }
  const col = MODES[mode].color;
  for (let i = 0; i < world.N; i++) {
    const c = col(i); colBuf[i * 4] = c[0]; colBuf[i * 4 + 1] = c[1]; colBuf[i * 4 + 2] = c[2]; colBuf[i * 4 + 3] = 255;
    ownBuf[i] = world.owner[i] + 1;
  }
  globe.borders = mode === 'political' || mode === 'tech' ? 1 : 0;
  globe.setData(colBuf, ownBuf);
  // label anchors: population-weighted centre of each big state
  const acc = new Map();
  for (let i = 0; i < world.N; i++) {
    const o = world.owner[i]; if (o < 0) continue;
    let a = acc.get(o); if (!a) { a = [0, 0, 0, 0]; acc.set(o, a); }
    const la = world.lat[i] * Math.PI / 180, lo = world.lon[i] * Math.PI / 180, w = Math.sqrt(world.pop[i]);
    a[0] += Math.cos(la) * Math.cos(lo) * w; a[1] += Math.cos(la) * Math.sin(lo) * w; a[2] += Math.sin(la) * w; a[3] += w;
  }
  labels = world.polities.filter(p => p.alive && p.pop > 3e6 && p.cells >= 6 * world.K).sort((a, b) => b.pop - a.pop).slice(0, 18).map(p => {
    const a = acc.get(p.id); if (!a) return null;
    return { p, lon: Math.atan2(a[1], a[0]) * 180 / Math.PI, lat: Math.atan2(a[2], Math.hypot(a[0], a[1])) * 180 / Math.PI };
  }).filter(Boolean);
  colorsDirty = false;
}
function resize() { if (globe) { globe.resize(); needsDraw = true; } if (globe2) globe2.resize(); }
function draw() {
  if (colorsDirty) updateColors();
  globe.sel = selected >= 0 ? selected : 65535;
  globe.selOwn = selected >= 0 && world.owner[selected] >= 0 ? world.owner[selected] + 1 : 0;
  globe.render();
  const ctx = globe.beginOverlay(), sc = globe.view.scale;
  if (mode === 'trade' || mode === 'political') drawRoutes(ctx, mode === 'trade' ? 1 : 0.25);
  const placed = mode === 'political' ? drawLabels(ctx) : [];
  drawWorks(ctx);
  // cities
  const cities = world.topCities(sc > 2 ? 90 : sc > 1.3 ? 60 : 35);
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  cities.forEach((ct, k) => {
    const pt = globe.project(world.lon[ct.cell], world.lat[ct.cell]); if (!pt) return;
    const r = Math.max(1.6, Math.min(5.5, Math.log10(ct.pop) - 3.3)) * Math.min(1.6, Math.sqrt(sc));
    const cap = world.owner[ct.cell] >= 0 && world.polities[world.owner[ct.cell]].capital === ct.cell;
    ctx.beginPath(); ctx.arc(pt[0], pt[1], r, 0, Math.PI * 2);
    ctx.fillStyle = cap ? '#ffe7a3' : '#f4efe2'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(10,12,18,0.8)'; ctx.stroke();
    if (k < (sc > 2 ? 40 : sc > 1.3 ? 22 : 10)) {
      ctx.font = `${cap ? 600 : 500} ${10 + Math.min(3, sc)}px "Inter", system-ui, sans-serif`;
      const t = world.cityLabel(ct), tw = ctx.measureText(t).width, fs = 10 + Math.min(3, sc);
      const box = [pt[0] + r + 2, pt[1] - fs / 2, tw + 2, fs];
      if (placed.some(b => box[0] < b[0] + b[2] && box[0] + box[2] > b[0] && box[1] < b[1] + b[3] && box[1] + box[3] > b[1])) return;
      placed.push(box);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,10,18,0.7)'; ctx.strokeText(t, pt[0] + r + 3, pt[1]);
      ctx.fillStyle = '#e8e2d2'; ctx.fillText(t, pt[0] + r + 3, pt[1]);
    }
  });
}
function drawWorks(ctx) {
  if (!world.works || (mode !== 'political' && mode !== 'trade')) return;
  ctx.font = '13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const w of world.works) {
    if (w.abandoned || (globe.view.scale < 1.8 && !(w.done && (w.kind === 'wall' || w.kind === 'canal' || w.kind === 'pyramid') && world.polities[w.pol].pop > 5e6))) continue;
    const pt = globe.project(world.lon[w.cell] + 0.6, world.lat[w.cell] - 0.6); if (!pt || pt[2] < 0.3) continue;
    ctx.globalAlpha = w.done ? 0.95 : 0.5; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,10,18,.8)'; ctx.strokeText(WORK_ICONS[w.kind] || '•', pt[0], pt[1]); ctx.fillStyle = '#ffd98a'; ctx.fillText(WORK_ICONS[w.kind] || '•', pt[0], pt[1]);
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
}
function drawRoutes(ctx, alpha) {
  if (!world.routes) return;
  const lab = [];
  for (const r of world.routes) {
    const a = [world.lon[r.a], world.lat[r.a]], b = [world.lon[r.b], world.lat[r.b]];
    // great-circle arc in a few segments
    const pts = [];
    const v = ll => { const d = Math.PI / 180; return [Math.cos(ll[1] * d) * Math.cos(ll[0] * d), Math.cos(ll[1] * d) * Math.sin(ll[0] * d), Math.sin(ll[1] * d)]; };
    const A = v(a), B = v(b), n = 12;
    for (let k = 0; k <= n; k++) {
      const t = k / n, x = A[0] * (1 - t) + B[0] * t, y = A[1] * (1 - t) + B[1] * t, z = A[2] * (1 - t) + B[2] * t, l = Math.hypot(x, y, z);
      pts.push(globe.project(Math.atan2(y, x) * 180 / Math.PI, Math.asin(z / l) * 180 / Math.PI));
    }
    ctx.beginPath(); let on = false;
    for (const p of pts) { if (!p) { on = false; continue; } if (!on) { ctx.moveTo(p[0], p[1]); on = true; } else ctx.lineTo(p[0], p[1]); }
    ctx.strokeStyle = r.sea ? `rgba(120,200,255,${(0.4 + 0.55 * r.w) * alpha})` : `rgba(255,200,90,${(0.4 + 0.55 * r.w) * alpha})`;
    ctx.lineWidth = 0.6 + 2.6 * r.w; ctx.stroke();
    if (alpha >= 1 && r.good && r.pa !== r.pb && r.w > 0.45 && pts[6]) lab.push([r.w, r.good, pts[6]]);
  }
  // in the trade map, name the busiest routes by what they carry
  if (alpha >= 1) {
    ctx.font = '600 11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const done = [];
    for (const [, g, pt] of lab.sort((a, b) => b[0] - a[0]).slice(0, 14)) {
      if (done.some(q => Math.hypot(q[0] - pt[0], q[1] - pt[1]) < 60)) continue; done.push(pt);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(8,10,18,.8)'; ctx.strokeText(g, pt[0], pt[1] - 8); ctx.fillStyle = '#ffe2a8'; ctx.fillText(g, pt[0], pt[1] - 8);
    }
    ctx.textAlign = 'left';
  }
}
function drawLabels(ctx) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const placed = [], sc = globe.view.scale;
  for (const { p, lon, lat } of labels) {
    const pt = globe.project(lon, lat); if (!pt || pt[2] < 0.35) continue;
    const size = Math.max(9, Math.min(17, 2 + Math.sqrt(p.cells / world.K) * 1.1)) * Math.sqrt(sc);
    ctx.font = `700 ${size}px "Inter", system-ui, sans-serif`;
    const label = p.name.replace(/^(Kingdom|Principality|Duchy|Realm|Emirate|Republic|League|Shahdom|Altepetl) of /, '').toUpperCase(), wdt = ctx.measureText(label).width;
    const box = [pt[0] - wdt / 2, pt[1] - size / 2, wdt, size];
    if (placed.some(b => box[0] < b[0] + b[2] && box[0] + box[2] > b[0] && box[1] < b[1] + b[3] && box[1] + box[3] > b[1])) continue;
    placed.push(box);
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(8,10,18,0.75)'; ctx.strokeText(label, pt[0], pt[1]);
    ctx.fillStyle = '#f7f1e3'; ctx.fillText(label, pt[0], pt[1]);
  }
  return placed;
}

// ---------- panels ----------
const realPop = y => { let a = REAL_POP[0]; for (const b of REAL_POP) { if (b[0] >= y) { const t = (y - a[0]) / Math.max(1, b[0] - a[0]); return (a[1] + (b[1] - a[1]) * t) * 1e6; } a = b; } return a[1] * 1e6; };
function updatePanels() {
  if (branch) renderBranch();
  const h = world.history.at(-1);
  $('year').textContent = world.year < 1 ? `${1 - world.year} BC` : `${world.year}`;
  $('s-pop').textContent = fmt(h.pop);
  $('s-real').textContent = fmt(realPop(world.year));
  $('s-states').textContent = h.states;
  $('s-wars').textContent = h.wars;
  $('s-urban').textContent = (h.urban * 100).toFixed(0) + '%';
  $('s-tech').textContent = `${h.techLead} / ${TECHS.length}`;
  $('d-famine').textContent = fmt(world.totals.famine);
  $('d-war').textContent = fmt(world.totals.war);
  $('d-plague').textContent = fmt(world.totals.plague);
  drawChart();
  // top states
  const top = world.polities.filter(p => p.alive).sort((a, b) => b.pop - a.pop).slice(0, 8);
  $('states').innerHTML = top.map(p => `<div class="st" data-pol="${p.id}"><span class="sw" style="background:${p.color}"></span>${flagSVG(world, p, 18, 12)}&nbsp;<span class="nm">${p.name}</span><span class="v">${fmt(p.pop)}</span></div>`).join('');
  renderFamilies();
  if (player.id >= 0 && !player.busy && !$('playerbox').contains(document.activeElement)) renderPlayer();
  if (selected >= 0) showCell(selected);
}
function renderFamilies() {
  if (!world.families) return;
  const html = world.families.filter(f => !f.removed).map(f => {
    const h = f.head, age = world.year - h.born;
    const tr = f.traits && f.traits.length ? ` · <i>${f.traits.join(', ')}</i>` : '';
    return `<div class="fam" data-fam="${f.id}"><div><b>${h.given} ${f.surname}</b> <span class="dim">gen ${f.gen} · ${age}${f.guided ? ' · guided' : ''}</span></div><div class="dim">${h.job}, ${world._place(f.cell)}${tr}</div><div class="famact"><button class="xs" data-act="go">Show</button><button class="xs" data-act="log">Story so far</button><button class="xs" data-act="ai">Write their story (AI)</button><button class="xs" data-act="guide">${f.guided ? 'Stop guiding' : 'Guide'}</button>${f.custom ? '<button class="xs" data-act="save">Save</button>' : ''}<button class="xs" data-act="rm">Remove</button></div></div>`;
  }).join('');
  if ($('families').dataset.h !== html) { $('families').innerHTML = html; $('families').dataset.h = html; }
}
function drawChart() {
  const c = $('chart'), x = c.getContext('2d'), dpr = window.devicePixelRatio || 1;
  const W = c.clientWidth, H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, W, H);
  const y0 = 1, y1 = Math.max(world.year, 200);
  const lmin = Math.log10(1e8), lmax = Math.log10(2e10);
  const X = y => 4 + (y - y0) / (y1 - y0) * (W - 8), Y = p => H - 14 - (Math.log10(Math.max(p, 1e8)) - lmin) / (lmax - lmin) * (H - 22);
  x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = 1;
  for (const p of [1e8, 1e9, 1e10]) { x.beginPath(); x.moveTo(0, Y(p)); x.lineTo(W, Y(p)); x.stroke(); }
  x.fillStyle = 'rgba(255,255,255,0.35)'; x.font = '9px system-ui'; x.fillText('100M', 2, Y(1e8) - 2); x.fillText('1B', 2, Y(1e9) - 2); x.fillText('10B', 2, Y(1e10) - 2);
  x.beginPath(); for (let y = y0; y <= world.year; y += 5) { const px = X(y), py = Y(realPop(y)); y === y0 ? x.moveTo(px, py) : x.lineTo(px, py); }
  x.setLineDash([3, 3]); x.strokeStyle = 'rgba(255,255,255,0.45)'; x.stroke(); x.setLineDash([]);
  x.beginPath(); world.history.forEach((h, k) => { const px = X(h.y), py = Y(h.pop); k ? x.lineTo(px, py) : x.moveTo(px, py); });
  x.strokeStyle = '#f2b544'; x.lineWidth = 1.8; x.stroke();
  x.fillStyle = 'rgba(255,255,255,0.4)'; x.fillText(String(y0), 4, H - 3); x.textAlign = 'right'; x.fillText(String(y1), W - 4, H - 3); x.textAlign = 'left';
}
const ICON = { war: '⚔', peace: '🕊', famine: '🌾', plague: '☣', tech: '💡', split: '⚡', fall: '🏚', rise: '🏛', dynasty: '👑', disaster: '🌋', climate: '❄', contact: '⛵', colony: '⚓', annex: '➕', nuclear: '☢', start: '🌍', council: '📜', faith: '🕯', gov: '🏛', city: '🏙', sack: '🔥', ruler: '👑', alliance: '🤝', vassal: '⛓', family: '👪', people: '🗣' };
const GROUP = { war: 'war', peace: 'war', nuclear: 'war', famine: 'famine', plague: 'plague', tech: 'tech', split: 'states', fall: 'states', rise: 'states', dynasty: 'states', annex: 'states', colony: 'states', disaster: 'nature', climate: 'nature', contact: 'tech', start: 'states', council: 'council', faith: 'states', gov: 'states', city: 'states', sack: 'war', ruler: 'states', alliance: 'war', vassal: 'states', family: 'family', people: 'states' };
function eventVisible(e) {
  const g = GROUP[e.type] || 'states';
  if (!$('f-' + g).checked) return false;
  if ($('f-big').checked && !e.big && !['tech', 'contact', 'nuclear', 'disaster', 'start', 'climate', 'council', 'faith', 'family'].includes(e.type) && !(e.type === 'plague' && e.deaths > 5e5) && !(e.type === 'peace' && e.deaths > 3e5) && !(e.type === 'famine' && e.deaths > 1e6)) return false;
  return true;
}
function appendEvents() {
  const log = $('log'), ev = world.events, frag = document.createDocumentFragment();
  for (let k = lastEventCount; k < ev.length; k++) {
    const e = ev[k];
    if (!eventVisible(e)) continue;
    const d = document.createElement('div');
    d.className = 'ev ev-' + e.type + (e.big ? ' big' : '');
    d.innerHTML = `<span class="ey">${e.y}</span><span class="ei">${ICON[e.type] || '•'}</span><span class="et">${e.text}${e.ry ? `<span class="ry">Our world: ${e.ry}</span>` : ''}${e.why ? `<span class="ry why">Why: ${e.why}</span>` : ''}</span>`;
    if (e.cell !== undefined) d.onclick = () => focusCell(e.cell);
    else if (e.pol !== undefined && e.pol >= 0) d.onclick = () => { const p = world.polities[e.pol]; if (p.capital >= 0) focusCell(p.capital); };
    frag.prepend(d);
  }
  lastEventCount = ev.length;
  log.prepend(frag);
  while (log.childNodes.length > 600) log.removeChild(log.lastChild);
}
function rebuildLog() { $('log').innerHTML = ''; lastEventCount = 0; appendEvents(); }

function showCell(i) {
  const c = world.cellInfo(i), p = c.owner;
  const row = (k, v) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`;
  let html = `<div class="ihead">${p ? `${flagSVG(world, p, 27, 18)} <span class="sw" style="background:${p.color}"></span>${p.name}` : c.tribe}</div>`;
  html += `<div class="isub">${Math.abs(c.lat).toFixed(0)}°${c.lat >= 0 ? 'N' : 'S'} ${Math.abs(c.lon).toFixed(0)}°${c.lon >= 0 ? 'E' : 'W'} · ${world.peopleOf(i).name}${c.river ? ' · ' + c.river + ' river' : ''}</div>`;
  html += row('People', fmt(c.pop)) + row('Per km²', c.density.toFixed(1)) + row('Fed', Math.round(c.nour * 100) + '%');
  html += row('Harvest weather', (c.climate >= 1 ? '+' : '') + Math.round((c.climate - 1) * 100) + '%');
  html += row('Granary', fmt(c.granary) + ' rations') + row('Soil', Math.round(c.soil * 100) + '%') + row('Farmland cleared', Math.round(world.cleared[i] * 100) + '%');
  if (c.fishK > 0) html += row('Fish stock', Math.round(c.fish / c.fishK * 100) + '%');
  html += row('In towns', Math.round(c.urban * 100) + '%');
  if (c.city) html += row('City', c.city);
  html += row('Height', Math.round(c.elev / 10) * 10 + ' m') + row('Faith', c.faith);
  if (world.crops) html += row('Grows', world.cropsHere(i).join(', ') || '–');
  html += `<div class="isec">Peoples here</div>` + world.peoplesHere(i).map(x => row(`${x.q.name} <span class="dim">(${x.q.lang}, ${x.q.family})</span>`, Math.round(x.share * 100) + '%')).join('');
  if (c.resources.length) html += row('Resources', c.resources.join(', '));
  if (p) {
    const wars = world.wars.filter(w => !w.end && (w.a === p.id || w.b === p.id)).map(w => world.polities[w.a === p.id ? w.b : w.a].name);
    html += `<div class="isec">State</div>` + row('Government', (GOVS[p.gov] || GOVS.kingdom).label) + row('State faith', p.rel >= 0 ? world.faiths[p.rel].name : '–') + row('Treasury', `${Math.round(p.treasury || 0)} (${(p.income || 0) >= (p.spend || 0) ? '+' : ''}${((p.income || 0) - (p.spend || 0)).toFixed(1)}/yr)`) + row('Trade partners', (p.tradePartners || new Set()).size) + row('Population', fmt(p.pop)) + row('Provinces', p.cells) + row('Founded', p.founded) + row('Stability', Math.round(p.stability * 100) + '%') + row('Army', fmt(p.army)) + row('Research / yr', (p.rpRate || 0).toFixed(0)) + (p.grainPrice ? row('Bread price', `${(p.grainPrice / world.priceLevel).toFixed(1)}× usual`) : '') + (p.classes ? row('Society', Object.entries(p.classes).filter(([, v]) => v >= 0.01).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${CLASS_LABEL[k]} ${Math.round(v * 100)}%`).join(', ')) + row('Inequality', (p.gini || 0).toFixed(2)) + row('Unrest', Math.round(Math.min(1, p.unrest || 0) * 100) + '%') : '') + (p.exports ? row('Exports', p.exports.join(', ') || '–') + row('Imports', p.imports.join(', ') || '–') : '') + (p.taxRate ? row('Taxes', `${Math.round(p.taxRate * 100)}% of usual`) + row('Debt', p.debt > 0.01 ? `${(p.debt / Math.max(0.01, p.income)).toFixed(1)} years of income, at ${Math.round((p.interest || 0) * 100)}%${p.defaults ? `, ${p.defaults} default${p.defaults > 1 ? 's' : ''}` : ''}` : 'none') : '') + (p.inst && Object.keys(p.inst).length ? row('Institutions', Object.keys(p.inst).map(k => INST_LABEL[k]).join(', ')) : '');
    if (wars.length) html += row('At war with', wars.join(', '));
    if (p.ruler) html += row('Ruler', `${world._rulerTitle(p)}, ${p.ruler.age}`) + row('Traits', p.ruler.traits.join(', ')) + row('House', `${p.ruler.dynasty}${p.ruler.elected ? '' : ' (since ' + p.ruler.since + ')'}`);
    const al = world.allianceOf(p.id); if (al) html += row('Alliance', al.name);
    if (p.overlord != null) html += row('Vassal of', world.polities[p.overlord].name);
    const vs = world.polities.filter(q => q.alive && q.overlord === p.id); if (vs.length) html += row('Vassals', vs.map(q => q.name).join(', '));
    html += `<div style="margin:6px 0"><button class="xs" data-play="${p.id}">${player.id === p.id ? 'You rule this state' : '▶ Play as this state'}</button> <button class="xs" data-page="${p.id}">State page</button></div>`;
    if (p.policy) html += row('Council priority', p.policy.focus + (p.policy.source === 'llm' ? ' (AI)' : ''));
  }
  html += `<div class="isec">Knows (${c.known})</div><div class="techs">${c.techs.join(' · ')}</div>`;
  $('inspector').innerHTML = html;
}

let spin = null;
function focusCell(i) {
  selected = i; showCell(i);
  const from = { lon: globe.view.lon, lat: globe.view.lat }, to = { lon: world.lon[i], lat: world.lat[i] };
  let dl = to.lon - from.lon; if (dl > 180) dl -= 360; if (dl < -180) dl += 360;
  let t = 0;
  spin = () => { t = Math.min(1, t + 0.06); const e = t * t * (3 - 2 * t); globe.view.lon = from.lon + dl * e; globe.view.lat = from.lat + (to.lat - from.lat) * e; needsDraw = true; if (t >= 1) spin = null; };
}

// ---------- interaction ----------
let drag = null;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, lon: globe.view.lon, lat: globe.view.lat, moved: false }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
  const k = 0.25 / globe.view.scale;
  globe.view.lon = drag.lon - dx * k; globe.view.lat = Math.max(-85, Math.min(85, drag.lat + dy * k)); needsDraw = true;
});
canvas.addEventListener('pointerup', e => {
  if (drag && !drag.moved) {
    const r = canvas.getBoundingClientRect(), ll = globe.invert(e.clientX - r.left, e.clientY - r.top);
    const id = ll ? globe.idAt(ll[0], ll[1]) : 65535;
    if (id < world.N && famUI.picking) { famUI.picking = false; selected = id; showCell(id); openAddFamily(id); }
    else if (id < world.N) { selected = id; showCell(id); } else { selected = -1; $('inspector').innerHTML = '<div class="hint">Click land to inspect it.</div>'; }
    needsDraw = true;
  }
  drag = null;
});
canvas.addEventListener('wheel', e => { e.preventDefault(); globe.view.scale = Math.max(0.7, Math.min(10, globe.view.scale * Math.exp(-e.deltaY * 0.0012))); needsDraw = true; }, { passive: false });
window.addEventListener('resize', resize);

$('play').onclick = () => { playing = !playing; $('play').textContent = playing ? '❚❚ Pause' : '▶ Play'; };
$('step').onclick = () => { stepAll(); afterSteps(); };
$('speed').oninput = e => { speed = [1, 2, 5, 10, 20, 50, 100][+e.target.value]; $('speedv').textContent = speed + ' yr/s'; };
$('newworld').onclick = () => newWorld(Math.floor(Math.random() * 1e6));
$('seed').onchange = e => newWorld(+e.target.value || 1);
$('jump').onclick = () => { const to = +$('jumpto').value; if (to > world.year) { jumpTarget = to; playing = false; $('play').textContent = '▶ Play'; } };
for (const id of ['f-war', 'f-famine', 'f-plague', 'f-tech', 'f-states', 'f-nature', 'f-council', 'f-family', 'f-big']) $(id).onchange = rebuildLog;
$('modes').innerHTML = Object.entries(MODES).map(([k, m]) => `<button data-mode="${k}" class="${k === mode ? 'on' : ''}">${m.label}</button>`).join('');
$('modes').onclick = e => { const k = e.target.dataset.mode; if (!k) return; mode = k; colorsDirty = true; for (const b of $('modes').children) b.classList.toggle('on', b.dataset.mode === k); renderLegend(); needsDraw = true; };
$('states').onclick = e => { const el = e.target.closest('.st'); if (!el) return; const p = world.polities[+el.dataset.pol]; if (p.capital >= 0) focusCell(p.capital); };

let jumpTarget = null;
function renderLegend() {
  const m = MODES[mode];
  const items = m.legendFn ? m.legendFn() : m.legend ? m.legend.map((l, n) => [l, m.legendColors[n]]) : [];
  $('legend').innerHTML = items.map(([l, c]) => `<span><i style="background:${c}"></i>${l}</span>`).join('');
}
function afterSteps() { appendEvents(); updatePanels(); needsDraw = true; colorsDirty = true; }

// ---------- AI council ----------
async function holdLLMCouncil() {
  council.busy = true; council.held = world.year;
  const members = world.councilMembers(council.size);
  for (let k = 0; k < members.length; k++) {
    const p = members[k];
    $('c-status').textContent = `Year ${world.year}: asking ${council.model} for ${p.name} (${k + 1}/${members.length})…`;
    const neighbours = [...p.neighbours].map(q => world.polities[q]).filter(q => q.alive).map(q => q.name);
    const enemies = world.wars.filter(w => !w.end && (w.a === p.id || w.b === p.id)).map(w => world.polities[w.a === p.id ? w.b : w.a].name);
    try {
      const near = new Set([...p.neighbours]); for (const q of p.neighbours) for (const r of world.polities[q].neighbours) near.add(r);
      const allyCands = [...near].map(q => world.polities[q]).filter(q => q.alive && q.id !== p.id && q.overlord == null && !world.allied(p.id, q.id) && !world.atWarWith(p.id, q.id)).sort((a, b) => b.pop - a.pop).slice(0, 12).map(q => q.name);
      const d = await askCouncil({ url: council.url, model: council.model, brief: world.brief(p), neighbours, enemies, allyCands, inAlliance: !!world.allianceOf(p.id), ruler: world._rulerTitle(p), every: council.every });
      world.applyDecision(p, d, 'llm');
    } catch (err) {
      council.errors++;
      world.applyDecision(p, world.ruleDecision(p), 'rules');
      $('c-status').textContent = `AI council failed (${err.message.slice(0, 120)}). Used rules for ${p.name}.`;
      if (council.errors >= 3) { $('c-status').textContent += ' Switched to rule-based after 3 failures.'; setCouncilMode('rules'); break; }
    }
    appendEvents();
  }
  if (council.mode === 'llm') $('c-status').textContent = `Council of ${world.year} done. Next in ${world.year + council.every}.`;
  council.busy = false; updatePanels();
}
function setCouncilMode(m) {
  council.mode = m; store.set('cmode', m); $('c-mode').value = m;
  world.opts.council = m === 'rules' ? 'rules' : null; world.opts.councilEvery = council.every; world.opts.councilSize = council.size;
  document.querySelectorAll('.llmonly').forEach(el => el.style.display = m === 'llm' ? '' : 'none');
  $('c-status').textContent = m === 'off' ? 'States follow only the simulation rules.' : m === 'rules' ? `Every ${council.every} years the ${council.size} largest states pick a priority by simple rules.` : `Every ${council.every} years the ${council.size} largest states ask your local model. The world pauses while it thinks.`;
}
$('c-mode').onchange = e => { council.errors = 0; setCouncilMode(e.target.value); };
$('c-every').onchange = e => { council.every = Math.max(5, +e.target.value || 25); store.set('cevery', council.every); setCouncilMode(council.mode); };
$('c-size').onchange = e => { council.size = Math.max(1, Math.min(12, +e.target.value || 5)); store.set('csize', council.size); setCouncilMode(council.mode); };
$('c-url').onchange = e => { council.url = e.target.value.trim(); store.set('curl', council.url); };
$('c-model').onchange = e => { council.model = e.target.value.trim(); store.set('cmodel', council.model); };
$('c-test').onclick = async () => {
  $('c-status').textContent = 'Connecting…';
  try {
    const models = await listModels(council.url);
    const has = models.includes(council.model) || models.includes(council.model + ':latest');
    $('c-status').textContent = `Connected. Models: ${models.join(', ') || 'none'}.` + (has ? ' ✔ ' + council.model + ' is installed.' : ` ✖ ${council.model} not found — run: ollama pull ${council.model}`);
  } catch (err) {
    $('c-status').innerHTML = `Can't reach Ollama at ${council.url}. Is it running? This page is opened from a file, so Ollama must allow it: set the environment variable <b>OLLAMA_ORIGINS=*</b> and restart Ollama.`;
  }
};

// ---------- many worlds ----------
let batchWorkers = [];
$('b-run').onclick = () => {
  for (const w of batchWorkers) w.terminate();
  batchWorkers = [];
  const n = Math.max(1, Math.min(200, +$('b-count').value || 20)), first = +$('b-first').value || 1, toYear = +$('b-year').value || 2026;
  const cores = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 4) - 1));
  const seeds = Array.from({ length: n }, (_, k) => first + k), rows = [];
  const progress = {};
  $('b-out').innerHTML = ''; $('b-sum').textContent = `Running ${n} worlds on ${cores} threads…`;
  const url = URL.createObjectURL(new Blob([__WORKER_SRC__], { type: 'text/javascript' }));
  for (let k = 0; k < cores; k++) {
    const mine = seeds.filter((_, j) => j % cores === k); if (!mine.length) continue;
    const wk = new Worker(url); batchWorkers.push(wk);
    wk.onmessage = e => {
      const m = e.data;
      if (m.progress) { progress[m.seed] = m.year; $('b-sum').textContent = `Running… ${rows.length}/${n} done` ; return; }
      rows.push(m); renderBatch(rows, n, toYear);
    };
    wk.postMessage({ geo, seeds: mine, toYear });
  }
};
const med = a => { const b = a.filter(x => x != null).sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
function renderBatch(rows, n, toYear) {
  rows.sort((a, b) => a.seed - b.seed);
  const yr = v => v == null ? '<span class="dim">–</span>' : v;
  $('b-out').innerHTML = `<table><tr><th>Seed</th><th>People ${toYear}</th><th>Contact</th><th>Printing</th><th>Factories</th><th>Computers</th><th>Biggest war</th><th>☢</th></tr>` +
    rows.map(r => `<tr data-seed="${r.seed}"><td>${r.seed}</td><td>${fmt(r.pop)}</td><td>${yr(r.contact)}</td><td>${yr(r.tech.printing)}</td><td>${yr(r.tech.industry)}</td><td>${yr(r.tech.computers)}</td><td>${r.biggestWar ? fmt(r.biggestWar.deaths) : '–'}</td><td>${r.nukes ? r.nukes : ''}</td></tr>`).join('') + '</table>';
  const nuk = rows.filter(r => r.nukes).length;
  $('b-sum').innerHTML = `${rows.length}/${n} worlds. Median: printing <b>${med(rows.map(r => r.tech.printing)) ?? '–'}</b> (ours 1440), contact <b>${med(rows.map(r => r.contact)) ?? '–'}</b> (1492), factories <b>${med(rows.map(r => r.tech.industry)) ?? '–'}</b> (1780), computers <b>${med(rows.map(r => r.tech.computers)) ?? '–'}</b> (1946). Nuclear war in <b>${nuk}</b> of ${rows.length}. Click a row to open that world.`;
}
$('b-out').onclick = e => { const tr = e.target.closest('tr[data-seed]'); if (tr) { newWorld(+tr.dataset.seed); $('batchpanel').classList.remove('open'); } };
$('b-open').onclick = () => $('batchpanel').classList.toggle('open');
$('b-close').onclick = () => $('batchpanel').classList.remove('open');

// ---------- families ----------
$('families').onclick = async e => {
  const b = e.target.closest('button'); if (!b) return;
  const f = world.families[+e.target.closest('.fam').dataset.fam];
  if (b.dataset.act === 'go') { focusCell(f.cell); return; }
  if (b.dataset.act === 'guide') { f.guided = !f.guided; renderFamilies(); return; }
  if (b.dataset.act === 'rm') { f.alive = false; f.removed = true; world.familyPrompts = (world.familyPrompts || []).filter(q => q.fam !== f.id); renderFamilies(); return; }
  if (b.dataset.act === 'save') {
    const first = f.firstHead || f.head;
    famUI.saved = famUI.saved.filter(x => x.surname !== f.surname);
    famUI.saved.push({ surname: f.surname, given: first.given, sex: first.sex, job: first.job, traits: f.startTraits || f.traits, guided: f.guided, lon: world.lon[f.startCell ?? f.cell], lat: world.lat[f.startCell ?? f.cell], auto: true });
    saveFamStore(); renderSaved(); b.textContent = 'Saved ✓'; return;
  }
  const box = $('story');
  box.classList.add('open');
  $('story-title').textContent = `The ${f.surname} family, ${f.log[0].y}–${world.year}`;
  if (b.dataset.act === 'log') { $('story-body').innerHTML = f.log.map(x => `<p><b>${x.y}</b> ${x.text}</p>`).join(''); return; }
  $('story-body').innerHTML = `<p class="dim">Asking ${council.model} to write the ${f.surname} story…</p>`;
  try {
    const txt = await writeFamilyStory({ url: council.url, model: council.model, surname: f.surname, record: world.familyStory(f) });
    f.stories = f.stories || []; f.stories.push({ y: world.year, text: txt });
    $('story-body').innerHTML = txt.split(/\n+/).map(p => `<p>${p}</p>`).join('');
  } catch (err) {
    $('story-body').innerHTML = `<p>Could not reach Ollama at ${council.url} (${err.message}). Check the Council settings and press Test. Meanwhile, here is the record:</p>` + f.log.map(x => `<p><b>${x.y}</b> ${x.text}</p>`).join('');
  }
};
$('story-close').onclick = () => $('story').classList.remove('open');

const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
function renderSaved() {
  $('fam-saved').innerHTML = famUI.saved.length ? '<div class="dim" style="margin-top:6px">Saved families (start in every new world):</div>' + famUI.saved.map((x, k) => `<div class="crow"><span>${esc(x.given)} ${esc(x.surname)}</span><span style="flex:1"></span><button class="xs" data-sv="${k}" data-a="add">Add now</button><button class="xs" data-sv="${k}" data-a="del">Forget</button></div>`).join('') : '';
}
$('fam-saved').onclick = e => {
  const b = e.target.closest('button'); if (!b) return; const k = +b.dataset.sv, x = famUI.saved[k];
  if (b.dataset.a === 'del') famUI.saved.splice(k, 1), saveFamStore();
  else { world.addFamily({ ...x, cell: world._nearest(x.lon, x.lat) }); appendEvents(); }
  renderSaved(); renderFamilies();
};
$('fam-builtin').checked = famUI.builtin;
$('fam-builtin').onchange = () => { famUI.builtin = $('fam-builtin').checked; store.set('builtinFam', famUI.builtin ? '1' : '0'); };
$('fam-add').onclick = () => {
  if (selected >= 0) openAddFamily(selected);
  else { famUI.picking = true; $('inspector').innerHTML = '<div class="hint">Click the province where your family lives.</div>'; }
};
function openAddFamily(c) {
  const jobs = world.jobOptions(c);
  $('story-title').textContent = `A new family in ${world._place(c)} (${world.year})`;
  $('story-body').innerHTML = `
    <div class="crow"><label>Surname <input id="nf-sur" placeholder="leave empty for a local name"></label></div>
    <div class="crow"><label>Given name <input id="nf-giv" placeholder="leave empty for a local name"></label>
      <label>Sex <select id="nf-sex"><option value="f">woman</option><option value="m">man</option></select></label></div>
    <div class="crow"><label>Work <select id="nf-job">${jobs.map(j => `<option>${j}</option>`).join('')}</select></label></div>
    <div class="dim" style="margin:6px 0 2px">Traits (run in the family, may fade or appear over generations)</div>
    ${Object.entries(FAMILY_TRAITS).map(([t, d]) => `<label style="display:block"><input type="checkbox" class="nf-tr" value="${t}"> <b>${t}</b> <span class="dim">— ${d}</span></label>`).join('')}
    <label style="display:block;margin-top:8px"><input type="checkbox" id="nf-guide"> Guide them: pause and let me choose at famines, wars, new chances and each coming of age</label>
    <label style="display:block"><input type="checkbox" id="nf-save"> Save this family and start it in every new world</label>
    <div class="crow" style="margin-top:10px"><button class="primary" id="nf-go">Add the family</button><button id="nf-other">Pick another province</button></div>`;
  $('story').classList.add('open');
  $('nf-other').onclick = () => { $('story').classList.remove('open'); famUI.picking = true; $('inspector').innerHTML = '<div class="hint">Click the province where your family lives.</div>'; };
  $('nf-go').onclick = () => {
    const traits = [...document.querySelectorAll('.nf-tr:checked')].map(x => x.value);
    const spec = { surname: $('nf-sur').value.trim(), given: $('nf-giv').value.trim(), sex: $('nf-sex').value, job: $('nf-job').value, traits, guided: $('nf-guide').checked };
    const f = world.addFamily({ ...spec, cell: c });
    if ($('nf-save').checked) { famUI.saved = famUI.saved.filter(x => x.surname !== f.surname); famUI.saved.push({ ...spec, surname: f.surname, given: f.head.given, lon: world.lon[c], lat: world.lat[c], auto: true }); saveFamStore(); renderSaved(); }
    $('story').classList.remove('open'); appendEvents(); renderFamilies();
  };
}
// a guided family needs a decision: pause and ask
function openFamilyPrompt() {
  const q = world.familyPrompts[0], f = world.families[q.fam];
  player.busy = true;
  $('story-title').textContent = `The ${f.surname} family, ${world.year}`;
  const recent = f.log.slice(-4).map(x => `<p class="dim"><b>${x.y}</b> ${x.text}</p>`).join('');
  $('story-body').innerHTML = recent + `<p><b>${q.text}</b></p><div class="crow" style="flex-wrap:wrap">${q.options.map(o => `<button data-k="${o.key}">${esc(o.label)}</button>`).join('')}</div>
    <p class="dim" style="margin-top:8px"><a href="#" id="fp-auto">Let them decide for themselves from now on</a></p>`;
  $('story').classList.add('open'); $('story-close').style.display = 'none';
  const done = () => { $('story').classList.remove('open'); $('story-close').style.display = ''; player.busy = false; appendEvents(); renderFamilies(); };
  $('story-body').querySelectorAll('button[data-k]').forEach(b => b.onclick = () => { world.resolveFamily(q, b.dataset.k); done(); });
  $('fp-auto').onclick = ev => { ev.preventDefault(); f.guided = false; world.resolveFamily(q, q.options[0].key); done(); };
}
renderSaved();

// ---------- export ----------
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function runInfo() {
  const h = world.history.at(-1);
  return { seed: world.seed, year: world.year, exported: new Date().toISOString(),
    council: { mode: council.mode, every: council.every, states: council.size, model: council.mode === 'llm' ? council.model : null },
    people: Math.round(h.pop), ourWorld: Math.round(realPop(world.year)), states: h.states, warsNow: h.wars,
    deaths: Object.fromEntries(Object.entries(world.totals).map(([k, v]) => [k, Math.round(v)])), contactYear: world.contactYear };
}
$('x-md').onclick = () => {
  const i = runInfo();
  const largest = world.polities.filter(p => p.alive).sort((a, b) => b.pop - a.pop).slice(0, 10);
  let md = `# WorldSim chronicle, seed ${i.seed}, year ${i.year}\n\n`;
  md += `- People: ${fmt(i.people)} (our world: ${fmt(i.ourWorld)})\n- States: ${i.states}, wars now: ${i.warsNow}\n`;
  md += `- Deaths so far: famine ${fmt(i.deaths.famine)}, war ${fmt(i.deaths.war)}, plague ${fmt(i.deaths.plague)}\n`;
  md += `- First contact across the ocean: ${i.contactYear ?? 'not yet'}\n`;
  md += `- Council: ${i.council.mode}${i.council.model ? ` (${i.council.model})` : ''}, every ${i.council.every} years, ${i.council.states} largest states\n\n`;
  md += `## Largest states in ${i.year}\n\n` + largest.map(p => `- ${p.name}: ${fmt(p.pop)}, ${p.cells} provinces, founded ${p.founded}${p.policy ? `, priority ${p.policy.focus}` : ''}`).join('\n') + '\n\n';
  if (world.families) {
    md += `## Families\n\n`;
    for (const f of world.families) {
      md += `### The ${f.surname} family (now generation ${f.gen}: ${f.head.given}, ${f.head.job})\n\n` + f.log.map(x => `- **${x.y}** ${x.text}`).join('\n') + '\n\n';
      for (const st of f.stories || []) md += `> _Story written in ${st.y}:_\n>\n> ${st.text.replace(/\n+/g, '\n>\n> ')}\n\n`;
    }
  }
  const shown = world.events.filter(eventVisible);
  md += `## Chronicle (${shown.length} entries, current filters)\n\n`;
  for (const e of shown) md += `- **${e.y}** ${e.text}${e.ry ? ` _(our world: ${e.ry})_` : ''}${e.why ? `\n  - _Why:_ ${e.why}` : ''}\n`;
  download(`worldsim_seed${i.seed}_year${i.year}.md`, md, 'text/markdown');
};
$('x-json').onclick = () => {
  const i = runInfo();
  const data = { ...i,
    history: world.history.filter((h, k) => k % 5 === 0 || k === world.history.length - 1).map(h => ({ y: h.y, pop: Math.round(h.pop), states: h.states, wars: h.wars, urban: +h.urban.toFixed(3), famine: Math.round(h.famine), war: Math.round(h.war), plague: Math.round(h.plague), techLead: h.techLead })),
    firstTech: world.firstTech,
    wars: world.wars.filter(w => w.deaths > 1e5).map(w => ({ name: w.name, start: w.start, end: w.end, deaths: Math.round(w.deaths), nuclear: !!w.nuclear })),
    states: world.polities.filter(p => p.alive || p.peakPop > 5e6).map(p => ({ name: p.name, culture: p.culture, founded: p.founded, ended: p.ended, alive: p.alive, pop: Math.round(p.pop), peakPop: Math.round(p.peakPop), cells: p.cells, policy: p.policy || null })),
    events: world.events,
  };
  download(`worldsim_seed${i.seed}_year${i.year}.json`, JSON.stringify(data, null, 1), 'application/json');
};

// ---------- player mode ----------
function setPlayer(id) {
  player.id = id; world.playerId = id; player.held = world.year; player.fallen = false;
  renderPlayer(); if (selected >= 0) showCell(selected);
  if (id >= 0) world._log('council', `You take the throne of ${world.polities[id].name}.`, { pol: id, big: true });
  appendEvents();
}
$('inspector').addEventListener('click', e => { const b = e.target.closest('[data-play]'); if (b) setPlayer(+b.dataset.play); });
const pOpts = (list, empty) => list.length ? list.map(q => `<option value="${q.id}">${q.name}</option>`).join('') : `<option value="">${empty}</option>`;
function renderPlayer() {
  const box = $('playerbox');
  if (player.id < 0) { box.innerHTML = '<div class="hint">Click a state and press <b>Play as this state</b> to rule it yourself. Its council then pauses for you.</div>'; return; }
  const p = world.polities[player.id];
  if (!p.alive) { box.innerHTML = `<div class="hint">${p.name} has fallen.</div>`; return; }
  const nb = [...p.neighbours].map(q => world.polities[q]).filter(q => q.alive);
  const enemies = world.wars.filter(w => !w.end && (w.a === p.id || w.b === p.id)).map(w => world.polities[w.a === p.id ? w.b : w.a]);
  const near = new Set(nb.map(q => q.id)); for (const q of nb) for (const r of q.neighbours) near.add(r);
  const allyC = [...near].map(q => world.polities[q]).filter(q => q.alive && q.id !== p.id && !world.allied(p.id, q.id) && !world.atWarWith(p.id, q.id) && q.overlord == null).sort((a, b) => b.pop - a.pop).slice(0, 15);
  const al = world.allianceOf(p.id);
  const next = Math.ceil((world.year + 1) / council.every) * council.every;
  box.innerHTML = `<div>${flagSVG(world, p, 27, 18)} <span class="sw" style="background:${p.color}"></span><b>${p.name}</b></div>
    <div class="dim">${world._rulerTitle(p)} · ${fmt(p.pop)} · stability ${Math.round(p.stability * 100)}% · priority: ${p.policy ? p.policy.focus : '–'} · next council ${next}</div>
    <div class="crow" style="margin-top:6px"><select id="pa-war">${pOpts(nb.filter(q => !world.atWarWith(p.id, q.id)), 'no neighbours')}</select><button class="xs" id="pa-war-go">Declare war</button></div>
    <div class="crow"><select id="pa-peace">${pOpts(enemies, 'at peace')}</select><button class="xs" id="pa-peace-go">Offer peace</button></div>
    <div class="crow"><select id="pa-ally">${pOpts(allyC, 'nobody')}</select><button class="xs" id="pa-ally-go">Propose alliance</button>${al ? `<button class="xs" id="pa-leave">Leave ${al.name}</button>` : ''}</div>
    <div class="crow"><button class="xs" id="pa-council">Hold council now</button><button class="xs" id="pa-stop">Stop playing</button><span id="pa-msg" class="dim"></span></div>`;
  const P = () => world.polities[player.id], Q = id => world.polities[+id];
  const msg = t => { $('pa-msg').textContent = t; appendEvents(); colorsDirty = true; needsDraw = true; };
  $('pa-war-go').onclick = () => { const v = $('pa-war').value; if (v !== '') { world.playerDeclareWar(P(), Q(v)); msg('War declared.'); renderPlayer(); } };
  $('pa-peace-go').onclick = () => { const v = $('pa-peace').value; if (v !== '') { const r = world.playerOfferPeace(P(), Q(v)); msg(r === 'accepted' ? 'Peace accepted.' : 'They refuse.'); renderPlayer(); } };
  $('pa-ally-go').onclick = () => { const v = $('pa-ally').value; if (v !== '') { const r = world.playerProposeAlliance(P(), Q(v)); msg(r === 'accepted' ? 'Alliance formed.' : r === 'rejected' ? 'They decline.' : 'Not possible.'); renderPlayer(); } };
  if ($('pa-leave')) $('pa-leave').onclick = () => { world.playerLeaveAlliance(P()); msg('You left the alliance.'); renderPlayer(); };
  $('pa-council').onclick = () => openPlayerCouncil();
  $('pa-stop').onclick = () => setPlayer(-1);
}
function openPlayerCouncil() {
  const p = world.polities[player.id]; if (!p || !p.alive) return;
  player.busy = true; player.held = world.year;
  const nb = [...p.neighbours].map(q => world.polities[q]).filter(q => q.alive && !world.atWarWith(p.id, q.id));
  const enemies = world.wars.filter(w => !w.end && (w.a === p.id || w.b === p.id)).map(w => world.polities[w.a === p.id ? w.b : w.a]);
  const near = new Set([...p.neighbours]); for (const q of p.neighbours) for (const r of world.polities[q].neighbours) near.add(r);
  const allyC = [...near].map(q => world.polities[q]).filter(q => q.alive && q.id !== p.id && !world.allied(p.id, q.id) && !world.atWarWith(p.id, q.id) && q.overlord == null).sort((a, b) => b.pop - a.pop).slice(0, 15);
  const F = [['science', 'Learning: fund scholars'], ['farming', 'Farming: clear land, fill granaries'], ['army', 'The army: raise soldiers'], ['expansion', 'Expansion: push into unclaimed land'], ['stability', 'Order at home: calm the provinces'], ['trade', 'Trade: roads, ships, markets']];
  $('story-title').textContent = `Council of ${p.name}, year ${world.year}`;
  $('story-body').innerHTML = `<pre class="brief">${world.brief(p).replace(/</g, '&lt;')}</pre>
    <div class="isec">Priority for the next ${council.every} years</div>
    ${F.map(([k, l], n) => `<label class="opt"><input type="radio" name="pc-focus" value="${k}" ${p.policy && p.policy.focus === k || (!p.policy && n === 4) ? 'checked' : ''}> ${l}</label>`).join('')}
    <div class="isec">Diplomacy</div>
    <div class="crow"><label>Declare war on</label><select id="pc-war"><option value="">nobody</option>${nb.map(q => `<option value="${q.name}">${q.name}</option>`).join('')}</select></div>
    <div class="crow"><label>Make peace with</label><select id="pc-peace"><option value="">nobody</option>${enemies.map(q => `<option value="${q.name}">${q.name}</option>`).join('')}</select></div>
    <div class="crow"><label>Propose alliance to</label><select id="pc-ally"><option value="">nobody</option>${allyC.map(q => `<option value="${q.name}">${q.name}</option>`).join('')}</select></div>
    <div class="isec">Proclamation (optional, goes into the chronicle)</div>
    <input type="text" id="pc-say" class="md" style="width:100%" maxlength="220" placeholder="Let the granaries be full and the borders quiet…">
    <div style="margin-top:10px"><button class="primary" id="pc-go">Decide</button></div>`;
  $('story').classList.add('open'); $('story-close').style.display = 'none';
  $('pc-go').onclick = () => {
    const d = { focus: (document.querySelector('input[name=pc-focus]:checked') || {}).value || 'stability', war_target: $('pc-war').value || null, peace_with: $('pc-peace').value ? [$('pc-peace').value] : [], alliance_with: $('pc-ally').value || null, statement: $('pc-say').value.trim(), reasoning: '' };
    // peace via the council is an offer the other side may refuse
    const peace = d.peace_with[0]; d.peace_with = [];
    world.applyDecision(p, d, 'player');
    if (peace) { const q = world.polities.find(x => x.alive && x.name === peace); if (q) world.playerOfferPeace(p, q); }
    $('story').classList.remove('open'); $('story-close').style.display = '';
    player.busy = false; appendEvents(); renderPlayer(); colorsDirty = true; needsDraw = true;
  };
}
function checkPlayerFallen() {
  if (player.id < 0 || player.fallen) return;
  const p = world.polities[player.id]; if (p.alive) return;
  player.fallen = true; player.busy = true;
  // the successor: whoever now holds most of our old capital region
  const succ = p.capital >= 0 && world.owner[p.capital] >= 0 ? world.polities[world.owner[p.capital]] : null;
  $('story-title').textContent = `${p.name} has fallen (${world.year})`;
  $('story-body').innerHTML = `<p>Your state is gone. ${succ ? `<b>${succ.name}</b> now holds your old capital.` : ''}</p>
    <div class="crow">${succ ? `<button class="primary" id="pf-succ">Rule ${succ.name}</button>` : ''}<button id="pf-pick">Pick another state on the map</button><button id="pf-watch">Just watch</button></div>`;
  $('story').classList.add('open'); $('story-close').style.display = 'none';
  const close = () => { $('story').classList.remove('open'); $('story-close').style.display = ''; player.busy = false; };
  if (succ) $('pf-succ').onclick = () => { close(); setPlayer(succ.id); };
  $('pf-pick').onclick = () => { close(); setPlayer(-1); $('inspector').innerHTML = '<div class="hint">Click a state, then press Play as this state.</div>'; };
  $('pf-watch').onclick = () => { close(); setPlayer(-1); };
}

// ---------- main loop ----------
let acc = 0, last = performance.now(), panelTimer = 0;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  if (spin) spin();
  let stepped = 0;
  const t0 = performance.now();
  const councilDue = () => council.mode === 'llm' && world.year % council.every === 0 && council.held !== world.year;
  const playerDue = () => player.id >= 0 && world.polities[player.id].alive && world.year % council.every === 0 && player.held !== world.year;
  if (council.busy || player.busy) { /* waiting for a council */ }
  else if (jumpTarget !== null) {
    while (world.year < jumpTarget && performance.now() - t0 < 40) { if (playerDue()) { openPlayerCouncil(); break; } if (councilDue()) { holdLLMCouncil(); break; } stepAll(); stepped++; checkPlayerFallen(); if (world.familyPrompts && world.familyPrompts.length && !player.busy) openFamilyPrompt(); if (player.busy) break; }
    $('jumpinfo').textContent = world.year < jumpTarget ? `running to ${jumpTarget}…` : '';
    if (world.year >= jumpTarget) jumpTarget = null;
  } else if (playing) {
    acc += dt * speed;
    while (acc >= 1 && performance.now() - t0 < 30) { if (playerDue()) { openPlayerCouncil(); break; } if (councilDue()) { holdLLMCouncil(); break; } stepAll(); acc -= 1; stepped++; checkPlayerFallen(); if (world.familyPrompts && world.familyPrompts.length && !player.busy) openFamilyPrompt(); if (player.busy) break; }
    if (acc > 3) acc = 0;
  }
  if (stepped) { appendEvents(); panelTimer += stepped; needsDraw = true; colorsDirty = true; if (panelTimer >= 1) { updatePanels(); panelTimer = 0; if (MODES[mode].legendFn && world.year % 10 === 0) renderLegend(); } }
  if (rec) needsDraw = true;
  if (needsDraw) { draw(); drawSecond(); needsDraw = false; if (rec) recFrame(); }
  requestAnimationFrame(frame);
}

(async () => {
  try { globe = await Globe.create($('globe'), canvas, idBin, shadeJpg, riversPng, geo.cells.length); }
  catch (err) { $('globe').parentElement.insertAdjacentHTML('beforeend', `<div class="fatal">Could not start the globe: ${err.message}</div>`); throw err; }
  resize();
  $('c-mode').value = council.mode; $('c-every').value = council.every; $('c-size').value = council.size; $('c-url').value = council.url; $('c-model').value = council.model;
  newWorld(+(new URLSearchParams(location.search).get('seed')) || 1);
  setCouncilMode(council.mode);
  $('modes').querySelector('[data-mode=political]').click();
  requestAnimationFrame(frame);
})();
window.__world = () => world;
window.__drawTime = () => { const t = performance.now(); for (let k = 0; k < 10; k++) { colorsDirty = true; draw(); } return (performance.now() - t) / 10; };


// ---------- what-if branches ----------
function stepAll() { if (branch) { branch.A.step(); branch.B.step(); } else world.step(); }
function viewBranch(k) {
  if (!branch || branch.active === k) return;
  branch.active = k; world = branch[k];
  pplCache.clear(); langCache.clear(); rebuildLog(); colorsDirty = true; needsDraw = true; updatePanels(); renderPlayer();
  if (selected >= 0) showCell(selected);
}
function branchStats(w) {
  const s = w.history.at(-1), b0 = w.history.find(h => h.y >= (w.branchYear || 0)) || w.history[0];
  const top = w._largest().slice(0, 4).map(p => `<span class="sw" style="background:${p.color}"></span>${p.name} <span class="dim">${fmt(p.pop)}</span>`).join('<br>');
  const lead = w.polities.filter(p => p.alive).reduce((a, p) => (!a || p.fx.known > a.fx.known ? p : a), null);
  return { pop: fmt(s.pop), states: s.states, wars: s.wars, tech: `${s.techLead}/${TECHS.length}${lead ? ' · ' + lead.name : ''}`, top };
}
function renderBranch() {
  const box = $('branchcard'); if (!box) return;
  if (!branch) { box.style.display = 'none'; if (split) setSplit(false); return; }
  box.style.display = '';
  const a = branchStats(branch.A), b = branchStats(branch.B), same = branch.A.compareWith(branch.B).sameMap;
  const col = (k, st, w) => `<div class="bcol ${branch.active === k ? 'on' : ''}"><div class="crow"><b>${k === 'A' ? 'A · as it was' : 'B · what if'}</b><span style="flex:1"></span><button class="xs" data-bv="${k}">${branch.active === k ? 'viewing' : 'View'}</button></div>
    ${k === 'B' ? `<div class="dim" style="margin-bottom:4px">${branch.B.branchNote || ''}</div>` : '<div class="dim" style="margin-bottom:4px">unchanged</div>'}
    <div class="kv"><span>People</span><b>${st.pop}</b></div><div class="kv"><span>States</span><b>${st.states}</b></div><div class="kv"><span>Wars now</span><b>${st.wars}</b></div><div class="kv"><span>Top tech</span><b>${st.tech}</b></div>
    <div style="margin-top:4px;line-height:1.5">${st.top}</div></div>`;
  $('branchbody').innerHTML = `<div class="dim">Split in ${branch.B.branchYear}. ${Math.round(same * 100)}% of the map still has the same rulers.</div><div class="bgrid">${col('A', a)}${col('B', b)}</div>
    <div class="crow" style="margin-top:6px"><button class="xs" id="b-split">${split ? 'One globe' : 'Side by side'}</button><button class="xs" data-bk="A">Keep only A</button><button class="xs" data-bk="B">Keep only B</button></div>`;
  $('b-split').onclick = () => setSplit(!split);
}
document.addEventListener('click', e => {
  const v = e.target.closest('[data-bv]'); if (v) { viewBranch(v.dataset.bv); renderBranch(); return; }
  const k = e.target.closest('[data-bk]'); if (k && branch) { const keep = branch[k.dataset.bk]; branch.active = k.dataset.bk; world = keep; branch = null; pplCache.clear(); langCache.clear(); rebuildLog(); renderBranch(); colorsDirty = true; needsDraw = true; updatePanels(); }
});
$('branch').onclick = () => {
  playing = false; $('play').textContent = '▶ Play';
  const base = branch ? branch.A : world;
  const pol = selected >= 0 && base.owner[selected] >= 0 ? base.polities[base.owner[selected]] : null;
  const plagues = base.upcomingPlagues();
  $('story-title').textContent = `What if… (year ${base.year})`;
  $('story-body').innerHTML = `<p class="dim">The world is copied. Branch A runs on unchanged; branch B gets one change. Both run side by side${branch ? ' (this replaces the current branch B)' : ''}.</p>` +
    WHATIFS.map(w => {
      const off = (w.needs === 'state' && !pol) || (w.needs === 'cell' && selected < 0) || (w.needs === 'plague' && !plagues.length);
      const extra = w.needs === 'state' ? (pol ? ` <span class="dim">(${pol.name})</span>` : ' <span class="dim">(select a state on the map first)</span>') : w.needs === 'cell' ? (selected >= 0 ? ` <span class="dim">(${base._where(selected)})</span>` : ' <span class="dim">(select a province first)</span>') : w.needs === 'plague' ? ` <select id="wi-plague">${plagues.map(e => `<option>${e.name}</option>`).join('')}</select>` : '';
      return `<div class="crow" style="margin:4px 0"><button class="xs" data-wi="${w.id}" ${off ? 'disabled' : ''}>Branch</button><span>${w.label}${extra}</span></div>`;
    }).join('');
  $('story').classList.add('open');
  $('story-body').querySelectorAll('[data-wi]').forEach(b => b.onclick = () => {
    const id = b.dataset.wi, B = base.fork();
    const arg = id === 'luck' ? 1 + Math.floor(Math.random() * 1e6) : (id === 'ruler_lives' || id === 'ruler_dies' || id === 'civil_war' || id === 'peace' || id === 'tech') ? pol.id : id === 'plague' ? selected : id === 'no_plague' ? $('wi-plague').value : null;
    B.whatIf(id, arg);
    branch = { A: base, B, active: 'A' };
    world = base; viewBranch('B');
    $('story').classList.remove('open'); renderBranch();
  });
};


// ---------- charts ----------
const CH_METRICS = [['pop', 'People', 1], ['cells', 'Provinces', 2], ['army', 'Army', 3], ['known', 'Technologies known', 4], ['treasury', 'Treasury', 5], ['urban', 'Share in towns', 6], ['stab', 'Stability', 7]];
const PAL = ['#f2b544', '#e06666', '#6fa8dc', '#93c47d', '#c27ba0', '#76a5af', '#e69138', '#b4a7d6'];
function drawLines(cv, series, { y0 = 1, y1 = world.year, pct = false, log = false } = {}) {
  const x = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  let max = 0, min = Infinity; for (const s of series) for (const [, v] of s.pts) { if (v > max) max = v; if (v > 0 && v < min) min = v; }
  if (!isFinite(min)) min = 1; if (max <= 0) max = 1;
  const L = 46, B = 18, X = y => L + (y - y0) / Math.max(1, y1 - y0) * (W - L - 8);
  const Y = log ? v => H - B - (Math.log10(Math.max(v, min)) - Math.log10(min)) / Math.max(1e-9, Math.log10(max) - Math.log10(min)) * (H - B - 8) : v => H - B - v / max * (H - B - 8);
  x.font = '10px system-ui'; x.fillStyle = 'rgba(255,255,255,.45)'; x.strokeStyle = 'rgba(255,255,255,.08)';
  for (let k = 0; k <= 4; k++) { const v = log ? Math.pow(10, Math.log10(min) + (Math.log10(max) - Math.log10(min)) * k / 4) : max * k / 4, yy = Y(v); x.beginPath(); x.moveTo(L, yy); x.lineTo(W - 8, yy); x.stroke(); x.fillText(pct ? Math.round(v * 100) + '%' : fmt(v).replace(' million', 'M').replace(' billion', 'B'), 2, yy + 3); }
  for (let k = 0; k <= 5; k++) { const yr = Math.round(y0 + (y1 - y0) * k / 5); x.fillText(String(yr), X(yr) - 10, H - 4); }
  for (const s of series) { x.beginPath(); s.pts.forEach(([yy, v], k) => { const px = X(yy), py = Y(v); k ? x.lineTo(px, py) : x.moveTo(px, py); }); x.strokeStyle = s.color; x.lineWidth = s.dash ? 1.2 : 1.8; x.setLineDash(s.dash ? [4, 3] : []); x.stroke(); x.setLineDash([]); }
}
function openCharts() {
  $('story-title').textContent = `Charts, year ${world.year}`;
  const top = world._largest().slice(0, 6);
  const sel = selected >= 0 && world.owner[selected] >= 0 ? world.polities[world.owner[selected]] : null;
  $('story-body').innerHTML = `<div class="crow" style="flex-wrap:wrap;gap:6px">
      <select id="ch-what"><option value="states">Largest states now${sel ? ' + ' + sel.name : ''}</option><option value="faith">World faiths (share of people)</option><option value="fam">Language families (share of people)</option><option value="world">This world vs our world</option></select>
      <select id="ch-metric">${CH_METRICS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <label class="dim"><input type="checkbox" id="ch-log"> log scale</label></div>
    <canvas id="ch-cv" style="width:100%;height:300px;margin-top:8px"></canvas><div id="ch-leg" class="dim" style="line-height:1.7"></div><div id="ch-extra"></div>`;
  $('story').classList.add('open');
  const draw = () => {
    const what = $('ch-what').value, met = CH_METRICS.find(m => m[0] === $('ch-metric').value), log = $('ch-log').checked;
    $('ch-metric').style.display = what === 'states' ? '' : 'none';
    let series = [], pct = false; $('ch-extra').innerHTML = '';
    if (what === 'states') {
      const list = [...top]; if (sel && !list.includes(sel)) list.push(sel);
      series = list.map((p, k) => ({ name: p.name, color: PAL[k % PAL.length], pts: (p.hist || []).map(h => [h[0], h[met[2]]]) }));
      pct = met[0] === 'urban' || met[0] === 'stab';
    } else if (what === 'faith' || what === 'fam') {
      const sh = world.shareHist || [], totals = {};
      for (const h of sh) { const t = Object.values(h[what]).reduce((a, b) => a + b, 0) || 1; for (const [k, v] of Object.entries(h[what])) totals[k] = Math.max(totals[k] || 0, v / t); }
      const keys = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
      series = keys.map((k, n) => ({ name: what === 'faith' ? world.faiths[k].name : k, color: what === 'faith' ? world.faiths[k].color : world.FAMILY_COLORS[k] || PAL[n], pts: sh.map(h => { const t = Object.values(h[what]).reduce((a, b) => a + b, 0) || 1; return [h.y, (h[what][k] || 0) / t]; }) }));
      pct = true;
    } else {
      series = [{ name: 'This world: people', color: '#f2b544', pts: world.history.filter((h, k) => k % 5 === 0).map(h => [h.y, h.pop]) }, { name: 'Our world', color: 'rgba(255,255,255,.6)', dash: true, pts: REAL_POP.filter(r => r[0] <= world.year).map(r => [r[0], r[1] * 1e6]) }];
      const rows = TECHS.filter(t => t.ry > 0 && world.firstTech[t.id]).map(t => { const f = world.firstTech[t.id], d = f.year - t.ry; return `<tr><td>${t.name}</td><td>${t.ry}</td><td>${f.year}</td><td style="color:${d > 0 ? '#e06666' : '#93c47d'}">${d > 0 ? '+' : ''}${d}</td><td class="dim">${f.by}</td></tr>`; }).join('');
      $('ch-extra').innerHTML = `<table class="ctab"><tr><th>Invention</th><th>Our world</th><th>This world</th><th>Diff</th><th>First</th></tr>${rows}</table>`;
    }
    drawLines($('ch-cv'), series, { pct, log: log && !pct });
    $('ch-leg').innerHTML = series.map(s => `<span style="white-space:nowrap;margin-right:10px"><i style="display:inline-block;width:10px;height:3px;background:${s.color};vertical-align:middle;margin-right:4px"></i>${s.name}</span>`).join('');
  };
  for (const id of ['ch-what', 'ch-metric', 'ch-log']) $(id).onchange = draw;
  draw();
}
$('x-charts').onclick = openCharts;


// ---------- encyclopedia: a page per state ----------
function statePage(p) {
  const evs = world.events.filter(e => e.pol === p.id || (e.text && e.text.includes(p.name)));
  const wars = world.wars.filter(w => w.a === p.id || w.b === p.id).sort((a, b) => b.deaths - a.deaths).slice(0, 12);
  const peak = (p.hist || []).reduce((a, h) => (h[1] > a[1] ? h : a), [0, 0]);
  const t = new Map(); for (let i = 0; i < world.N; i++) if (world.owner[i] === p.id) t.set(world.ppl[i], (t.get(world.ppl[i]) || 0) + world.pop[i]);
  const peoples = [...t].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([q, n]) => `${world.peoples[q].name} ${Math.round(n / Math.max(1, p.pop) * 100)}%`).join(', ');
  const reigns = (p.reigns || []).slice(-25).map(r => `<tr><td>${r.from}–${r.to ?? ''}</td><td>${r.title}</td><td class="dim">House of ${r.dynasty}</td></tr>`).join('');
  $('story-title').innerHTML = `${flagSVG(world, p, 36, 24)} ${p.name}`;
  $('story-body').innerHTML = `
    <div class="kv"><span>Founded</span><b>${p.founded}${p.ended ? ` · ended ${p.ended}` : ''}</b></div>
    <div class="kv"><span>Government</span><b>${(GOVS[p.gov] || GOVS.kingdom).label}</b></div>
    <div class="kv"><span>Faith</span><b>${p.rel >= 0 ? world.faiths[p.rel].name : '–'}</b></div>
    ${p.alive ? `<div class="kv"><span>People now</span><b>${fmt(p.pop)} in ${p.cells} provinces</b></div><div class="kv"><span>Peoples</span><b>${peoples}</b></div>` : ''}
    <div class="kv"><span>Peak</span><b>${fmt(peak[1])} (${peak[0]})</b></div>
    ${p.classes ? `<div class="kv"><span>Society</span><b>${Object.entries(p.classes).filter(([, v]) => v >= 0.01).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${CLASS_LABEL[k]} ${Math.round(v * 100)}%`).join(', ')}</b></div><div class="kv"><span>Institutions</span><b>${Object.entries(p.inst || {}).map(([k, y]) => `${INST_LABEL[k]} (since ${y})`).join(', ') || '–'}</b></div>` : ''}
    ${(() => { const ws = (world.works || []).filter(w => w.pol === p.id); return ws.length ? `<div class="kv"><span>Great works</span><b>${ws.map(w => `${w.name} (${w.done ? 'built ' + w.done : w.abandoned ? 'abandoned' : 'building'})`).join('; ')}</b></div>` : ''; })()}
    <canvas id="sp-cv" style="width:100%;height:150px;margin-top:6px"></canvas>
    ${wars.length ? `<div class="isec">Wars</div><table class="ctab">${wars.map(w => `<tr><td>${w.start}–${w.end ?? ''}</td><td>${w.name}</td><td>${fmt(w.deaths)} dead</td></tr>`).join('')}</table>` : ''}
    ${reigns ? `<div class="isec">Rulers (latest ${Math.min(25, p.reigns.length)})</div><table class="ctab">${reigns}</table>` : ''}
    <div class="isec">In the chronicle</div>${evs.slice(-40).map(e => `<p><b>${e.y}</b> ${e.text}</p>`).join('')}`;
  $('story').classList.add('open');
  drawLines($('sp-cv'), [{ name: 'people', color: '#f2b544', pts: (p.hist || []).map(h => [h[0], h[1]]) }], { y0: p.founded, y1: p.ended || world.year });
}
$('inspector').addEventListener('click', e => { const b = e.target.closest('[data-page]'); if (b) statePage(world.polities[+b.dataset.page]); });
$('states').addEventListener('dblclick', e => { const el = e.target.closest('.st'); if (el) statePage(world.polities[+el.dataset.pol]); });

// ---------- the history book ----------
function centuryRecord(c) {
  const a = c * 100 + 1, b = a + 99;
  const evs = world.events.filter(e => e.y >= a && e.y <= b && e.type !== 'family' && (e.big || ['war', 'peace', 'split', 'fall', 'rise', 'dynasty', 'tech', 'faith', 'people', 'plague', 'famine', 'contact', 'gov', 'council'].includes(e.type)));
  evs.sort((x, y) => (y.big ? 1 : 0) - (x.big ? 1 : 0) || (y.deaths || 0) - (x.deaths || 0));
  const pick = evs.slice(0, 60).sort((x, y) => x.y - y.y);
  const h0 = world.history.find(h => h.y >= a), h1 = [...world.history].reverse().find(h => h.y <= b);
  const top = h1 ? `World population ${fmt(h0 ? h0.pop : 0)} in ${a}, ${fmt(h1.pop)} in ${h1.y}.` : '';
  return top + '\n' + pick.map(e => `${e.y}: ${e.text}`).join('\n');
}
const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
function openBook() {
  world.book = world.book || {};
  const last = Math.floor((world.year - 1) / 100);
  $('story-title').textContent = `A history of this world, 1–${world.year}`;
  const body = () => [...Array(last + 1).keys()].map(c => `<div class="chap"><div class="crow"><b>The ${ord(c + 1)} century (${c * 100 + 1}–${Math.min(world.year, c * 100 + 100)})</b><span style="flex:1"></span><button class="xs" data-ch="${c}">${world.book[c] ? 'Rewrite' : 'Write'}</button></div>${world.book[c] ? world.book[c].split(/\n+/).map(t => `<p>${t}</p>`).join('') : '<p class="dim">Not written yet.</p>'}</div>`).join('');
  $('story-body').innerHTML = `<div class="crow"><button id="bk-all" class="primary">Write the missing chapters (AI)</button><button id="bk-md">Export .md</button><span id="bk-st" class="dim"></span></div><div id="bk-body">${body()}</div>`;
  $('story').classList.add('open');
  const write = async c => {
    $('bk-st').textContent = `Writing the ${ord(c + 1)} century with ${council.model}…`;
    const prev = world.book[c - 1] ? world.book[c - 1].split(/\n+/).pop().slice(-300) : '';
    world.book[c] = await writeChapter({ url: council.url, model: council.model, title: `The ${ord(c + 1)} century`, record: centuryRecord(c), before: prev });
    $('bk-body').innerHTML = body(); $('bk-st').textContent = '';
  };
  $('bk-body').onclick = async e => { const b = e.target.closest('[data-ch]'); if (!b) return; try { await write(+b.dataset.ch); } catch (err) { $('bk-st').textContent = `Could not reach Ollama (${err.message}). Check the Council settings.`; } };
  $('bk-all').onclick = async () => { try { for (let c = 0; c <= last; c++) if (!world.book[c]) await write(c); $('bk-st').textContent = 'Done.'; } catch (err) { $('bk-st').textContent = `Could not reach Ollama (${err.message}). Check the Council settings.`; } };
  $('bk-md').onclick = () => download(`worldsim_history_seed${world.seed}_${world.year}.md`, `# A history of this world (seed ${world.seed}), 1–${world.year}\n\n` + [...Array(last + 1).keys()].map(c => `## The ${ord(c + 1)} century\n\n${world.book[c] || '_(not written)_'}\n`).join('\n'), 'text/markdown');
}
$('x-book').onclick = openBook;


// ---------- side by side: a second globe for the other branch ----------
async function setSplit(on) {
  if (on && !branch) return;
  if (on && !globe2) { globe2 = await Globe.create($('globe2'), $('overlay2'), idBin, shadeJpg, riversPng, geo.cells.length); }
  split = on;
  document.querySelector('main').classList.toggle('split', on);
  if (globe2) globe2.view = globe.view;
  resize(); colorsDirty = true; needsDraw = true; renderBranch(); updateTags();
}
function updateTags() { if (!branch) return; const o = branch.active === 'A' ? 'B' : 'A'; $('tag1').textContent = branch.active === 'A' ? 'A · as it was' : 'B · what if'; $('tag2').textContent = o === 'A' ? 'A · as it was' : 'B · what if'; }
function drawSecond() {
  if (!split || !branch || !globe2) return;
  const W = world, G = globe, L = labels;
  world = branch.active === 'A' ? branch.B : branch.A; globe = globe2;
  pplCache.clear(); langCache.clear(); colorsDirty = true;
  try { draw(); } finally { world = W; globe = G; labels = L; pplCache.clear(); langCache.clear(); colorsDirty = false; }
  updateTags();
}
for (const ov of [$('overlay2')]) {
  let d = null;
  ov.addEventListener('pointerdown', e => { d = { x: e.clientX, y: e.clientY, lon: globe.view.lon, lat: globe.view.lat }; ov.setPointerCapture(e.pointerId); });
  ov.addEventListener('pointermove', e => { if (!d) return; const k = 0.25 / globe.view.scale; globe.view.lon = d.lon - (e.clientX - d.x) * k; globe.view.lat = Math.max(-85, Math.min(85, d.lat + (e.clientY - d.y) * k)); needsDraw = true; });
  ov.addEventListener('pointerup', () => { d = null; });
  ov.addEventListener('wheel', e => { e.preventDefault(); globe.view.scale = Math.max(0.7, Math.min(10, globe.view.scale * Math.exp(-e.deltaY * 0.0012))); needsDraw = true; }, { passive: false });
}

// ---------- video recording ----------
function recFrame() {
  const r = rec, x = r.ctx, W = r.cv.width, H = r.cv.height, t = (performance.now() - r.t0) / 1000;
  x.fillStyle = '#060a14'; x.fillRect(0, 0, W, H);
  const panes = split && globe2 ? [[$('globe'), $('overlay'), 0, W / 2], [$('globe2'), $('overlay2'), W / 2, W / 2]] : [[$('globe'), $('overlay'), 0, W]];
  for (const [g, o, x0, pw] of panes) {
    const sw = g.width, sh = g.height, k = Math.max(pw / sw, H / sh), dw = sw * k, dh = sh * k, dx = x0 + (pw - dw) / 2, dy = (H - dh) / 2;
    x.save(); x.beginPath(); x.rect(x0, 0, pw, H); x.clip(); x.drawImage(g, dx, dy, dw, dh); x.drawImage(o, dx, dy, dw, dh); x.restore();
  }
  const u = H / 1080;
  if (split && branch) { x.font = `600 ${26 * u}px Inter, system-ui, sans-serif`; x.fillStyle = '#f2b544'; x.textAlign = 'center'; const o = branch.active === 'A' ? 'B' : 'A'; x.fillText(branch.active === 'A' ? 'As it was' : 'What if: ' + (branch.B.branchNote || ''), W / 4, 44 * u); x.fillText(o === 'A' ? 'As it was' : 'What if: ' + (branch.B.branchNote || ''), 3 * W / 4, 44 * u); x.textAlign = 'left'; }
  // caption bar: year, people, the latest big event
  if (r.captions) {
    const h = world.history.at(-1), ev = r.lastEv;
    const g = x.createLinearGradient(0, H - 200 * u, 0, H); g.addColorStop(0, 'rgba(6,10,20,0)'); g.addColorStop(1, 'rgba(6,10,20,.92)'); x.fillStyle = g; x.fillRect(0, H - 200 * u, W, 200 * u);
    x.fillStyle = '#f2b544'; x.font = `700 ${72 * u}px Inter, system-ui, sans-serif`; x.fillText(String(world.year), 48 * u, H - 60 * u);
    x.fillStyle = '#e8e2d2'; x.font = `500 ${26 * u}px Inter, system-ui, sans-serif`; x.fillText(`${fmt(h.pop)} people · ${h.states} states`, 48 * u, H - 24 * u);
    if (ev && t - ev.at < 6) { x.globalAlpha = Math.min(1, (6 - (t - ev.at)) / 1.2); x.font = `500 ${30 * u}px Inter, system-ui, sans-serif`; x.fillStyle = '#ffffff'; wrapText(x, ev.text, 340 * u, H - 92 * u, W - 400 * u, 38 * u); x.globalAlpha = 1; }
  }
  // title card, then the end card
  const card = (title, lines, a) => { x.globalAlpha = a; x.fillStyle = 'rgba(6,10,20,.88)'; x.fillRect(0, 0, W, H); x.fillStyle = '#f2b544'; x.textAlign = 'center'; x.font = `700 ${64 * u}px Inter, system-ui, sans-serif`; x.fillText(title, W / 2, H / 2 - 40 * u); x.fillStyle = '#e8e2d2'; x.font = `500 ${30 * u}px Inter, system-ui, sans-serif`; lines.forEach((l, k) => x.fillText(l, W / 2, H / 2 + (20 + k * 44) * u)); x.textAlign = 'left'; x.globalAlpha = 1; };
  if (t < 3.5) card(r.title, [`Seed ${world.seed} · from the year ${r.y0}`, world.opts.blind ? 'Blind mode: plagues, eruptions and prophets are random' : 'Real plagues, eruptions and climate at their real dates'], Math.min(1, (3.5 - t) / 0.8));
  if (r.ending) { const e = (performance.now() - r.ending) / 1000; const top = world._largest().slice(0, 3).map(p => `${p.name}: ${fmt(p.pop)}`); card(`The year ${world.year}`, [...top, `Starved ${fmt(world.totals.famine)} · killed in war ${fmt(world.totals.war)} · plague ${fmt(world.totals.plague)}`], Math.min(1, e / 0.8)); if (e > 4) finishRec(); }
}
function wrapText(x, text, x0, y0, maxW, lh) {
  const words = text.split(' '); let line = '', y = y0, n = 0;
  for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { x.fillText(line, x0, y); line = w; y += lh; if (++n >= 2) { x.fillText(line + '…', x0, y); return; } } else line = t; }
  x.fillText(line, x0, y);
}
function startRec(opt) {
  const [w, h] = opt.size.split('x').map(Number);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if (!mime) { alert('This browser cannot record video.'); return; }
  const stream = cv.captureStream(30), mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: w >= 1920 ? 12e6 : 6e6 });
  rec = { cv, ctx: cv.getContext('2d'), mr, chunks: [], t0: performance.now(), title: opt.title || 'WorldSim', y0: world.year, captions: opt.captions, auto: opt.auto, lastEv: null, evCount: world.events.length, lastCam: 0, mime };
  const R = rec; mr.ondataavailable = e => { if (e.data.size) R.chunks.push(e.data); };
  mr.start(1000);
  $('recbtn').classList.add('on'); $('recbtn').textContent = '■ Stop';
  if (opt.play && !playing) $('play').click();
}
function stopRec() { if (rec && !rec.ending) { rec.ending = performance.now(); if (playing) $('play').click(); } }
function finishRec() {
  const r = rec; rec = null;
  r.mr.onstop = () => { const blob = new Blob(r.chunks, { type: r.mime.split(';')[0] }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `worldsim_seed${world.seed}_${r.y0}-${world.year}.${r.mime.includes('mp4') ? 'mp4' : 'webm'}`; a.click(); };
  r.mr.stop();
  $('recbtn').classList.remove('on'); $('recbtn').textContent = '● Record';
}
// captions and the camera follow the big events
function recEvents() {
  if (!rec) return;
  const t = (performance.now() - rec.t0) / 1000;
  for (let k = rec.evCount; k < world.events.length; k++) {
    const e = world.events[k];
    if (e.type === 'family' || !(e.big || (e.deaths || 0) > 2e6)) continue;
    rec.lastEv = { text: `${e.y}: ${e.text}`, at: t };
    const c = e.cell !== undefined ? e.cell : e.pol !== undefined && e.pol >= 0 && world.polities[e.pol].capital >= 0 ? world.polities[e.pol].capital : -1;
    if (rec.auto && c >= 0 && t - rec.lastCam > 5) { rec.lastCam = t; focusCell(c); }
  }
  rec.evCount = world.events.length;
}
setInterval(recEvents, 200);
$('recbtn').onclick = () => {
  if (rec) { stopRec(); return; }
  $('story-title').textContent = 'Record a video';
  $('story-body').innerHTML = `<p class="dim">Records the globe as you see it (map mode, zoom, side by side if a what-if is open) with captions, a title card and an end card. Run the world while recording; press Stop to finish. The file downloads as .webm.</p>
    <div class="crow"><label>Title <input id="rv-title" value="A world, seed ${world.seed}"></label></div>
    <div class="crow"><label>Size <select id="rv-size"><option>1920x1080</option><option>1280x720</option><option>1080x1080</option><option>1080x1920</option></select></label></div>
    <label style="display:block"><input type="checkbox" id="rv-cap" checked> Captions: year, people, the latest big event</label>
    <label style="display:block"><input type="checkbox" id="rv-auto" checked> Camera follows the big events</label>
    <label style="display:block"><input type="checkbox" id="rv-play" checked> Start playing when recording starts</label>
    <div class="crow" style="margin-top:10px"><button class="primary" id="rv-go">Start recording</button></div>`;
  $('story').classList.add('open');
  $('rv-go').onclick = () => { $('story').classList.remove('open'); startRec({ title: $('rv-title').value, size: $('rv-size').value, captions: $('rv-cap').checked, auto: $('rv-auto').checked, play: $('rv-play').checked }); };
};
