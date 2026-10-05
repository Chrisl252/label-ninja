// Read-only HTTP gate. Never creates users, projects, or PDF jobs. Everything is free (2026-10-01).
const base = new URL(process.env.LN_BASE || 'http://127.0.0.1:8787');
let failures = 0;
function result(passed, label) { console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`); if (!passed) failures++; }
async function get(path, url = new URL(path, base)) {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
  return { response, body: await response.text() };
}
// Follow the actual served module URLs, including their cache-version queries.
// Only the expected same-origin path is allowed; this check never follows arbitrary imports.
function servedImport(source, binding, referrer, expectedPath) {
  const match = source.match(new RegExp(`\\bimport\\s*\\{\\s*${binding}\\s*\\}\\s*from\\s*['"]([^'"]+)['"]`));
  if (!match) return null;
  const url = new URL(match[1], referrer);
  return url.origin === base.origin && url.pathname === expectedPath && !url.hash ? url : null;
}
try {
  for (const [path, marker] of [['/', '<title>'], ['/reset', 'id="mode-home"'],
    ['/privacy', '<h1>Privacy policy</h1>'], ['/terms', '<h1>Terms of use</h1>']]) {
    const { response, body } = await get(path);
    result(response.status === 200 && body.includes(marker), `${path}: correct page, not a misleading 200 fallback`);
    result(response.headers.get('x-content-type-options') === 'nosniff' && response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"), `${path}: security headers`);
  }
  // Reset form moved into a mounted view in v2; verify the served module chain too.
  const app = await get('/js/app/app.js');
  let resetChain = false;
  const mountUrl = servedImport(app.body, 'mountViews', new URL('/js/app/app.js', base), '/js/app/views/mount.js');
  if (app.response.status === 200 && app.body.includes('mountViews();') && mountUrl) {
    const mount = await get('', mountUrl);
    const overlaysUrl = servedImport(mount.body, 'OVERLAYS_VIEW', mountUrl, '/js/app/views/overlays.js');
    if (mount.response.status === 200 && overlaysUrl) {
      const overlays = await get('', overlaysUrl);
      resetChain = overlays.response.status === 200 && overlays.body.includes('id="auth-form-reset-confirm"');
    }
  }
  result(resetChain, 'reset: served view module chain (rendering checked in Chrome)');
  const pricing = await get('/pricing');
  result(pricing.response.status === 301 && new URL(pricing.response.headers.get('location'), base).pathname === '/', '/pricing: 301 to /');
  const health = await get('/api/health');
  result(health.response.status === 200 && JSON.parse(health.body).db === true, 'database health');
  result(health.response.headers.get('cache-control') === 'private, no-store', 'API cache isolation');
  result((await get('/api/config/pricing')).response.status === 404, 'billing config endpoint removed');
  if (base.hostname === 'label-ninja.com') {
    const www = await get('/terms', new URL('https://www.label-ninja.com/terms?x=1'));
    result(www.response.status === 301 && www.response.headers.get('location') === 'https://label-ninja.com/terms?x=1', 'www: 301 to https apex');
    const http = await get('/terms', new URL('http://label-ninja.com/terms'));
    result([301, 308].includes(http.response.status) && http.response.headers.get('location') === 'https://label-ninja.com/terms', 'http: redirects to https apex');
  }
} catch (err) { result(false, 'HTTP check stopped: ' + err.name); }
console.log(failures ? `NOT READY: ${failures} gate(s) failed` : 'HTTP GATE PASSED (not email, capacity, or printer acceptance)');
process.exitCode = failures ? 1 : 0;
