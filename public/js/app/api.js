// API fetch wrapper — same-origin cookie auth, JSON in/out, normalized errors.
// Error shape mirrors the backend: {error:{code,message,...extra}}.

export class ApiError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const opts = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body (proxy error, empty) — fall through to status handling
  }
  if (!res.ok) {
    const err = (data && data.error) || {};
    throw new ApiError(res.status, err.code || `http_${res.status}`, err.message || `Request failed (${res.status}).`, err);
  }
  return data;
}

// Binary download (PDFs) with the session cookie attached.
export async function apiFetchBlob(path) {
  const res = await fetch(path, { credentials: 'same-origin' });
  if (!res.ok) {
    let code = `http_${res.status}`;
    let message = `Download failed (${res.status}).`;
    try {
      const data = await res.json();
      if (data && data.error) {
        code = data.error.code || code;
        message = data.error.message || message;
      }
    } catch {
      // binary error page — keep defaults
    }
    throw new ApiError(res.status, code, message);
  }
  return res.blob();
}
