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
3. Run `wrangler deploy --dry-run`; it must read every file under `public/` **and list `env.ASSETS` among the bindings**. If `env.ASSETS` is missing, every deep link will 500 in production (see DECISIONS_LOG 2026-09-02).
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

## 3b. Post-Deploy Path-Route Smoke Check (mandatory)

Asset paths and `#hash` routes are both served by `/`, so neither proves the SPA fallback works. Curl the **path** routes:

```bash
for u in / /pricing /reset "/reset?token=abc" /billing /account /privacy /foo /api/health; do
  printf "%-22s -> " "$u"; curl -s -o /dev/null -w "%{http_code}\n" --max-time 12 "https://label-ninja.com$u"
done
```

All must be `200`. Repeat against `https://www.label-ninja.com`. Anything returning `{"error":{"code":"internal_error"}}` means the Worker is handling the path and `env.ASSETS` is unavailable.

## 3c. Clean-Lane Deploy (when the working tree has co-worker WIP)

Never `wrangler deploy` from a dirty tree — it ships someone else's unfinished work. Deploy from a detached worktree pinned to the last-deployed commit plus your change:

```bash
git worktree add --detach C:\Code\_worktrees\ln-<lane> <last-deployed-commit>
cmd //c "mklink /J C:\Code\_worktrees\ln-<lane>\node_modules C:\Code\label-ninja\node_modules"
cd C:\Code\_worktrees\ln-<lane>   # apply the narrow change here, then:
npx wrangler deploy --dry-run     # confirm bindings + asset count
npx wrangler deploy
```

Teardown, in this order (the junction must go first or a recursive delete can eat the real `node_modules`):

```bash
cmd //c "rmdir C:\Code\_worktrees\ln-<lane>\node_modules"
git worktree remove C:\Code\_worktrees\ln-<lane> --force
```

## 4. Thermal Printer Acceptance

- Warehouse bins: 4 x 6 in (102 x 152 mm), Portrait, Margins None, Scale 100%.
- Whatnot 1 x 0.5: 25 x 13 mm, Landscape, Margins None, Scale 100%.
- Never use the 10% custom scale shown in the original faulty preview.
