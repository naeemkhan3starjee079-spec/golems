# Railway & Cloud Infrastructure Rules

## Railway Project
- **Project:** `helpful-empathy` (production)
- **Service:** `golems`
- **URL:** `golems-production.up.railway.app`
- **Health:** `GET /health` returns `{"status":"ok",...}`
- **Usage:** `GET /usage` returns API call stats, token counts, cost

## NEVER Use `railway down` Without a Recovery Plan

`railway down` kills the running instance. If builds are broken, you can't get it back.

**Before pausing:**
1. Verify builds are succeeding (check recent deployments)
2. Have a rollback plan (known working deployment ID)
3. Prefer `railway service restart` over down+up

## Deploy Methods (in order of preference)

1. **Git push to master** — Railway auto-deploys from GitHub (most reliable)
2. **`railway redeploy -y`** — Redeploys from latest linked commit
3. **`railway up -d`** — Uploads local code directly (use only as fallback)

**Never `railway up` from a feature branch** — it uploads wrong code to production.

## When Builds Fail

1. Check `railway deployment list` — are ALL recent deploys failing?
2. Check `railway logs <deployment-id>` — is it stuck at scheduling or failing at build?
3. **Stuck at "scheduling build on Metal builder"** — Railway platform issue, not your code
   - File support ticket at railway.com
   - Try `railway redeploy` (uses different build path than `railway up`)
   - Check https://status.railway.com
   - Snooze stop hook: `touch ~/.claude/hooks/railway-snooze`
4. **Failing at build** — likely code/Dockerfile issue, check build logs
5. **Failing at deploy** — check health endpoint timeout, start command, env vars

## Health Monitoring

The Claude stop hook (`~/.claude/hooks/keep-going.py`) checks Railway health on every session stop in the golems directory. If Railway is down, it blocks Claude from stopping.

- **Snooze:** `touch ~/.claude/hooks/railway-snooze` (when issue is known/unfixable)
- **Unsnooze:** `rm ~/.claude/hooks/railway-snooze`
- Only fires in golems sessions (checks cwd)

## Environment Variables

Managed via `railway variables`. Key vars:
- `ANTHROPIC_API_KEY` — Haiku for cloud LLM
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — DB access
- `TELEGRAM_BOT_TOKEN` — notifications
- `AXIOM_TOKEN` — observability
- `GMAIL_*` — email polling
- `GOOGLE_GENERATIVE_AI_API_KEY` — Gemini fallback

## Cloud Worker Schedule (Israel Time)

| Schedule | Service |
|----------|---------|
| Hourly 6am-7pm (skip 12pm) + 10pm | Email poller |
| 6am, 9am, 1pm (Sun-Thu) | Job scraper |
| 8am daily | Morning briefing |
| 2am daily | Soltome learner |

## Railway CLI Quick Reference

```bash
railway status              # Project/env/service info
railway logs -n 20          # Recent logs
railway deployment list     # Recent deployments + status
railway redeploy -y         # Redeploy from latest commit
railway up -d               # Upload + deploy local code
railway variables           # Show env vars
railway down -y             # DANGEROUS: kills running instance
railway service restart -y  # Restart without rebuild
```
