// Account mode — signed-in profile: email, what a free account includes,
// sign out, and a private support path for account deletion.

import { getUser } from './session.js';
import { authSignOut } from './auth-ui.js';
import { escapeHtml } from './html.js';

let initialized = false;

function el(id) {
  return document.getElementById(id);
}

function renderAccount() {
  const user = getUser();
  const wrap = el('account-mount');
  if (!user) {
    wrap.innerHTML = '<p class="small muted">Sign in to see your account.</p>';
    return;
  }
  wrap.innerHTML = `
    <div class="grid grid--2">
      <div class="panel panel--tight stack stack--xs">
        <p class="label">Account</p>
        <div class="kv kv--acct">
          <span class="kv__k">Email</span><span class="kv__v mono">${escapeHtml(user.email)}</span>
        </div>
      </div>
      <div class="panel panel--tight stack stack--xs">
        <p class="label led led--ready">Included free</p>
        <ul class="dot-list">
          <li><span class="dot">·</span><span>Every label tool and unlimited PDF downloads</span></li>
          <li><span class="dot">·</span><span>Saved projects you can reopen and duplicate</span></li>
          <li><span class="dot">·</span><span>Re-download recent PDFs for 7 days</span></li>
        </ul>
      </div>
    </div>
    <div class="acct-actions">
      <button type="button" id="account-signout-btn" class="btn btn--ghost">Sign out</button>
      <a href="mailto:chris@bisket.com?subject=Label%20Ninja%20account%20deletion" class="btn btn--ghost">Request account deletion</a>
    </div>
    <p class="tiny muted">Need help or want your account deleted? Email chris@bisket.com from the address on this account.</p>`;
  el('account-signout-btn').addEventListener('click', async () => {
    if (await authSignOut()) window.LN.switchMode('home');
  });
}

export async function showAccount() {
  renderAccount();
}

export function initAccount() {
  if (initialized) return;
  initialized = true;
}
