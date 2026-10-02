// Canonical host/scheme and retired-page redirects. Runs before any routing.

const CANONICAL_ORIGIN = 'https://label-ninja.com';
const PRODUCTION_HOSTS = new Set(['label-ninja.com', 'www.label-ninja.com']);
const RETIRED_PAGES = new Set(['/pricing', '/pricing/', '/pricing.html', '/billing', '/billing/']);

function safeMethod(request) {
  return request.method === 'GET' || request.method === 'HEAD';
}

function redirect(location, status) {
  return new Response(null, { status, headers: { Location: location, 'Cache-Control': 'public, max-age=3600' } });
}

// www.label-ninja.com or http:// -> https://label-ninja.com, same path + query.
// 301 for GET/HEAD; 308 elsewhere so the method and body survive. Local dev hosts
// (localhost/127.0.0.1) and preview hosts are never redirected.
export function canonicalRedirect(request) {
  const url = new URL(request.url);
  if (!PRODUCTION_HOSTS.has(url.hostname)) return null;
  if (url.hostname === 'label-ninja.com' && url.protocol === 'https:' && !url.port) return null;
  return redirect(CANONICAL_ORIGIN + url.pathname + url.search, safeMethod(request) ? 301 : 308);
}

// Everything is free now; the old pricing page permanently points home.
export function legacyPageRedirect(request) {
  if (!safeMethod(request)) return null;
  const url = new URL(request.url);
  if (!RETIRED_PAGES.has(url.pathname)) return null;
  return redirect(url.origin + '/' + url.search, 301);
}
