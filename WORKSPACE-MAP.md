# Label Ninja workspace map

- Canonical source: C:\Code\label-ninja; GitHub Chrisl252/label-ninja.
- Runtime: Cloudflare Worker named label-ninja, custom domains label-ninja.com and www.label-ninja.com.
- Current verified release: source ceb6a67 / Worker eacac403-fbac-4484-bd6f-24398f2232cf; isolated deploy worktree backups/release-upgrade-20260907. This is a release copy, not canonical source. Prior Whatnot Worker 99bd8c27-c9e0-479d-b418-08727ff37aa3 is the rollback target; see DEPLOYMENT_UPGRADE_CEB6A67.md.
- Database: Cloudflare D1 label-ninja-db; local fixtures live under .wrangler/state/v3/d1.
- Preview: loopback http://127.0.0.1:8787 from npm run dev.
- Credential locations: ignored .dev.vars locally, Worker secret store in production. Values must never be copied into this map.
- backups/ is edit-time rollback only; scratch/ and public/_preview-tools.html contain prior-session work, not release input.
- Historical Pages mirror is not API-capable. Do not deploy to it for paid SaaS.
- No WSL, NAS, mapped-drive, or external run-host is required for this project.

- Upgrade UI fixture: scripts/preview-upgrade-flow.mjs, loopback 8799, simulated account/billing only; never a live service or deploy target. The approved Whatnot and upgrade-flow repair are both deployed on the existing Worker.
