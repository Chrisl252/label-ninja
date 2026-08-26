# RUNBOOKS.md — Label Ninja Runbooks

## 1. Local Development

```powershell
cd C:\Code\label-ninja
python -m http.server 5100 --directory public --bind 127.0.0.1
```

Open `http://127.0.0.1:5100/`.

## 2. Pre-Deploy Verification

1. Run the inline JavaScript syntax check used in the session.
2. Run `git diff --check`.
3. Run `wrangler deploy --dry-run`; it must read the four files under `public/`.
4. Ready Check the exact local candidate in Chrome at desktop and mobile widths.

## 3. Deployment

The custom domains are served by the Worker; Pages is the mirror. Push the verified commit first, then run:

```powershell
npm run deploy
npm run deploy:pages
```

Production endpoints:

- `https://label-ninja.com`
- `https://www.label-ninja.com`
- `https://label-ninja.pages.dev`

Verify HTTP 200 from all three and compare each downloaded `index.html` SHA-256 with local `public/index.html`.

## 4. Thermal Printer Acceptance

- Warehouse bins: 4 x 6 in (102 x 152 mm), Portrait, Margins None, Scale 100%.
- Whatnot 1 x 0.5: 25 x 13 mm, Landscape, Margins None, Scale 100%.
- Never use the 10% custom scale shown in the original faulty preview.
