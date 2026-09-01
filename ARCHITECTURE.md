# ARCHITECTURE.md — Label Ninja Module Map

## 1. Overview & Request Flow

Label Ninja is a static SPA plus a first-party Worker API on the same domain. Static assets are served by Cloudflare Workers Static Assets; **the Worker only runs when no asset matches**, so `/api/*` hits the Worker and every other path stays static (unchanged from the pure-static era, including SPA fallback).

```
Browser ──> Cloudflare edge
             ├─ asset match (/, /app.js, ...) ──> public/ static asset (Worker not invoked)
             └─ /api/* ────────────────────────> src/worker.js (router)
                                                 ├─ /api/health          ─> src/auth.js (D1 probe)
                                                 ├─ /api/auth/*          ─> src/auth.js (sessions, PBKDF2, reset)
                                                 │     └─ guards: src/ratelimit.js, src/validate.js, src/http.js
                                                 └─ anything else        ─> 404 {"error":{"code":"not_found"}}
D1 database label-ninja-db (binding DB) backs users/sessions/ledger/rate limits.
Storage plan: R2 `label-ninja-outputs` when R2 is enabled on the account (Brick 2; D1 blobs as fallback).
```

## 2. Directory Layout

```
label-ninja/
├── wrangler.toml          # main=src/worker.js + [assets] + D1 binding + ADMIN_EMAILS var
├── migrations/
│   └── 0001_init.sql      # schema v1 — all tables (users, sessions, reset tokens,
│                          #   export_jobs, usage_ledger, webhook_events, projects,
│                          #   printer_profiles, rate_limits)
├── src/                   # backend (plain ESM, no build step)
│   ├── worker.js          # thin router: /api/* -> handleApi, else -> ASSETS binding
│   ├── auth.js            # all auth domain logic + route table + /api/health
│   ├── db.js              # PBKDF2 hash/verify, sha256 token hashing, ids, timing-safe compare
│   ├── http.js            # JSON response helpers, HttpError, guarded body reader (100KB cap)
│   ├── validate.js        # email/password/token-shape validation (400s)
│   └── ratelimit.js       # fixed-window per-IP counter in D1 (429 + Retry-After)
├── scripts/
│   └── test-auth-local.ps1  # 24-check local suite against wrangler dev
├── public/                # static SPA (frontend — unchanged in brick 1)
└── scratch/, src/index.js # preserved prior-session artifacts (NOT deployed, do not touch)
```

## 3. Backend Module Inventory

| Module | Route(s) | Responsibility |
|---|---|---|
| **router** | all | `src/worker.js` — dispatch `/api/*` vs static; SPA fallback via ASSETS binding |
| **auth** | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/reset-request`, `POST /api/auth/reset-confirm` | `src/auth.js` — user creation (admin bootstrap via `ADMIN_EMAILS`), sessions, free-uses math (`granted + admin_grant/admin_revoke deltas − export count`, `unlimited` when pro+active), reset tokens |
| **health** | `GET /api/health` | `src/auth.js` — `SELECT 1` probe; `db:false` + 500 on failure |
| **crypto** | — | `src/db.js` — `pbkdf2$100000$salt$hash` passwords, SHA-256(token) storage, constant-time compare |
| **guards** | — | `src/http.js` (JSON errors `{"error":{code,message}}`, 100KB body cap → 413), `src/validate.js`, `src/ratelimit.js` (10/hr per IP on auth endpoints) |

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
