# Label Ninja backlog

## Whatnot Labels feature and search launch

- [x] Build a public numbered-label setup page and a separate print-size troubleshooting guide, preserving the existing Print Bench design and metered export flow.
- [x] Verify all-stock PDF dimensions, long-prefix fitting, quota/replay and settings transfer; add canonical metadata, structured data, internal links and sitemap entries.
- [ ] Chris: approve or deny the exact local candidate shown in Chrome. Agent then deploys the unchanged approved source and verifies both public domains.
- [ ] Chris/agent: authorized Search Console access, sitemap submission and indexing checks. Establish actual queries/impressions/clicks before expanding the content cluster. No ranking guarantee.

## Required before paid launch

- [x] Compatibility release: portable 600,000-round PBKDF2, real remote oracle/legacy proof, explicit repair/deploy approval, and 18/18 live account/PDF/project checks. Source 72c5eb1 is deployed.
- [ ] Operator/agent: secure test Stripe price, API secret, destination secret, terms URL and portal configuration; real checkout/cancel/renewal test.
- [ ] Operator/agent: verified recovery-email sender and successful inbox/reset test.
- [ ] Agent: measure CPU/memory, image-heavy jobs and sustained load. One deployed 200-page vector batch passed in 1.34 s; Workers Paid already enabled.
- [ ] Chris: confirm billing operator, refund/contact language and tax requirements.
- [ ] Chris/agent: rotate exposed test key; provision distinct live credentials securely.
- [x] Chris approved compatibility repair/deploy; clean Worker release and real registration/export verification complete. Production migration 0003 was already applied.
- [ ] Chris/agent: approved real payment canary and operational alert/backup/restore checks.
- [ ] Chris: physical Rollo 4x6 and tiny-stock print/scan acceptance.

## Deployed code on 2026-09-06 (provider configuration still open)

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
