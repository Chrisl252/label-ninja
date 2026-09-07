# Label Ninja current state

## Start here (2026-09-06; deployment evidence Sep 7 UTC)

- LIVE: approved upgrade-flow repair ceb6a67b6dfa8fe3634b53fa0d1fbfe7d091c877, Worker eacac403-fbac-4484-bd6f-24398f2232cf, on label-ninja.com and www. Receipt: DEPLOYMENT_UPGRADE_CEB6A67.md.
- Preserves the already-live Whatnot feature from 79842db. Paywall opens pricing in the same document; return restores the same tool and draft; pricing shows actual allowance and focuses the offer on deliberate entry.
- Both domains: all 41 public file hashes match approved source; route/header/DB/offer gates pass. Live synthetic account/PDF/project canary passes 17/17; sanitized health/pricing tail: two ok outcomes, zero exceptions.
- Live browser: SHIP-21 through SHIP-75 on 3x2 stock survives pricing -> return; 55 labels / 1 PDF batch, no warnings/errors. No mutation of the owner's account.
- Offer unchanged: 10 PDF batches TOTAL, then $9.99 USD/month. Production pricing remains configured:false, mode:test; --require-live-billing correctly fails. Payment/recovery setup is the next revenue brick.
- Release gate: 61 builders, DOM contract, 60 launch, 87 Whatnot and 25 upgrade checks pass. Earlier local runtime, real D1/PDF/quota integration and phone UI checks passed. No post-approval product edits.
- Clean isolated release: backups/release-upgrade-20260907. Exact reviewed bytes retained across Git newline normalization. Worker bundle 995.30 KiB / gzip 248.99 KiB; startup 31 ms; existing DB/ASSETS/APP_ORIGIN and cleanup schedule.
- Rollback target: Whatnot Worker 99bd8c27-c9e0-479d-b418-08727ff37aa3. Pre-release D1 bookmark: 00000072-00000000-000050df-86835d5328f34df70c38e7fd61fec466. No migrations pending or applied.
- Canary footprint: ln-release+20260907053132@bisket.com, two expiring PDFs, 8 batches remaining; its synthetic project deleted. No payment/email or customer record change.
- No provider credentials, pricing, hosting plan, DNS or GitHub push changed. Saved projects remain necessary for durable drafts across full reload/external checkout.
- Earlier Stripe handoff records an owner identity/payout task and exposed test key; this release did not recheck the dashboard. Do not ask for the previously nonexistent credential file or copy old keys.
- Other paid-launch gates: recovery delivery, real checkout/webhook/portal lifecycle, key rotation, operations/capacity, terms review and physical Rollo/tiny-stock acceptance.
- Preserve prior release worktrees, DEPLOYMENT_WHATNOT_79842db.md, public/_preview-tools.html and unrelated scratch files. Canonical source remains C:\Code\label-ninja.

Module map: ARCHITECTURE.md. Procedures: RUNBOOKS.md. Full recovery/evidence: LAUNCH_READINESS.md and the deployment receipt.
