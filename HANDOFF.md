# Label Ninja handoff

Chris approved deployment. The unchanged candidate was deployed as ed44eff2-0ade-4312-a48b-f89c5a1cad32, then rolled back because production registration returned 500. Previous Worker 5ccad6c2-1846-49ab-9658-d49b87416c77 is live and passed registration plus one exact-size PDF canary. Migration 0003 remains applied remotely; release-created cleanup cron removed. See LAUNCH_READINESS.md for recovery point and evidence.

First blocker is now confirmed crypto compatibility: remote node:crypto PBKDF2 rejects 600,000 iterations with NotSupportedError (100,000 ceiling), while local workerd passes. A no-DB remote-development probe reproduced both outcomes and was stopped. Do not silently weaken hashing; implement a secure Worker-compatible alternative, test remotely, and obtain fresh approval before redeploy. Workers Paid is already enabled, so upgrading the account is not the fix.

Chris answered the credential-location question: he only has the test keys already pasted in chat. Do not ask him to find a nonexistent file or paste those keys again. Chrome is already signed into the live Bisket Stripe dashboard. Read-only account status shows Payments active but Payouts paused since Sep 6, with the task Provide a valid ID document. Chris must complete that task directly in Stripe; the account-status page is open. No identity documents or secrets were revealed or submitted. Secure billing and recovery-email configuration still need completion; the production Worker has no secrets.

Keep the preview at http://127.0.0.1:8787 available for review. Configure the correct canonical origin per environment before sending a real reset link. Full launch also needs capacity, operational and physical checks; do not call HTTP 200 or a mock checkout a paid launch.

Do not manually reapply migration 0003. Preserve unrelated scratch artifacts; public/_preview-tools.html is excluded from assets. No GitHub push or paid-provider configuration mutation occurred. Retain the isolated release and probe under backups as evidence. The working production canary is synthetic; no existing customer account was modified.
