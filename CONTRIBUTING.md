# Contributing to Label Ninja

## Local setup

Use Node 24 (the regression harness uses node:sqlite), npm ci, and the checked-in lockfile. Run npm run dev for the full app on http://127.0.0.1:8787. A static file server cannot test the API.

Apply local migrations with npx wrangler d1 migrations apply label-ninja-db --local. Use .dev.vars.example for variable names, not real credentials. .dev.vars is ignored. Never put secrets in source, command-line arguments, screenshots, or notes.

## Change contract

1. Inspect git status and preserve other work.
2. Back up touched files under backups with a timestamp.
3. Keep one domain per module. Add handlers behind named seams in worker.js or the appropriate domain router.
4. Run npm test. API changes also need the local integration/project suites; crypto changes need npm run test:runtime.
5. Inspect meaningful desktop and mobile states in Chrome. Keep physical PDF geometry independent of preview zoom.
6. Run node scripts/check-launch.mjs and npx wrangler deploy --dry-run. Confirm DB and ASSETS bindings.
7. Record results and remaining limitations in PROJECT_STATE.md and DECISIONS_LOG.md.

Do not weaken tests or reset production data to get a green run. Repeated local auth suites can exhaust their 10/hour synthetic-IP bucket; use a fresh isolated local database or clear only its local test counter after confirming the target.

## Security seams

Authentication, ownership, then input validation are required before user mutations. Return 404 for another user's private resource. Stripe identifiers come from server configuration and bound account state, never trusted client metadata. Charge and webhook paths need both provider and database idempotency.

Use bounded body readers and provider timeouts. Log codes and event IDs, not credentials, reset URLs, label content, payment payloads, or email bodies. Escape user strings at HTML sinks.

Applied migrations are immutable; add a numbered migration. New tests must demonstrate the defect and a safe failure mode. Password hashing lives only in passwords.js and uses pinned portable @noble/hashes, not native PBKDF2 (the remote runtime caps it at 100,000 iterations). Preserve 600,000 rounds and the stored format. For a KDF change, prove the actual module using the no-DB password-runtime-worker.js on a real remote preview, then run test:runtime with LN_CRYPTO_PROBE. Do not infer remote compatibility from local workerd or weaken work factors.

## Release

No automatic production release. Follow RUNBOOKS.md: exact candidate in Chrome, explicit owner approval, approved commit, isolated clean release directory, additive migration, Worker deploy, HTTP plus real lifecycle verification. Never bundle unrelated scratch files or ship the static Pages mirror as a SaaS app.
