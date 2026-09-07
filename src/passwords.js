// Portable PBKDF2 preserves the existing format and 600,000-iteration work factor.
// Cloudflare's native PBKDF2 has a production-only 100,000-iteration ceiling.
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { timingSafeEqual } from './db.js';

export const PASSWORD_ITERATIONS = 600000;
const DUMMY_SALT = new Uint8Array(16).fill(11);
const encode = new TextEncoder();
const toB64 = bytes => btoa(String.fromCharCode(...bytes));
const fromB64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));

export async function derivePasswordKey(password, salt, iterations = PASSWORD_ITERATIONS) {
  if (typeof password !== 'string' || !(salt instanceof Uint8Array) || salt.length !== 16 ||
      !Number.isSafeInteger(iterations) || iterations < 100000 || iterations > PASSWORD_ITERATIONS) {
    throw new TypeError('Invalid password derivation parameters');
  }
  const bytes = encode.encode(password);
  try {
    return pbkdf2(sha256, bytes, salt, { c: iterations, dkLen: 32 });
  } finally {
    bytes.fill(0);
  }
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordKey(password, salt);
  return `pbkdf2$${PASSWORD_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const parts = String(stored).split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const expected = fromB64(parts[3]);
    if (expected.length !== 32) return false;
    const actual = await derivePasswordKey(password, fromB64(parts[2]), Number(parts[1]));
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function passwordNeedsUpgrade(stored) {
  return String(stored).startsWith('pbkdf2$100000$');
}

export async function dummyVerify(password) {
  // One derivation on every request, including the first unknown-email login.
  await derivePasswordKey(password, DUMMY_SALT);
  return false;
}
