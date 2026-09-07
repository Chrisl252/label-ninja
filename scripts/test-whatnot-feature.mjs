// Pure setup/URL/PDF proof and crawlable HTML contract. No network or user data.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { WHATNOT_STOCKS } from '../public/js/app/presets.js';
import { buildWhatnotSpec } from '../public/js/app/spec-builders.js';
import { modeFromHash } from '../public/js/app/guides.js';
import { renderSpecPdf } from '../src/render/pdf-label.js';
import { whatnotTextWidthEm } from '../public/js/app/whatnot-text-fit.js';
import { validateWhatnotSettings, whatnotToolUrl, whatnotSettingsFromSearch, WHATNOT_TOOL_HASH } from '../public/js/whatnot-settings.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; console.log('PASS ' + message); };
const defaults = { stock: 'fnsku', prefix: '#', start: 1, end: 50 };
const fontDoc = await PDFDocument.create();
const font = await fontDoc.embedFont(StandardFonts.HelveticaBold);
for (let code = 32; code <= 126; code++) {
  const char = String.fromCharCode(code);
  assert.equal(whatnotTextWidthEm(char), font.widthOfTextAtSize(char, 1000) / 1000);
}
check(true, 'all 95 ASCII advance widths match the actual PDF font');
for (const size of Object.values(WHATNOT_STOCKS)) {
  for (const prefix of ['Show-', 'W'.repeat(12), '@'.repeat(12), 'i'.repeat(12)]) {
    const spec = buildWhatnotSpec({ prefix, start: 999, end: 999, ...size });
    const text = spec.pages[0].elements[0];
    check(font.widthOfTextAtSize(text.text, text.font_size_pt) <= text.w_in * 72,
      `${size.name}: long prefix ${prefix} fits inside label padding`);
  }
}
check(validateWhatnotSettings(defaults).end === 50, 'default 50-label setup');
check(modeFromHash(WHATNOT_TOOL_HASH) === 'whatnot', 'existing tool hash remains compatible');
for (const stock of Object.keys(WHATNOT_STOCKS)) {
  for (const prefix of ['', '#', 'Show-', '<b>&?/#=']) {
    const settings = { ...defaults, stock, prefix };
    const url = new URL(whatnotToolUrl(settings), 'https://label-ninja.com');
    assert.deepEqual(whatnotSettingsFromSearch(url.search), settings);
    check(url.origin === 'https://label-ninja.com' && url.pathname === '/' && url.hash === WHATNOT_TOOL_HASH,
      `${stock} settings round-trip safely with ${JSON.stringify(prefix)}`);
  }
}
for (const patch of [
  { stock: '__proto__' }, { stock: 'shipping' }, { prefix: 'x'.repeat(13) }, { prefix: '\n' },
  { prefix: '😀' }, { start: '1.5' }, { start: '1e1' }, { start: '' }, { start: 0 },
  { end: 1000 }, { end: '50junk' }, { start: 51 }, { end: 201 },
]) {
  assert.throws(() => validateWhatnotSettings({ ...defaults, ...patch }));
  check(true, 'reject invalid settings ' + JSON.stringify(patch));
}
for (const query of ['', '?wn-stock=tiny', '?wn-stock=tiny&wn-prefix=%23&wn-start=1&wn-end=2&wn-end=3',
  '?wn-stock=__proto__&wn-prefix=%23&wn-start=1&wn-end=2']) {
  check(whatnotSettingsFromSearch(query) === null, 'ignore incomplete/duplicate/invalid deep link');
}
for (const [stock, size] of Object.entries(WHATNOT_STOCKS)) {
  const settings = validateWhatnotSettings({ stock, prefix: 'C', start: 800, end: 999 });
  const spec = buildWhatnotSpec({ ...settings, ...size });
  check(spec.pages.length === 200 && spec.pages[0].elements[0].text === 'C800' &&
    spec.pages[199].elements[0].text === 'C999', `${stock}: inclusive 200-number sequence`);
  const pdf = await PDFDocument.load(await renderSpecPdf(spec));
  check(pdf.getPageCount() === 200 && pdf.getPages().every(page =>
    page.getWidth() === size.width * 72 && page.getHeight() === size.height * 72),
  `${stock}: all 200 rendered PDF pages have exact stock dimensions`);
}

const routes = ['/whatnot-labels', '/guides/whatnot-labels-printing-too-small'];
const sitemap = readFileSync('public/sitemap.xml', 'utf8');
const home = readFileSync('public/index.html', 'utf8');
const titles = new Set();
for (const route of routes) {
  const html = readFileSync(`public${route}.html`, 'utf8');
  check((html.match(/<main\b/g) || []).length === 1 && (html.match(/<h1\b/g) || []).length === 1,
    `${route}: one main and H1 in server-readable HTML`);
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  check(!titles.has(title), `${route}: unique title`); titles.add(title);
  check(html.includes(`<link rel="canonical" href="https://label-ninja.com${route}">`) &&
    html.includes('index,follow,max-image-preview:large'), `${route}: indexable self-canonical`);
  check(sitemap.includes(`https://label-ninja.com${route}</loc>`) && home.includes(`href="${route}"`),
    `${route}: sitemap and crawlable studio link`);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  check(schemas.length > 0 && schemas.every(match => JSON.parse(match[1])['@context'] === 'https://schema.org'),
    `${route}: parseable structured data`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)) {
    const path = match[1];
    if (path === '/' || path === '/pricing') continue;
    check(existsSync(`public${path}`) || existsSync(`public${path}.html`), `${route}: local target ${path}`);
  }
  check(!/sk_(?:live|test)_|pk_test_|trusted by|guaranteed rank/i.test(html), `${route}: no keys or fabricated proof`);
}
check(home.includes('id="wn-preview-caption"') && home.includes('id="wn-preview-number"'), 'studio live-preview DOM wiring');
console.log(`ALL ${checks} WHATNOT FEATURE CHECKS PASSED`);
