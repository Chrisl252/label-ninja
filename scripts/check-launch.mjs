// Read-only HTTP gate. Never creates users, projects, or PDF jobs. Everything is free (2026-10-01).
const base = new URL(process.env.LN_BASE || 'http://127.0.0.1:8787');
let failures = 0;
function result(passed, label) { console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`); if (!passed) failures++; }
async function get(path, url = new URL(path, base)) {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
  return { response, body: await response.text() };
}
try {
  for (const [path, marker] of [['/', '<title>'], ['/reset', 'auth-form-reset-confirm'],
    ['/privacy', '<h1>Privacy policy</h1>'], ['/terms', '<h1>Service terms</h1>']]) {
    const { response, body } = await get(path);
    result(response.status === 200 && body.includes(marker), `${path}: correct page, not a misleading 200 fallback`);
    result(response.headers.get('x-content-type-options') === 'nosniff' && response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"), `${path}: security headers`);
  }
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
