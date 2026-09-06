// Exercise the actual workerd crypto API, not Node's implementation.
import assert from 'node:assert/strict';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
const runtime = new Miniflare(convertV4MiniflareOptions({ modules: true, compatibilityDate: '2024-09-23',
  compatibilityFlags: ['nodejs_compat'],
  script: `import { pbkdf2Sync } from 'node:crypto';
    export default { async fetch() {
      const started = Date.now();
      const hash = pbkdf2Sync('runtime-fixture', 'salt-fixture', 600000, 32, 'sha256');
      return Response.json({ bytes: hash.length, ms: Date.now() - started });
    } };` }));
try {
  const response = await runtime.dispatchFetch('http://local.test/');
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.bytes, 32);
  console.log('PASS workerd PBKDF2-SHA256 600000 iterations:', data);
} finally { await runtime.dispose(); }
