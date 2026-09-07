# Label Ninja current state

## Start here (2026-09-06)

- New requested brick: The Whatnot Labels feature and print-size guide are built LOCALLY, awaiting exact-candidate Ready Check approval. Audience/action/tone confirmed by Chris; no new production release yet. Preview: http://127.0.0.1:8787/whatnot-labels.
- New feature proof: 87 Whatnot tests plus the existing 61 builder/60 launch/DOM checks pass; all three stocks pass local authenticated PDF/quota/replay tests. Two static HTML URLs and supporting assets match served source bytes. Chrome verified range errors, settings transfer with an existing session, phone/tablet layouts and long-prefix containment. Deployment dry run: 48 public files, DB/ASSETS bindings. See SEO_STRATEGY.md.
- Compatibility repair and SaaS hardening are LIVE on both domains: Worker dffca000-41ea-47a0-af74-6b82fda69820, source 72c5eb1. Chris explicitly approved the repair and deployment. Paid launch is NOT cleared.
- Offer confirmed by Chris: 10 PDF batches TOTAL, then $9.99 USD/month unlimited batches. One PDF, not one label, consumes a free batch.
- Deployed code includes atomic quota/idempotency, retry-safe billing, paid-through enforcement, single-use recovery plumbing, portable stronger password hashing, project-name escaping, security headers, bounded cleanup, and mobile account fixes.
- Migration 0003 is applied locally AND remotely. Cleanup cron */15 * * * * is deployed. No migration was replayed for the repair.
- Verification: 60 launch regressions + 61 builder checks + DOM contract; real local D1 integration; actual password module passes both local and Cloudflare remote checks. Live canary passes all 18 checks, including registration, legacy login, 3/200-page PDFs, replay accounting, and project save/reopen/delete.
- Current local preview is http://127.0.0.1:8787. Pricing states Checkout unavailable because provider configuration is absent/fake.
- Production read-only evidence after repair: both domain HTTP gates pass; all 34 asset hashes match source; health/pricing logs outcome:ok and zero exceptions. Worker secret list []; pricing configured:false. Paid-billing gate deliberately fails.
- Earlier read-only inspection used the signed-in live Bisket Stripe dashboard: Payments active, Payouts paused since Sep 6, task Provide a valid ID document. Chris must complete that identity task directly in Stripe; no documents/keys were revealed or submitted. The Stripe tab was subsequently closed.
- Root cause fixed: Cloudflare native PBKDF2 caps at 100,000 despite local support. src/passwords.js uses pinned @noble/hashes 2.4.0 with the same 600,000-round format. Real remote proof matches an independent native oracle; the previous synthetic account upgraded successfully.
- Live fixture ln-release+20260907003637@bisket.com generated two PDFs (3 and 200 pages), leaving 8 batches; only its synthetic project was deleted. No payment or email sent. Existing customer data was not changed by the canary.
- Workers Paid is already enabled; no plan/spending change. Live registration/sign-in took about 4.2 s each; 200-page vector export 1.34 s. Image-heavy capacity, sustained load and physical printing remain unverified.
- Terms/contact/refund language is a draft requiring owner review. Only the approved existing-Worker release was published; no new paid plan, domain, or provider configuration was created.
- Preserve unrelated scratch files and public/_preview-tools.html. The latter is excluded by public/.assetsignore.
- Clean release: backups/release-20260906-portable. Previous stable Worker 5ccad6c2-1846-49ab-9658-d49b87416c77 is the rollback target; failed ed44eff2 must not be restored. Recovery bookmark/evidence: LAUNCH_READINESS.md. No GitHub push or provider-secret provisioning occurred.
- The exposed test key still needs owner rotation. It was not copied to notes or source. No reusable secret store was created.

Module map: ARCHITECTURE.md. Procedures: RUNBOOKS.md. Remaining gate evidence: LAUNCH_READINESS.md.
