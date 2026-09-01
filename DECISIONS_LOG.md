# DECISIONS_LOG.md — Label Ninja Decision Record

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
