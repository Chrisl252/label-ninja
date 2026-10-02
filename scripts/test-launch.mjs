// Launch regressions: real SQLite transactions + real handlers/PDF rendering, fake mail provider only.
// Everything is free: no quota, no billing. Abuse limits (30 exports/hour, 200 pages/batch) still apply.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { pbkdf2Sync } from 'node:crypto';
import worker from '../src/worker.js';
import { maintain } from '../src/maintenance.js';
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
const env = { DB, APP_ORIGIN: 'https://label-ninja.com',
  ASSETS: { fetch: async () => new Response('local asset') } };
const originalFetch = globalThis.fetch;
let mailUrl = null;
globalThis.fetch = async (url, init = {}) => {
  if (String(url) === 'https://api.resend.com/emails') {
    const payload = JSON.parse(init.body);
    mailUrl = payload.text.match(/https:\/\/[^\s]+/)[0];
    return Response.json({ id: 'mail_fixture' });
  }
  throw new Error('unexpected_external_fetch ' + new URL(url).origin);
};
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; console.log('PASS ' + message); }
async function call(path, { method = 'GET', body, cookie, headers = {}, targetEnv = env, origin = 'https://label-ninja.com' } = {}) {
  const h = { ...headers };
  if (cookie) h.Cookie = cookie;
  if (body !== undefined) h['Content-Type'] ??= 'application/json';
  const response = await worker.fetch(new Request(origin + path, {
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
const ledgerRows = who => sqlite.prepare("SELECT COALESCE(SUM(CASE WHEN kind='export' THEN 1 ELSE 0 END),0) n FROM usage_ledger WHERE user_id=?").get(who.id).n;
let owner;
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
  check((await call('/api/export', { method:'POST', cookie:owner.cookie, body:bomb })).status === 400 && ledgerRows(owner) === 0, 'oversized decoded image rejected before rendering');
  let exported = await call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('first-batch', 3) });
  check(exported.status === 200 && exported.data.job.status === 'completed' && ledgerRows(owner) === 0 && !('remaining_free_uses' in exported.data), 'free export completes with no credit ledger and no allowance field');
  const jobId = exported.data.job.id;
  const pdf = await call('/api/export/' + jobId + '/download', { cookie: owner.cookie });
  const doc = await PDFDocument.load(await pdf.response.arrayBuffer());
  check(doc.getPageCount() === 3 && doc.getPage(0).getWidth() === 288 && doc.getPage(0).getHeight() === 432, 'real PDF stays exactly 4 by 6 inches');
  const replay = await call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('first-batch', 3) });
  check(replay.status === 200 && replay.data.job.id === jobId && ledgerRows(owner) === 0, 'same batch replay returns the same job');
  check((await call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('first-batch', 4) })).status === 409, 'different content cannot reuse an idempotency key');
  check((await call('/api/export/' + jobId + '/download', { cookie: stranger.cookie })).status === 404, 'PDF ownership enforced');
  await call('/api/export/' + jobId, { method: 'DELETE', cookie: owner.cookie });
  check((await call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('first-batch', 3) })).status === 410 && ledgerRows(owner) === 0, 'deleted PDF cannot be resurrected by key replay');
  const simultaneous = await Promise.all(Array.from({ length: 4 }, () => call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('simultaneous') })));
  check(simultaneous.filter(r => r.status === 200).length >= 1 && simultaneous.every(r => [200, 409].includes(r.status)) && sqlite.prepare("SELECT COUNT(*) n FROM export_jobs WHERE user_id=? AND idempotency_key='simultaneous'").get(owner.id).n === 1, 'concurrent same-key exports create exactly one job');
  for (let i = 2; i < 12; i++) assert.equal((await call('/api/export', { method: 'POST', cookie: owner.cookie, body: spec('batch-free-' + i) })).status, 200);
  check(sqlite.prepare("SELECT COUNT(*) n FROM export_jobs WHERE user_id=? AND status='completed'").get(owner.id).n >= 11 && ledgerRows(owner) === 0, 'eleventh and later batches stay free (no 402 paywall)');
  sqlite.prepare('UPDATE users SET free_uses_granted=0 WHERE id=?').run(stranger.id);
  check((await call('/api/export', { method: 'POST', cookie: stranger.cookie, body: spec('legacy-zero-allowance') })).status === 200, 'old free_uses_granted column no longer gates exports');
  check((await call('/api/export', { method: 'POST', cookie: stranger.cookie, body: spec('too-many-pages', 201) })).status === 400, '201-page batch rejected by the 200 pages/batch abuse limit');
  const me = (await call('/api/auth/me', { cookie: owner.cookie })).data.user;
  check(me.plan === 'free' && me.unlimited === true && !('free_uses' in me) && !('subscription' in me), '/api/auth/me returns plan free + unlimited, no billing fields');
  const hourWindow = Math.floor(Date.now() / 3600000);
  sqlite.prepare('INSERT OR REPLACE INTO rate_limits (key, count, window_start) VALUES (?, 30, ?)').run('export:' + stranger.id + ':' + hourWindow, hourWindow);
  const limited = await call('/api/export', { method: 'POST', cookie: stranger.cookie, body: spec('thirty-first') });
  check(limited.status === 429 && limited.data.error.code === 'rate_limited' && limited.response.headers.get('retry-after'), '31st export in an hour is rate limited (429 + Retry-After)');
  for (const [path, method] of [['/api/config/pricing', 'GET'], ['/api/billing/checkout', 'POST'], ['/api/billing/portal', 'POST'], ['/api/billing/confirm', 'POST'], ['/api/webhooks/stripe', 'POST']]) {
    const r = await call(path, { method, cookie: owner.cookie, body: method === 'POST' ? {} : undefined });
    check(r.status === 404, method + ' ' + path + ' removed (404)');
  }
  check((await call('/api/webhooks/stripe', { method: 'POST', body: '{}', headers: { Origin: 'https://evil.test' } })).status === 403, 'former webhook path no longer bypasses the same-origin guard');

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
  check((await call('/api/export', { method: 'POST', cookie: faultUser.cookie, body: spec('failed-storage') })).status === 500 && ledgerRows(faultUser) === 0, 'storage failure leaves no ledger row');
  storageFault = 'after-save';
  check((await call('/api/export', { method: 'POST', cookie: faultUser.cookie, body: spec('lost-response') })).status === 200 && ledgerRows(faultUser) === 0, 'lost commit response preserves a completed PDF');
  storageFault = 'recovery';
  check((await call('/api/export', { method: 'POST', cookie: faultUser.cookie, body: spec('recovered-render') })).status === 500 && ledgerRows(faultUser) === 0, 'late renderer cannot resurrect a recovered export');
  const recovered = sqlite.prepare("SELECT id FROM export_jobs WHERE user_id=? AND idempotency_key='recovered-render'").get(faultUser.id);
  check(!sqlite.prepare('SELECT 1 FROM output_chunks WHERE job_id=?').get(recovered.id), 'recovered job retains no PDF bytes');
  sqlite.prepare("UPDATE export_jobs SET expires_at=? WHERE status='completed'").run(Date.now() - 1000);
  const jobsBefore = sqlite.prepare('SELECT COUNT(*) n FROM export_jobs').get().n;
  await maintain(env);
  await maintain(env); // Each run expires at most ten jobs; this fixture has more.
  check(sqlite.prepare('SELECT 1 FROM output_chunks LIMIT 1').get() === undefined, 'scheduled expiry removes PDF bytes');
  check(sqlite.prepare('SELECT COUNT(*) n FROM export_jobs').get().n === jobsBefore, 'scheduled expiry keeps job audit rows');
  check(readFileSync('public/js/app/dashboard.js', 'utf8').includes('escapeHtml(p.name)'), 'saved project names escaped at HTML sink');
  check((await call('/api/auth/logout', { method:'POST', cookie:faultUser.cookie, body:'', headers:{'Content-Type':''} })).status === 200 &&
    (await call('/api/auth/me', {cookie:faultUser.cookie})).status === 401, 'bodyless browser sign-out revokes the session');
  // Canonical host + retired pricing page (worker runs first for every request).
  const www = await call('/guides/x?a=1', { origin: 'https://www.label-ninja.com' });
  check(www.status === 301 && www.response.headers.get('location') === 'https://label-ninja.com/guides/x?a=1', 'www host 301s to apex with path + query');
  const plain = await call('/terms?b=2', { origin: 'http://label-ninja.com' });
  check(plain.status === 301 && plain.response.headers.get('location') === 'https://label-ninja.com/terms?b=2', 'http 301s to https apex');
  const wwwHttp = await call('/', { origin: 'http://www.label-ninja.com' });
  check(wwwHttp.status === 301 && wwwHttp.response.headers.get('location') === 'https://label-ninja.com/', 'http www 301s to https apex in one hop');
  const wwwPost = await call('/api/auth/login', { method: 'POST', body: {}, origin: 'https://www.label-ninja.com' });
  check(wwwPost.status === 308 && wwwPost.response.headers.get('location') === 'https://label-ninja.com/api/auth/login', 'non-GET on www uses 308 to keep method and body');
  check((await call('/', { method: 'HEAD', origin: 'https://www.label-ninja.com' })).status === 301, 'HEAD on www 301s');
  check((await call('/api/health', { origin: 'http://127.0.0.1:8787' })).status === 200 && (await call('/', { origin: 'http://localhost:8787' })).status === 200, 'local dev hosts are never redirected');
  check((await call('/')).status === 200, 'canonical https apex serves directly');
  for (const path of ['/pricing', '/pricing/', '/pricing.html']) {
    const p = await call(path + '?ref=x');
    check(p.status === 301 && p.response.headers.get('location') === 'https://label-ninja.com/?ref=x', path + ' 301s to /');
  }
  const pw = await call('/pricing', { origin: 'https://www.label-ninja.com' });
  check(pw.status === 301 && pw.response.headers.get('location') === 'https://label-ninja.com/pricing', 'www /pricing canonicalizes first, then /pricing 301s home');
  console.log('\nALL ' + checks + ' LAUNCH REGRESSION CHECKS PASSED');
} finally { globalThis.fetch = originalFetch; sqlite.close(); }
