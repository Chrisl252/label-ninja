# Label Ninja current state

## Start here (2026-10-01, LIVE)

- LIVE 2026-10-02T00:35Z: commit 03a1229 (branch lane/free-everything-20261001, worktree C:\Code\label-ninja.com\lane-free-20261001), Worker version 28e897a3-ba6c-4cf3-a276-c1cd2f8076f9 on label-ninja.com + www. Pushed; origin/master fast-forwarded to 03a1229 (local master in the main checkout still at d354b16 with the superseded dirty tree).
- Rollback: Worker eacac403-fbac-4484-bd6f-24398f2232cf (ceb6a67, old paywall build) via wrangler rollback.
- Owner decision (Chris): payment system and Stripe removed; everything is free; revenue = ads only. Ads still OFF (public/js/ads-config.js enabled:false) pending his call.
- Removed: all billing/Stripe/entitlement modules, dead src/index.js, paywall/pricing/plan frontend. Billing DB tables dormant, no migration.
- Export: no quota; free account still required in the studio (401 without session); 30 exports/hour, 200 pages/batch kept.
- New: free in-browser /shipping-label-to-4x6 (no upload/account); 3 new guides; rewritten home, Whatnot, privacy, terms; sitemap 9 URLs.
- src/redirects.js: www/http -> https://label-ninja.com 301; /pricing, /billing -> / 301. run_worker_first = true.
- Live evidence: all 9 sitemap URLs + /api/health 200; /pricing, /billing, www, http 301 to apex; /api/config/pricing 404; home has 0 stripe/9.99 hits. npm test exit 0; test-label-crop exit 0.
- No Chrome Ready Check happened (preview killed by low memory); Chris approved deploy without it. Eyeball the live 4x6 tool with a real label.
- GSC sitemap resubmit FAILED 403 (wgf gsc token is read-only scope). Submit/inspect in the GSC UI. Baseline 90d: ~150 impr, 13 clicks.
- Stripe cleanup: nothing to do — wrangler secret list returns [] and no Stripe webhook was ever created. Ads: Chris said ON; blocked — ad wells need a looser CSP on SEO pages (script/frame/img https:), which needs his explicit permission. GSC check at 28/56 days.
- Superseded $9 Stripe candidate: C:\Code\label-ninja.com\label-ninja\backups\uncommitted-9usd-candidate.bak-20261001-154856.patch. Main checkout C:\Code\label-ninja.com\label-ninja still has that dirty tree at d354b16.

Module map: ARCHITECTURE.md. Procedures: RUNBOOKS.md. Evidence: LAUNCH_READINESS.md. Backlog: BACKLOG.md.

## History

### Previous start here (2026-09-06; deployment evidence Sep 7 UTC)

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
