# Label Ninja current state

## Start here (2026-09-06)

- SaaS hardening is implemented locally; paid launch is NOT cleared. No production deployment or secret provisioning occurred this session.
- Offer confirmed by Chris: 10 PDF batches TOTAL, then $9.99 USD/month unlimited batches. One PDF, not one label, consumes a free batch.
- Local candidate includes atomic quota/idempotency, retry-safe billing, paid-through enforcement, single-use email recovery, stronger password hashing, project-name escaping, private API/security headers, bounded cleanup, and mobile account fixes.
- Migration 0003 is applied locally only; production still needs the additive migration with release approval.
- Verification: 60 launch regressions + 61 builder checks + DOM contract pass; workerd crypto test pass; real local D1 export and project suites pass. HTTP page/header gate passes locally. See LAUNCH_READINESS.md for exact boundaries.
- Current local preview is http://127.0.0.1:8787. Pricing states Checkout unavailable because provider configuration is absent/fake.
- Production read-only evidence: Worker secret list []; public pricing configured:false. Real Stripe, portal, email delivery, capacity and physical print acceptance remain unverified.
- Next: secure provider configuration, test-mode purchase/cancel/recovery, production capacity check, owner-approved live configuration, exact Chrome Ready Check, then migrate/deploy/verify.
- Existing old 100,000-iteration passwords remain valid and upgrade on login. New hashes use 600,000 with nodejs_compat; establish sufficient production CPU budget.
- Terms/contact/refund language is a draft requiring owner review. No automatic paid plan, DNS, or external publishing changes were made.
- Preserve unrelated scratch files and public/_preview-tools.html. The latter is excluded by public/.assetsignore.
- Last recorded production version before this work: 5ccad6c2-1846-49ab-9658-d49b87416c77; re-read provider version before release.
- The exposed test key still needs owner rotation. It was not copied to notes or source. No reusable secret store was created.

Module map: ARCHITECTURE.md. Procedures: RUNBOOKS.md. Remaining gate evidence: LAUNCH_READINESS.md.
