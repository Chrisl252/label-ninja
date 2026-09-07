# Label Ninja current state

## Start here (2026-09-06)

- The approved SaaS release was deployed on Sep 6 and ROLLED BACK after production registration returned 500. Current live Worker is the previous 5ccad6c2-1846-49ab-9658-d49b87416c77; paid launch is NOT cleared.
- Offer confirmed by Chris: 10 PDF batches TOTAL, then $9.99 USD/month unlimited batches. One PDF, not one label, consumes a free batch.
- Local candidate includes atomic quota/idempotency, retry-safe billing, paid-through enforcement, single-use email recovery, stronger password hashing, project-name escaping, private API/security headers, bounded cleanup, and mobile account fixes.
- Migration 0003 is applied locally AND remotely. Additive columns remain after rollback; the newly created cleanup cron was removed (zero schedules).
- Verification: 60 launch regressions + 61 builder checks + DOM contract pass; workerd crypto test pass; real local D1 export and project suites pass. HTTP page/header gate passes locally. See LAUNCH_READINESS.md for exact boundaries.
- Current local preview is http://127.0.0.1:8787. Pricing states Checkout unavailable because provider configuration is absent/fake.
- Production read-only evidence: Worker secret list []; public pricing configured:false. Real Stripe, portal, email delivery, capacity and physical print acceptance remain unverified.
- Chrome is already signed into the live Bisket Stripe dashboard. Account status shows Payments active but Payouts paused since Sep 6: Provide a valid ID document. Chris must complete that identity task directly in Stripe; no documents/keys were revealed or submitted.
- Release blocker: remote node:crypto PBKDF2 rejects 600,000 iterations with NotSupportedError (100,000 ceiling), although local workerd passed. No account was created by the failed registration. Replace the incompatible KDF implementation without silently weakening security, prove it in the real remote runtime, then obtain fresh release approval.
- Recovery verified: one synthetic account registered on the restored Worker and downloaded a three-page 4x6 PDF, consuming one batch (9 remaining); both domain health endpoints return 200/db:true.
- Hosting plan is verified Workers Paid in Chrome; no upgrade/spending change made. Worst-case PDF capacity remains unverified.
- Terms/contact/refund language is a draft requiring owner review. No automatic paid plan, DNS, or external publishing changes were made.
- Preserve unrelated scratch files and public/_preview-tools.html. The latter is excluded by public/.assetsignore.
- Failed release version: ed44eff2-0ade-4312-a48b-f89c5a1cad32, source b0bb4a5. Recovery point and detailed evidence: LAUNCH_READINESS.md. No git push or provider-secret provisioning occurred.
- The exposed test key still needs owner rotation. It was not copied to notes or source. No reusable secret store was created.

Module map: ARCHITECTURE.md. Procedures: RUNBOOKS.md. Remaining gate evidence: LAUNCH_READINESS.md.
