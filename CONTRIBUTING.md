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

## Security seams

Authentication, ownership, then input validation are required before user mutations. Return 404 for another user's private resource. There is no payment code; do not add plan, quota or checkout logic without an owner decision. Export keeps database idempotency (user/key job plus content hash).

Use bounded body readers and provider timeouts. Log codes and IDs, not credentials, reset URLs, label content, or email bodies. Escape user strings at HTML sinks.

Applied migrations are immutable; add a numbered migration. New tests must demonstrate the defect and a safe failure mode. Password hashing lives only in passwords.js and uses pinned portable @noble/hashes, not native PBKDF2 (the remote runtime caps it at 100,000 iterations). Preserve 600,000 rounds and the stored format. For a KDF change, prove the actual module using the no-DB password-runtime-worker.js on a real remote preview, then run test:runtime with LN_CRYPTO_PROBE. Do not infer remote compatibility from local workerd or weaken work factors.

## Release

The 4x6 converter (public/js/label-crop/) keeps geometry and detect pure so scripts/test-label-crop.mjs can test them in Node; output.js takes pdf-lib by injection. It must stay upload-free and account-free. Use the real local server on 8787 and test:integration for export/PDF acceptance.

For Whatnot feature/content changes, npm test includes scripts/test-whatnot-feature.mjs (settings, URL round-trip, all-stock PDF geometry and HTML SEO contract). Run node scripts/test-whatnot-http.mjs --local-export against local Wrangler to prove three stocks and replay. Without that flag, the script is read-only and can check a deployed LN_BASE. Keep label settings validation in public/js/whatnot-settings.js, reuse the existing export flow, and use real static HTML URLs for new guides. Cite official sources and distinguish item numbers, sorting automation and shipping postage.

No automatic production release. Follow RUNBOOKS.md: exact candidate in Chrome, explicit owner approval, approved commit, isolated clean release directory, additive migration, Worker deploy, HTTP plus canary verification. Never bundle unrelated scratch files or ship the static Pages mirror as a SaaS app.
