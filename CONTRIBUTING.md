# Contributing to Label Ninja

## Local setup

Use Node 24 (the regression harness uses node:sqlite), npm ci, and the checked-in lockfile. Run npm run dev for the full app on http://127.0.0.1:8787. A static file server cannot test the API.

Apply local migrations with npx wrangler d1 migrations apply label-ninja-db --local. Use .dev.vars.example for variable names, not real credentials. .dev.vars is ignored. Never put secrets in source, command-line arguments, screenshots, or notes.

## Change contract

1. Inspect git status and preserve other work.
2. Back up touched files under backups with a timestamp.
3. Keep one domain per module. Add handlers behind named seams in worker.js or the appropriate domain router.
4. Run npm test (spec-builders, redesign-contract, test-launch, whatnot-feature). 4x6 converter changes also run node scripts/test-label-crop.mjs. API changes also need the local integration/project suites; crypto changes need npm run test:runtime.
5. Inspect meaningful desktop and mobile states in Chrome. Keep physical PDF geometry independent of preview zoom.
6. Run node scripts/check-launch.mjs and npx wrangler deploy --dry-run. Confirm DB and ASSETS bindings.
7. Record results and remaining limitations in PROJECT_STATE.md and DECISIONS_LOG.md.

Do not weaken tests or reset production data to get a green run. Repeated local auth suites can exhaust their 10/hour synthetic-IP bucket; use a fresh isolated local database or clear only its local test counter after confirming the target.

## Shared design conventions

Read `DESIGN.md` before UI changes; Chris approved Packing Bench. Keep warm-paper/light-default and dark themes on every canonical/utility page. Use semantic colors/type/spacing/radius/motion from `public/css/tokens.css`, primitives from `app.css`, and the shared `site.css`/`site-nav.js` header, native Tools group, Find/Theme controls and footer classes. Declare color values in tokens only. Reserve header controls in static markup and keep all three local font preloads aligned with token font URLs; `font-display:swap` alone does not prevent wrapping shifts.

Add a presentation concern as a named module and one app registration call; home-picker, packing-tools and printer-picker demonstrate the pattern. Version the app entry, mount/views and presentation helpers together when their markup changes; keep API/output dependencies on their shared canonical imports so state/output identity does not split. Home/guide/printer content must stay real static HTML with existing routes/canonicals/IDs. Keep `public/index.html` below 700 lines and app-only views in `public/js/app/views/`. Prefer one H1 and labelled main per visible mode, real links, native details/dialogs, visible focus and reduced-motion rules. New controls need useful labels and a complete keyboard path at 390px; no-overflow checks alone do not prove tool usability.

Keep canvas pixel geometry, Helvetica preview, presets, spec builders, barcode/PDF and crop geometry independent of theme/type changes. Preserve an output fixture/hash baseline before editing these paths; run meaningful physical-dimension/barcode/PDF comparisons. Size preferences must not automatically overwrite a draft: the current editor stock reuse is an explicit click. Local browser processing/privacy claims apply only where verified; studio exports still use the authenticated API. Do not advertise ZPL, PNG or DPI controls that do not exist.

For a full redesign, record true head titles (exclude SVG titles), descriptions/canonicals/JSON-LD, H1 visibility, anchors and affiliate tuples before/after. Capture the actual candidate separately from proposal mockups. Report mobile Lighthouse scores with their URLs/environments, layout shift and remaining interaction/contrast limits; do not call lab scores field Core Web Vitals. Any visible candidate change after approval repeats the exact-candidate review; Associates registration and deployment remain separate explicit approvals.

## Security seams

Authentication, ownership, then input validation are required before user mutations. Return 404 for another user's private resource. There is no payment code; do not add plan, quota or checkout logic without an owner decision. Export keeps database idempotency (user/key job plus content hash).

Use bounded body readers and provider timeouts. Log codes and IDs, not credentials, reset URLs, label content, or email bodies. Escape user strings at HTML sinks.

Applied migrations are immutable; add a numbered migration. New tests must demonstrate the defect and a safe failure mode. Password hashing lives only in passwords.js and uses pinned portable @noble/hashes, not native PBKDF2 (the remote runtime caps it at 100,000 iterations). Preserve 600,000 rounds and the stored format. For a KDF change, prove the actual module using the no-DB password-runtime-worker.js on a real remote preview, then run test:runtime with LN_CRYPTO_PROBE. Do not infer remote compatibility from local workerd or weaken work factors.

## Release

The 4x6 converter (public/js/label-crop/) keeps geometry and detect pure so scripts/test-label-crop.mjs can test them in Node; output.js takes pdf-lib by injection. It must stay upload-free and account-free. Use the real local server on 8787 and test:integration for export/PDF acceptance.

For Whatnot feature/content changes, npm test includes scripts/test-whatnot-feature.mjs (settings, URL round-trip, all-stock PDF geometry and HTML SEO contract). Run node scripts/test-whatnot-http.mjs --local-export against local Wrangler to prove three stocks and replay. Without that flag, the script is read-only and can check a deployed LN_BASE. Keep label settings validation in public/js/whatnot-settings.js, reuse the existing export flow, and use real static HTML URLs for new guides. Cite official sources and distinguish item numbers, sorting automation and shipping postage.

No automatic production release. Follow RUNBOOKS.md: exact candidate in Chrome, explicit owner approval, approved commit, isolated clean release directory, additive migration, Worker deploy, HTTP plus canary verification. Never bundle unrelated scratch files or ship the static Pages mirror as a SaaS app.

## Affiliate links

Read `config/affiliates.json` before adding an Amazon shopping anchor. Use the configured `tag` in the static href (escape query separators as `&amp;`), `data-affiliate="amazon"`, `rel="sponsored noopener"` and `target="_blank"`. Put `data-affiliate-disclosure="amazon"` on a visible paragraph in the same section, including: As an Amazon Associate I earn from qualifying purchases. Link to `/privacy#shopping-links`. Support/documentation/privacy links are sources and must not become shopping links. No hardcoded live price, availability, borrowed reviews or unverified product compatibility.

Run `npm run check:affiliates` after content edits. Before release, verify Label Ninja in the selected store's Associates website list, update the evidence in `config/affiliates.json` with a backup, and run `npm run check:affiliates:release`. A listed website is not proof of account approval or guaranteed commission. Complete RUNBOOKS.md Ready Check and obtain deployment approval separately.
