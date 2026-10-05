# Label Ninja agent bootloader

Parent rules: C:\Code\twilight\claude-brain\DECREES.md and the user-global contract.

Active source is C:\Code\label-ninja.com\lane-site-improve-20261004 (branch lane/site-improve-20261004-labelninja). The former label-ninja checkout was deleted by Chris on 2026-10-01; do not recreate or use it. Read PROJECT_STATE.md, then LAUNCH_READINESS.md before claiming launch readiness. Read ARCHITECTURE.md before changing a domain, and RUNBOOKS.md before any deployment.

Everything is free (owner decision 2026-10-01): no plans, quotas, payments or Stripe. Chris authorized affiliate shopping links on 2026-10-05; all tools remain free. Validate with npm run check:affiliates; check:affiliates:release additionally requires a verified Associates website listing. Ads stay off (public/js/ads-config.js enabled:false) until Chris decides. A free account is still required to export from the studio; abuse limits (30 exports/hour, 200 pages/batch) remain. Do not reintroduce pricing or invent working features.

Use npm test, npm run test:runtime, and local full-stack integration checks. Never run mutation suites against production without explicit approval. Never ship the old static Pages mirror as the SaaS. No secret values in source, notes, chat, or command arguments. Preserve unrelated working files and back up before edits.
