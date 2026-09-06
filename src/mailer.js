// Transactional mail. Tokens never enter logs or error bodies.
import { HttpError } from './http.js';

export function mailConfigured(env) {
  return Boolean(env.RESEND_API_KEY && env.EMAIL_FROM && !env.EMAIL_FROM.includes('resend.dev'));
}

export async function sendResetEmail(env, email, url) {
  if (!mailConfigured(env)) throw new HttpError(503, 'email_unavailable', 'Password recovery is temporarily unavailable. Contact support.');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: email, subject: 'Reset your Label Ninja password',
        text: `Reset your password (link expires in 1 hour):\n\n${url}\n\nIf you did not request this, ignore this email.` }),
    });
    if (!response.ok) throw new Error('delivery_rejected');
  } catch {
    console.error('reset email delivery failed');
    throw new HttpError(503, 'email_unavailable', 'Password recovery is temporarily unavailable. Contact support.');
  }
}
