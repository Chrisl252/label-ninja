# Label Ninja workspace map

- Active source: C:\Code\label-ninja.com\lane-site-improve-20261004, branch lane/site-improve-20261004-labelninja, base 379fb71; GitHub Chrisl252/label-ninja. Former label-ninja checkout was deleted by Chris October 1.
- Runtime: Cloudflare Worker named label-ninja, custom domains label-ninja.com and www.label-ninja.com.
- Last recorded v2 release (October 1): source ab63404 / Worker 1f8eb5e4-8713-47ca-bbbd-579f3d62a450, source lane-free-20261001. Later content source base is 379fb71; re-read Cloudflare version before any future deployment. Earlier paid receipts are historical.
- Database: Cloudflare D1 label-ninja-db; local fixtures live under .wrangler/state/v3/d1.
- Approved Packing Bench candidate preview: loopback http://127.0.0.1:8797/ from this active worktree; Wrangler --local-upstream localhost:8797, local D1 only. This runs real studio/API/converter code, not a static mockup or Cloudflare preview deployment. Standard npm run dev uses 8787.
- Credential locations: ignored .dev.vars locally, Worker secret store in production. Values must never be copied into this map.
- backups/ is edit-time rollback only; scratch/ and public/_preview-tools.html contain prior-session work, not release input.
- Historical Pages mirror is not API-capable. Do not deploy to it for paid SaaS.
- No WSL, NAS, mapped-drive, or external run-host is required for this project.

- Upgrade UI fixture: scripts/preview-upgrade-flow.mjs, loopback 8799, simulated account/billing only; never a live service or deploy target. The approved Whatnot and upgrade-flow repair are both deployed on the existing Worker.

- Packing Bench implementation and affiliate candidate remain local only. Final exact-candidate release review and Associates website registration are pending; websiteListed:false closes the release gate. No deployment, GitHub push or external account change. Current rollback files: backups/packing-20261005/; earlier affiliate evidence: backups/affiliate-20261005/.
- Historical direction review: design/redesign-20261005/, loopback static review URL http://127.0.0.1:8809/index.html. Chris approved Packing Bench and the real implementation is on 8797. Proposals remain outside public/ and excluded from Worker release; their controls/artwork do not generate real exports. Current evidence is indexed in the design README and QA.md.
- Frozen review/release input: backups/packing-20261005/release-candidate-v2/, manifest release-candidate-v2-sha256.json: 121 files including 98 physical public assets; source and frozen copy match. Local dry run reports 109 asset entries. This rollback/release copy is not canonical source; approval/listing gate remains closed.
