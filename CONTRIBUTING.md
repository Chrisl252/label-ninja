# CONTRIBUTING.md — Label Ninja Conventions

## 1. Modular Design Rules

- **Rule 11 Compliance:** Keep files modular. Do not let `app.js` exceed ~500 lines.
- **Seam Isolation:** UI binding, Barcode rendering, and PDF export must live in clean, isolated functions.
- **Backups:** Create timestamped backups in `backups/` before every edit.

---

## 2. Standard Change Cycle

1. Read existing code & verify local state.
2. Back up affected files to `backups/`.
3. Make narrow edit.
4. Run `npm test`. For API changes, start `wrangler dev` and run the matching integration suite (`npm run test:integration` and/or `npm run test:projects`).
5. Test meaningful desktop and mobile states in a browser; preserve the canvas coordinate system when scaling previews.
6. Append `DECISIONS_LOG.md` entry.
7. Refresh `PROJECT_STATE.md`.
