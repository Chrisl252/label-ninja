// Overlays — the account modal (create account / sign in / reset), the My
// Exports drawer, the save-project mini form and the downloaded-PDF toast.
// Static app-only markup rendered once at boot by views/mount.js; behaviour
// lives in auth-ui.js, exporter.js and projects.js.

export const OVERLAYS_VIEW = `
  <div id="auth-modal" class="scrim hidden no-print" role="dialog" aria-modal="true" aria-labelledby="auth-title" aria-describedby="auth-msg">
    <div class="modal auth">
      <div class="modal__head">
        <div class="stack stack--xs">
          <h2 id="auth-title" class="modal__title">Your account</h2>
          <p id="auth-msg" class="auth__intent">Sign in to download PDFs and keep your saved projects.</p>
        </div>
        <button id="auth-close" type="button" class="btn btn--quiet btn--sm btn--icon modal__close x" aria-label="Close">✕</button>
      </div>

      <ul class="auth__perks" aria-label="What a free account includes">
        <li class="chip chip--ready">Free</li>
        <li class="chip">No card</li>
        <li class="chip">No PDF limit</li>
        <li class="chip">Saved projects</li>
      </ul>

      <div id="auth-tabs" class="tabs" role="group" aria-label="Choose">
        <button id="auth-tab-register" type="button" class="tabs__btn">Create free account</button>
        <button id="auth-tab-signin" type="button" class="tabs__btn is-active">Sign in</button>
      </div>

      <p id="auth-error" class="note note--danger hidden" role="alert"></p>

      <form id="auth-form-signin" data-panel="signin" class="stack stack--sm" novalidate>
        <div class="field">
          <label for="auth-signin-email" class="field__label">Email</label>
          <input id="auth-signin-email" name="email" type="email" autocomplete="email" inputmode="email" required class="input">
        </div>
        <div class="field">
          <label for="auth-signin-password" class="field__label">Password</label>
          <input id="auth-signin-password" name="password" type="password" autocomplete="current-password" required class="input">
        </div>
        <button id="auth-signin-submit" type="submit" class="btn btn--primary btn--block btn--lg">Sign in</button>
        <div class="row spread small">
          <a href="#" id="auth-to-reset" class="link">Forgot password?</a>
          <a href="#" id="auth-to-register" class="link">New here? Create a free account</a>
        </div>
      </form>

      <form id="auth-form-register" data-panel="register" class="hidden stack stack--sm" novalidate>
        <div class="field">
          <label for="auth-register-email" class="field__label">Email</label>
          <input id="auth-register-email" name="email" type="email" autocomplete="email" inputmode="email" required class="input">
        </div>
        <div class="field">
          <label for="auth-register-password" class="field__label">Choose a password</label>
          <input id="auth-register-password" name="password" type="password" autocomplete="new-password" minlength="10" required class="input" aria-describedby="auth-register-hint">
          <span id="auth-register-hint" class="field__hint">At least 10 characters.</span>
        </div>
        <label class="check"><input id="auth-register-show" type="checkbox"> Show password</label>
        <button id="auth-register-submit" type="submit" class="btn btn--primary btn--block btn--lg">Create free account</button>
        <p class="tiny muted center">By creating an account, you agree to the <a href="/terms" target="_blank" rel="noopener" class="link">Service terms</a> and <a href="/privacy" target="_blank" rel="noopener" class="link">Privacy policy</a>.</p>
        <p class="small center"><a href="#" id="auth-to-signin" class="link">Already have an account? Sign in</a></p>
      </form>

      <form id="auth-form-reset-request" data-panel="reset-request" class="hidden stack stack--sm" novalidate>
        <div class="field">
          <label for="auth-reset-email" class="field__label">Account email</label>
          <input id="auth-reset-email" name="email" type="email" autocomplete="email" required class="input">
        </div>
        <button type="submit" class="btn btn--primary btn--block">Send reset link</button>
        <p id="auth-reset-sent" class="note note--ready hidden" role="status">If an account exists for that email, a reset link is on its way. Check your inbox — the link expires in 1 hour.</p>
        <a href="#" id="auth-reset-back" class="link small">Back to sign in</a>
      </form>

      <form id="auth-form-reset-confirm" data-panel="reset-confirm" class="hidden stack stack--sm" novalidate>
        <input type="hidden" name="token" id="auth-reset-confirm-token" value="">
        <div class="field">
          <label for="auth-reset-new-password" class="field__label">New password (10+ characters)</label>
          <input id="auth-reset-new-password" name="password" type="password" autocomplete="new-password" required class="input">
        </div>
        <button type="submit" class="btn btn--primary btn--block">Set new password</button>
      </form>

      <button id="auth-cancel" type="button" class="btn btn--quiet btn--sm btn--block">Not now</button>
    </div>
  </div>

  <div id="exports-drawer" class="scrim scrim--right hidden no-print" role="dialog" aria-modal="true" aria-labelledby="exports-title">
    <div class="drawer">
      <div class="drawer__head">
        <h2 id="exports-title" class="modal__title">My Exports</h2>
        <button id="exports-close" type="button" class="btn btn--quiet btn--sm btn--icon x" aria-label="Close">✕</button>
      </div>
      <div id="exports-list" class="drawer__body" aria-live="polite"></div>
      <div class="drawer__foot">PDF files are kept for 7 days after export. Re-download or delete anytime.</div>
    </div>
  </div>

  <div id="save-modal" class="scrim hidden no-print" role="dialog" aria-modal="true" aria-labelledby="save-title">
    <div class="modal">
      <div class="modal__head">
        <h2 id="save-title" class="modal__title">Save project</h2>
        <button id="save-close" type="button" class="btn btn--quiet btn--sm btn--icon modal__close x" aria-label="Close">✕</button>
      </div>
      <form id="save-form" class="stack stack--sm" novalidate>
        <div class="field">
          <label for="save-name" class="field__label">Project name</label>
          <input id="save-name" name="name" type="text" maxlength="80" autocomplete="off" class="input">
        </div>
        <label class="check"><input id="save-template-check" type="checkbox"> Save as template (reusable starting point)</label>
        <button id="save-submit" type="submit" class="btn btn--primary btn--block">Save</button>
      </form>
      <button id="save-cancel" type="button" class="btn btn--quiet btn--sm btn--block">Cancel</button>
    </div>
  </div>

  <div id="open-pdf-toast" class="toast hidden no-print" role="status">
    <div class="grow">
      <p class="toast__title">PDF downloaded</p>
      <p id="open-pdf-name" class="mono tiny muted truncate"></p>
    </div>
    <button id="open-pdf-btn" type="button" class="btn btn--sm">Open PDF</button>
    <button id="open-pdf-close" type="button" class="btn btn--quiet btn--sm btn--icon x" aria-label="Dismiss">✕</button>
  </div>
`;
