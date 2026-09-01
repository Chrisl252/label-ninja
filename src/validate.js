// Input validation — throws HttpError(400) on bad shape.

import { HttpError } from './http.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function expectEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    throw new HttpError(400, 'validation_error', 'A valid email address is required.');
  }
  return email;
}

export function expectPassword(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 1000) {
    throw new HttpError(400, 'validation_error', 'Password must be at least 10 characters.');
  }
  return value;
}

export function expectHexToken(value, bytes) {
  const re = new RegExp(`^[0-9a-f]{${bytes * 2}}$`);
  if (typeof value !== 'string' || !re.test(value)) {
    throw new HttpError(400, 'validation_error', 'Invalid token format.');
  }
  return value;
}
