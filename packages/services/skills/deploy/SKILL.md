---
name: deploy
description: Deploy the cloud worker to Railway. Builds and pushes the latest code.
---

# Deploy to Railway

Deploy the golems cloud worker to Railway.

## Process

1. Verify we're on a clean git state (no uncommitted changes)
2. Run tests: `bun test` — must pass
3. Push current branch to remote
4. Trigger Railway deployment: `railway up` or git-based deploy
5. Monitor deployment logs: `railway logs --follow`
6. Verify health endpoint: `curl https://golems-production.up.railway.app/`
7. Report deployment status

## Environment

- **Railway URL**: `golems-production.up.railway.app`
- **Entry point**: `packages/services/src/cloud-worker.ts`
- **Required env vars**: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TELEGRAM_*`
