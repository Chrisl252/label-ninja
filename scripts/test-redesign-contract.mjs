// Release UI contract check: every DOM id / selector the JS modules query must exist in
// public/index.html, every LN.* inline handler in the HTML must be exported on window.LN,
// and no Tailwind class strings survive anywhere in public/ (html + app js).
import { readFileSync, readdirSync } from 'node:fs';

const html = readFileSync('public/index.html', 'utf8');
const jsDir = 'public/js/app';
const jsFiles = readdirSync(jsDir).filter((f) => f.endsWith('.js'));
const js = Object.fromEntries(jsFiles.map((f) => [f, readFileSync(`${jsDir}/${f}`, 'utf8')]));
const allJs = Object.values(js).join('\n');

let fail = 0;
const bad = (msg) => { fail++; console.log('FAIL', msg); };

// 1. ids queried by JS exist in HTML (skip ids the JS itself creates or template-only ids)
const idRe = /getElementById\(['"]([^'"]+)['"]\)|querySelector(?:All)?\(['"]#([a-zA-Z][\w-]*)['"]\)/g;
const htmlIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const jsCreated = new Set([...allJs.matchAll(/\.id\s*=\s*['"]([^'"]+)['"]/g)].map((m) => m[1]));
const jsTemplateIds = new Set([...allJs.matchAll(/id="([^"$]+)"/g)].map((m) => m[1]));
const queried = new Map();
for (const [f, src] of Object.entries(js)) {
  for (const m of src.matchAll(idRe)) {
    const id = m[1] || m[2];
    if (!queried.has(id)) queried.set(id, new Set());
    queried.get(id).add(f);
  }
}
for (const [id, files] of queried) {
  if (!htmlIds.has(id) && !jsCreated.has(id) && !jsTemplateIds.has(id)) bad(`id #${id} queried by ${[...files].join(',')} not in index.html`);
}
// duplicates
const idCounts = {};
for (const m of html.matchAll(/\sid="([^"]+)"/g)) idCounts[m[1]] = (idCounts[m[1]] || 0) + 1;
for (const [id, n] of Object.entries(idCounts)) if (n > 1) bad(`duplicate id #${id} x${n}`);

// 2. LN.* handlers in HTML are exported on window.LN in app.js
const lnCalls = new Set([...html.matchAll(/LN\.([a-zA-Z]+)\(/g)].map((m) => m[1]));
const lnBlock = js['app.js'].match(/window\.LN\s*=\s*\{([\s\S]*?)\n\};/);
const exported = new Set(lnBlock ? [...lnBlock[1].matchAll(/^\s*([a-zA-Z]+)\s*[,:]/gm)].map((m) => m[1]) : []);
for (const fn of lnCalls) if (!exported.has(fn) && !js['app.js'].includes(`${fn},`) && !js['app.js'].includes(`${fn}:`)) bad(`LN.${fn} used in HTML but not on window.LN`);

// 3. no Tailwind residue
const tw = /\b(?:bg|text|border|rounded|px|py|p|m|mt|mb|ml|mr|space-x|space-y|gap|grid-cols|w|h|max-w|shadow|font)-(?:slate|blue|emerald|amber|red|gray|white|black|\d+|xs|sm|md|lg|xl|2xl|3xl|mono|bold|semibold)\b|\bflex-col\b|\bitems-center\b|\bjustify-between\b|\bhover:|\blg:|\bsm:|\bmd:|\bxl:/;
for (const [name, src] of [['index.html', html], ['privacy.html', readFileSync('public/privacy.html', 'utf8')], ...Object.entries(js)]) {
  const lines = src.split('\n');
  lines.forEach((l, i) => { if (tw.test(l) && !/^\s*\/\//.test(l)) bad(`tailwind residue ${name}:${i + 1}: ${l.trim().slice(0, 110)}`); });
}
if (html.includes('cdn.tailwindcss.com')) bad('tailwind CDN still linked');
if (/Bisket LLC/i.test(html)) bad('Bisket LLC in index.html');

// 4. inline colours in CSS (tokens only, except tokens.css)
for (const f of readdirSync('public/css')) {
  if (f === 'tokens.css') continue;
  const src = readFileSync(`public/css/${f}`, 'utf8');
  src.split('\n').forEach((l, i) => {
    if (/(?:#[0-9a-fA-F]{3,8}\b|\brgba?\(|\boklch\(|\bhsl\()/.test(l) && !/url\(|mask/.test(l)) bad(`inline colour ${f}:${i + 1}: ${l.trim().slice(0, 100)}`);
  });
}

console.log(fail ? `${fail} contract failures` : `contract OK — ${queried.size} queried ids resolved, ${lnCalls.size} LN handlers wired, ${htmlIds.size} ids in page`);
process.exit(fail ? 1 : 0);
