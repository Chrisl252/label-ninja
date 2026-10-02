// Label Ninja Worker — thin router: canonical host first, /api/* to the API, everything else to static assets (src/static.js: real 404s).

import { errorResponse } from './http.js';
import { handleApi } from './auth.js';
import { handleExportApi } from './export.js';
import { handleProjectsApi } from './projects.js';
import { guardBrowserWrite, privateApiResponse } from './security.js';
import { canonicalRedirect, legacyPageRedirect } from './redirects.js';
import { maintain } from './maintenance.js';
import { serveStatic } from './static.js';

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
