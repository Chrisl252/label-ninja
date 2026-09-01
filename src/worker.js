// Label Ninja Worker — thin router: /api/* to the API, everything else to static assets.

import { errorResponse, HttpError } from './http.js';
import { handleApi } from './auth.js';
import { handleExportApi } from './export.js';
import { handleBillingApi } from './billing.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/export')) {
        return await handleExportApi(request, env, url.pathname, url.searchParams);
      }
      if (
        url.pathname === '/api/config/pricing' ||
        url.pathname.startsWith('/api/billing/') ||
        url.pathname === '/api/webhooks/stripe'
      ) {
        return await handleBillingApi(request, env, url.pathname);
      }
      if (url.pathname.startsWith('/api/')) {
        return await handleApi(request, env, url.pathname);
      }
      return await serveStatic(request, env);
    } catch (err) {
      return errorResponse(err);
    }
  },
};

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
