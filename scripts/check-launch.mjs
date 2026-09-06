// Read-only HTTP gate. Never creates users, payments, projects, or PDF jobs.
const base = new URL(process.env.LN_BASE || 'http://127.0.0.1:8787');
const requireLive = process.argv.includes('--require-live-billing');
let failures = 0;
function result(passed, label) { console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`); if (!passed) failures++; }
async function get(path) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(12000) });
  return { response, body: await response.text() };
}
try {
  for (const [path, marker] of [['/', '10 Free PDF Batches'], ['/pricing', 'pricing-mount'],
    ['/billing', 'account-mount'], ['/reset', 'auth-form-reset-confirm'], ['/privacy', '<h1>Privacy policy</h1>'],
    ['/terms', '<h1>Service terms</h1>']]) {
    const { response, body } = await get(path);
    result(response.status === 200 && body.includes(marker), `${path}: correct page, not a misleading 200 fallback`);
    result(response.headers.get('x-content-type-options') === 'nosniff' && response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"), `${path}: security headers`);
  }
  const health = await get('/api/health');
  result(health.response.status === 200 && JSON.parse(health.body).db === true, 'database health');
  result(health.response.headers.get('cache-control') === 'private, no-store', 'API cache isolation');
  const { response, body } = await get('/api/config/pricing');
  const price = JSON.parse(body);
  result(response.status === 200 && price.monthly?.amount === 999 && price.monthly?.currency === 'usd' && price.monthly?.interval === 'month' && price.free_batches === 10 && !price.annual, '10 batches + $9.99/month contract');
  console.log(`Billing configured=${price.configured === true}, mode=${price.mode || 'unknown'}`);
  if (requireLive) result(price.configured === true && price.mode === 'live', 'live Stripe price configured (payment lifecycle still needs an end-to-end test)');
} catch (err) { result(false, 'HTTP check stopped: ' + err.name); }
console.log(failures ? `NOT READY: ${failures} gate(s) failed` : 'HTTP GATE PASSED (not payment, email, capacity, or printer acceptance)');
process.exitCode = failures ? 1 : 0;
