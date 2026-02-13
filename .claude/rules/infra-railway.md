# Railway & Cloud Infrastructure Rules

## Railway Project
- **Project:** `helpful-empathy` (production)
- **Service:** `helpful-empathy`
- **URL:** `helpful-empathy-production-482d.up.railway.app`
- **Health:** `GET /health` returns `{"status":"ok",...}`
- **Usage:** `GET /usage` returns API call stats, token counts, cost
- **Backend:** `gemini` (free Gemini 2.5 Flash-Lite, NOT Haiku)

## NEVER Delete the Service

`railway down` can DELETE the service entirely. We lost 2 days rebuilding in Feb 2026.

**Instead of `railway down`:**
1. Prefer `railway service restart -y` (restart without rebuild)
2. If truly need to pause: use Railway dashboard, not CLI
3. NEVER run `railway down -y` — it nukes the service and all env vars

## Deploy Methods (in order of preference)

1. **`railway up -d`** — Uploads local code directly (current method, no GitHub link)
2. **`railway redeploy -y`** — Redeploys from latest upload

**Note:** GitHub auto-deploy is NOT set up on this new service. All deploys are manual via `railway up -d`.

## Dockerfile Notes

- Don't copy `bun.lockb` — tax-helper is local-only, causes lockfile mismatch
- All workspace package.json files MUST be copied for bun workspace resolution
- `bun install --production` without `--frozen-lockfile` (CI=true auto-freezes)

## When Builds Fail

1. Check `railway deployment list` — are ALL recent deploys failing?
2. Check `railway logs -d <deployment-id>` — build or runtime error?
3. **lockfile errors** — workspace mismatch. Check Dockerfile includes all packages in root workspace.
4. **Stuck at scheduling** — Railway platform issue, snooze: `touch ~/.claude/hooks/railway-snooze`

## Health Monitoring

The Claude stop hook (`~/.claude/hooks/keep-going.py`) checks Railway health on every session stop in the golems directory.

- **Snooze:** `touch ~/.claude/hooks/railway-snooze` (when issue is known/unfixable)
- **Unsnooze:** `rm ~/.claude/hooks/railway-snooze`

## Environment Variables

Managed via `railway variables`. All 15 vars:

| Variable | Source | Purpose |
|----------|--------|---------|
| `ANTHROPIC_API_KEY` | 1Password | Haiku fallback (not used when LLM_BACKEND=gemini) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | 1Password | Gemini Flash-Lite (primary) |
| `SUPABASE_URL` | .env | Database |
| `SUPABASE_ANON_KEY` | .env | Public DB key |
| `SUPABASE_SERVICE_KEY` | .env | Service role (bypasses RLS) |
| `TELEGRAM_BOT_TOKEN` | .env | Notifications |
| `TELEGRAM_ALLOWED_IDS` | .env | Auth whitelist |
| `GMAIL_CLIENT_ID` | .env | Email OAuth |
| `GMAIL_CLIENT_SECRET` | .env | Email OAuth |
| `GMAIL_REFRESH_TOKEN` | .env | Email OAuth |
| `AXIOM_TOKEN` | .env | Observability |
| `GOLEMS_OWNER_NAME` | .env | Owner identity |
| `LLM_BACKEND` | set to `gemini` | Free cloud LLM |
| `STATE_BACKEND` | set to `supabase` | Cloud state |
| `TELEGRAM_MODE` | set to `direct` | Bot API mode |
| `TZ` | set to `Asia/Jerusalem` | Timezone |

## Cloud Worker Schedule (Israel Time)

| Schedule | Service |
|----------|---------|
| Hourly 6am-7pm (skip 12pm) + 10pm | Email poller |
| 6am, 9am, 1pm (Sun-Thu) | Job scraper |
| 8am daily | Morning briefing |

## Railway CLI Quick Reference

```bash
railway status              # Project/env/service info
railway logs -n 20          # Recent logs
railway deployment list     # Recent deployments + status
railway redeploy -y         # Redeploy from latest upload
railway up -d               # Upload + deploy local code
railway variables           # Show env vars
railway service restart -y  # Restart without rebuild
# NEVER: railway down -y   # DELETES the service!
```
