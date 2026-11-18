import { build } from 'esbuild';
import fs from 'fs';
const wk = await build({ entryPoints: ['src/batchworker.js'], bundle: true, minify: true, format: 'iife', write: false });
const r = await build({ entryPoints: ['src/ui.js'], bundle: true, minify: true, format: 'iife', write: false, loader: { '.json': 'json', '.bin': 'binary', '.jpg': 'binary', '.png': 'binary' }, define: { __WORKER_SRC__: JSON.stringify(wk.outputFiles[0].text) } });
const js = r.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
const html = fs.readFileSync('src/template.html', 'utf8').replace('/*BUNDLE*/', () => js);
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
console.log('built', (html.length / 1024).toFixed(0) + ' KB');
