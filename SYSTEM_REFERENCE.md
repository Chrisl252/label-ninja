# SYSTEM_REFERENCE.md — Label Ninja

- **Canonical path:** `C:\Code\label-ninja`
- **GitHub:** `https://github.com/Chrisl252/label-ninja`
- **Branch:** `master`
- **Local preview:** `http://127.0.0.1:5100/`
- **Production Worker:** `https://label-ninja.com`, `https://www.label-ninja.com`
- **Cloudflare Pages mirror:** `https://label-ninja.pages.dev`
- **Deploy config:** `wrangler.toml` using `[assets] directory = "./public"`
- **Runtime:** static client-side HTML, CSS, and JavaScript
- **External browser libraries:** Tailwind CSS, JsBarcode, PapaParse, PDFMake, and Tesseract.js via CDN
- **Release commit:** `478ca96a229953704cce86777551136d4b6ae276`
- **Worker version:** `5e799b62-7c72-4fb8-bce5-4e421fd5b30a` (brick 4 — Stripe billing backend, live but unconfigured)

## Stripe billing setup (test mode) — THE remaining external step

Billing code is live in production but returns structured 503s / `configured:false` until these
secrets exist. All four are Worker secrets (never wrangler.toml, never committed):

```powershell
# from C:\Code\label-ninja
npx wrangler secret put STRIPE_SECRET_KEY        # sk_test_... from Stripe dashboard (Developers > API keys)
npx wrangler secret put STRIPE_WEBHOOK_SECRET    # whsec_... from the webhook endpoint created below
npx wrangler secret put STRIPE_PRICE_MONTHLY     # price_... of the monthly test price
npx wrangler secret put STRIPE_PRICE_ANNUAL      # price_... of the annual test price
```

Stripe dashboard steps (test mode):

1. **Products** → Add product "Label Ninja Pro" → recurring pricing → create TWO prices:
   `$15/month` and `$150/year` (copy both `price_...` ids).
2. **Developers → Webhooks** → Add endpoint: `https://label-ninja.com/api/webhooks/stripe`,
   events: `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed` → copy the Signing secret
   (`whsec_...`).
3. Run the four `wrangler secret put` commands above (order does not matter).
4. Verify: `curl https://label-ninja.com/api/config/pricing` → `"configured":true` with real
   amounts; register → `POST /api/billing/checkout {"plan":"monthly"}` → Stripe test Checkout URL
   (card `4242 4242 4242 4242`, any future date/CVC) → `/api/auth/me` flips to `plan:pro`.

Local dev: copy `.dev.vars.example` → `.dev.vars` (fakes already in place: `sk_test_fake_local`,
`whsec_fake_local_secret`, `price_fake_monthly`/`price_fake_annual`). `scripts/test-billing-local.ps1`
signs its own webhook events with the fake secret — no real key needed locally.
