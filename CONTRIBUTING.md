# CONTRIBUTING.md — Label Ninja Conventions

## 1. Modular Design Rules

- **Rule 11 Compliance:** Keep files modular. Do not let `app.js` exceed ~500 lines.
- **Seam Isolation:** UI binding, Barcode rendering, and PDF export must live in clean, isolated functions.
- **Backups:** Create timestamped backups in `backups/` before major edits.

---

## 2. Standard Change Cycle

1. Read existing code & verify local state.
2. Back up affected files to `backups/`.
3. Make narrow edit.
4. Test in browser (or via local static server).
5. Append `DECISIONS_LOG.md` entry.
6. Refresh `PROJECT_STATE.md`.
