# Label Ninja runbooks

## Local verification

Run from the active source worktree in WORKSPACE-MAP.md:

- npm ci
- npx wrangler d1 migrations apply label-ninja-db --local
- npm run dev (loopback port 8787; --local-upstream keeps the canonical redirect from firing locally)
- npm test
- node scripts/test-label-crop.mjs
- npm run test:runtime
- npm run test:integration
- npm run test:projects
- node scripts/check-launch.mjs
- npx wrangler deploy --dry-run

The dry run must include DB and ASSETS bindings. A config change to nodejs_compat requires restarting Wrangler if its hot reload exits. Do not treat a 200 on an unknown SPA path as proof of a valid page; check the expected content.

Crypto compatibility must also be tested on an isolated real Cloudflare remote preview with scripts/password-runtime-worker.js and no data bindings/routes. Point LN_CRYPTO_PROBE at that preview and run npm run test:runtime, then stop the preview. Local workerd alone missed the native 100,000-round production ceiling; do not reintroduce native PBKDF2 or lower the current 600,000-round work factor.

To run scheduled cleanup locally, GET http://127.0.0.1:8787/cdn-cgi/local/scheduled. This mutates only local D1.

## Before a public push

Payments are gone (2026-10-01), so there is no provider acceptance gate. Remaining operator checks: recovery email delivered to an owner-controlled inbox (Resend + verified sender), representative 200-page and image-heavy jobs on production capacity, and owner review of the public operator/contact language. Ads stay off until Chris decides; turning them on is its own Ready Check.

## Release gate

Affiliate changes also require `npm run check:affiliates:release`. Verify the site in the selected Associates store website list and update `config/affiliates.json` with dated evidence before this gate. Adding a website or new tracking ID requires owner approval; source inspection does not constitute account approval.

Show the exact release candidate in Chrome at desktop and phone widths. Ask for explicit approve/deny. Do not deploy before approval or change the artifact after approval.

Check the diff and stage only named intended paths; preserve scratch and co-worker files. Commit locally. A direct master push remains owner-gated. If the working tree contains unrelated work, create a clean detached worktree under the project's backups/release area or another explicitly approved C:\Code release path, pinned to the approved commit. Use npm ci there; do not use junction-based destructive cleanup.

Record the current Worker version and a D1 recovery point/export. Inspect pending remote migrations; migration 0003 is already applied as of Sep 6 and must not be manually replayed. Apply only approved pending additive migrations, then deploy the approved Worker. Do not remove columns or erase customer data. Do not deploy public/ to Pages: it lacks the API.

Verify on https://label-ninja.com the real PATH routes /, /shipping-label-to-4x6, /whatnot-labels, each /guides/* page in the sitemap, /reset, /privacy, /terms, /sitemap.xml, /robots.txt and /api/health. Verify redirects: https://www.label-ninja.com/<path> and http:// return 301 to the https apex with path/query kept (308 for non-GET); /pricing and /billing return 301 to /; /api/config/pricing and billing routes return 404. Confirm /vendor/* carries the immutable cache header. Compare served public files to the approved commit. Run node scripts/check-launch.mjs with LN_BASE set to the deployed origin.

After an approved deploy, set LN_BASE to the known production origin and run node scripts/test-deploy-canary.mjs --allow-production. It creates one synthetic account, two PDFs (3 and 200 pages), and one project that it deletes; it tests sign-in/out, export and replay without email. LN_LEGACY_EMAIL optionally selects only a known ln-canary-b3 synthetic account to prove old-hash upgrades. Never substitute a customer account. Confirm success before calling the site repaired; read-only HTTP checks cannot catch password failures.

## Operational checks

Check /api/health, mail delivery, export 429 rates, Worker errors/CPU, and D1 storage. Example bounded read-only investigations:

- SELECT id,status,started_at FROM export_jobs WHERE status='processing' ORDER BY started_at LIMIT 20;
- SELECT id,expires_at FROM export_jobs WHERE status='completed' AND expires_at <= <now_ms> ORDER BY expires_at LIMIT 20;

Read first; do not clear job or ledger records as a diagnostic. Billing tables are dormant; leave them in place.

## Rollback and support

Roll back Worker code to the recorded version if needed; keep additive D1 columns. Do not restore an old full database over newer accounts or projects. Rolling back to ceb6a67 would bring back the old quota/paywall; do it only to stop an outage. Support must verify account ownership before deletion and account for audit retention. Account deletion is a support workflow, not an implemented self-service API.

Physical acceptance remains separate: print and scan a 4x6 Rollo label and a 1x0.5 Whatnot label at actual size, zero margins. Record the driver stock names and result.
