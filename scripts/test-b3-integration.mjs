// test-b3-integration.mjs — brick 3 frontend↔backend contract proof against a
// running server (default http://127.0.0.1:8787, override with LN_BASE).
// Simulates the UI export flow EXACTLY: builder-produced spec -> POST /api/export
// -> download -> dimension check; idempotent double-click; 402 paywall body.
// Usage: node scripts/test-b3-integration.mjs
// Env:   LN_BASE (default http://127.0.0.1:8787), LN_CANARY=1 for the single
//        prod canary export (register+export+download only, burns 1 use).

import { spawnSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { buildBinSpec, buildWhatnotSpec } from '../public/js/app/spec-builders.js';

const BASE = process.env.LN_BASE || 'http://127.0.0.1:8787';
const TS = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
const PASSWORD = 'B3-Dev!Pass-123';
const MODULES = [
  '/js/app/app.js', '/js/app/api.js', '/js/app/auth-ui.js', '/js/app/bin-tool.js',
  '/js/app/editor.js', '/js/app/exporter.js', '/js/app/fnsku-tool.js', '/js/app/guides.js',
  '/js/app/paywall.js', '/js/app/presets.js', '/js/app/session.js', '/js/app/spec-builders.js',
  '/js/app/whatnot-tool.js',
];
const HASHES = [
  '#printer-setup-checklist', '#best-label-printers', '#seo-keywords',
  '#rollo-setup', '#zebra-setup', '#dymo-setup', '#pricing',
];

let failures = 0;
function ok(cond, label) {
  if (cond) console.log(`PASS ${label}`);
  else {
    failures += 1;
    console.error(`FAIL ${label}`);
  }
}
function line(s) {
  console.log(s);
}

class Client {
  constructor(name) {
    this.name = name;
    this.cookie = null;
  }
  async call(path, { method = 'GET', body, raw = false } = {}) {
    const headers = {};
    if (this.cookie) headers.Cookie = this.cookie;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of setCookies) {
      if (c.startsWith('ln_session=')) this.cookie = c.split(';')[0];
    }
    if (raw) return { status: res.status, bytes: Buffer.from(await res.arrayBuffer()), res };
    let data = null;
    try {
      data = await res.json();
    } catch {
      // non-JSON
    }
    return { status: res.status, data, res };
  }
}

async function register(name) {
  const client = new Client(name);
  const email = process.env.LN_CANARY
    ? `ln-canary-b3+${TS}@bisket.com`
    : `ln-b3-dev+${name}+${TS}@bisket.com`;
  const r = await client.call('/api/auth/register', { method: 'POST', body: { email, password: PASSWORD } });
  ok(r.status === 200 && r.data.ok, `register ${name} (${email}) -> ${r.status}`);
  if (!client.cookie) throw new Error(`no session cookie for ${name}`);
  return { client, email };
}

async function exportSpec(client, tool, spec, idemKey) {
  const payload = { idempotency_key: idemKey, format: 'pdf', ...spec };
  return client.call('/api/export', { method: 'POST', body: payload });
}

async function main() {
  line(`== Label Ninja B3 integration vs ${BASE} (${new Date().toISOString()}) ==`);

  // 1. static shell + every module URL
  const anon = new Client('anon');
  const homeRes = await fetch(BASE + '/');
  const html = await homeRes.text();
  ok(homeRes.status === 200 && html.includes('<script type="module" src="/js/app/app.js">'), 'GET / -> 200 with module tag present');
  ok(!html.includes('pdfmake') && !html.includes('tesseract'), 'GET / -> pdfmake + tesseract script tags removed');
  for (const m of MODULES) {
    const r = await fetch(BASE + m);
    ok(r.status === 200, `GET ${m} -> ${r.status}`);
  }

  // 2. hash URLs all serve the SPA document (client routing proven in test-spec-builders)
  for (const h of HASHES) {
    const r = await fetch(BASE + '/' + h);
    ok(r.status === 200, `GET /${h} -> ${r.status} (SPA doc)`);
  }

  if (process.env.LN_CANARY) {
    // Prod canary: exactly ONE export.
    const { client, email } = await register('canary');
    const spec = buildBinSpec({ prefix: 'BIN ', shelf: 'C', start: 1, end: 3, width: 4, height: 6, orientation: 'Portrait', padding: 0.18, titleSize: 0.72, barcodeHeight: 2.45, showValue: true });
    const key = `b3-canary-${TS}-${Math.random().toString(36).slice(2, 8)}`;
    const r = await exportSpec(client, 'bin', spec, key);
    ok(r.status === 200 && r.data.job.status === 'completed', `canary export -> ${r.status} job=${r.data && r.data.job ? r.data.job.id : 'n/a'}`);
    line(`   canary remaining_free_uses=${r.data.remaining_free_uses}`);
    const dl = await client.call(`/api/export/${r.data.job.id}/download`, { raw: true });
    ok(dl.status === 200 && dl.bytes.subarray(0, 4).toString() === '%PDF', `canary download -> ${dl.status} %PDF (${dl.bytes.length} bytes)`);
    mkdirSync('scratch', { recursive: true });
    const file = `scratch/b3-canary-${TS}.pdf`;
    writeFileSync(file, dl.bytes);
    const verify = spawnSync('node', ['scripts/verify-pdf.mjs', file, '288', '432', '3'], { encoding: 'utf8' });
    line(verify.stdout.trim());
    ok(verify.status === 0, 'canary verify-pdf 288x432pt x3 pages');
    line(`CANARY DONE: ${email}`);
    process.exit(failures ? 1 : 0);
  }

  // 3. register -> export -> download (builder spec, exact UI payload)
  const { client: userA } = await register('flow');
  const binSpec = buildBinSpec({
    prefix: 'BIN ', shelf: 'A', start: 1, end: 3,
    width: 4, height: 6, orientation: 'Portrait',
    padding: 0.18, titleSize: 0.72, barcodeHeight: 2.45, showValue: true,
  });
  const binKey = `b3-bin-${TS}-a1a3`;
  const first = await exportSpec(userA, 'bin', binSpec, binKey);
  ok(first.status === 200 && first.data.ok && first.data.job.status === 'completed', `POST /api/export (bin A1-A3 builder spec) -> ${first.status} job=${first.data?.job?.id}`);
  line(`   job pages=${first.data.job.output_meta.pages} ${first.data.job.output_meta.width_in}x${first.data.job.output_meta.height_in}in remaining=${first.data.remaining_free_uses}`);

  // 4. double-click sim: same key twice -> same job id, remaining unchanged
  const second = await exportSpec(userA, 'bin', binSpec, binKey);
  ok(second.status === 200 && second.data.job.id === first.data.job.id, `idempotent replay -> same job id (${second.data?.job?.id})`);
  ok(second.data.remaining_free_uses === first.data.remaining_free_uses, `idempotent replay -> remaining unchanged (${second.data.remaining_free_uses})`);

  // 5. download -> %PDF -> exact dims
  const dl = await userA.call(`/api/export/${first.data.job.id}/download`, { raw: true });
  ok(dl.status === 200 && dl.bytes.subarray(0, 4).toString() === '%PDF', `GET download -> ${dl.status} %PDF (${dl.bytes.length} bytes)`);
  mkdirSync('scratch', { recursive: true });
  const binFile = `scratch/b3-bin-${TS}.pdf`;
  writeFileSync(binFile, dl.bytes);
  const verify = spawnSync('node', ['scripts/verify-pdf.mjs', binFile, '288', '432', '3'], { encoding: 'utf8' });
  line(verify.stdout.trim().split('\n').map((l) => '   ' + l).join('\n'));
  ok(verify.status === 0, 'verify-pdf: 3 pages @ 288.00x432.00pt');

  // 6. history shows the job
  const hist = await userA.call('/api/exports?limit=50');
  ok(hist.status === 200 && hist.data.exports.some((j) => j.id === first.data.job.id), `GET /api/exports lists job (${hist.data.exports.length} rows)`);

  // 7. auth gate: signed-out export -> 401 (what the UI sees before opening the modal)
  const anonPost = await anon.call('/api/export', { method: 'POST', body: { idempotency_key: `b3-anon-${TS}`, format: 'pdf', ...binSpec } });
  ok(anonPost.status === 401, `signed-out POST /api/export -> ${anonPost.status} (UI opens auth modal)`);

  // 8. 402 flow: fresh user burns all 10 -> 11th carries upgrade_url
  const { client: userB } = await register('burner');
  let last = null;
  for (let i = 1; i <= 10; i++) {
    const spec = buildWhatnotSpec({ prefix: '#', start: i, end: i, width: 1, height: 0.5, padding: 0.02 });
    last = await exportSpec(userB, 'whatnot', spec, `b3-burn-${TS}-${i}`);
    if (last.status !== 200) break;
  }
  ok(last.status === 200 && last.data.remaining_free_uses === 0, `burned 10 exports -> remaining 0 (last status ${last.status})`);
  const eleventh = await exportSpec(userB, 'whatnot', buildWhatnotSpec({ prefix: '#', start: 99, end: 99, width: 1, height: 0.5, padding: 0.02 }), `b3-burn-${TS}-11`);
  ok(eleventh.status === 402, `11th export -> ${eleventh.status}`);
  ok(eleventh.data?.error?.code === 'free_limit_reached', `402 code=${eleventh.data?.error?.code}`);
  ok(eleventh.data?.error?.upgrade_url === '/pricing', `402 upgrade_url=${eleventh.data?.error?.upgrade_url}`);
  line(`   402 body: ${JSON.stringify(eleventh.data.error)}`);

  line(failures ? `\n${failures} FAILURE(S)` : '\nALL B3 INTEGRATION CHECKS PASSED');
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(`FATAL ${err.message}`);
  process.exit(1);
});
