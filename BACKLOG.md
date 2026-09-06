# BACKLOG.md — Label Ninja Work Queue

## Launch Complete

- [x] Custom visual label editor with local artwork uploads.
- [x] Warehouse bin, Whatnot number, FNSKU, and CSV batch generators.
- [x] Exact physical print contracts for 4x6 and small thermal stock.
- [x] Responsive desktop/mobile UI.
- [x] GitHub push and Cloudflare Worker production deployment.
- [x] Synchronized Cloudflare Pages mirror.

## Next Acceptance Pass

1. [ ] Print one warehouse bin label on Chris's Rollo with 4x6 portrait paper, zero margins, and 100% scale.
2. [ ] Print a short Whatnot sequence on 1x0.5 landscape stock at 100% scale.
3. [ ] Record the exact Rollo driver paper names that work on this PC in `SYSTEM_REFERENCE.md`.

## Open (2026-09-06)

1. [x] Stabilize the Print Bench redesign: assembled page, modular CSS, mobile-safe exact canvas, permanent UI contract test, and saved-project integration proof.
2. [ ] **Next brick — make the offer internally consistent:** one $9.99/month Stripe price, monthly-only pricing/paywall contract, real checkout + portal, truthful feature comparison, and an explicit product definition for “10 free prints” (PDF exports vs physical pages).
3. [ ] **End-of-day security gate:** rotate the Stripe test secret exposed in chat, then store the replacement only in a local ignored env/credential store and the Worker secret store. Never put it in Obsidian, Jarvis notes, source, or git.
4. [ ] `/pricing` is still the SPA guides section, not a real page. Do not index it until the route has unique, crawlable content.
5. [ ] Only 2 URLs are indexable (`/`, `/privacy`). Every tool lives behind a `#hash`, so Google sees one page. Real crawlable per-tool landing pages are the traffic brick.
6. [ ] B7 CSV batch (PapaParse already loaded); `pdf_convert` still returns 501 server-side.

No open deployment blocker remains — production is healthy on Worker `5ccad6c2-1846-49ab-9658-d49b87416c77`.
