# RUNBOOKS.md — Label Ninja Runbooks

## 1. Local Development Runbook

```powershell
# Serve public directory locally on port 5099
cd C:\Code\label-ninja
python -m http.server 5099
# Open http://localhost:5099 in browser
```

## 2. Deployment Runbook

- Target Host: Cloudflare Pages / Static Edge host
- Command: `wrangler pages deploy public --project-name label-ninja`
