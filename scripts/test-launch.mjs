// Launch regressions: real SQLite transactions + real handlers/PDF rendering, fake provider only.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { createHmac, pbkdf2Sync } from 'node:crypto';
import worker from '../src/worker.js';
import { maintain } from '../src/maintenance.js';
import { isProActive } from '../src/entitlements.js';
import { PDFDocument } from 'pdf-lib';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec('PRAGMA foreign_keys=ON');
for (const file of readdirSync('migrations').filter(f => f.endsWith('.sql')).sort()) sqlite.exec(readFileSync('migrations/' + file, 'utf8'));
function stmt(sql, args = []) {
  const execute = () => sqlite.prepare(sql);
  return {
    sql,
    bind(...values) { return stmt(sql, values); },
    async first() { return execute().get(...args) || null; },
    async all() { return { results: execute().all(...args) }; },
    async run() { const r = execute().run(...args); return { meta: { changes: Number(r.changes) } }; },
    runSync() { const r = execute().run(...args); return { meta: { changes: Number(r.changes) } }; },
  };
}
let storageFault = null;
const DB = {
  prepare: stmt,
  async batch(statements) {
    let afterCommit = false;
    if (storageFault && statements.some(s => s.sql.includes('INSERT INTO output_chunks'))) {
      const fault = storageFault;
      storageFault = null;
      if (fault === 'before-save') throw new Error('simulated_storage_failure');
      afterCommit = fault === 'after-save';
      if (fault === 'recovery') {
        sqlite.prepare("UPDATE export_jobs SET started_at=? WHERE status='processing'").run(Date.now() - 20 * 60000);
        await maintain(env);
      }
    }
    sqlite.exec('BEGIN');
    let result;
    try { result = statements.map(s => s.runSync()); sqlite.exec('COMMIT'); }
    catch (err) { sqlite.exec('ROLLBACK'); throw err; }
    if (afterCommit) throw new Error('simulated_lost_commit_response');
    return result;
  },
};
const env = { DB, APP_ORIGIN: 'https://label-ninja.com', STRIPE_SECRET_KEY: 'sk_test_fixture_only',
  STRIPE_PRICE_MONTHLY: 'price_fixture', STRIPE_WEBHOOK_SECRET: 'fixture_webhook_only',
  ASSETS: { fetch: async () => new Response('local asset') } };
const originalFetch = globalThis.fetch;
const calls = [];
const providerKeys = new Map();
let sub = null;
let providerUnavailable = false;
let priceAmount = 999;
let checkoutStatus = 'open';
let mailUrl = null;
globalThis.fetch = async (url, init = {}) => {
  if (String(url) === 'https://api.resend.com/emails') {
    const payload = JSON.parse(init.body);
    mailUrl = payload.text.match(/https:\/\/[^\s]+/)[0];
    return Response.json({ id: 'mail_fixture' });
  }
  assert.equal(new URL(url).origin, 'https://api.stripe.com');
  calls.push({ url: String(url), method: init.method, key: init.headers['Idempotency-Key'], body: init.body });
  if (providerUnavailable) throw new Error('simulated_provider_outage');
  const path = new URL(url).pathname;
  if (path.startsWith('/v1/prices/')) return Response.json({ unit_amount: priceAmount, currency: 'usd', type: 'recurring',
    recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' }, active: true,
    product: { active: true }, billing_scheme: 'per_unit', livemode: false });
  if (path === '/v1/customers') return Response.json({ id: 'cus_fixture' });
  if (path === '/v1/subscriptions') return Response.json({ data: sub ? [sub] : [], has_more: false });
  if (path.startsWith('/v1/subscriptions/')) return Response.json(sub);
  if (path === '/v1/checkout/sessions') {
    assert.ok(init.headers['Idempotency-Key']);
    if (!providerKeys.has(init.headers['Idempotency-Key'])) providerKeys.set(init.headers['Idempotency-Key'], { id: 'cs_fixture', url: 'https://checkout.stripe.com/fixture' });
    return Response.json(providerKeys.get(init.headers['Idempotency-Key']));
  }
  if (path === '/v1/checkout/sessions/cs_fixture') return Response.json({ id: 'cs_fixture', status: checkoutStatus,
    url: 'https://checkout.stripe.com/fixture', customer: 'cus_fixture', subscription: sub?.id, client_reference_id: owner?.id });
  if (path === '/v1/billing_portal/sessions') return Response.json({ url: 'https://billing.stripe.com/fixture' });
  throw new Error('unexpected_mock_path');
};
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; console.log('PASS ' + message); }
async function call(path, { method = 'GET', body, cookie, headers = {}, targetEnv = env } = {}) {
  const h = { ...headers };
  if (cookie) h.Cookie = cookie;
  if (body !== undefined) h['Content-Type'] ??= 'application/json';
  const response = await worker.fetch(new Request('https://label-ninja.com' + path, {
    method, headers: h, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  }), targetEnv, {});
  let data = null;
  if (response.headers.get('content-type')?.includes('application/json')) data = await response.clone().json();
  return { response, status: response.status, data };
}
async function user(label) {
  const r = await call('/api/auth/register', { method: 'POST', body: { email: label + '@example.test', password: 'fixture-Password-123!' } });
  assert.equal(r.status, 200);
  return { id: r.data.user.id, cookie: r.response.headers.get('set-cookie').split(';')[0] };
}
function spec(key, pages = 1) {
  return { tool: 'bin', format: 'pdf', idempotency_key: key,
    pages: Array.from({ length: pages }, () => ({ width_in: 4, height_in: 6,
      elements: [{ type: 'text', text: 'Launch test', x_in: 0.2, y_in: 0.2, font_size_pt: 12 }] })) };
}
const usage = who => sqlite.prepare("SELECT COALESCE(SUM(CASE WHEN kind='export' THEN 1 ELSE 0 END),0) n FROM usage_ledger WHERE user_id=?").get(who.id).n;
let owner;
async function event(type, created, overrides = {}, eventId = 'evt_' + crypto.randomUUID().replaceAll('-', '')) {
  const object = type.startsWith('customer.subscription.') ? { id: sub.id, customer: sub.customer } :
    type === 'checkout.session.completed' ? { subscription: sub.id, customer: sub.customer } :
    { parent: { subscription_details: { subscription: sub.id } }, customer: sub.customer };
  const body = JSON.stringify({ id: eventId, type, created, livemode: false, data: { object }, ...overrides });
  const timestamp = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(timestamp + '.' + body).digest('hex');
  return call('/api/webhooks/stripe', { method: 'POST', body, headers: { 'Stripe-Signature': 't=' + timestamp + ',v1=' + sig } });
}
try {
  owner = await user('owner');
  const stranger = await user('stranger');
  check(sqlite.prepare('SELECT password_hash FROM users WHERE id=?').get(owner.id).password_hash.startsWith('pbkdf2$600000$'), 'new passwords use 600000 PBKDF2 iterations');
  const oldSalt = Buffer.alloc(16, 7);
  const oldHash = 'pbkdf2$100000$' + oldSalt.toString('base64') + '$' + pbkdf2Sync('fixture-Password-123!', oldSalt, 100000, 32, 'sha256').toString('base64');
  sqlite.prepare('UPDATE users SET password_hash=? WHERE id=?').run(oldHash, stranger.id);
  check((await call('/api/auth/login', { method: 'POST', body: { email: 'stranger@example.test', password: 'fixture-Password-123!' } })).status === 200 &&
    sqlite.prepare('SELECT password_hash FROM users WHERE id=?').get(stranger.id).password_hash.startsWith('pbkdf2$600000$'), 'legacy login upgrades password hash without locking account out');
  check((await call('/api/auth/me', { cookie: owner.cookie })).response.headers.get('cache-control') === 'private, no-store', 'account responses never cache');
  check((await call('/api/auth/logout', { method: 'POST', cookie: owner.cookie, headers: { Origin: 'https://evil.test' } })).status === 403, 'cross-origin mutation denied');
  check((await call('/api/auth/login', { method: 'POST', body: 'null' })).status === 400, 'JSON null rejected cleanly');
  check((await call('/api/auth/login', { method: 'POST', body: '{}', headers: { 'Content-Type': 'text/plain' } })).status === 415, 'simple form cross-origin content type denied');
  const huge = JSON.stringify({ x: 'é'.repeat(60000) });
  check((await call('/api/auth/login', { method: 'POST', body: huge })).status === 413, 'UTF-8 byte cap, not character cap');
  const bomb = spec('oversized-image');
  const pngHeader = Buffer.alloc(33);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(pngHeader);
  pngHeader.writeUInt32BE(13, 8); pngHeader.write('IHDR', 12);
  pngHeader.writeUInt32BE(100000, 16); pngHeader.writeUInt32BE(100000, 20);
  bomb.pages[0].elements = [{ type: 'image', mime: 'image/png', data_base64: pngHeader.toString('base64'), x_in:0, y_in:0, w_in:1, h_in:1 }];
  check((await call('/api/export', { method:'POST', cookie:owner.cookie, body:bomb })).status === 400 && usage(owner) === 0, 'oversized decoded image rejected before credit reservation');
  let exported = await call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('first-batch', 3) });
  check(exported.status === 200 && usage(owner) === 1, 'three label pages consume one PDF batch');
  const jobId = exported.data.job.id;
  const pdf = await call('/api/export/' + jobId + '/download', { cookie: owner.cookie });
  const doc = await PDFDocument.load(await pdf.response.arrayBuffer());
  check(doc.getPageCount() === 3 && doc.getPage(0).getWidth() === 288 && doc.getPage(0).getHeight() === 432, 'real PDF stays exactly 4 by 6 inches');
  const replay = await call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('first-batch', 3) });
  check(replay.status === 200 && replay.data.job.id === jobId && usage(owner) === 1, 'same batch replay has no second charge');
  check((await call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('first-batch', 4) })).status === 409, 'different content cannot reuse an idempotency key');
  check((await call('/api/export/' + jobId + '/download', { cookie: stranger.cookie })).status === 404, 'PDF ownership enforced');
  await call('/api/export/' + jobId, { method: 'DELETE', cookie: owner.cookie });
  check((await call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('first-batch', 3) })).status === 410 && usage(owner) === 1, 'deleted PDF never refunds its batch');
  const simultaneous = await Promise.all(Array.from({ length: 4 }, () => call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('simultaneous') })));
  check(simultaneous.filter(r => r.status === 200).length >= 1 && simultaneous.every(r => [200, 409].includes(r.status)) && usage(owner) === 2, 'concurrent same-key exports reserve exactly once');
  for (let i = 2; i < 10; i++) assert.equal((await call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('batch-credit-' + i) })).status, 200);
  check((await call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('eleventh') })).status === 402 && usage(owner) === 10, '11th batch denied with exactly 10 credits used');
  sqlite.prepare('UPDATE users SET free_uses_granted=1 WHERE id=?').run(stranger.id);
  const race = await Promise.all(['race-one', 'race-two'].map(key => call('/api/export', { method: 'POST', cookie: stranger.cookie, body: spec(key) })));
  check(race.map(r => r.status).sort().join(',') === '200,402' && usage(stranger) === 1, 'last free credit is atomic across different keys');

  const price = await call('/api/config/pricing');
  check(price.data.configured && price.data.monthly.amount === 999 && !price.data.annual, 'monthly-only $9.99 Stripe contract');
  priceAmount = 1500;
  check(!(await call('/api/config/pricing')).data.configured, 'wrong Stripe price fails closed');
  priceAmount = 999;
  check((await call('/api/billing/checkout', { method: 'POST', cookie: owner.cookie, body: { plan: 'annual' } })).status === 400, 'annual checkout rejected');
  const checkouts = await Promise.all([1, 2].map(() => call('/api/billing/checkout', { method: 'POST', cookie: owner.cookie, body: { plan: 'monthly' } })));
  check(checkouts.every(r => r.status === 200) && providerKeys.size === 1, 'concurrent checkout uses one Stripe session key');
  check(calls.filter(c => c.url.endsWith('/v1/customers')).every(c => c.key === 'ln-customer-' + owner.id), 'customer creation idempotent');
  const checkoutParams = new URLSearchParams(calls.find(c => c.url.endsWith('/v1/checkout/sessions')).body);
  check(checkoutParams.get('success_url').startsWith(env.APP_ORIGIN + '/billing?'), 'checkout returns only to canonical app origin');
  check(checkoutParams.get('consent_collection[terms_of_service]') === 'required', 'paid checkout requires terms consent');
  check((await call('/api/billing/confirm', { method: 'POST', cookie: stranger.cookie, body: { session_id: 'cs_fixture' } })).status === 404, 'checkout confirmation scoped to customer and user');
  const epoch = Math.floor(Date.now() / 1000);
  sub = { id: 'sub_fixture', customer: 'cus_fixture', status: 'active', created: epoch - 10, cancel_at_period_end: false,
    items: { data: [{ price: { id: 'price_fixture' }, current_period_end: epoch + 2592000 }] },
    latest_invoice: { status: 'paid' } };
  check((await event('customer.subscription.created', epoch)).status === 200, 'signed subscription created event reconciles');
  check((await call('/api/auth/me', { cookie: owner.cookie })).data.user.free_uses.unlimited, 'paid subscription unlocks Pro');
  check((await call('/api/billing/checkout', { method: 'POST', cookie: owner.cookie, body: { plan: 'monthly' } })).status === 409, 'existing subscription cannot be purchased twice');
  check((await call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('pro-batch') })).status === 200 && usage(owner) === 10, 'Pro exports do not consume old free allowance');
  const paidBefore = sqlite.prepare('SELECT paid_through FROM users WHERE id=?').get(owner.id).paid_through;
  sub = { ...sub, status: 'past_due', items: { data: [{ price: { id: 'price_fixture' }, current_period_end: epoch + 5184000 }] }, latest_invoice: { status: 'open' } };
  await event('invoice.payment_failed', epoch + 1);
  check(sqlite.prepare('SELECT paid_through FROM users WHERE id=?').get(owner.id).paid_through === paidBefore, 'failed renewal does not extend paid-through date');
  sub = { ...sub, status: 'canceled' };
  await event('customer.subscription.deleted', epoch + 2);
  check((await call('/api/auth/me', { cookie: owner.cookie })).data.user.free_uses.unlimited, 'cancellation retains access through paid period');
  const stale = await event('customer.subscription.updated', epoch - 1);
  check(stale.data.result === 'stale_event_ignored', 'older events cannot regress subscription state');
  const dupId = 'evt_duplicate_fixture';
  await event('invoice.payment_failed', epoch + 3, {}, dupId);
  check((await event('invoice.payment_failed', epoch + 3, {}, dupId)).data.duplicate, 'completed webhook replay acknowledged without reprocessing');
  providerUnavailable = true;
  check((await event('customer.subscription.updated', epoch + 4, {}, 'evt_retry_fixture')).status === 503, 'provider failure asks Stripe to retry');
  providerUnavailable = false;
  check((await event('customer.subscription.updated', epoch + 4, {}, 'evt_retry_fixture')).status === 200, 'failed webhook delivery can recover');
  check((await event('customer.subscription.updated', epoch + 5, { livemode: true })).status === 400, 'test and live webhook modes cannot mix');
  check((await call('/api/webhooks/stripe', { method: 'POST', body: { fake: true } })).status === 400, 'unsigned webhook denied');
  sqlite.prepare('INSERT INTO webhook_events(event_id,type,payload_json,processed_at,result) VALUES (?,?,?,?,?)').run('evt_busy', 'customer.subscription.updated', '{}', Date.now(), 'processing:other');
  check((await event('customer.subscription.updated', epoch + 6, {}, 'evt_busy')).status === 503, 'concurrent webhook delivery receives retryable status');
  sqlite.prepare('UPDATE webhook_events SET processed_at=? WHERE event_id=?').run(Date.now() - 61000, 'evt_busy');
  check((await event('customer.subscription.updated', epoch + 6, {}, 'evt_busy')).status === 200, 'abandoned webhook lease recovers');
  const originalItems = sub.items;
  sub.items = { data: [{ price: { id: 'price_different_product' } }] };
  check((await event('customer.subscription.updated', epoch + 7)).data.result === 'other_product_ignored', 'another product cannot grant Label Ninja access');
  sub.items = originalItems;
  sqlite.prepare("UPDATE users SET paid_through=?, subscription_status='active' WHERE id=?").run(Date.now() - 1000, owner.id);
  check(!(await call('/api/auth/me', { cookie: owner.cookie })).data.user.free_uses.unlimited, 'missed renewal webhook cannot grant forever');
  check(usage(owner) === 10 && (await call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('after-cancel') })).status === 402, 'expired Pro retains consumed free quota');
  check(!isProActive({ subscription_status: 'unpaid', paid_through: Date.now() + 50000 }), 'unpaid subscription denied');
  checkoutStatus = 'complete';
  check((await call('/api/billing/checkout', { method: 'POST', cookie: owner.cookie, body: { plan: 'monthly' } })).status === 200 && providerKeys.size === 2, 'completed checkout permits a new purchase after canceled paid access ends');
  check((await call('/api/billing/portal', { method: 'POST', cookie: owner.cookie, body: '', headers: { 'Content-Type': '' } })).status === 200, 'bodyless billing portal POST works through browser guard');

  const project = await call('/api/projects', { method: 'POST', cookie: stranger.cookie, body: { name: '<img src=x onerror=alert(1)>', tool: 'bin', data: { values: {} } } });
  check(project.status === 200, 'project name retained as data');
  check((await call('/api/projects/' + project.data.project.id, { cookie: owner.cookie })).status === 404, 'project ownership enforced');
  check((await call('/api/auth/reset-request', { method: 'POST', body: { email: 'owner@example.test' } })).status === 503, 'missing mail provider explicitly disables reset without logging tokens');
  const mailEnv = { ...env, RESEND_API_KEY: 'mail_fixture_only', EMAIL_FROM: 'Label Ninja <support@example.test>' };
  check((await call('/api/auth/reset-request', { method: 'POST', body: { email: 'owner@example.test' }, targetEnv: mailEnv })).status === 200, 'reset uses configured mail provider');
  const token = new URL(mailUrl).searchParams.get('token');
  check(new URL(mailUrl).origin === env.APP_ORIGIN, 'password reset uses canonical origin');
  const resets = await Promise.all([1, 2].map(() => call('/api/auth/reset-confirm', { method: 'POST', body: { token, new_password: 'new-Fixture-Password-123!' } })));
  check(resets.map(r => r.status).sort().join(',') === '200,400', 'reset token is single-use even under concurrent requests');
  check((await call('/api/auth/me', { cookie: owner.cookie })).status === 401, 'password reset revokes all sessions');

  const faultUser = await user('storage-faults');
  storageFault = 'before-save';
  check((await call('/api/export', { method: 'POST', cookie: faultUser.cookie, body: spec('failed-storage') })).status === 500 && usage(faultUser) === 0, 'storage failure returns its reserved credit');
  storageFault = 'after-save';
  check((await call('/api/export', { method: 'POST', cookie: faultUser.cookie, body: spec('lost-response') })).status === 200 && usage(faultUser) === 1, 'lost commit response preserves a completed PDF and charge');
  storageFault = 'recovery';
  check((await call('/api/export', { method: 'POST', cookie: faultUser.cookie, body: spec('recovered-render') })).status === 500 && usage(faultUser) === 1, 'late renderer cannot resurrect a recovered free export');
  const recovered = sqlite.prepare("SELECT id FROM export_jobs WHERE user_id=? AND idempotency_key='recovered-render'").get(faultUser.id);
  check(!sqlite.prepare('SELECT 1 FROM output_chunks WHERE job_id=?').get(recovered.id), 'recovered job retains no PDF bytes');
  sqlite.prepare("UPDATE export_jobs SET expires_at=? WHERE status='completed'").run(Date.now() - 1000);
  const creditsBefore = usage(stranger);
  await maintain(env);
  await maintain(env); // Each run expires at most ten jobs; this fixture has more.
  check(sqlite.prepare('SELECT 1 FROM output_chunks LIMIT 1').get() === undefined, 'scheduled expiry removes PDF bytes');
  check(usage(stranger) === creditsBefore, 'scheduled expiry preserves consumed credits');
  check(readFileSync('public/js/app/dashboard.js', 'utf8').includes('escapeHtml(p.name)'), 'saved project names escaped at HTML sink');
  check((await call('/api/auth/logout', { method:'POST', cookie:faultUser.cookie, body:'', headers:{'Content-Type':''} })).status === 200 &&
    (await call('/api/auth/me', {cookie:faultUser.cookie})).status === 401, 'bodyless browser sign-out revokes the session');
  console.log('\nALL ' + checks + ' LAUNCH REGRESSION CHECKS PASSED');
} finally { globalThis.fetch = originalFetch; sqlite.close(); }
