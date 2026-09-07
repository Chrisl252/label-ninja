// Bundle the actual password module; compare with Node's independent native oracle.
// LN_CRYPTO_PROBE=http://127.0.0.1:8798 exercises the same worker on Cloudflare.
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
const expected = pbkdf2Sync('runtime-fixture', Buffer.alloc(16, 7), 600000, 32, 'sha256').toString('hex');
let runtime;
try {
  const started = performance.now();
  let response;
  if (process.env.LN_CRYPTO_PROBE) {
    response = await fetch(process.env.LN_CRYPTO_PROBE, { signal: AbortSignal.timeout(20000) });
  } else {
    const bundled = await build({ entryPoints: ['scripts/password-runtime-worker.js'], bundle: true,
      write: false, format: 'esm', platform: 'browser' });
    runtime = new Miniflare(convertV4MiniflareOptions({ modules: true, compatibilityDate: '2024-09-23',
      compatibilityFlags: ['nodejs_compat'], script: bundled.outputFiles[0].text }));
    response = await runtime.dispatchFetch('http://local.test/');
  }
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.iterations, 600000);
  assert.equal(data.key, expected);
  assert.equal(data.roundTrip, true);
  assert.equal(data.rejectsWrong, true);
  assert.equal(data.legacy, true);
  console.log('PASS ' + (process.env.LN_CRYPTO_PROBE ? 'Cloudflare remote' : 'local workerd') +
    ' portable PBKDF2: native-oracle match, 600000 rounds, login, wrong password and legacy login',
    { probe_wall_ms: Math.round(performance.now() - started) });
} finally { await runtime?.dispose(); }
