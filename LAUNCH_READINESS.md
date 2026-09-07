# Label Ninja launch readiness

Status: compatibility repair and SaaS hardening deployed and live account/PDF/project checks passed. Updated 2026-09-06 (evidence is Sep 7 UTC). Paid production launch remains blocked by provider provisioning/acceptance. Billing credentials and the hosting plan were not changed.

## Current repaired release

- Chris explicitly approved fixing the compatibility issue and deploying. Source 72c5eb1321ad1a88c25ec043d20ee58eb8c5ae6d shipped from the clean detached worktree backups/release-20260906-portable, without GitHub push.
- Current Worker: dffca000-41ea-47a0-af74-6b82fda69820; both existing custom domains and */15 * * * * cleanup schedule deployed. DB/ASSETS/APP_ORIGIN bindings confirmed. Bundle 995.30 KiB / gzip 248.99 KiB, startup 28 ms.
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

## Confirmed offer

Chris confirmed 10 PDF batches total. A PDF containing 1 or 200 labels consumes one free batch. Failed generation consumes no batch; an available PDF may be re-downloaded without another charge. Pro is $9.99 USD/month with unlimited batches during paid access, subject to the disclosed 200-page and 30-request/hour safeguards. There is no annual plan.

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
| Stripe payout verification | Read-only live dashboard inspection showed Payments active but Payouts paused on Sep 6, 2026. Outstanding task: Provide a valid ID document. That tab was later closed; no identity documents or secrets were revealed/submitted. | Chris completes the task directly in Stripe |
| Stripe provisioning | Production secret list returned []; public /api/config/pricing returned configured:false. Need matching test and live API key, monthly price, signing secret, terms URL, and enabled billing portal. Screenshot of a product is not checkout proof. | Chris provides secure access; agent wires and verifies |
| Real billing lifecycle | Mock-provider checks passed; no actual purchase, webhook delivery, portal cancellation, renewal failure, or live payment has been tested. Test-mode acceptance first; live payment only with explicit approval. | Agent + Chris |
| Recovery email | No production RESEND_API_KEY or verified EMAIL_FROM. Need a delivered recovery message and completed single-use reset from an owner-controlled inbox. | Chris + agent |
| Hosting capacity | Workers Paid confirmed. Compatibility repaired; one live 200-page vector PDF passed in 1.34 s. Measure image-heavy jobs, sustained load and CPU/memory separately. No plan change made. | Agent |
| Operational readiness | Configure error/delivery alerts, verify backup/recovery, check bounded cleanup keeps up with output volume, and choose support ownership. No monitoring service was provisioned. | Chris + agent |
| Public terms | Service-terms/privacy drafts now describe the offer and data flows. Confirm business operator, support mailbox, refund handling, retention and tax requirements. No legal/tax compliance clearance claimed. | Chris |
| Secrets | The pasted test secret remains exposed and needs rotation. It was not saved to Obsidian, Jarvis, source, or a new reusable store. Use project-scoped restricted replacements and a secure store. | Chris |
| Physical output | Exact PDF geometry is proven. Rollo/tiny-stock printing and barcode scanning still need physical acceptance. | Chris |

## Limits and follow-ups

Email ownership verification, self-service account deletion, stricter CSP without inline handlers, automated billing reconciliation, high-volume output storage, and crawlable per-tool pages remain backlog items. Free credits are per account, not per real-world person. Existing IP limits mitigate abuse but do not prevent repeated account creation.

The historical Pages mirror is static and has no first-party API. Its deployment script was removed from the SaaS release path; no external mirror/DNS setting was changed. Decide whether to retire or redirect it before advertising the launch.

## Reference basis

- [Stripe webhook handling](https://docs.stripe.com/webhooks): signature verification, duplicate/out-of-order delivery, and retries.
- [Cloudflare native crypto](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/): node:crypto availability with compatibility settings.
- [Noble hashes](https://github.com/paulmillr/noble-hashes): portable cryptographic implementation; version 2.4.0 is pinned in the lockfile. Actual runtime compatibility was tested, not inferred from the library's documentation.
- [OWASP password storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html): PBKDF2-HMAC-SHA256 work factor.
- [Cloudflare runtime limits](https://developers.cloudflare.com/workers/platform/limits/): CPU/memory budgets require production verification.
- [FTC ROSCA guidance](https://www.ftc.gov/business-guidance/blog/2018/07/time-rosca-recap-ftc-says-risk-free-trial-was-risky-not-free): clear terms, informed consent and cancellation. This checklist is engineering evidence, not legal advice.
