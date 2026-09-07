// Loopback-only UI fixture: real app assets, simulated exhausted account and billing.
// No database, external API calls, account creation, or payments. Never deployed.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg' };
const server = createServer(async (req, res) => {
  const send = (status, contentType, body) => {
    res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  };
  const json = (status, data) => send(status, 'application/json', JSON.stringify(data));
  if (!['127.0.0.1:8799', 'localhost:8799'].includes(req.headers.host)) return json(403, {});
  try {
    const url = new URL(req.url, 'http://127.0.0.1:8799');
    const mode = new URL(req.headers.referer || 'http://127.0.0.1:8799').searchParams.get('fixture');
    if (url.pathname === '/api/auth/me') {
      if (mode === 'visitor') return json(401, { error: { code: 'unauthorized' } });
      return json(200, { user: { id: 'local-ui-fixture', email: 'preview@example.test',
        free_uses: { remaining: mode === 'remaining' ? 2 : 0, granted: 10, unlimited: mode === 'pro' } } });
    }
    if (url.pathname === '/api/config/pricing') return json(200, { configured: false, mode: 'test' });
    if (url.pathname === '/api/projects') return json(200, { projects: [] });
    if (url.pathname === '/api/export' && req.method === 'POST') {
      req.resume();
      return json(402, { error: { code: 'free_limit_reached', message: 'Fixture: free limit reached.', upgrade_url: '/pricing' } });
    }
    if (url.pathname === '/api/exports') return json(200, { exports: [] });
    if (url.pathname.startsWith('/api/')) return json(503, { error: { message: 'Preview fixture: action unavailable.' } });
    if (req.method !== 'GET') return json(405, {});
    const path = ['/', '/pricing', '/billing', '/account'].includes(url.pathname) ? '/index.html' : decodeURIComponent(url.pathname);
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep) || !types[extname(file)] || /_preview|\.bak/.test(file)) return json(404, {});
    send(200, types[extname(file)], await readFile(file));
  } catch { json(404, {}); }
});
server.listen(8799, '127.0.0.1', () => console.log('UI fixture only: http://127.0.0.1:8799/?fixture=exhausted#editor (no real account or billing)'));
