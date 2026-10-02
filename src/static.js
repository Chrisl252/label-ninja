// Static asset serving with real 404s (no soft-404 SPA fallback).
//
// Only the client-routed SPA paths below are served index.html; every other
// path is whatever Workers Static Assets resolves (file, extensionless .html,
// directory index.html), or the site 404 page with a 404 status and noindex.

// Real URLs that public/js/app/app.js routes on window.location.pathname.
// /reset is the password-reset link sent by src/auth.js; /account is the account deep link.
export const SPA_PATHS = new Set(['/account', '/account/', '/reset', '/reset/']);
const NOT_FOUND_PATHS = new Set(['/404', '/404.html']);

export async function serveStatic(request, env) {
  const url = new URL(request.url);
  if (SPA_PATHS.has(url.pathname)) {
    return env.ASSETS.fetch(new Request(new URL('/', url).toString(), request));
  }
  if (NOT_FOUND_PATHS.has(url.pathname)) return notFound(request, env);
  const res = await env.ASSETS.fetch(request);
  if (res.status !== 404) return res;
  return notFound(request, env, res);
}

// not_found_handling = "404-page" already makes the binding answer with public/404.html
// and status 404; this keeps the page (and the status) right if that setting changes.
async function notFound(request, env, res) {
  let page = res;
  if (!page || !(page.headers.get('content-type') || '').includes('text/html')) {
    const pageUrl = new URL('/404', request.url);
    page = await env.ASSETS.fetch(new Request(pageUrl.toString(), { method: request.method, headers: request.headers }));
  }
  const headers = new Headers(page.headers);
  headers.set('X-Robots-Tag', 'noindex');
  headers.set('Cache-Control', 'no-store');
  headers.delete('ETag');
  return new Response(request.method === 'HEAD' ? null : page.body, { status: 404, statusText: 'Not Found', headers });
}
