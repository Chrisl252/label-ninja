// Signed-in views — dashboard (#mode-dashboard) and account (#mode-account).
// Static app-only markup rendered once at boot by views/mount.js (kept out of
// index.html so the crawlable page stays small; ids are checked by
// scripts/test-redesign-contract.mjs). Inline LN.* handlers resolve on window.LN.

export const DASHBOARD_VIEW = `
  <main id="mode-dashboard" class="mode mode--wide hidden no-print">
    <div class="grid grid--2">
      <section class="panel dash-start">
        <h1>What are we printing today?</h1>
        <p class="lede">Design a custom label or run a numbered batch.</p>
        <div class="row">
          <button type="button" class="btn btn--primary btn--lg" onclick="LN.switchMode('editor')">New label</button>
        </div>
      </section>
      <section class="panel dash-usage">
        <p class="label led led--ready">Free account</p>
        <p class="small">Every tool, unlimited PDF downloads, saved projects, and 7-day re-downloads in My Exports.</p>
      </section>
    </div>

    <div id="dash-uploader" class="dropzone" role="button" tabindex="0" aria-label="Upload artwork to the label editor">
      <span class="bars dropzone__bars" aria-hidden="true"></span>
      <p class="dropzone__title">Add artwork to a label</p>
      <p class="dropzone__hint">PNG, JPG, or WebP · uploaded when you export or save</p>
      <input id="dash-uploader-input" type="file" accept="image/png,image/jpeg,image/webp" class="sr-only">
    </div>

    <section class="stack">
      <h2 class="dash-h">Recent projects</h2>
      <div id="dash-projects" class="grid grid--3"></div>
    </section>

    <section class="stack hidden">
      <h2 class="dash-h">Your templates</h2>
      <div id="dash-templates" class="grid grid--3"></div>
    </section>

    <section class="stack">
      <h2 class="dash-h">Recent exports</h2>
      <div id="dash-exports" class="grid grid--3"></div>
    </section>

    <section class="stack">
      <h2 class="dash-h">Quick tools</h2>
      <div id="dash-quick-tools" class="grid grid--4"></div>
    </section>

    <section class="stack">
      <h2 class="dash-h">Common sizes</h2>
      <div id="dash-common-sizes" class="grid grid--4 grid--sizes"></div>
    </section>
  </main>
`;

export const ACCOUNT_VIEW = `
  <main id="mode-account" class="mode hidden no-print">
    <header class="page-head">
      <h1>Account</h1>
      <p class="lede small">Your sign-in details and account help.</p>
    </header>
    <div id="account-mount" class="stack"><p class="small muted">Loading…</p></div>
  </main>
`;
