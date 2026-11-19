// WorldSim video factory: one command from a seed to a narrated documentary.
//
//   node video/make.mjs --seed 7                       # plan, narrate, voice, film, assemble
//   node video/make.mjs --seed 7 --plan-only           # write the script and stop (edit it, then:)
//   node video/make.mjs --script out/seed7/script.json # film an edited script
//
// Steps: run the world in the page once to see what happens; pick the story beats; write the
// narration (local Qwen through Ollama if it answers, otherwise plain sentences from the chronicle);
// voice it (Kokoro if installed, else espeak-ng, else silent captions); film each scene in the page
// (a time-lapse from the last beat, the camera flying to the next); join the scenes with ffmpeg and
// add the narration and subtitles.
//
// Needs: Node 20+, ffmpeg on the PATH, and puppeteer (npm i puppeteer) or puppeteer-core with CHROME set.
// Optional: Ollama with a Qwen model (--model), kokoro-js (npm i kokoro-js) for the voice.
import fs from 'fs';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const A = parseArgs(process.argv.slice(2));
const opt = {
  seed: +(A.seed ?? 1), from: +(A.from ?? 0), to: +(A.to ?? 2026), scenario: +(A.scenario ?? 0), blind: !!A.blind,
  minutes: +(A.minutes ?? 5), width: +(A.width ?? 1920), height: +(A.height ?? 1080), fps: +(A.fps ?? 30),
  ollama: A.ollama ?? 'http://localhost:11434', model: A.model ?? 'qwen2.5:7b', noLLM: !!A['no-llm'],
  voice: A.voice ?? 'auto', kvoice: A['kokoro-voice'] ?? 'bm_george', espeakVoice: A['espeak-voice'] ?? 'en-gb',
  page: path.resolve(A.page ?? path.join(HERE, '..', 'index.html')), planOnly: !!A['plan-only'], script: A.script,
  title: A.title, out: A.out,
};
const OUT = path.resolve(A.dir ?? (A.script ? path.dirname(path.resolve(A.script)) : null) ?? path.join(HERE, 'out', `seed${opt.seed}${opt.scenario ? '_' + opt.scenario : ''}${opt.blind ? '_blind' : ''}`));
fs.mkdirSync(path.join(OUT, 'scenes'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'voice'), { recursive: true });
const log = (...m) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...m);

function parseArgs(a) { const o = {}; for (let i = 0; i < a.length; i++) { if (!a[i].startsWith('--')) continue; const k = a[i].slice(2); o[k] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; } return o; }
const fmtN = n => n >= 1e9 ? (n / 1e9).toFixed(2) + ' billion' : n >= 1e6 ? Math.round(n / 1e6) + ' million' : n >= 1e3 ? Math.round(n / 1e3) + ' thousand' : String(Math.round(n));
const yearStr = y => (y < 0 ? -y + ' BC' : String(y));

// ---------------- the browser ----------------
async function browser() {
  let pp;
  try { pp = (await import('puppeteer')).default; } catch { pp = (await import('puppeteer-core')).default; }
  const exe = process.env.CHROME || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
  const b = await pp.launch({ headless: 'new', executablePath: exe, protocolTimeout: 0, args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${opt.width},${opt.height}`] });
  const pg = await b.newPage();
  await pg.setViewport({ width: opt.width, height: opt.height, deviceScaleFactor: 1 });
  pg.on('pageerror', e => log('page error:', e.message));
  await pg.goto(pathToFileURL(opt.page).href, { waitUntil: 'load' });
  await pg.waitForFunction(() => window.__film && window.__world && window.__world(), { timeout: 60000 });
  return { b, pg };
}
const setup = pg => pg.evaluate(o => window.__film.setup(o), { seed: opt.seed, blind: opt.blind, scenario: opt.scenario, width: opt.width, height: opt.height });

// ---------------- 1. what happens, and 2. the beats ----------------
const KEY_TECH = /invents (Printing press|Ocean navigation|Scientific method|Factories|Railways|Electricity|Flight|Nuclear fission|Computers|Spaceflight|The internet|Steam engine|Gunpowder|Paper)/i;
function deathsIn(t) { const m = t.match(/([\d.,]+)\s*(million|billion)?\s+dead/); if (!m) return 0; const v = +m[1].replace(/,/g, ''); return v * (m[2] === 'billion' ? 1e9 : m[2] === 'million' ? 1e6 : 1); }
// how much a chronicle line deserves a scene of its own
function score(e) {
  const t = e.text, d = Math.max(e.deaths || 0, deathsIn(t));
  switch (e.type) {
    case 'contact': return /two halves of the world/.test(t) ? 40 : /reaches .*far beyond/.test(t) ? 6 : 0;
    case 'tech': return KEY_TECH.test(t) ? 14 : 0;
    case 'fall': { const n = +(t.match(/after (\d+) years/) || [0, 0])[1]; return n < 60 && !e.big ? 0 : 6 + Math.min(10, n / 40) + (e.big ? 6 : 0); }
    case 'split': return 4 + 3 * (t.split(',').length) + (e.big ? 6 : 0);
    case 'rise': return /unite|founded|proclaim/i.test(t) ? 10 + (e.big ? 6 : 0) : e.big ? 6 : 2;
    case 'faith': return /is born|new faith/i.test(t) ? 12 + (e.big ? 4 : 0) : /converts/.test(t) && e.big ? 5 : 0;
    case 'plague': return d > 1e6 ? 6 + 4 * Math.log10(d / 1e6 + 1) * 3 : 0;
    case 'peace': return d > 2e6 ? 6 + 4 * Math.log10(d / 1e6) * 3 : 0;
    case 'war': return d > 5e6 ? 8 : 0;
    case 'climate': return 9;
    case 'dynasty': return e.big ? 8 : 3;
    case 'sack': return e.big ? 8 : 3;
    case 'disaster': return d > 1e6 ? 8 : 2;
    case 'people': return e.big ? 6 : 1;
    case 'famine': return d > 3e6 ? 7 : 0;
    default: return e.big ? 3 : 0;
  }
}
function pickBeats(P) {
  const y0 = P.events.length ? Math.min(...P.events.map(e => e.y)) : 1, y1 = P.year;
  const n = Math.max(6, Math.round(opt.minutes * 60 / 24));  // about 24 s a beat
  const scored = P.events.filter(e => e.lon !== null).map(e => ({ ...e, s: score(e) })).filter(e => e.s > 0).sort((a, b) => b.s - a.s);
  const gap = (y1 - y0) / n * 0.5, beats = [], perType = {}, cap = Math.max(2, Math.ceil(n * 0.3));
  const sig = e => e.type + ':' + (e.text.match(/against ([A-Z][\w-]+(?: [A-Z][\w-]+)*)/) || e.text.match(/^([A-Z][\w-]+(?: [A-Z][\w-]+)*)/) || ['', ''])[1];
  for (const e of scored) {
    if (beats.length >= n) break;
    if (e.y < y0 + 20 || beats.some(b => Math.abs(b.y - e.y) < gap)) continue;
    if ((perType[e.type] || 0) >= (e.type === 'climate' ? 1 : cap)) continue;
    if (beats.some(b => sig(b) === sig(e) && Math.abs(b.y - e.y) < 400)) continue;
    perType[e.type] = (perType[e.type] || 0) + 1; beats.push(e);
  }
  beats.sort((a, b) => a.y - b.y);
  return beats.map((e, k) => {
    const prev = k ? beats[k - 1].y : y0;
    const around = P.events.filter(x => x.y > prev && x.y <= e.y && x.text !== e.text && score(x) >= 8).slice(-5).map(x => `${x.y}: ${x.text}`);
    const ty = Math.round(e.y / 50) * 50, tops = P.tops[ty] || P.tops[Math.floor(e.y / 50) * 50] || [];
    const pop = (P.hist.filter(h => h.y <= e.y).at(-1) || P.hist[0]).pop;
    const mode = e.type === 'faith' ? 'religion' : 'political';
    const { title, sub } = titles(e.text);
    return { year: e.y, from: prev, lon: e.lon, lat: e.lat, mode, label: mode === 'religion' ? 'Faiths' : '', title, sub, event: e.text, facts: around, context: `Largest states around ${ty}: ${tops.map(t => `${t[0]} (${fmtN(t[1])})`).join(', ')}. World population about ${fmtN(pop)}.` };
  });
}
// a short title, and whatever the title leaves out as the line under it
function titles(text) {
  const t = text.replace(/\s+/g, ' ').trim();
  let cut = t.search(/[:;]|, \d|\. /);
  if (cut < 12) cut = t.search(/[.;]/);
  let title = (cut > 0 ? t.slice(0, cut) : t).replace(/[.,]$/, '');
  if (title.length > 64) title = title.slice(0, title.lastIndexOf(' ', 60)) + '…';
  let sub = t.slice(title.replace(/…$/, '').length).replace(/^[:;,.]\s*/, '').trim();
  if (sub.length < 4) sub = '';
  return { title, sub };
}

// ---------------- 3. the narration ----------------
async function ollamaUp() { if (opt.noLLM) return false; try { const r = await fetch(opt.ollama.replace(/\/$/, '') + '/api/tags', { signal: AbortSignal.timeout(3000) }); return r.ok; } catch { return false; } }
async function llm(system, user) {
  const body = { model: opt.model, stream: false, options: { temperature: 0.7 }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] };
  if (/qwen3/i.test(opt.model)) body.think = false;
  const r = await fetch(opt.ollama.replace(/\/$/, '') + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('Ollama ' + r.status);
  return ((await r.json()).message.content || '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}
const SYS = 'You narrate a documentary about an alternate history of the world, produced by a simulation. Write the narration for one scene: 2 or 3 sentences, 35 to 60 words, spoken English, past tense, calm and vivid like a history documentary. Use only the facts given; keep every name, year and number exactly as given; never invent people, places or events. No headings, lists, quotes or stage directions.';
async function writeScript(P, beats) {
  const useLLM = await ollamaUp();
  log(useLLM ? `narration: ${opt.model} through Ollama` : 'narration: Ollama not reachable, using plain sentences from the chronicle');
  const firstTop = (P.tops[0] || P.tops[50] || []).slice(0, 3).map(t => t[0]);
  const title = opt.title || `A world, seed ${opt.seed}`;
  const intro = { kind: 'title', year: P.hist[0].y, lon: 60, lat: 25, scale: 1, title, sub: `${P.blind ? 'Blind mode' : 'Our Earth, our year 1'}: what happens next is the simulation's.`, card: { title, lines: [`Seed ${opt.seed} · from ${yearStr(P.hist[0].y)} to ${P.year}`, P.blind ? 'Plagues, eruptions and prophets are random' : 'Real plagues, eruptions and climate at their real dates'] } };
  intro.text = `This is the story of one possible world. It begins in the year ${yearStr(P.hist[0].y)} with about ${fmtN(P.hist[0].pop)} people, and great states such as ${firstTop.join(', ')}. Everything that follows was decided by the simulation.`;
  const scenes = [intro];
  for (const b of beats) {
    const facts = `Year of the scene: ${yearStr(b.year)}.\nMain event: ${b.year}: ${b.event}\nOther events since ${yearStr(b.from)}:\n${b.facts.join('\n') || '(none)'}\nContext: ${b.context}`;
    let text = '';
    if (useLLM) { try { text = await llm(SYS, facts); } catch (e) { log('Ollama failed, plain text for this scene:', e.message); } }
    if (!text) text = plain(b);
    scenes.push({ kind: 'beat', ...b, text });
    log(`scene ${scenes.length - 1}: ${b.year} ${b.title}`);
  }
  const top = P.largest.slice(0, 3).map(p => `${p.name} (${fmtN(p.pop)})`);
  const cmp = P.tech.filter(t => ['printing', 'industry', 'electricity', 'flight', 'computers'].includes(t.id)).map(t => `${t.name}: ${t.year} here, ${yearStr(t.real)} in ours`);
  const end = { kind: 'end', year: P.year, lon: 60, lat: 20, scale: 1, title: `The year ${P.year}`, card: { title: `The year ${P.year}`, lines: [`${fmtN(P.pop)} people`, ...top, ...cmp.slice(0, 3)] } };
  end.text = `By ${P.year} the world held ${fmtN(P.pop)} people. The largest states were ${top.join(', ')}. ${cmp.length ? 'Compared with our own history: ' + cmp.slice(0, 2).join('; ') + '.' : ''}`;
  if (useLLM) { try { end.text = await llm(SYS.replace('one scene', 'the closing scene'), `Closing facts: ${end.text}\nWars killed ${fmtN(P.totals.war)}, famine ${fmtN(P.totals.famine)}, plague ${fmtN(P.totals.plague)} over the whole history.`) || end.text; } catch { } }
  scenes.push(end);
  return { seed: opt.seed, scenario: opt.scenario, blind: opt.blind, to: P.year, width: opt.width, height: opt.height, title, scenes };
}
function plain(b) {
  const ev = b.event.replace(/\.$/, '').replace(/\s*\(\d+–\d+\)/, '');
  const extra = b.facts.length ? ` Earlier, in ${b.facts.at(-1).replace(/^(\d+):\s*(A|An|The) /, (m, y, a) => `${y}, ${a.toLowerCase()} `).replace(/^(\d+):\s*/, '$1, ').replace(/\.$/, '')}.` : '';
  const pop = (b.context.match(/World population about ([^.]+)/) || [])[1];
  return `The year ${yearStr(b.year)}. ${ev}.${extra}${pop ? ` The world now holds about ${pop} people.` : ''}`.replace(/\s+/g, ' ').trim();
}

// ---------------- 4. the voice ----------------
let kokoro = null;
async function voiceEngine() {
  if (opt.voice === 'none') return 'none';
  if (opt.voice === 'auto' || opt.voice === 'kokoro') {
    try {
      const { KokoroTTS } = await import('kokoro-js');
      kokoro = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
      return 'kokoro';
    } catch (e) { if (opt.voice === 'kokoro') throw e; log('Kokoro not available (' + e.message.split('\n')[0] + ')'); }
  }
  if (spawnSync('espeak-ng', ['--version']).status === 0) return 'espeak';
  if (spawnSync('espeak', ['--version']).status === 0) return 'espeak1';
  return 'none';
}
function duration(file) { const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]); return +String(r.stdout).trim() || 0; }
async function speak(engine, text, file) {
  if (engine === 'kokoro') { const a = await kokoro.generate(text, { voice: opt.kvoice }); await a.save(file); }
  else if (engine === 'espeak' || engine === 'espeak1') { const r = spawnSync(engine === 'espeak' ? 'espeak-ng' : 'espeak', ['-v', opt.espeakVoice, '-s', '150', '-w', file, text]); if (r.status) throw new Error('espeak failed'); }
  else return Math.max(4, text.split(/\s+/).length / 2.5);   // silent: as long as it takes to read
  return duration(file);
}

// ---------------- 5. filming and assembling ----------------
const ease = t => t * t * (3 - 2 * t);
function lerpLon(a, b, t) { let d = b - a; if (d > 180) d -= 360; if (d < -180) d += 360; return a + d * t; }
function ffmpeg(args, input) {
  return new Promise((res, rej) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: [input ? 'pipe' : 'ignore', 'ignore', 'inherit'] });
    p.on('error', rej); p.on('exit', c => c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)));
    if (input) input(p.stdin);
  });
}
async function filmScene(pg, sc, prev, k, dur) {
  const final = path.join(OUT, 'scenes', `s${String(k).padStart(2, '0')}.mp4`), tmp = final.replace('.mp4', '.part.mp4');
  if (fs.existsSync(final) && !A.refilm) { log(`scene ${k}: already filmed`); return; }
  const n = Math.round(dur * opt.fps);
  const enc = ['-f', 'image2pipe', '-framerate', String(opt.fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(opt.fps), tmp];
  let write;
  const done = ffmpeg(enc, s => { write = s; });
  for (let i = 0; i < n; i++) {
    const url = await pg.evaluate(x => window.__film.frame(x), frameAt(sc, prev, i / Math.max(1, n - 1)));
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!write.write(buf)) await new Promise(r => write.once('drain', r));
  }
  write.end();
  await done;
  fs.renameSync(tmp, final);
  log(`scene ${k}: ${n} frames, ${dur.toFixed(1)} s`);
}
function frameAt(sc, prev, t) {
    const pFrom = prev || sc, travel = sc.kind === 'beat' ? 0.55 : 0;
    const m = travel ? ease(Math.min(1, t / travel)) : 1;
    const f = { year: sc.kind === 'beat' ? Math.round(pFrom.year + (sc.year - pFrom.year) * m) : sc.year, mode: sc.mode || 'political', label: sc.label || '' };
    f.lon = lerpLon(pFrom.lon ?? sc.lon, sc.lon, m); f.lat = (pFrom.lat ?? sc.lat) + (sc.lat - (pFrom.lat ?? sc.lat)) * m;
    f.scale = sc.kind === 'beat' ? (t <= travel ? 1.6 * (1 - 0.3 * Math.sin(Math.PI * m)) : 1.6 * (1 + 0.18 * ease((t - travel) / (1 - travel)))) : 1 + 0.08 * t;
    if (sc.kind === 'beat') { f.title = sc.title; f.sub = t > travel * 0.9 ? (sc.sub ?? '') : ''; f.titleAlpha = Math.min(1, Math.max(0, (t - travel * 0.8) / 0.12)); }
    if (sc.card) f.card = { ...sc.card, alpha: sc.kind === 'title' ? Math.min(1, (1 - t) / 0.25) : Math.min(1, t / 0.2) };
    if (sc.kind === 'title') { f.lower = t > 0.7; f.fade = Math.max(0, 1 - t / 0.08); }
    if (sc.kind === 'end') f.fade = Math.max(0, (t - 0.92) / 0.08);
    return f;
}
function srtTime(s) { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; }

// ---------------- main ----------------
const t0 = Date.now();
const { b, pg } = await browser();
let script;
if (opt.script) { script = JSON.parse(fs.readFileSync(opt.script, 'utf8')); Object.assign(opt, { seed: script.seed, scenario: script.scenario, blind: script.blind, to: script.to }); log(`using the script ${opt.script}`); }
else {
  log(`running seed ${opt.seed} to ${opt.to} to see what happens…`);
  await setup(pg);
  const P = await pg.evaluate(to => window.__film.plan(to), opt.to);
  fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify(P));
  const beats = pickBeats(P);
  script = await writeScript(P, beats);
  fs.writeFileSync(path.join(OUT, 'script.json'), JSON.stringify(script, null, 2));
  log(`script written: ${path.join(OUT, 'script.json')} (${script.scenes.length} scenes). Edit the "text" of any scene and run again with --script to re-voice it.`);
}
if (opt.planOnly) { await b.close(); process.exit(0); }
// a few full-size frames to look at before a full render
if (A.stills) {
  await setup(pg);
  const picks = [0, ...[1, Math.floor(script.scenes.length / 2), script.scenes.length - 2].filter(k => k > 0)], tAt = { title: 0.85, beat: 0.8, end: 0.6 };
  for (const k of [...new Set(picks), script.scenes.length - 1]) {
    const sc = script.scenes[k], url = await pg.evaluate(x => window.__film.frame(x), frameAt(sc, k ? script.scenes[k - 1] : null, tAt[sc.kind]));
    const f = path.join(OUT, `still_${String(k).padStart(2, '0')}.jpg`); fs.writeFileSync(f, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')); log('still', f);
  }
  await b.close(); process.exit(0);
}

// voices first: each scene lasts as long as its narration
const engine = await voiceEngine();
log(`voice: ${engine}${engine === 'kokoro' ? ' (' + opt.kvoice + ')' : ''}`);
const durs = [];
for (const [k, sc] of script.scenes.entries()) {
  const f = path.join(OUT, 'voice', `v${String(k).padStart(2, '0')}.wav`);
  const len = await speak(engine, sc.text, f);
  sc.voice = engine === 'none' ? null : f; sc.voiceLen = len;
  durs.push(Math.max(sc.kind === 'title' ? 7 : 5, len + 1.4));
}
// film
await setup(pg);
for (const [k, sc] of script.scenes.entries()) await filmScene(pg, sc, k ? script.scenes[k - 1] : null, k, durs[k]);
await b.close();
// join the scenes (same size, rate and encoder, so no re-encoding)
const list = path.join(OUT, 'scenes.txt');
fs.writeFileSync(list, script.scenes.map((_, k) => `file '${path.join(OUT, 'scenes', `s${String(k).padStart(2, '0')}.mp4`).replace(/'/g, "'\\''")}'`).join('\n'));
const silent = path.join(OUT, 'video_silent.mp4');
await ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
// narration track: each voice clip starts 0.4 s into its scene
const final = path.resolve(opt.out || path.join(OUT, `worldsim_seed${opt.seed}.mp4`));
let srt = '', at = 0;
script.scenes.forEach((sc, k) => { srt += `${k + 1}\n${srtTime(at + 0.4)} --> ${srtTime(at + 0.4 + Math.min(durs[k] - 0.6, sc.voiceLen || durs[k]))}\n${sc.text}\n\n`; at += durs[k]; });
fs.writeFileSync(final.replace(/\.mp4$/, '.srt'), srt);
if (engine !== 'none') {
  const ins = [], filt = [];
  let off = 0;
  script.scenes.forEach((sc, k) => { ins.push('-i', sc.voice); const ms = Math.round((off + 0.4) * 1000); filt.push(`[${k + 1}:a]aresample=48000,aformat=channel_layouts=mono,adelay=${ms}|${ms}[a${k}]`); off += durs[k]; });
  const mix = `${filt.join(';')};${script.scenes.map((_, k) => `[a${k}]`).join('')}amix=inputs=${script.scenes.length}:normalize=0,apad[aout]`;
  const tmp = final.replace(/\.mp4$/, '.part.mp4');
  await ffmpeg(['-i', silent, ...ins, '-filter_complex', mix, '-map', '0:v', '-map', '[aout]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-shortest', tmp]);
  fs.renameSync(tmp, final);
} else fs.copyFileSync(silent, final);
log(`done in ${((Date.now() - t0) / 60000).toFixed(1)} min: ${final} (${at.toFixed(0)} s), subtitles beside it`);
