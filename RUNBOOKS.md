# Label Ninja runbooks

## Local verification

Run from C:\Code\label-ninja:

- npm ci
- npx wrangler d1 migrations apply label-ninja-db --local
- npm run dev (loopback port 8787)
- npm test
- npm run test:runtime
- npm run test:integration
- npm run test:projects
- node scripts/check-launch.mjs
- npx wrangler deploy --dry-run

The dry run must include DB and ASSETS bindings. A config change to nodejs_compat requires restarting Wrangler if its hot reload exits. Do not treat a 200 on an unknown SPA path as proof of a valid page; check the expected content.

To run scheduled cleanup locally, GET http://127.0.0.1:8787/cdn-cgi/local/scheduled. This mutates only local D1.

## Provider acceptance before paid launch

1. Configure a test-mode Stripe price at $9.99 USD/month, test API key, destination signing secret, terms URL and Customer Portal.
2. In test mode, verify registration, the first 10 batches, the eleventh-batch paywall, checkout, subscription activation, invoices/portal, cancellation, failed renewal, expired paid access, and re-subscription. Verify duplicate webhook deliveries do not double-apply.
3. Configure Resend and a verified sender. Deliver a real recovery email to an owner-controlled inbox; use the link, prove one-time behavior and session revocation.
4. Obtain owner approval for live configuration and spending. Configure distinct live key/price/webhook/portal. Never paste secrets into chat or logs.
5. Confirm production CPU/storage capacity. Test representative 200-page and image-heavy jobs. Inspect provider usage rather than inferring capacity from local speed.
6. Owner reviews public operator/contact/refund language and applicable tax requirements. The service-terms draft is not a legal compliance certification.

## Release gate

Show the exact release candidate in Chrome at desktop and phone widths. Ask for explicit approve/deny. Do not deploy before approval or change the artifact after approval.

Check the diff and stage only named intended paths; preserve scratch and co-worker files. Commit locally. A direct master push remains owner-gated. If the working tree contains unrelated work, create a clean detached worktree under the project's backups/release area or another explicitly approved C:\Code release path, pinned to the approved commit. Use npm ci there; do not use junction-based destructive cleanup.

Record the current Worker version and a D1 recovery point/export. With approval, apply additive migration 0003 to the remote database, then deploy the approved Worker. Do not remove columns or erase customer data. Do not deploy public/ to Pages: it lacks the API.

Verify apex and www real PATH routes /pricing, /billing, /reset, /privacy, /terms and /api/health. Compare served public files to the approved commit. Run the HTTP check with LN_BASE set to the deployed origin and --require-live-billing. Then run the separately approved payment/email canary; an HTTP gate alone cannot certify those workflows.

## Operational checks

Check /api/health, Stripe webhook failures, payment-failure handling, mail delivery, Worker errors/CPU, and D1 storage. Example bounded read-only investigations:

- SELECT event_id,type,result,processed_at FROM webhook_events WHERE result LIKE 'error:%' OR result LIKE 'processing:%' ORDER BY processed_at DESC LIMIT 20;
- SELECT id,status,started_at FROM export_jobs WHERE status='processing' ORDER BY started_at LIMIT 20;
- SELECT id,expires_at FROM export_jobs WHERE status='completed' AND expires_at <= <now_ms> ORDER BY expires_at LIMIT 20;

Read first; do not clear ledger entries or expire paid users as a diagnostic. Retry a failed Stripe delivery through the provider after fixing its cause. Unknown checkout outcomes retain their original idempotency key; after 23 hours without a stored session, reconcile in Stripe before releasing the attempt.

## Rollback and support

Roll back Worker code to the recorded version if needed; keep additive D1 columns. Do not restore an old full database over new purchases. Reconcile any in-flight checkout/webhook first. Support must verify account ownership before deletion and account for billing/audit retention. Account deletion is a support workflow, not an implemented self-service API.

Physical acceptance remains separate: print and scan a 4x6 Rollo label and a 1x0.5 Whatnot label at actual size, zero margins. Record the driver stock names and result.
