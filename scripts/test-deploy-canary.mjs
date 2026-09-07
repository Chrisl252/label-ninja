// Explicit production gate: one synthetic account, two PDF batches and one owned project.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { buildBinSpec } from '../public/js/app/spec-builders.js';

const base = new URL(process.env.LN_BASE || 'http://127.0.0.1:8787');
const local = ['localhost', '127.0.0.1'].includes(base.hostname);
if (!local && (!process.argv.includes('--allow-production') ||
    !['https://label-ninja.com', 'https://www.label-ninja.com'].includes(base.origin))) {
  throw new Error('Production mutations require --allow-production and the known Label Ninja origin');
}
const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const email = `ln-release+${stamp}@bisket.com`;
const password = 'Canary!' + randomUUID();
let cookie = '';
let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; console.log('PASS ' + label); };
async function call(path, method = 'GET', body) {
  const headers = { Origin: base.origin };
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const started = performance.now();
  const response = await fetch(new URL(path, base), { method, headers, redirect: 'manual',
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const setCookie = response.headers.getSetCookie().find(value => value.startsWith('ln_session='));
  if (setCookie) cookie = setCookie.split(';')[0];
  const data = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;
  return { response, data, status: response.status, ms: Math.round(performance.now() - started) };
}
function binSpec(pages) {
  return buildBinSpec({ prefix: 'RELEASE ', shelf: 'A', start: 1, end: pages, width: 4, height: 6,
    orientation: 'Portrait', padding: 0.18, titleSize: 0.72, barcodeHeight: 2.45, showValue: true });
}
async function pdfCheck(job, pages) {
  const result = await call(`/api/export/${job.id}/download`);
  check(result.status === 200, `${pages}-page PDF download`);
  const pdf = await PDFDocument.load(await result.response.arrayBuffer());
  check(pdf.getPageCount() === pages && pdf.getPages().every(p => p.getWidth() === 288 && p.getHeight() === 432),
    `${pages} pages, every page exactly 4x6 inches`);
}
try {
  const registered = await call('/api/auth/register', 'POST', { email, password });
  check(registered.status === 200, `register (${registered.ms} ms)`);
  const fresh = await call('/api/auth/me');
  check(fresh.status === 200 && fresh.data.user.free_uses.remaining === 10, 'new account has ten batches');
  check((await call('/api/auth/logout', 'POST')).status === 200, 'bodyless sign-out');
  check((await call('/api/auth/me')).status === 401, 'signed-out session denied');
  check((await call('/api/auth/login', 'POST', { email, password: 'wrong-password-fixture' })).status === 401, 'wrong password denied');
  const login = await call('/api/auth/login', 'POST', { email, password });
  check(login.status === 200, `sign-in (${login.ms} ms)`);
  const payload = { ...binSpec(3), format: 'pdf', idempotency_key: 'release-' + randomUUID() };
  const exported = await call('/api/export', 'POST', payload);
  check(exported.status === 200 && exported.data.job.status === 'completed' && exported.data.remaining_free_uses === 9,
    `three pages consume one batch (${exported.ms} ms)`);
  const replayed = await call('/api/export', 'POST', payload);
  check(replayed.status === 200 && replayed.data.job.id === exported.data.job.id && replayed.data.remaining_free_uses === 9,
    'duplicate request does not consume another batch');
  await pdfCheck(exported.data.job, 3);
  const maximum = await call('/api/export', 'POST', { ...binSpec(200), format: 'pdf', idempotency_key: 'release-max-' + randomUUID() });
  check(maximum.status === 200 && maximum.data.remaining_free_uses === 8, `200-page batch succeeds (${maximum.ms} ms)`);
  await pdfCheck(maximum.data.job, 200);
  const saved = await call('/api/projects', 'POST', { name: 'Release smoke fixture', tool: 'bin', data: { prefix: 'RELEASE ' } });
  check(saved.status === 200, 'save project');
  const projectId = saved.data.project.id;
  const opened = await call('/api/projects/' + projectId);
  check(opened.status === 200 && opened.data.project.data.prefix === 'RELEASE ', 'reopen saved project');
  check((await call('/api/projects/' + projectId, 'DELETE')).status === 200, 'remove only the synthetic project');
  check((await call('/api/auth/logout', 'POST')).status === 200, 'final sign-out');
  if (process.env.LN_LEGACY_EMAIL) {
    assert.match(process.env.LN_LEGACY_EMAIL, /^ln-canary-b3\+\d{14}@bisket\.com$/);
    check((await call('/api/auth/login', 'POST', { email: process.env.LN_LEGACY_EMAIL, password: 'B3-Dev!Pass-123' })).status === 200,
      'previous-release synthetic account still signs in');
    await call('/api/auth/logout', 'POST');
  }
  console.log(`ALL ${checks} DEPLOY CANARY CHECKS PASSED; synthetic account ${email}; no payment or email sent`);
} catch (error) {
  console.error('DEPLOY CANARY FAILED:', error.message);
  process.exitCode = 1;
}
