// Response helpers + guarded JSON body reading for the Label Ninja API.

export class HttpError extends Error {
  constructor(status, code, message, headers = {}, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.headers = headers;
    this.extra = extra; // merged into the error object (e.g. upgrade_url)
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export function ok(data = {}, headers = {}) {
  return json({ ok: true, ...data }, 200, headers);
}

export function errorResponse(err) {
  if (err instanceof HttpError) {
    return json({ error: { code: err.code, message: err.message, ...err.extra } }, err.status, err.headers);
  }
  console.error(`api internal error: ${err && err.message}`);
  return json({ error: { code: 'internal_error', message: 'Internal server error.' } }, 500);
}

const MAX_BODY_BYTES = 100 * 1024;

export async function readJson(request, maxBytes = MAX_BODY_BYTES) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > maxBytes) {
    throw new HttpError(413, 'payload_too_large', `Request body too large (max ${Math.floor(maxBytes / 1024)}KB).`);
  }
  const text = await request.text();
  if (text.length > maxBytes) {
    throw new HttpError(413, 'payload_too_large', `Request body too large (max ${Math.floor(maxBytes / 1024)}KB).`);
  }
  if (!text) {
    throw new HttpError(400, 'invalid_json', 'Request body must be JSON.');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'invalid_json', 'Request body must be valid JSON.');
  }
}
