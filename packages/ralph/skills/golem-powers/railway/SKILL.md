---
name: railway
description: Deploy and manage the golems cloud-worker on Railway. Use when deploying backend changes, checking logs, managing env vars, or restarting services. Wraps `railway` CLI. Covers railway, deploy, cloud-worker, redeploy, logs, variables. NOT for: Vercel deployments, frontend, Supabase.
---

# Railway Operations

> Manages the golems cloud-worker service on Railway. The cloud-worker runs email poller, job scraper, briefing, and soltome learner.

## CRITICAL: Working Directory

**ALWAYS run Railway commands from `packages/autonomous/`** — NOT from the monorepo root.

```bash
cd ~/Gits/golems/packages/autonomous
```

The Dockerfile and `railway.json` live here. Running from the wrong directory causes "Could not find root directory" errors.

---

## Project Info

| Key | Value |
|-----|-------|
| Project | `helpful-empathy` |
| Service | `golems` |
| Environment | `production` |
| Entry point | `bun run src/cloud-worker.ts` |
| Health check | `/health` |

---

## Quick Actions

| What you want to do | Workflow |
|---------------------|----------|
| Deploy latest code | [workflows/deploy.md](workflows/deploy.md) |
| Check logs | [workflows/logs.md](workflows/logs.md) |
| Manage env vars | [workflows/variables.md](workflows/variables.md) |
| Restart without rebuilding | [workflows/restart.md](workflows/restart.md) |
| Check status | [workflows/status.md](workflows/status.md) |

---

## When to Deploy

Deploy to Railway after merging PRs that change:
- `packages/autonomous/src/cloud-worker.ts` (schedules, worker config)
- `packages/autonomous/src/email-golem/` (email processing)
- `packages/autonomous/src/job-golem/` (job scraping)
- `packages/autonomous/src/lib/cloud-llm.ts` (Haiku backend)
- `packages/autonomous/Dockerfile` or `railway.json`

Do NOT forget to deploy after backend PRs merge. Use the CLI — no "manual redeploy" needed.
