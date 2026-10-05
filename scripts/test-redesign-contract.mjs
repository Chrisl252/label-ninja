// Release UI contract check: every DOM id / selector the JS modules query must exist in
// public/index.html, every LN.* inline handler in the HTML must be exported on window.LN,
// no Tailwind class strings survive anywhere in public/ (html + app js), no payment UI
// remains (everything is free since 2026-10-01), and the home page keeps its SEO contract.
// App-only markup lives in public/js/app/views/*.js templates mounted at boot; their ids
// and LN.* handlers are checked together with index.html.
import { readFileSync, readdirSync } from 'node:fs';

const html = readFileSync('public/index.html', 'utf8');
const jsDir = 'public/js/app';
const jsFiles = readdirSync(jsDir, { recursive: true }).map((f) => f.replace(/\\/g, '/')).filter((f) => f.endsWith('.js'));
const js = Object.fromEntries(jsFiles.map((f) => [f, readFileSync(`${jsDir}/${f}`, 'utf8')]));
const allJs = Object.values(js).join('\n');
const views = jsFiles.filter((f) => f.startsWith('views/') && f !== 'views/mount.js').map((f) => js[f]).join('\n');
const markup = `${html}\n${views}`; // everything the browser ends up with

let fail = 0;
const bad = (msg) => { fail++; console.log('FAIL', msg); };

// 1. ids queried by JS exist in HTML (skip ids the JS itself creates or template-only ids)
const idRe = /getElementById\(['"]([^'"]+)['"]\)|querySelector(?:All)?\(['"]#([a-zA-Z][\w-]*)['"]\)/g;
const htmlIds = new Set([...markup.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
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
for (const m of markup.matchAll(/\sid="([^"]+)"/g)) idCounts[m[1]] = (idCounts[m[1]] || 0) + 1;
for (const [id, n] of Object.entries(idCounts)) if (n > 1) bad(`duplicate id #${id} x${n}`);

// 2. LN.* handlers in HTML are exported on window.LN in app.js
const lnCalls = new Set([...markup.matchAll(/LN\.([a-zA-Z]+)\(/g)].map((m) => m[1]));
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

// 5. free product (2026-10-01): no payment UI, modules, routes, or copy in the app shell
for (const gone of ['paywall.js', 'pricing.js', 'plan.js']) if (jsFiles.includes(gone)) bad(`retired module public/js/app/${gone} still present`);
const paidRe = /stripe|paywall|pricing|upgrade|checkout|\bPro\b|9\.99|batches remaining|free_uses|subscription/i;
for (const [name, src] of [['index.html', html], ...Object.entries(js)]) {
  src.split('\n').forEach((l, i) => { if (paidRe.test(l)) bad(`payment residue ${name}:${i + 1}: ${l.trim().slice(0, 110)}`); });
}
if (/['"]pricing['"]/.test(js['app.js'])) bad('pricing mode still routed in app.js');

// 6. home page SEO contract
const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
const titleText = title.replace(/&amp;/g, '&');
if (!titleText || titleText.length >= 60) bad(`<title> missing or >= 60 chars (${titleText.length})`);
const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
if (!desc || desc.length >= 155) bad(`meta description missing or >= 155 chars (${desc.length})`);
if (!html.includes('<link rel="canonical" href="https://label-ninja.com/">')) bad('canonical link missing');
for (const tag of ['og:title', 'og:description', 'og:url', 'twitter:card']) if (!html.includes(`"${tag}"`)) bad(`${tag} meta missing`);
const lds = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => {
  try { return JSON.parse(m[1]); } catch { bad('JSON-LD does not parse'); return {}; }
});
const ldData = lds.find((d) => d['@type'] === 'WebApplication') || null;
if (!ldData || ldData['@type'] !== 'WebApplication' || ldData.offers?.price !== '0') bad('WebApplication JSON-LD with offers price 0 missing');
if (ldData && (ldData.aggregateRating || ldData.review)) bad('JSON-LD must not carry ratings/reviews');
const homeMain = (html.match(/<main id="mode-home"[\s\S]*?<\/main>/) || [''])[0];
if (!homeMain) bad('#mode-home missing');
if (/<main id="mode-home"[^>]*\bhidden\b/.test(html)) bad('#mode-home must be visible without JS');
if ((homeMain.match(/<h1\b/g) || []).length !== 1) bad('#mode-home needs exactly one <h1>');
for (const href of ['/shipping-label-to-4x6', '/whatnot-labels', '/guides/whatnot-labels-printing-too-small', '/#tools/warehouse-rack-bin-label-generator', '/#tools/amazon-fba-fnsku-generator', '/#editor']) {
  if (!homeMain.includes(`<a href="${href}"`)) bad(`free tools section missing link ${href}`);
}
if (!/id="free-tools"/.test(homeMain) || !/id="faq"/.test(homeMain)) bad('home needs #free-tools and #faq sections');
const foot = (html.match(/<footer class="foot[\s\S]*?<\/footer>/) || [''])[0];
for (const href of ['/privacy', '/terms', '/#free-tools']) if (!foot.includes(`href="${href}"`)) bad(`footer missing ${href}`);
if (!/MODES = \[[^\]]*'home'/.test(js['app.js'])) bad('home mode not routed in app.js');

// 7. home: FAQPage JSON-LD mirrors the visible FAQ exactly; one shared header; same-origin only
const plain = (frag) => frag.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
const faqHtml = (homeMain.match(/<section id="faq"[\s\S]*?<\/section>/) || [''])[0];
const visibleQa = [...faqHtml.matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => [plain(m[1]), plain(m[2])]);
const faqLd = lds.find((d) => d['@type'] === 'FAQPage');
const ldQa = (faqLd?.mainEntity || []).map((q) => [q.name, q.acceptedAnswer?.text]);
if (!visibleQa.length) bad('home FAQ has no visible questions');
if (JSON.stringify(visibleQa) !== JSON.stringify(ldQa)) bad(`FAQPage JSON-LD (${ldQa.length}) does not match the visible FAQ (${visibleQa.length}) exactly`);
if ((html.match(/<header class="site-header/g) || []).length !== 1 || /class="[^"]*\bwordmark\b/.test(html)) bad('index.html must have exactly one site header (no second app top bar)');
const header = (html.match(/<header class="site-header[\s\S]*?<\/header>/) || [''])[0];
if (!/<a class="site-brand" href="\/">/.test(header)) bad('site-brand link missing');
for (const href of ['/shipping-label-to-4x6', '/#tools/whatnot-live-show-number-generator', '/#tools/warehouse-rack-bin-label-generator', '/#tools/amazon-fba-fnsku-generator', '/#editor', '/#label-sizes', '/#best-label-printers', '/guides/']) {
  if (!header.includes('<nav class="site-nav" aria-label="Main">') || !header.includes(`<a href="${href}">`)) bad(`site-nav missing ${href}`);
}
for (const m of html.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)="(?:https?:)?\/\/[^"]*"[^>]*>/g)) {
  if (!/rel="canonical"/.test(m[0])) bad(`external resource in index.html: ${m[0].slice(0, 100)}`);
}
for (const m of markup.matchAll(/<img\b[^>]*>/g)) if (!/\swidth="\d+"/.test(m[0]) || !/\sheight="\d+"/.test(m[0])) bad(`img without width/height: ${m[0].slice(0, 80)}`);
const homeCta = (homeMain.match(/<div class="home-cta">[\s\S]*?<\/div>/) || [''])[0];
if (!/class="btn btn--primary/.test(homeCta) || !homeCta.includes('href="/shipping-label-to-4x6"')) bad('home hero needs a primary CTA and the 4x6 converter CTA');
const lineCount = html.split('\n').length;
if (lineCount > 700) bad(`public/index.html is ${lineCount} lines (Rule 11 budget 700)`);
if (!/mountViews\(\)/.test(js['app.js'])) bad('app.js must mount the app-only views');

console.log(fail ? `${fail} contract failures` : `contract OK — ${queried.size} queried ids resolved, ${lnCalls.size} LN handlers wired, ${htmlIds.size} ids in page`);
process.exit(fail ? 1 : 0);
