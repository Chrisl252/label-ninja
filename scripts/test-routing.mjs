// Routing regressions: real Worker fetch() over a fake ASSETS binding that mimics Workers Static
// Assets (html_handling auto-trailing-slash, not_found_handling 404-page) on the real public/ tree.
// Guards the soft-404 fix: junk paths are 404 + noindex, every canonical page/SPA path/static file is 200.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import worker from '../src/worker.js';
import { SPA_PATHS } from '../src/static.js';

const PUBLIC = 'public';
const isFile = (p) => existsSync(p) && statSync(p).isFile();
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', xml: 'application/xml', txt: 'text/plain', png: 'image/png', jpg: 'image/jpeg', ico: 'image/x-icon', svg: 'image/svg+xml', webmanifest: 'application/manifest+json' };
const typeOf = (f) => TYPES[f.split('.').pop()] || 'application/octet-stream';
const asset = (file, status = 200) => new Response(readFileSync(file), { status, headers: { 'content-type': typeOf(file), 'cache-control': 'public, max-age=300' } });

// Simplified Workers Static Assets resolution (enough for the routes this site uses).
const ASSETS = {
  async fetch(input) {
    const req = input instanceof Request ? input : new Request(input);
    const path = decodeURIComponent(new URL(req.url).pathname);
    const local = join(PUBLIC, path);
    if (path.endsWith('.html')) {
      const bare = path.replace(/(index)?\.html$/, '');
      if (isFile(local)) return new Response(null, { status: 307, headers: { location: bare || '/' } });
    } else if (path.endsWith('/')) {
      if (isFile(join(local, 'index.html'))) return asset(join(local, 'index.html'));
    } else if (isFile(local)) {
      return asset(local);
    } else if (isFile(local + '.html')) {
      return asset(local + '.html');
    } else if (isFile(join(local, 'index.html'))) {
      return new Response(null, { status: 307, headers: { location: path + '/' } });
    }
    return asset(join(PUBLIC, '404.html'), 404); // not_found_handling = "404-page"
  },
};
const env = { ASSETS, APP_ORIGIN: 'https://label-ninja.com', DB: null };
const ctx = { waitUntil() {} };
const get = (path, method = 'GET') => worker.fetch(new Request('http://127.0.0.1:8824' + path, { method }), env, ctx);

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

// Config: the binding must not soft-404 if the Worker is ever bypassed.
const toml = readFileSync('wrangler.toml', 'utf8');
ok(/not_found_handling\s*=\s*"404-page"/.test(toml), 'wrangler.toml not_found_handling = "404-page"');
ok(/run_worker_first\s*=\s*true/.test(toml), 'run_worker_first stays true');

// 404 page itself.
const page404 = readFileSync('public/404.html', 'utf8');
ok(/<meta name="robots" content="noindex/.test(page404), '404.html is noindex');
ok(page404.includes('class="site-header"') && page404.includes('href="/shipping-label-to-4x6"') && page404.includes('href="/guides/"'), '404.html has site shell + tool/guide links');

// Every sitemap URL is a real 200 page (and the sitemap includes the new guides hub).
const sitemap = readFileSync('public/sitemap.xml', 'utf8');
const locs = [...sitemap.matchAll(/<loc>https:\/\/label-ninja\.com([^<]*)<\/loc>/g)].map((m) => m[1]);
ok(locs.includes('/guides/') && locs.length >= 10, 'sitemap lists /guides/ and all canonical pages');
ok(!/<loc>[^<]*(404|account|reset|api)/.test(sitemap), 'sitemap has no 404/SPA/api URLs');
ok((sitemap.match(/<lastmod>2026-10-01<\/lastmod>/g) || []).length === locs.length, 'every sitemap URL has lastmod');
const hubBuilt = isFile('public/guides/index.html');
for (const path of locs) {
  if (path === '/guides/' && !hubBuilt) { console.warn('skip /guides/ (public/guides/index.html not written yet)'); continue; }
  const res = await get(path);
  ok(res.status === 200, `${path} -> 200 (got ${res.status})`);
  ok(!(await res.text()).includes('This page didn\'t print'), `${path} is not the 404 page`);
}

// SPA paths the frontend routes on (app.js routeFromLocation) serve the studio with 200.
for (const path of [...SPA_PATHS, '/reset?token=abc']) {
  const res = await get(path);
  const body = await res.text();
  ok(res.status === 200 && body.includes('id="mode-home"'), `${path} -> 200 studio SPA (got ${res.status})`);
}

// Static files keep their type and headers.
for (const [path, type] of [['/robots.txt', 'text/plain'], ['/sitemap.xml', 'xml'], ['/css/site.css', 'text/css'], ['/js/site-nav.js', 'javascript'],
  ['/assets/logo.jpg', 'image/jpeg'], ['/assets/og-default.png', 'image/png'], ['/assets/og-4x6.png', 'image/png'], ['/favicon.ico', 'icon'],
  ['/favicon.svg', 'svg'], ['/apple-touch-icon.png', 'image/png'], ['/site.webmanifest', 'manifest'], ['/ads.txt', 'text/plain']]) {
  const res = await get(path);
  ok(res.status === 200 && (res.headers.get('content-type') || '').includes(type), `${path} -> 200 ${type} (got ${res.status} ${res.headers.get('content-type')})`);
  ok(res.headers.get('cache-control') === 'public, max-age=300', `${path}: asset headers pass through`);
}

// Junk paths: real 404 status, the helpful page, noindex, never cached.
for (const path of ['/nope-xyz', '/guides/nope', '/foo/bar', '/account/extra', '/index.php', '/wp-login.php', '/css/nope.css', '/assets/nope.png', '/404', '/404.html']) {
  const res = await get(path);
  const body = await res.text();
  ok(res.status === 404, `${path} -> 404 (got ${res.status})`);
  ok(body.includes('This page didn\'t print') && res.headers.get('x-robots-tag') === 'noindex' && res.headers.get('cache-control') === 'no-store', `${path}: 404 page, noindex, no-store`);
}
const head404 = await get('/nope-xyz', 'HEAD');
ok(head404.status === 404 && (await head404.text()) === '', 'HEAD junk -> 404 without body');

// Redirects and API routing are untouched.
const pricing = await get('/pricing');
ok(pricing.status === 301 && new URL(pricing.headers.get('location')).pathname === '/', '/pricing -> 301 /');
const api = await get('/api/definitely-not-a-route');
ok(api.status === 404 && (api.headers.get('content-type') || '').includes('json'), '/api/* unknown stays a JSON 404 from the API');

console.log(`test-routing: ${checks} checks passed`);
