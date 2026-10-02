// Label Ninja Worker — thin router: canonical host first, /api/* to the API, everything else to static assets.

import { errorResponse } from './http.js';
import { handleApi } from './auth.js';
import { handleExportApi } from './export.js';
import { handleProjectsApi } from './projects.js';
import { guardBrowserWrite, privateApiResponse } from './security.js';
import { canonicalRedirect, legacyPageRedirect } from './redirects.js';
import { maintain } from './maintenance.js';

export default {
  async fetch(request, env, ctx) {
    const redirect = canonicalRedirect(request) || legacyPageRedirect(request);
    if (redirect) return redirect;
    const response = await route(request, env, ctx);
    return new URL(request.url).pathname.startsWith('/api/') ? privateApiResponse(response) : response;
  },
  async scheduled(_event, env, ctx) { ctx.waitUntil(maintain(env)); },
};

async function route(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) guardBrowserWrite(request);
      if (url.pathname.startsWith('/api/export')) {
        return await handleExportApi(request, env, url.pathname, url.searchParams);
      }
      if (url.pathname.startsWith('/api/projects')) {
        return await handleProjectsApi(request, env, url.pathname, url.searchParams);
      }
      if (url.pathname.startsWith('/api/')) {
        return await handleApi(request, env, url.pathname);
      }
      return await serveStatic(request, env);
    } catch (err) {
      return errorResponse(err);
    }
}

async function serveStatic(request, env) {
  const assetRes = await env.ASSETS.fetch(request);
  if (assetRes.status === 404 && request.method === 'GET') {
    // SPA fallback: reproduce not_found_handling for paths the binding did not resolve.
    const spaUrl = new URL(request.url);
    spaUrl.pathname = '/index.html';
    const spaRes = await env.ASSETS.fetch(new Request(spaUrl.toString(), request));
    if (spaRes.status !== 404) return spaRes;
  }
  return assetRes;
}
