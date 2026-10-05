# Label Ninja workspace map

- Active source: C:\Code\label-ninja.com\lane-site-improve-20261004, branch lane/site-improve-20261004-labelninja, base 379fb71; GitHub Chrisl252/label-ninja. Former label-ninja checkout was deleted by Chris October 1.
- Runtime: Cloudflare Worker named label-ninja, custom domains label-ninja.com and www.label-ninja.com.
- Last recorded v2 release (October 1): source ab63404 / Worker 1f8eb5e4-8713-47ca-bbbd-579f3d62a450, source lane-free-20261001. Later content source base is 379fb71; re-read Cloudflare version before any future deployment. Earlier paid receipts are historical.
- Database: Cloudflare D1 label-ninja-db; local fixtures live under .wrangler/state/v3/d1.
- Approved Packing Bench candidate preview: loopback http://127.0.0.1:8797/ from this active worktree; Wrangler --local-upstream localhost:8797, local D1 only. This runs real studio/API/converter code, not a static mockup or Cloudflare preview deployment. Standard npm run dev uses 8787.
- Credential locations: ignored .dev.vars locally, Worker secret store in production. Values must never be copied into this map.
- backups/ holds edit rollback, frozen candidates and isolated release receipts/checkouts; none is canonical source. scratch/ contains prior-session work, not release input. The obsolete /_preview-tools route must remain excluded by public/.assetsignore; no preview file exists in the frozen public tree.
- Historical Pages mirror is not API-capable. Deploy the complete Worker site, which includes the API.
- No WSL, NAS, mapped-drive, or external run-host is required for this project.

- Upgrade UI fixture: scripts/preview-upgrade-flow.mjs, loopback 8799, simulated account/billing only; never a live service or deploy target. The approved Whatnot and upgrade-flow repair are both deployed on the existing Worker.

- Packing Bench release preparation is committed as f1699eccaf1f47b20a9e93343af6e92b51f7daf7; Chris approved unchanged v2 deploy and site registration (“approved deploy”). Only pending gate is the owner audience declaration covering all three Associates properties; automatic review rejected “No” because that attestation was not authorized and includes unrelated properties. Async question pending, Amazon tab handed off, no option selected; registration remains unverified and websiteListed:false. No production deploy or GitHub push.
- Historical direction review: design/redesign-20261005/, loopback static review URL http://127.0.0.1:8809/index.html. Chris approved Packing Bench and the real implementation is on 8797. Proposals remain outside public/ and excluded from Worker release; their controls/artwork do not generate real exports. Current evidence is indexed in the design README and QA.md.
- Frozen approved input: backups/packing-20261005/release-candidate-v2/, manifest release-candidate-v2-sha256.json: 121 entries including 98 physical public assets. Detached release checkout backups/packing-release-20261005/release-checkout is pinned to f1699eccaf1f47b20a9e93343af6e92b51f7daf7 and matches all 121 hashes. Locked npm ci (40 packages), isolated npm test and dry-run passed; 109 asset entries, 977.15 KiB / gzip 244.57 KiB, DB/ASSETS/APP_ORIGIN. This copy is release input, not canonical source.

- Pre-deploy recovery baseline: live Worker unchanged 1f8eb5e4-8713-47ca-bbbd-579f3d62a450; D1 bookmark 00000bef-00000000-000050fb-d17b0152450b718a8710492d826a3a6e; no pending remote migrations. Release receipt/logs and handed-off Amazon declaration screenshot: backups/packing-release-20261005/.
