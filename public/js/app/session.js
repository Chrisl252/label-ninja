// Session state — GET /api/auth/me bootstrap + light polling, change events.
// Consumers (auth-ui chip, exporter) subscribe via onSessionChange.

import { api } from './api.js';

const listeners = new Set();
let currentUser = null;
let watching = false;

export function getUser() {
  return currentUser;
}

export function isSignedIn() {
  return !!currentUser;
}

export function isPro() {
  const u = currentUser;
  return !!(u && u.free_uses && u.free_uses.unlimited);
}

export function onSessionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) {
    try {
      fn(currentUser);
    } catch {
      // listener bugs never break the session bus
    }
  }
}

export function applyUser(user) {
  currentUser = user;
  emit();
}

export async function refreshSession() {
  try {
    const data = await api('/api/auth/me');
    currentUser = data.user;
  } catch {
    currentUser = null;
  }
  emit();
  return currentUser;
}

// Bootstrap on load, re-check on focus, poll every 5 minutes.
export function startSessionWatch() {
  if (watching) return;
  watching = true;
  refreshSession();
  window.addEventListener('focus', refreshSession);
  setInterval(refreshSession, 5 * 60 * 1000);
}
