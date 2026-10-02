// Same-origin browser writes, canonical links, and response privacy.
import { HttpError } from './http.js';

export function appOrigin(env) {
  const value = env.APP_ORIGIN || 'https://label-ninja.com';
  const url = new URL(value);
  if (url.origin !== value || (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)))) {
    throw new HttpError(503, 'invalid_origin_config', 'Service configuration needs attention.');
  }
  return url.origin;
}

export function guardBrowserWrite(request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const path = new URL(request.url).pathname;
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new HttpError(403, 'cross_origin_denied', 'Open Label Ninja directly and try again.');
  }
  // workerd exposes an empty POST as a body stream. These routes deliberately
  // accept no input; Origin/SameSite still guard them, without requiring JSON.
  const noInput = request.method === 'DELETE' || path === '/api/auth/logout';
  if (!noInput && request.body &&
      !request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'json_required', 'Use application/json.');
  }
}

export function privateApiResponse(response) {
  const result = new Response(response.body, response);
  result.headers.set('Cache-Control', 'private, no-store');
  result.headers.set('X-Content-Type-Options', 'nosniff');
  result.headers.set('Referrer-Policy', 'no-referrer');
  result.headers.set('X-Frame-Options', 'DENY');
  return result;
}
