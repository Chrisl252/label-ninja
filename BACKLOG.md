# Label Ninja backlog

## Required before paid launch

- [ ] RELEASE BLOCKER: replace native 600,000-iteration PBKDF2 with a secure Worker-compatible implementation; real remote runtime rejects it despite local success. Add remote proof before fresh approval. Previous Worker restored; migration 0003 remains remote.
- [ ] Operator/agent: secure test Stripe price, API secret, destination secret, terms URL and portal configuration; real checkout/cancel/renewal test.
- [ ] Operator/agent: verified recovery-email sender and successful inbox/reset test.
- [ ] Agent: measure deployed CPU/memory and 200-page output capacity. Workers Paid is already enabled; no upgrade needed for the confirmed crypto API incompatibility.
- [ ] Chris: confirm billing operator, refund/contact language and tax requirements.
- [ ] Chris/agent: rotate exposed test key; provision distinct live credentials securely.
- [ ] Chris: fresh exact-candidate approval after hashing fix; agent: clean Worker release and registration/export verification. Production migration 0003 already applied.
- [ ] Chris/agent: approved real payment canary and operational alert/backup/restore checks.
- [ ] Chris: physical Rollo 4x6 and tiny-stock print/scan acceptance.

## Implemented locally on 2026-09-06

- [x] One-time 10 PDF batches and monthly-only $9.99 offer throughout the UI.
- [x] Atomic export reservation, input-bound replay, expiry without refunds, interrupted-render recovery.
- [x] Customer/checkout idempotency, duplicate-subscription prevention, owned confirmation and retry-safe webhooks.
- [x] Paid-through expiry and cancellation semantics; failed renewal does not extend access.
- [x] Password recovery without token logs; single-use reset/session revocation; stronger hash upgrade.
- [x] Project HTML escaping, CSRF/body guards, private responses, resource caps.
- [x] Honest feature copy, service-terms draft, mobile account access and meaningful verification scripts.

## After launch / scaling

- [ ] Email verification and stronger signup abuse controls; evaluate account takeover/recovery policy.
- [ ] Automated monitoring and reconciler for stuck billing events/checkout attempts; paging destination needs owner choice.
- [ ] R2 output storage and adaptive cleanup throughput once volume warrants it.
- [ ] Self-service verified account deletion and explicit operational retention policy.
- [ ] Replace inline handlers, tighten CSP, vendor browser dependencies or add SRI.
- [ ] Dedicated crawlable tool/pricing routes and page-specific metadata; current tools remain one SPA.
- [ ] CSV import and PDF conversion, with their own specification and tests. Do not advertise before implementation.
- [ ] International text/font coverage and physical barcode acceptance across printers.
- [ ] Retire or redirect the old static Pages mirror after explicit approval.
