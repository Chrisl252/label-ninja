// Crypto + id helpers: PBKDF2 password hashing, SHA-256 token hashing, ids, time.

const PBKDF2_ITERATIONS = 100000;

export function now() {
  return Date.now();
}

export function uid() {
  return crypto.randomUUID();
}

export function randomHex(bytes) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function timingSafeEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array) || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function toB64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(text) {
  return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
}

async function deriveBits(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  );
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveBits(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const parts = String(stored).split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
    const salt = fromB64(parts[2]);
    const expected = fromB64(parts[3]);
    const actual = await deriveBits(password, salt, Number(parts[1]));
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

let dummyHashPromise = null;

// Burn equal PBKDF2 work on unknown-email logins so timing cannot enumerate users.
export function dummyVerify(password) {
  if (!dummyHashPromise) dummyHashPromise = hashPassword('timing-equalizer-placeholder');
  return dummyHashPromise.then((dummy) => verifyPassword(password, dummy));
}
