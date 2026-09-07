// Public page gate is read-only. --local-export adds one synthetic LOCAL account,
// three PDFs and replay checks; it cannot mutate a remote service.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { WHATNOT_STOCKS } from '../public/js/app/presets.js';
import { buildWhatnotSpec } from '../public/js/app/spec-builders.js';
import { validateWhatnotSettings } from '../public/js/whatnot-settings.js';

const base = new URL(process.env.LN_BASE || 'http://127.0.0.1:8787');
assert.ok(['http:', 'https:'].includes(base.protocol));
const exportTest = process.argv.includes('--local-export');
if (exportTest) assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Export fixture is local-only');
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; console.log('PASS ' + message); };
const hash = value => createHash('sha256').update(value).digest('hex');
for (const path of ['/whatnot-labels', '/guides/whatnot-labels-printing-too-small',
  '/js/whatnot-settings.js', '/js/whatnot-labels.js', '/js/app/whatnot-text-fit.js',
  '/js/app/whatnot-tool.js', '/js/app/spec-builders.js', '/css/whatnot-labels.css', '/sitemap.xml']) {
  const response = await fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(10000) });
  check(response.status === 200, `${path} -> ${response.status} without redirect`);
  const file = path.includes('.') ? path : path + '.html';
  check(hash(Buffer.from(await response.arrayBuffer())) === hash(readFileSync('public' + file)), `${path}: exact source bytes, no SPA fallback`);
}
if (exportTest) {
  let cookie = '';
  async function call(path, body) {
    const headers = { Origin: base.origin };
    if (cookie) headers.Cookie = cookie;
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch(new URL(path, base), { method: body ? 'POST' : 'GET', headers,
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
    const session = response.headers.getSetCookie().find(value => value.startsWith('ln_session='));
    if (session) cookie = session.split(';')[0];
    return response;
  }
  const email = `ln-whatnot+${Date.now()}@example.com`;
  check((await call('/api/auth/register', { email, password: 'Local!' + randomUUID() })).status === 200, 'local synthetic account registered');
  let remaining = 10;
  for (const [stock, size] of Object.entries(WHATNOT_STOCKS)) {
    const settings = validateWhatnotSettings({ stock, prefix: 'Show-', start: 1, end: 3 });
    const payload = { ...buildWhatnotSpec({ ...settings, ...size }), format: 'pdf', idempotency_key: 'whatnot-' + randomUUID() };
    const response = await call('/api/export', payload);
    const result = await response.json();
    check(response.status === 200 && result.job?.status === 'completed' && result.remaining_free_uses === --remaining,
      `${stock}: 3 labels consume exactly 1 free batch`);
    const replay = await (await call('/api/export', payload)).json();
    check(replay.job.id === result.job.id && replay.remaining_free_uses === remaining, `${stock}: replay does not spend a batch`);
    const download = await call(`/api/export/${result.job.id}/download`);
    check(download.status === 200, `${stock}: authenticated PDF download`);
    const pdf = await PDFDocument.load(await download.arrayBuffer());
    check(pdf.getPageCount() === 3 && pdf.getPages().every(page =>
      page.getWidth() === size.width * 72 && page.getHeight() === size.height * 72), `${stock}: exact PDF dimensions after API export`);
  }
}
console.log(`ALL ${checks} WHATNOT HTTP CHECKS PASSED`);
