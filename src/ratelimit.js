// Fixed-window per-IP rate limiting for auth endpoints, backed by the D1 rate_limits table.

import { HttpError } from './http.js';

const WINDOW_MS = 60 * 60 * 1000;
const LIMIT = 10;

export function clientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

export async function enforceRateLimit(db, request, bucket = 'auth') {
  const window = Math.floor(Date.now() / WINDOW_MS);
  const key = `${bucket}:${clientIp(request)}:${window}`;
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = count + 1
       RETURNING count`
    )
    .bind(key, window)
    .first();
  const count = row ? row.count : 1;
  if (count > LIMIT) {
    const retryAfter = Math.max(1, Math.ceil(((window + 1) * WINDOW_MS - Date.now()) / 1000));
    throw new HttpError(429, 'rate_limited', 'Too many attempts. Try again later.', {
      'Retry-After': String(retryAfter),
    });
  }
}
