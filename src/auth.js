// Auth domain: sessions, register/login/logout/me, password reset plumbing.

import { ok, json, readJson, HttpError } from './http.js';
import { now, uid, randomHex, sha256Hex, hashPassword, verifyPassword, dummyVerify } from './db.js';
import { expectEmail, expectPassword, expectHexToken } from './validate.js';
import { enforceRateLimit } from './ratelimit.js';

const SESSION_COOKIE = 'ln_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function sessionCookie(token) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function isAdminEmail(env, email) {
  const list = String(env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email);
}

async function createSession(db, userId) {
  const token = randomHex(32);
  const tokenHash = await sha256Hex(token);
  const t = now();
  await db
    .prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?,?,?,?)')
    .bind(tokenHash, userId, t, t + SESSION_TTL_MS)
    .run();
  return token;
}

export async function getSessionUser(env, request) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.role, u.plan, u.subscription_status, u.paid_through,
            u.free_uses_granted, u.disabled, s.expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?`
  ).bind(tokenHash).first();
  if (!row || row.expires_at <= now() || row.disabled) return null;
  return row;
}

function pickPublic(user) {
  return { id: user.id, email: user.email, role: user.role, plan: user.plan, created_at: user.created_at };
}

async function health(env) {
  try {
    const row = await env.DB.prepare('SELECT 1 AS one').first();
    if (!row || row.one !== 1) throw new Error('unexpected probe result');
    return ok({ db: true });
  } catch {
    return json({ ok: false, db: false }, 500);
  }
}

async function register(request, env) {
  await enforceRateLimit(env.DB, request);
  const body = await readJson(request);
  const email = expectEmail(body.email);
  const password = expectPassword(body.password);
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) throw new HttpError(409, 'email_exists', 'An account with this email already exists.');
  const t = now();
  const user = {
    id: uid(),
    email,
    role: isAdminEmail(env, email) ? 'admin' : 'user',
    created_at: t,
  };
  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (?,?,?,?,?,?)'
  )
    .bind(user.id, email, await hashPassword(password), user.role, t, t)
    .run();
  const token = await createSession(env.DB, user.id);
  return ok({ user: pickPublic(user) }, { 'Set-Cookie': sessionCookie(token) });
}

async function login(request, env) {
  await enforceRateLimit(env.DB, request);
  const body = await readJson(request);
  const email = expectEmail(body.email);
  const password = expectPassword(body.password);
  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user) {
    await dummyVerify(password); // equalize timing so unknown email costs the same PBKDF2 work
    throw new HttpError(401, 'invalid_credentials', 'Invalid email or password.');
  }
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid || user.disabled) {
    throw new HttpError(401, 'invalid_credentials', 'Invalid email or password.');
  }
  const token = await createSession(env.DB, user.id);
  return ok({ user: pickPublic(user) }, { 'Set-Cookie': sessionCookie(token) });
}

async function logout(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) {
    const tokenHash = await sha256Hex(token);
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }
  return ok({ message: 'Signed out.' }, { 'Set-Cookie': clearSessionCookie() });
}

async function me(request, env) {
  const user = await getSessionUser(env, request);
  if (!user) throw new HttpError(401, 'unauthorized', 'Not signed in.');
  const ledger = await env.DB.prepare(
    `SELECT COALESCE(SUM(CASE WHEN kind IN ('admin_grant','admin_revoke') THEN delta ELSE 0 END), 0) AS adjustments,
            COALESCE(SUM(CASE WHEN kind = 'export' THEN 1 ELSE 0 END), 0) AS consumed
     FROM usage_ledger WHERE user_id = ?`
  ).bind(user.id).first();
  const t = now();
  const unlimited =
    user.plan === 'pro' &&
    (user.subscription_status === 'active' || user.subscription_status === 'trialing') &&
    (user.paid_through == null || user.paid_through > t);
  const consumed = ledger ? ledger.consumed : 0;
  const adjustments = ledger ? ledger.adjustments : 0;
  const remaining = user.free_uses_granted + adjustments - consumed;
  return ok({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      subscription: { status: user.subscription_status, paid_through: user.paid_through },
      free_uses: {
        granted: user.free_uses_granted,
        consumed,
        remaining: unlimited ? null : remaining,
        unlimited,
      },
    },
  });
}

async function sendResetEmail(env, email, url) {
  if (env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM || 'Label Ninja <onboarding@resend.dev>',
          to: email,
          subject: 'Reset your Label Ninja password',
          text: `Reset your password (link expires in 1 hour):\n\n${url}\n\nIf you did not request this, ignore this email.`,
        }),
      });
      if (!res.ok) console.error(`reset email delivery failed with status ${res.status}`);
    } catch {
      console.error('reset email delivery error');
    }
  } else {
    console.log(`[RESET-LINK] ${url}`);
  }
}

async function resetRequest(request, env) {
  await enforceRateLimit(env.DB, request);
  const body = await readJson(request);
  const raw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (raw && raw.length <= 254) {
    const user = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(raw).first();
    if (user) {
      const token = randomHex(48);
      const tokenHash = await sha256Hex(token);
      await env.DB.prepare(
        'INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, used) VALUES (?,?,?,0)'
      )
        .bind(tokenHash, user.id, now() + RESET_TTL_MS)
        .run();
      const origin = new URL(request.url).origin;
      await sendResetEmail(env, raw, `${origin}/reset?token=${token}`);
    }
  }
  return ok({ message: 'If an account exists, a reset link has been sent.' });
}

async function resetConfirm(request, env) {
  await enforceRateLimit(env.DB, request);
  const body = await readJson(request);
  const token = expectHexToken(body.token, 48);
  const password = expectPassword(body.new_password);
  const tokenHash = await sha256Hex(token);
  const t = now();
  const row = await env.DB.prepare(
    'SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND used = 0 AND expires_at > ?'
  )
    .bind(tokenHash, t)
    .first();
  if (!row) throw new HttpError(400, 'invalid_token', 'Invalid or expired reset token.');
  const hash = await hashPassword(password);
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').bind(hash, t, row.user_id),
    env.DB.prepare('UPDATE password_reset_tokens SET used = 1 WHERE token_hash = ?').bind(tokenHash),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id),
  ]);
  return ok({ message: 'Password updated. Please log in again.' });
}

export async function handleApi(request, env, path) {
  if (path === '/api/health' && request.method === 'GET') return health(env);
  const route = `${request.method} ${path}`;
  switch (route) {
    case 'POST /api/auth/register':
      return register(request, env);
    case 'POST /api/auth/login':
      return login(request, env);
    case 'POST /api/auth/logout':
      return logout(request, env);
    case 'GET /api/auth/me':
      return me(request, env);
    case 'POST /api/auth/reset-request':
      return resetRequest(request, env);
    case 'POST /api/auth/reset-confirm':
      return resetConfirm(request, env);
    default:
      throw new HttpError(404, 'not_found', 'Not found.');
  }
}
