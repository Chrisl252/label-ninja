# Label Ninja workspace map

- Canonical source: C:\Code\label-ninja; GitHub Chrisl252/label-ninja.
- Runtime: Cloudflare Worker named label-ninja, custom domains label-ninja.com and www.label-ninja.com.
- Database: Cloudflare D1 label-ninja-db; local fixtures live under .wrangler/state/v3/d1.
- Preview: loopback http://127.0.0.1:8787 from npm run dev.
- Credential locations: ignored .dev.vars locally, Worker secret store in production. Values must never be copied into this map.
- backups/ is edit-time rollback only; scratch/ and public/_preview-tools.html contain prior-session work, not release input.
- Historical Pages mirror is not API-capable. Do not deploy to it for paid SaaS.
- No WSL, NAS, mapped-drive, or external run-host is required for this project.
