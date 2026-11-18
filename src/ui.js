import geo from './world2.json';
import idBin from './idmap.bin';
import elevBin from './elev.bin';
import { Globe } from './globe.js';
import { World, fmt } from './engine.js';
import { GOVS, RES } from './systems.js';
import { TECHS, REAL_POP } from './scenario.js';
import { askCouncil, listModels } from './council.js';

// ---------- state ----------
const $ = id => document.getElementById(id);
let world, playing = false, speed = 10, mode = 'political', selected = -1, needsDraw = true, lastEventCount = 0;
let rot = [-60, -25], scale = 1;
const store = { get: (k, d) => { try { const v = localStorage.getItem('worldsim.' + k); return v === null ? d : v; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem('worldsim.' + k, v); } catch {} } };
const council = { mode: store.get('cmode', 'off'), every: +store.get('cevery', 25), size: +store.get('csize', 5), url: store.get('curl', 'http://localhost:11434'), model: store.get('cmodel', 'qwen2.5:7b'), busy: false, held: -1, errors: 0 };
function worldOpts() { return { council: council.mode === 'rules' ? 'rules' : null, councilEvery: council.every, councilSize: council.size }; }
const canvas = $('overlay');
let globe = null, colorsDirty = true;

function newWorld(seed) {
  world = new World(geo, seed, worldOpts());
  council.held = -1;
  selected = -1; lastEventCount = 0; $('log').innerHTML = ''; spin = null;
  $('seed').value = seed;
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
const GOV_COL = { chiefdom: [120, 110, 90], kingdom: [70, 110, 170], empire: [150, 60, 150], khanate: [180, 140, 70], republic: [60, 160, 150], theocracy: [210, 200, 120], constitutional: [100, 150, 210], democracy: [90, 200, 110], dictatorship: [200, 60, 50] };
const RES_ORDER = [['oil', [30, 30, 30]], ['coal', [90, 80, 80]], ['gold', [240, 200, 60]], ['tin', [170, 190, 210]], ['iron', [190, 90, 60]], ['horses', [200, 160, 110]], ['timber', [50, 110, 60]]];
const cultureCache = new Map();
function cultureColor(c) { let v = cultureCache.get(c); if (v) return v; let h = 0; for (const ch of c) h = (h * 31 + ch.charCodeAt(0)) >>> 0; v = toRGB(`hsl(${(h * 137.5) % 360},${40 + h % 25}%,${45 + (h >> 5) % 15}%)`); cultureCache.set(c, v); return v; }
const MODES = {
  political: { label: 'Political', color: i => world.owner[i] >= 0 ? toRGB(world.polities[world.owner[i]].color) : ramp([[52, 62, 50], [92, 100, 76]], Math.sqrt(world.pop[i] / world.area[i] / 20)) },
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
  culture: { label: 'Culture', color: i => cultureColor(world.culture[i]),
    legendFn: () => { const t = new Map(); for (let i = 0; i < world.N; i++) t.set(world.culture[i], (t.get(world.culture[i]) || 0) + world.pop[i]); return [...t].sort((a, b) => b[1] - a[1]).slice(0, 9).map(([c]) => [c, css(cultureColor(c))]); } },
  government: { label: 'Government', color: i => { const o = world.owner[i]; return o < 0 ? [45, 52, 44] : GOV_COL[world.polities[o].gov] || [120, 120, 120]; },
    legendFn: () => Object.entries(GOV_COL).map(([g, c]) => [GOVS[g].label, css(c)]) },
  resources: { label: 'Resources', color: i => { const r = world.res[i]; for (const [k, c] of RES_ORDER) if (r & (1 << RES.indexOf(k))) return c; return [48, 56, 48]; },
    legendFn: () => RES_ORDER.map(([k, c]) => [k, css(c)]) },
  trade: { label: 'Trade routes', color: i => { const o = world.owner[i]; if (o < 0) return [44, 50, 44]; const c = toRGB(world.polities[o].color); return [c[0] * 0.45 | 0, c[1] * 0.45 | 0, c[2] * 0.45 | 0]; } },
  wealth: { label: 'Wealth per person', color: i => { const o = world.owner[i]; if (o < 0) return [44, 50, 44]; const p = world.polities[o]; return ramp([[60, 50, 70], [120, 90, 140], [210, 170, 80], [250, 230, 150]], Math.log10(1 + (p.income || 0) / Math.max(1, p.pop) * 1e7) / 2.5); }, legend: ['poor', '', 'rich'], legendColors: ['rgb(60,50,70)', 'rgb(160,120,110)', 'rgb(250,230,150)'] },
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
function resize() { if (globe) { globe.resize(); needsDraw = true; } }
function draw() {
  if (colorsDirty) updateColors();
  globe.sel = selected >= 0 ? selected : 65535;
  globe.selOwn = selected >= 0 && world.owner[selected] >= 0 ? world.owner[selected] + 1 : 0;
  globe.render();
  const ctx = globe.beginOverlay(), sc = globe.view.scale;
  if (mode === 'trade' || mode === 'political') drawRoutes(ctx, mode === 'trade' ? 1 : 0.25);
  const placed = mode === 'political' ? drawLabels(ctx) : [];
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
function drawRoutes(ctx, alpha) {
  if (!world.routes) return;
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
  $('states').innerHTML = top.map(p => `<div class="st" data-pol="${p.id}"><span class="sw" style="background:${p.color}"></span><span class="nm">${p.name}</span><span class="v">${fmt(p.pop)}</span></div>`).join('');
  if (selected >= 0) showCell(selected);
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
const ICON = { war: '⚔', peace: '🕊', famine: '🌾', plague: '☣', tech: '💡', split: '⚡', fall: '🏚', rise: '🏛', dynasty: '👑', disaster: '🌋', climate: '❄', contact: '⛵', colony: '⚓', annex: '➕', nuclear: '☢', start: '🌍', council: '📜', faith: '🕯', gov: '🏛', city: '🏙', sack: '🔥' };
const GROUP = { war: 'war', peace: 'war', nuclear: 'war', famine: 'famine', plague: 'plague', tech: 'tech', split: 'states', fall: 'states', rise: 'states', dynasty: 'states', annex: 'states', colony: 'states', disaster: 'nature', climate: 'nature', contact: 'tech', start: 'states', council: 'council', faith: 'states', gov: 'states', city: 'states', sack: 'war' };
function eventVisible(e) {
  const g = GROUP[e.type] || 'states';
  if (!$('f-' + g).checked) return false;
  if ($('f-big').checked && !e.big && !['tech', 'contact', 'nuclear', 'disaster', 'start', 'climate', 'council', 'faith'].includes(e.type) && !(e.type === 'plague' && e.deaths > 5e5) && !(e.type === 'peace' && e.deaths > 3e5) && !(e.type === 'famine' && e.deaths > 1e6)) return false;
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
  let html = `<div class="ihead">${p ? `<span class="sw" style="background:${p.color}"></span>${p.name}` : c.tribe}</div>`;
  html += `<div class="isub">${Math.abs(c.lat).toFixed(0)}°${c.lat >= 0 ? 'N' : 'S'} ${Math.abs(c.lon).toFixed(0)}°${c.lon >= 0 ? 'E' : 'W'} · ${c.culture}${c.river ? ' · ' + c.river + ' river' : ''}</div>`;
  html += row('People', fmt(c.pop)) + row('Per km²', c.density.toFixed(1)) + row('Fed', Math.round(c.nour * 100) + '%');
  html += row('Harvest weather', (c.climate >= 1 ? '+' : '') + Math.round((c.climate - 1) * 100) + '%');
  html += row('Granary', fmt(c.granary) + ' rations') + row('Soil', Math.round(c.soil * 100) + '%') + row('Farmland cleared', Math.round(world.cleared[i] * 100) + '%');
  if (c.fishK > 0) html += row('Fish stock', Math.round(c.fish / c.fishK * 100) + '%');
  html += row('In towns', Math.round(c.urban * 100) + '%');
  if (c.city) html += row('City', c.city);
  html += row('Height', Math.round(c.elev / 10) * 10 + ' m') + row('Faith', c.faith) + row('Culture', c.culture);
  if (c.resources.length) html += row('Resources', c.resources.join(', '));
  if (p) {
    const wars = world.wars.filter(w => !w.end && (w.a === p.id || w.b === p.id)).map(w => world.polities[w.a === p.id ? w.b : w.a].name);
    html += `<div class="isec">State</div>` + row('Government', (GOVS[p.gov] || GOVS.kingdom).label) + row('State faith', p.rel >= 0 ? world.faiths[p.rel].name : '–') + row('Treasury', `${Math.round(p.treasury || 0)} (${(p.income || 0) >= (p.spend || 0) ? '+' : ''}${((p.income || 0) - (p.spend || 0)).toFixed(1)}/yr)`) + row('Trade partners', (p.tradePartners || new Set()).size) + row('Population', fmt(p.pop)) + row('Provinces', p.cells) + row('Founded', p.founded) + row('Stability', Math.round(p.stability * 100) + '%') + row('Army', fmt(p.army)) + row('Research / yr', (p.rpRate || 0).toFixed(0));
    if (wars.length) html += row('At war with', wars.join(', '));
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
    if (id < world.N) { selected = id; showCell(id); } else { selected = -1; $('inspector').innerHTML = '<div class="hint">Click land to inspect it.</div>'; }
    needsDraw = true;
  }
  drag = null;
});
canvas.addEventListener('wheel', e => { e.preventDefault(); globe.view.scale = Math.max(0.7, Math.min(4, globe.view.scale * Math.exp(-e.deltaY * 0.0012))); needsDraw = true; }, { passive: false });
window.addEventListener('resize', resize);

$('play').onclick = () => { playing = !playing; $('play').textContent = playing ? '❚❚ Pause' : '▶ Play'; };
$('step').onclick = () => { world.step(); afterSteps(); };
$('speed').oninput = e => { speed = [1, 2, 5, 10, 20, 50, 100][+e.target.value]; $('speedv').textContent = speed + ' yr/s'; };
$('newworld').onclick = () => newWorld(Math.floor(Math.random() * 1e6));
$('seed').onchange = e => newWorld(+e.target.value || 1);
$('jump').onclick = () => { const to = +$('jumpto').value; if (to > world.year) { jumpTarget = to; playing = false; $('play').textContent = '▶ Play'; } };
for (const id of ['f-war', 'f-famine', 'f-plague', 'f-tech', 'f-states', 'f-nature', 'f-council', 'f-big']) $(id).onchange = rebuildLog;
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
      const d = await askCouncil({ url: council.url, model: council.model, brief: world.brief(p), neighbours, enemies, every: council.every });
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

// ---------- main loop ----------
let acc = 0, last = performance.now(), panelTimer = 0;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  if (spin) spin();
  let stepped = 0;
  const t0 = performance.now();
  const councilDue = () => council.mode === 'llm' && world.year % council.every === 0 && council.held !== world.year;
  if (council.busy) { /* waiting for the AI council */ }
  else if (jumpTarget !== null) {
    while (world.year < jumpTarget && performance.now() - t0 < 40) { if (councilDue()) { holdLLMCouncil(); break; } world.step(); stepped++; }
    $('jumpinfo').textContent = world.year < jumpTarget ? `running to ${jumpTarget}…` : '';
    if (world.year >= jumpTarget) jumpTarget = null;
  } else if (playing) {
    acc += dt * speed;
    while (acc >= 1 && performance.now() - t0 < 30) { if (councilDue()) { holdLLMCouncil(); break; } world.step(); acc -= 1; stepped++; }
    if (acc > 3) acc = 0;
  }
  if (stepped) { appendEvents(); panelTimer += stepped; needsDraw = true; colorsDirty = true; if (panelTimer >= 1) { updatePanels(); panelTimer = 0; if (MODES[mode].legendFn && world.year % 10 === 0) renderLegend(); } }
  if (needsDraw) { draw(); needsDraw = false; }
  requestAnimationFrame(frame);
}

(async () => {
  try { globe = await Globe.create($('globe'), canvas, idBin, elevBin, geo.cells.length); }
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
