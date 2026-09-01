# DECISIONS_LOG.md — Label Ninja Decision Record

## 2026-08-31: SaaS pivot brick 2 — server-side PDF export engine + atomic 10-use metering

- **Reservation-then-generate pattern:** `POST /api/export` enforces the free entitlement with a single atomic statement — `INSERT INTO usage_ledger ... SELECT ... WHERE (granted + admin deltas − export count) > 0`. `stmt.changes === 0` → 402 `free_limit_reached` with `upgrade_url:"/pricing"` inside the error object; the client's spec is never deleted. Pro-active users (plan/subscription_status/paid_through via `src/entitlements.js`) skip reservation entirely (no ledger row, `uses_consumed=0`, `remaining_free_uses:null`). Entitlement math extracted from auth.js into `src/entitlements.js` — one formula, two consumers.
- **Compensation on failure:** any render/store error after reservation deletes the ledger row and marks the job `failed` — a failed export consumes zero uses (proven: corrupt-PNG payload → 500 `export_failed`, `/me` unchanged). Logs carry job id + error class only; `settings_json` is never stored or logged (it can contain user label text).
- **D1 chunk storage (R2 unavailable, error 10042):** completed PDFs live in `output_chunks` (`migrations/0002_outputs.sql`, composite PK `job_id, seq`) as ≤400KB BLOBs, ≤96 chunks/output. Read path concatenates `ORDER BY seq` into a `Uint8Array`. 7-day expiry with a lazy bounded sweep (50 jobs/pass, runs on POST + history GET); DELETE drops chunks immediately. Downloads: `Content-Disposition: attachment`, `Cache-Control: private, no-store`.
- **Renderer (`src/render/pdf-label.js` + `src/code128.js`):** pure pdf-lib vector output — exact `setSize(w_in*72, h_in*72)` pages, Helvetica/Bold text with WinAnsi sanitization (unsupported glyphs → `?`, avoids pdf-lib encode throws), top-down y with 0.75×ascent conversion, multi-line at 1.2×, and a from-scratch CODE128 encoder (107-pattern table + mod-103 checksum, bars as rects; verified against spec vectors: `A` → start `211214`, check `131123`, stop `2331112`). `tool='test_print'` is a real product feature: server-generated diagnostic page (border, corner L-marks, 1-inch ruler with 1/8in ticks, orientation text, dated, CODE128 `TEST-12345`).
- **Limits (`src/limits.js`, all pre-consumption):** 200 pages, 200 elements/page, 2000 chars/text, 20 images/page, 8MB total + 4MB/image base64, 10MB body, coords/dims ≤100in, barcode values printable-ASCII ≤200 (400 `invalid_barcode_value`), images PNG/JPEG magic-checked (400 `invalid_image`/`unsupported_image_format`; WebP rejected — client converts), `pdf_convert` → 501 `not_implemented_yet` (Brick 3). Rate limit 30/hour/user (`export:<uid>` bucket, reuses `rate_limits` table).
- **Idempotency:** unique `(user_id, idempotency_key)` replay returns the same completed job body with no new use; failed/processing/expired rows under the same key are deleted (with any orphan ledger row) and retried fresh.
- **Endpoints:** `POST /api/export`, `GET /api/exports?limit=`, `GET /api/export/:id`, `GET /api/export/:id/download`, `DELETE /api/export/:id` — all auth-required; foreign job ids 404 (never 403, no existence leak). Wired in `src/worker.js` (one prefix dispatch, router still thin). `package.json` → `"type":"module"` (src is ESM; enables node-side verify scripts to import it).
- **Verification:** `scripts/test-export-local.ps1` — 13/13 cases (fresh user 10 remaining; 3-page export → consumed 1; idempotent replay same id; exhaustion 10+402; history/delete/410; `%PDF` + headers; dimension proofs **288.00×432.00pt (4×6in)** and **70.87×36.85pt (25×13mm)** via `scripts/verify-pdf.mjs`; corrupt-image compensation; test_print; ownership 404; parallel race exactly one 200 + one 402; 31st-in-hour 429) + bonus pro-override pass. Auth suite still 24/24. Prod canary `ln-canary-b2+20260831181300@bisket.com`: one export, `/me` remaining 9, idempotent replay same id, download dimension-proofed. Production exhaustion math NOT exercised (deliberate — proven locally).
- **Release:** Worker version `d73cb865-5ca4-4c78-9a02-a2ed39495df8`, migration 0002 applied local+remote.

## 2026-08-31: SaaS pivot brick 1 — Worker API + D1 auth

- **Decision:** Add a plain-ESM Worker API at `/api/*` on the same domain (Worker runs only when no static asset matches; assets block + custom domains unchanged). D1 database `label-ninja-db` (id `852d3ccd-83b6-4ab9-9c39-49a1cf77b88b`) bound as `DB`; migration `0001_init.sql` applied local+remote with all forward tables (export_jobs, usage_ledger, projects, printer_profiles, webhook_events) so future bricks never re-shape v1.
- **Auth design:** PBKDF2-SHA256 (100k iters, 16-byte salt) passwords; 32-byte-hex session tokens in HttpOnly+Secure+SameSite=Lax cookie `ln_session` (30d), stored as SHA-256(token) in `sessions`; logout deletes; password reset via 48-byte-hex tokens (1h, single-use, revoke all sessions) "sent" through pluggable mailer (Resend when `RESEND_API_KEY` set, else `[RESET-LINK]` console.log read via `wrangler tail`). Login burns dummy PBKDF2 on unknown email to kill timing enumeration.
- **Rate limits:** fixed-window counter in D1 `rate_limits` — 10/hour per IP across register/login/reset endpoints; 429 + `Retry-After`.
- **ADMIN_EMAILS bootstrap:** `[vars] ADMIN_EMAILS="chrislucas252@gmail.com"` → matching registrants get role `admin`.
- **R2:** bucket creation failed (`code 10042` — R2 not enabled on the account). No `OUTPUTS` binding; Brick 2 output storage falls back to D1 blobs or needs R2 enabled in the dashboard first.
- **Endpoints:** `GET /api/health`, `POST /api/auth/{register,login,logout,reset-request,reset-confirm}`, `GET /api/auth/me` (free-uses math: granted + admin adjustments − export count; `unlimited:true` when pro+active). Verified 24/24 local checks (`scripts/test-auth-local.ps1`) and full curl pass in production.
- **Release:** commit `5b8611e`, Worker version `0e4d7460-db61-4bac-8be9-2a183d51e2d6`, canary account `ln-canary+20260831175445@bisket.com` registered in prod.

## 2026-08-31: Ads off — Adsterra removed from operational pages

- **Decision:** Remove all Adsterra ad units (leaderboard + rectangles) from `index.html` and `privacy.html`, set `ADS.enabled: false` in `js/ads-config.js`, and drop the `ads.js` module import and AdSense `adsbygoogle.js` loader from both pages. The integration (`js/ads.js` + `js/ads-config.js`) stays in the repo behind the flag; `ads.txt` stays.
- **Reason:** SaaS pivot — ads damage trust in the conversion workflow. Possible future reuse limited to public SEO guide pages.
- **Release:** commit `ef33427`, Worker version `9a41b050-7bc3-4946-8ba9-87a7aee5b1e2`, deployed to Worker custom domains + Pages mirror, verified ad-free on all three endpoints. Also committed prior 08-29 SEO fixes (`e906248`: robots.txt, sitemap URLs, guide copy).

## 2026-08-29: Adsterra display ads + privacy page

- **Decision:** Add Adsterra 728x90 and 300x250 display units across Label Ninja, plus a dedicated `/privacy.html` for AdSense qualification.
- **Reason:** Google allows other networks on the same site if the page still follows publisher policy. Popunder, Social Bar, and Smartlink stay off. Ads load in sandboxed srcdoc iframes because Adsterra `invoke.js` uses `document.write`.
- **Placement:** Leaderboard under the header on every view. Rectangle on the editor (below the canvas), each tool, Printer Guides, and the privacy page. Slots in hidden tabs do not load until that tab is shown.

## 2026-08-25: Freemium Pivot & Domain Acquisition

- **Decision:** Chris acquired `label-ninja.com`. Pivot project to 100% Freemium & Unlimited tool.
- **Changes:**
  - Removed all payment gates, LemonSqueezy modals, and MVP mentions.
  - Implemented 100% client-side CSV manifest parsing via PapaParse.
  - Added support for 5 thermal printer label presets and 5 barcode symbology types (CODE128, UPC-A, EAN-13, CODE39, QR Code).
- **Deployment Plan:** Target Cloudflare Pages static edge host for zero hosting costs.

## 2026-08-26: Physical Print Contracts, Local Artwork, and Production Hosting

- **Decision:** Every generator sets an explicit physical CSS page size before printing. Warehouse bins use 4x6 portrait pages; Whatnot stock is selectable and defaults to 1x0.5 landscape.
- **Reason:** Browser viewport sizing and printer-driver defaults produced oversized or clipped labels. Exact CSS inches keep one complete label on each physical sheet when the matching driver paper, zero margins, and 100% scale are selected.
- **Decision:** Custom-editor image uploads remain browser-only. Accept PNG, JPEG, and WebP files up to 8 MB; do not upload or retain user files on a server.
- **Reason:** This preserves privacy, eliminates storage cost, and keeps untrusted files away from a server boundary.
- **Decision:** `label-ninja.com` and `www` are served by Cloudflare Worker Static Assets. `label-ninja.pages.dev` remains a synchronized mirror.
- **Reason:** The custom domains were already attached to the Worker; static-assets mode deploys the canonical `public/` directory directly and removes the stale generated-worker seam.
