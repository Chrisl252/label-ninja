# Label Ninja launch readiness

## Current release (2026-10-05): Packing Bench deployed

- Live commit 2d78018eff0890e4622b6382536296b4a251d8d8, Worker b7eb4353-a631-45b0-b0b1-b88cdea0dafc, on apex/www with existing cleanup schedule and DB/ASSETS/APP_ORIGIN. Chris approved exact v2 deploy and explicitly authorized Amazon's “No” declaration for all three sites; Confirm/reloaded saved listing and websiteListed:true release gate succeeded.
- Canonical receipt: DEPLOYMENT_PACKING_2D78018.md. 120 protected frozen source rows match; approved registration config is the only exception. Deploy exit 0; 96 assets (83 new / 13 existing), 977.15 KiB / gzip 244.57 KiB, startup 22 ms; no migration. Approved release 2d78018 is synced to origin/lane/site-improve-20261004-labelninja with upstream tracking; github-source-push.log records success. No master push/merge/PR.
- Passed live: 101 GET/96 served asset hashes, 15 launch checks, 31 route GET checks, 17 production canary checks including exact 3/200-page 4x6 PDFs and synthetic project lifecycle. Desktop Chrome passes correct versioned entry, no overflow/runtime errors.
- Live browser/traffic acceptance passes: desktop 1902 x 902 correct versioned entry/no overflow/runtime errors, phone 390 x 844 home/editor/converter each one H1/no overflow, corrected stock names, fanfold filter/reset and two-Rollo comparison. Worker 100% confirmed in deployments-after.log; deployment created 2026-10-05T22:50:45.722Z. Final live-browser-final.json has runtimeLogEntries:[]; live-home-reviewed.png shows public home at restored viewport. Owner session/content unchanged.
- Worker tail UNVERIFIED: no event sample, connected:false/health:null in worker-observation-final.json. Automatic approval review rejected corrective pretty-mode attempt under one-attempt boundary rule; no retry and no healthy-log claim. Optional separately authorized observation is not a core-deployment blocker. Physical printer/scan, recovery-email and sustained/image-heavy capacity acceptance remain unperformed; local Lighthouse is not field CWV.
- Rollback Worker 1f8eb5e4-8713-47ca-bbbd-579f3d62a450; immediate D1 bookmark 00000bf1-00000000-000050fb-4443b3e89188447ff7bd7b371a8e9d1f supersedes preparation's older bef bookmark. Preserve newer data; no migration applied.
- Everything is free, studio export remains account-backed, ads stay OFF. Affiliate registration is verified, but orders/revenue/ranking lift are not claimed.

## Historical October 1 pre-deploy snapshot (superseded)

Status (2026-10-01): paid-launch gates are RETIRED. Chris removed the payment system and Stripe; everything is free and revenue is ads only (ads off pending his decision). Live production is still ceb6a67 with the old 10-batch quota and paywall. The free-everything lane (branch lane/free-everything-20261001, base d354b16) is NOT deployed and awaits a Ready Check.

## Free-everything lane (candidate, not deployed)

- Removes all billing/Stripe code, quota and paywall; adds the free /shipping-label-to-4x6 converter, three guides, canonical www/http redirects and /pricing, /billing redirects. Billing DB tables stay dormant; no migration.
- Local evidence: npm test passes (spec-builders, redesign-contract, test-launch 52, whatnot-feature 105); test-label-crop 13 pass; wrangler dry-run bundle 976 KiB.
- Still required before deploy: Ready Check in Chrome (desktop + phone), Chris approval, clean release worktree, then RUNBOOKS.md release verification and the production canary.

## Former paid-launch evidence (historical)

The sections below record the paid-offer era. Their Stripe/quota gates no longer apply.

## Upgrade release ceb6a67 (historical; superseded)

- Explicit deploy approval for unchanged source ceb6a67; clean isolated backups/release-upgrade-20260907. Live Worker eacac403-fbac-4484-bd6f-24398f2232cf. Prior Whatnot Worker 99bd8c27-c9e0-479d-b418-08727ff37aa3 is the rollback target.
- Both domains match all 41 public source hashes and pass route/header/DB/offer gates. Production canary passes 17/17, including exact 3/200-page PDFs, one batch per PDF, no replay charge and saved-project lifecycle. Live browser preserves custom Whatnot settings through pricing/return; no browser warnings/errors. Sanitized health/pricing tail: two ok outcomes, zero exceptions.
- No pending migrations or schema/provider/plan changes. Paid gate still fails for configured:false, mode:test. Recovery point, canary footprint and exact evidence: DEPLOYMENT_UPGRADE_CEB6A67.md.

## Previous Whatnot release (historical evidence)

- Explicit Ready Check approval: source 79842db84aba8b1c296c892b071a3f19acc85132, clean detached backups/release-whatnot-79842db. Newer local upgrade-flow changes were preserved and excluded. No GitHub push.
- Live Worker 99bd8c27-c9e0-479d-b418-08727ff37aa3 on apex/www with existing cleanup schedule. No migration, provider or plan changes. Prior dffca000-41ea-47a0-af74-6b82fda69820 is the current rollback target.
- Both domains: Whatnot HTTP exact-source checks and route/header/DB/offer gates pass. Production synthetic account/PDF/project canary passes 17/17, including exact 3/200-page PDFs and no replay charge. Billing remains configured:false, mode:test; indexing/rankings and physical output are unverified.
- Full receipt and fresh D1 recovery point: DEPLOYMENT_WHATNOT_79842db.md. The upgrade candidate below is still local and needs its own review.

## Upgrade candidate before approval (historical evidence)

Local-only candidate added 2026-09-06: the paywall/pricing journey preserves in-tab drafts, returns to the last label tool, and displays actual remaining allowance. npm test adds 25 upgrade regressions; local workerd password check, real D1/PDF/quota integration, read-only HTTP gate, and dry-run (49 public assets; DB/ASSETS/APP_ORIGIN) passed. Browser fixture verified an edited label and custom Whatnot prefix/range/stock through the exhausted-account round trip; mobile view has no horizontal overflow and focuses the pricing heading. Fixture account/billing responses are simulated, not provider acceptance. The live pricing page was inspected and still displays Checkout unavailable. This upgrade improvement awaits exact-candidate review and was not included in the Whatnot deployment.

## Previous compatibility release (historical evidence)

- Chris explicitly approved fixing the compatibility issue and deploying. Source 72c5eb1321ad1a88c25ec043d20ee58eb8c5ae6d shipped from the clean detached worktree backups/release-20260906-portable, without GitHub push.
- Previous Worker: dffca000-41ea-47a0-af74-6b82fda69820; both existing custom domains and */15 * * * * cleanup schedule deployed. DB/ASSETS/APP_ORIGIN bindings confirmed. Bundle 995.30 KiB / gzip 248.99 KiB, startup 28 ms.
- Pre-repair D1 bookmark: 00000035-00000000-000050df-f254ab2e143577af074fc6133a562255. No migrations pending; migration 0003 was not replayed. Previous stable Worker 5ccad6c2-1846-49ab-9658-d49b87416c77 remains the rollback target, not the failed ed44eff2 version.
- Password repair is isolated in src/passwords.js: pinned @noble/hashes 2.4.0 implements PBKDF2-SHA256 with the same 600,000-round format and legacy verification. An isolated no-DB Cloudflare remote preview passed independent native-oracle equality, correct/wrong password and legacy checks before deploy; preview stopped. Local workerd also passed. No security work-factor downgrade or hosting-plan change.
- Live scripts/test-deploy-canary.mjs --allow-production: all 18 checks passed. Register 4242 ms; sign-in 4234 ms; bodyless sign-out and expired session rejection; wrong password 401; three-page export 483 ms consuming one batch; identical replay consumes no extra; 200-page export 1340 ms consuming one batch; both downloads have every page at 288x432 points; project save/reopen/delete succeeds.
- Synthetic footprint: new ln-release+20260907003637@bisket.com account, two seven-day PDFs, 8 free batches remaining, no remaining synthetic project. Generated password was held only in the test process, not logged or saved. No payment/email sent. Prior ln-canary-b3+20260907001414@bisket.com still signs in; targeted DB read confirms its hash prefix upgraded to pbkdf2$600000$. No existing customer data was modified by the test.
- Both apex and www pass the HTTP route/header/DB/offer checks. All 34 public SHA-256 hashes match the exact clean release. Sanitized live health/pricing logs report outcome:ok and zero exceptions. Chrome restores the owner's existing signed-in dashboard without replacing their account/session.
- Production secret names remain []; /api/config/pricing reports configured:false, mode:test. --require-live-billing fails as expected. Checkout and recovery email are NOT configured or end-to-end accepted. A working free workflow is not a paid SaaS launch.

## Earlier failed release and recovery (historical)

- Chris explicitly requested deploy after viewing the candidate. Deployed unchanged source b0bb4a5 from an isolated clean worktree at backups/release-20260906-b0bb4a5; no GitHub push.
- Pre-release Worker: 5ccad6c2-1846-49ab-9658-d49b87416c77. D1 recovery bookmark: 00000032-00000000-000050df-b1b2bcca6aa0d9510f1de43f9798d45f.
- Migration 0003 applied remotely at 2026-09-07 00:11:22 UTC. Release ed44eff2-0ade-4312-a48b-f89c5a1cad32 deployed at 00:11:28 UTC with both custom domains and the cleanup schedule.
- Both domains passed the HTTP gate. All 34 public file SHA-256 hashes matched the approved release. Sanitized live health/pricing tail records reported outcome:ok and zero exceptions. Those checks did not exercise password hashing.
- The single production canary registration returned 500. A targeted database lookup confirmed no user was created for that failed attempt; no PDF or payment followed.
- Rolled back to 5ccad6c2-1846-49ab-9658-d49b87416c77 at 100% traffic. Removed only this release's cleanup schedule after verifying its creation timestamp; schedules now empty. Additive migration remains, without restoring or deleting customer data.
- Recovery canary ln-canary-b3+20260907001414@bisket.com registered and exported job 8485c105-3470-4876-ab9c-bfea756971c5. Download: 2682-byte PDF, three pages at 288x432 points (4x6 inches), remaining free batches 9. Both live health endpoints return 200 with db:true.
- Root cause reproduced in an isolated remote-development Worker without database bindings: native PBKDF2 100,000 iterations succeeds; 600,000 returns NotSupportedError: iteration counts above 100000 are not supported. Local workerd accepts the same code, so local runtime proof is insufficient. Probe stopped; source retained under backups/crypto-probe-20260906.
- Cloudflare dashboard confirms Workers Paid is already the current plan. This failure is a crypto API limit, not evidence of an insufficient hosting plan. Do not silently lower the security work factor; replace the incompatible implementation and prove it remotely before a fresh approved release.

## Offer

Free for everyone (2026-10-01). Studio export needs a free account; limits are 200 pages/batch and 30 export requests/hour. No plans, quotas or payments. The former offer (10 batches total, then $9.99/month) is retired.

## Audit findings addressed in deployed code

| Severity | Finding | Fix and evidence |
| --- | --- | --- |
| High | Duplicate/concurrent exports could miscount credits; expiry could reopen a free allowance path | Atomic D1 claim/reservation, content hash, immutable completed/expired keys, race and expiry tests |
| High | A lost commit response or abandoned render could leave charging/output state inconsistent | Guarded chunk commit and compensation; interrupted-render recovery; failure-injection tests |
| High | Subscription status alone could grant Pro indefinitely | Paid-through required for all eligible states; missed/failed renewals and cancellation tests |
| High | Duplicate checkout and stale/retried billing events could corrupt customer access | Stable provider keys, saved attempts, duplicate purchase guard, current-state reconciliation, optimistic update, leased webhook claims |
| High | Saved project names reached HTML without escaping | Shared HTML encoder at dashboard and account sinks; ownership and XSS regression |
| High | Password recovery could log tokens instead of delivering email, and reset reuse was not atomic | Removed log fallback, configured provider only, bounded canonical email delivery, atomic reset and session revocation |
| High / resolved | Native 600,000-iteration PBKDF2 passes locally but fails on Cloudflare production | Pinned portable implementation preserves 600,000 rounds; actual-module remote oracle proof and new/legacy live logins passed |
| Medium | Cross-origin mutation/body handling and API caching were not explicit | Same-origin guard, JSON/byte caps, private no-store API responses, security headers |
| Medium | Image dimensions were trusted before decompression | Header-only dimension checks, total decoded-pixel cap; reject before reserving quota |
| Medium | Checkout/account deep links raced session bootstrap | Preserve requested account route through sign-in; tested in Chrome |
| Medium | Mobile signed-in header overlapped and hid account access | Responsive account/action layout; phone-width browser check |
| Medium | UI advertised unfinished conversion/import and exposed SEO planning text | Removed unsupported claims, rewrote guide section for actual label workflows |

## Completed verification

- npm test: 61 spec-builder checks, DOM/handler contract (42 queried IDs, 18 handlers, 123 unique page IDs), and 60 launch regressions passed, including bodyless browser sign-out and billing-portal POSTs.
- npm run test:runtime: the actual portable password module passes local workerd and real Cloudflare remote checks against Node's independent native PBKDF2 oracle, plus correct/wrong/legacy verification. The remote multi-derivation fixture took about 7.6 s wall time. The original native-only local result did not establish remote compatibility.
- npm run test:integration: real local Wrangler/D1 register, export, replay, history, exact 4x6 three-page PDF, ten-batch exhaustion, and eleventh-batch 402 passed after resetting only exhausted local test rate counters.
- npm run test:projects: local CRUD, ownership isolation, 256 KiB rejection, deletion, and 60/hour write limit passed.
- node scripts/check-launch.mjs: six real paths/content markers, security headers, D1 health, private API cache policy, and offer contract passed locally.
- The same HTTP script with --require-live-billing exits 1, correctly reporting unconfigured test-mode billing.
- npm audit --omit=dev: zero production dependency vulnerabilities reported. Browser CDN libraries and operational settings are separate surfaces.
- Wrangler dry-run and actual clean deployment: valid bundle with DB + ASSETS + APP_ORIGIN. Public preview files are excluded by .assetsignore; all 34 served public hashes match after deploy.
- Chrome: protected /billing prompts for sign-in; successful sign-in returns to account; reload retains the path. Mobile Account control works, pricing states checkout unavailable, no observed console errors in those flows. Chris subsequently explicitly approved the compatibility repair and deployment. Live Chrome dashboard restores the existing owner session.
- Migration 0003 also applied remotely during the release attempt; retained after rollback. See recovery evidence above.

## Gates still open

| Gate | Evidence / next action | Owner |
| --- | --- | --- |
| Recovery email | No production RESEND_API_KEY or verified EMAIL_FROM. Need a delivered recovery message and completed single-use reset from an owner-controlled inbox. | Chris + agent |
| Hosting capacity | Workers Paid confirmed. Compatibility repaired; one live 200-page vector PDF passed in 1.34 s. Measure image-heavy jobs, sustained load and CPU/memory separately. No plan change made. | Agent |
| Operational readiness | Configure error/delivery alerts, verify backup/recovery, check bounded cleanup keeps up with output volume (free exports may raise volume), and choose support ownership. | Chris + agent |
| Public terms | Terms/privacy rewritten for the free service in this lane. Confirm business operator, support mailbox and retention language; ads disclosure is needed before ads go on. No legal compliance clearance claimed. | Chris |
| Retired Stripe credentials | Code no longer reads STRIPE_*. After deploy, delete any STRIPE_* Worker secrets, disable the Stripe webhook endpoint, and revoke the previously exposed test key. | Chris |
| Physical output | Exact PDF geometry is proven. Rollo/tiny-stock printing and barcode scanning still need physical acceptance. | Chris |

## Limits and follow-ups

Email ownership verification, self-service account deletion, stricter CSP without inline handlers, high-volume output storage, and crawlable per-tool pages remain backlog items. Existing IP and per-user export limits mitigate abuse but do not prevent repeated account creation.

The historical Pages mirror is static and has no first-party API. Its deployment script was removed from the SaaS release path; no external mirror/DNS setting was changed. Decide whether to retire or redirect it before advertising the launch.

## Reference basis

- [Stripe webhook handling](https://docs.stripe.com/webhooks): signature verification, duplicate/out-of-order delivery, and retries.
- [Cloudflare native crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/): node:crypto availability with compatibility settings.
- [Noble hashes](https://github.com/paulmillr/noble-hashes): portable cryptographic implementation; version 2.4.0 is pinned in the lockfile. Actual runtime compatibility was tested, not inferred from the library's documentation.
- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): PBKDF2-HMAC-SHA256 work factor.
- [Cloudflare runtime limits](https://developers.cloudflare.com/workers/platform/limits/): CPU/memory budgets require production verification.
- [FTC ROSCA guidance](https://www.ftc.gov/business-guidance/blog/2018/07/time-rosca-recap-ftc-says-risk-free-trial-was-risky-not-free): clear terms, informed consent and cancellation. This checklist is engineering evidence, not legal advice.
