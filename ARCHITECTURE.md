# ARCHITECTURE.md — Label Ninja Module Map

## 1. Overview & Request Flow

Label Ninja is a static SPA plus a first-party Worker API on the same domain. Static assets are served by Cloudflare Workers Static Assets; **the Worker only runs when no asset matches**, so `/api/*` hits the Worker and every other path stays static (unchanged from the pure-static era, including SPA fallback).

```
Browser ──> Cloudflare edge
              ├─ asset match (/, /app.js, ...) ──> public/ static asset (Worker not invoked)
              ├─ /api/export* ──────────────────> src/export.js (PDF pipeline)
              │     ├─ POST /api/export        ─> rate limit(30/h user) -> validate spec -> idempotency
              │     │                             -> ATOMIC ledger reservation -> render (pdf-lib)
              │     │                             -> D1 output_chunks -> completed (+7d expiry)
              │     ├─ GET /api/exports         ─> history (lazy expiry sweep)
              │     └─ GET/DELETE /api/export/:id[/download] ─> ownership-gated job + bytes
              └─ /api/* ────────────────────────> src/worker.js (router)
                                                  ├─ /api/health          ─> src/auth.js (D1 probe)
                                                  ├─ /api/auth/*          ─> src/auth.js (sessions, PBKDF2, reset)
                                                  │     └─ guards: src/ratelimit.js, src/validate.js, src/http.js
                                                  └─ anything else        ─> 404 {"error":{"code":"not_found"}}
D1 database label-ninja-db (binding DB) backs users/sessions/ledger/rate limits.
Output storage: D1 blobs (output_chunks, 400KB chunks) — R2 unavailable on the account (error 10042).
```

Export pipeline order (POST /api/export): **rate limit -> validate (nothing consumed on 400) -> idempotency replay (completed = same body, no new use) -> atomic reservation (`INSERT..SELECT..WHERE remaining > 0`, changes=0 -> 402) -> job row -> render -> chunk store -> complete**. Any failure after reservation deletes the ledger row (failed exports consume zero).

## 2. Directory Layout

```
label-ninja/
├── wrangler.toml          # main=src/worker.js + [assets] + D1 binding + ADMIN_EMAILS var
├── migrations/
│   ├── 0001_init.sql      # schema v1 — all tables (users, sessions, reset tokens,
│   │                      #   export_jobs, usage_ledger, webhook_events, projects,
│   │                      #   printer_profiles, rate_limits)
│   └── 0002_outputs.sql   # schema v2 — output_chunks (D1-blob PDF storage, PK job_id+seq)
├── src/                   # backend (plain ESM, no build step)
│   ├── worker.js          # thin router: /api/export* -> export.js, /api/* -> auth.js, else ASSETS
│   ├── auth.js            # auth domain logic + route table + /api/health
│   ├── export.js          # export domain: reservation, storage, downloads, history
│   ├── entitlements.js    # free-use formula + pro-active check (single source of truth)
│   ├── spec-validate.js   # job-spec validation (all 400s fire pre-consumption)
│   ├── limits.js          # export pipeline caps (pages/elements/images/body/TTL)
│   ├── code128.js         # pure-JS CODE128 encoder (Code Set B, patterns + checksum)
│   ├── render/
│   │   └── pdf-label.js   # pdf-lib renderer + test_print diagnostic generator
│   ├── db.js              # PBKDF2 hash/verify, sha256 token hashing, ids, timing-safe compare
│   ├── http.js            # JSON response helpers, HttpError, guarded body reader (param cap)
│   ├── validate.js        # email/password/token-shape validation (400s)
│   └── ratelimit.js       # fixed-window counters in D1: per-IP auth (10/h), per-user export (30/h)
├── scripts/
│   ├── test-auth-local.ps1   # 24-check local auth suite against wrangler dev
│   ├── test-export-local.ps1 # 13-case + bonus export suite (metering/idempotency/race/limits)
│   ├── test-export-prod.ps1  # production canary evidence (burns exactly 1 use)
│   └── verify-pdf.mjs        # PDF dimension proof (page count + pt/in per page, optional asserts)
├── public/                # static SPA (frontend — unchanged in brick 1)
└── scratch/, src/index.js # preserved prior-session artifacts (NOT deployed, do not touch)
```

## 3. Backend Module Inventory

| Module | Route(s) | Responsibility |
|---|---|---|
| **router** | all | `src/worker.js` — dispatch `/api/*` vs static; SPA fallback via ASSETS binding |
| **auth** | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/reset-request`, `POST /api/auth/reset-confirm` | `src/auth.js` — user creation (admin bootstrap via `ADMIN_EMAILS`), sessions; free-uses math delegated to `src/entitlements.js` |
| **export** | `POST /api/export`, `GET /api/exports`, `GET /api/export/:id`, `GET /api/export/:id/download`, `DELETE /api/export/:id` | `src/export.js` — atomic reservation-then-generate metering (one use = one completed job; failures compensate the ledger row), D1 chunk storage (400KB), 7-day expiry + lazy sweep, ownership-scoped 404s, `private, no-store` downloads |
| **entitlements** | — | `src/entitlements.js` — `granted + admin deltas − export count`; pro-active = plan/subscription_status/paid_through. Imported by auth + export; never duplicated |
| **spec-validate** | — | `src/spec-validate.js` — job-spec shape/caps (pages ≤200, elements ≤200/page, text ≤2000, images ≤20/page + 8MB total, body ≤10MB, 4MB/image), barcode charset, PNG/JPEG magic checks, webp → 400 `unsupported_image_format`, pdf_convert → 501 `not_implemented_yet`. All pre-consumption |
| **renderer** | — | `src/render/pdf-label.js` — pdf-lib: exact `setSize(w*72, h*72)` pages, text (Helvetica/Bold, WinAnsi sanitize, top-down y, multi-line 1.2×), CODE128 as vector rects, rect/line, PNG/JPEG embeds. `buildTestPrintSpec()` = built-in diagnostic tool |
| **code128** | — | `src/code128.js` — Code Set B encoder: 107-pattern table, checksum, bar/space widths (verified against spec vectors) |
| **limits** | — | `src/limits.js` — every pipeline cap in one place |
| **health** | `GET /api/health` | `src/auth.js` — `SELECT 1` probe; `db:false` + 500 on failure |
| **crypto** | — | `src/db.js` — `pbkdf2$100000$salt$hash` passwords, SHA-256(token) storage, constant-time compare |
| **guards** | — | `src/http.js` (JSON errors `{"error":{code,message,...extra}}`, body cap → 413), `src/validate.js`, `src/ratelimit.js` (10/h per IP auth, 30/h per user export) |

## 4. Frontend (static SPA — unchanged)

| Module | Location | Description |
|---|---|---|
| **UI Shell** | `public/index.html` | Single-page label studio layout |
| **Barcode Engine** | `public/app.js` | 1D/2D barcodes via JsBarcode |
| **PDF Generator** | `public/app.js` | Inch-precise canvas & PDF output for thermal printers |
| **Preset Configurator** | `public/app.js` | Label specs (Dymo 30334/30336, 4x6 Rollo, Whatnot stock) |

## 5. Conventions

- All API responses JSON; success `{"ok":true,...}`, error `{"error":{"code","message"}}`. Same-origin — no CORS headers. No secrets in responses or logs.
- Schema changes = new numbered file in `migrations/`, applied with `wrangler d1 migrations apply label-ninja-db --local` then `--remote`. Never edit an applied migration.
- New API domain = new module in `src/` + one route line in `src/auth.js`'s `handleApi` (or a sibling handler wired in `worker.js`). No monoliths.
