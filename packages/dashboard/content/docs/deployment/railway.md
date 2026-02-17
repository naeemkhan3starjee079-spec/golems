---
sidebar_position: 1
---

# Railway Deployment

The Railway cloud worker is the "body" of the Golems ecosystem — it handles data collection (email polling, job scraping, Whoop sync) and morning briefings while the Mac remains the "brain" (Telegram bot, Night Shift, notifications).

## Railway Project

Create a new project in Railway with these settings:

- **Organization:** Your Railway org
- **Project:** golems (or any name you choose)
- **Service:** golems
- **Region:** Any region (US West, Europe, etc.)
- **Root:** Repository root (the Dockerfile is at the repo root)
- **Builder:** Dockerfile

The Dockerfile builds a Bun workspace image with all packages. The entry point is `packages/services/src/cloud-worker.ts`.

## Getting Started

### Install Railway CLI

```bash
brew install railway
```

### Authenticate

```bash
railway login
# Opens browser to authorize
```

### Link Project

From the repo root:

```bash
railway link
# Select your org
# Select your project
```

### Deploy

```bash
# Upload and deploy local code
railway up -d

# Or redeploy from latest upload
railway redeploy -y
```

Watch logs:

```bash
railway logs -f
```

## Environment Variables

Set these variables in Railway dashboard (`Settings` → `Variables`):

### Core Configuration

| Variable | Value | Notes |
|----------|-------|-------|
| `LLM_BACKEND` | `gemini` | Gemini 2.5 Flash-Lite (free tier) |
| `STATE_BACKEND` | `supabase` | Cloud state |
| `TELEGRAM_MODE` | `direct` | Direct API calls |
| `TZ` | `Asia/Jerusalem` | Scheduling |

### API Keys (from 1Password)

| Variable | Source | Required |
|----------|--------|----------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio | Yes (primary LLM) |
| `ANTHROPIC_API_KEY` | Anthropic Console | Optional (Haiku fallback) |
| `SUPABASE_URL` | Your Supabase project (format: `https://YOUR_PROJECT.supabase.co`) | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard → Settings → API | Yes |
| `SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API | Yes |
| `GMAIL_CLIENT_ID` | Google Cloud Console → OAuth credentials | Yes |
| `GMAIL_CLIENT_SECRET` | Google Cloud Console | Yes |
| `GMAIL_REFRESH_TOKEN` | OAuth flow (see Gmail setup docs) | Yes |
| `TELEGRAM_BOT_TOKEN` | @BotFather on Telegram | Yes |
| `TELEGRAM_CHAT_ID` | Your Telegram group/chat ID | Yes |
| `TELEGRAM_ALLOWED_IDS` | Comma-separated Telegram user IDs | Yes |

### Telegram Topics

| Variable | Example Value | How to Get |
|----------|---------------|-----------|
| `TELEGRAM_TOPIC_ALERTS` | `3` | Create topic in your Telegram group |
| `TELEGRAM_TOPIC_NIGHTSHIFT` | `4` | Create topic in your Telegram group |
| `TELEGRAM_TOPIC_EMAIL` | `5` | Create topic in your Telegram group |
| `TELEGRAM_TOPIC_JOBS` | `7` | Create topic in your Telegram group |
| `TELEGRAM_TOPIC_RECRUITER` | `126` | Create topic in your Telegram group |
| `TELEGRAM_TOPIC_UPTIME` | `282` | Create topic in your Telegram group |

## Cloud Worker Schedule

| Job | Interval | What | Model |
|-----|----------|------|-------|
| Email Poller | Hourly (6am-7pm, skip noon, +10pm) | Fetch Gmail, route to Golems | Gemini Flash-Lite |
| Job Scraper | 6am, 9am, 1pm Sun-Thu | Find relevant jobs, score | Gemini Flash-Lite |
| Whoop Sync | 5x daily (7am, 10am, 2pm, 5pm, 8pm) | Sync biometrics to Supabase | -- |
| Briefing | 8:00 AM | Daily Telegram summary | Gemini Flash-Lite |

All schedules use Israel/Asia/Jerusalem timezone with automatic DST handling.

## Health & Monitoring

### Health Check Endpoint

```
GET /health
```

Returns `200 OK` with:

```json
{
  "status": "ok",
  "uptime": 3600,
  "backend": "gemini",
  "stateBackend": "supabase",
  "telegramMode": "direct",
  "israelTime": "2026-02-15T12:30:00+02:00",
  "isWorkHours": true,
  "isWorkday": true
}
```

Railway automatically checks `/health` every 30 seconds.

### Usage Metrics Endpoint

```
GET /usage
```

Returns API cost stats by source (email-golem, job-golem, briefing, etc.).

### Uptime Monitoring

Configure **UptimeRobot** (free tier):

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Add monitor: `https://your-service.up.railway.app/health`
3. Check every 5 minutes
4. Webhook alerts can be sent to Telegram via `/webhook/uptimerobot`

## Rollback Strategy

All configs are **environment-based** for quick rollback:

```bash
# Switch LLM backend
railway variables set LLM_BACKEND=gemini  # Free (default, recommended)
railway variables set LLM_BACKEND=haiku   # Paid fallback (optional)

# Switch state backend
railway variables set STATE_BACKEND=file  # Local fallback

# Always redeploy after variable changes
railway redeploy -y
```

## Database Migrations

Migrations are managed via the Supabase MCP server or dashboard:

```bash
# Via MCP (in Claude Code)
mcp__supabase__apply_migration(project_id, name, query)

# Via Supabase CLI
supabase db push
```

## Logs & Debugging

### View Logs

```bash
# Stream live logs
railway logs -f

# Last 20 lines
railway logs -n 20

# Recent deployments
railway deployment list
```

### Common Issues

#### 502 Bad Gateway
- Check if service is running: `railway logs -f`
- Verify all required env vars are set
- Check SUPABASE_URL and SUPABASE_SERVICE_KEY

#### Telegram notifications not sending
- Verify TELEGRAM_BOT_TOKEN is correct
- Check TELEGRAM_CHAT_ID is negative (for groups)
- Verify topic IDs (TELEGRAM_TOPIC_*)

#### LLM calls failing
- Check `GOOGLE_GENERATIVE_AI_API_KEY` is set (primary)
- For Haiku fallback: check `ANTHROPIC_API_KEY` and account credits
- Check logs for rate limiting

#### Service restart (without rebuild)

```bash
railway service restart -y
```

## Cost Management

Monitor costs in two places:

1. **Railway dashboard** — Compute (~$5-10/month)
2. **Supabase dashboard** — Database queries (free tier sufficient)

LLM costs:
- **Gemini Flash-Lite** (default): Free tier
- **GLM-4.7-Flash** (local): Free (Ollama)
- **Haiku 4.5** (paid fallback): $0.80/$4.00 per million tokens

Typical monthly cost: **$5-10** (Railway compute only, LLM is free with Gemini).

## Dockerfile Notes

- The Dockerfile lives at the **repo root** (not in a package)
- Don't copy `bun.lockb` — local-only packages cause lockfile mismatch
- All workspace `package.json` files must be copied for Bun workspace resolution
- Uses `bun install --production` without `--frozen-lockfile`
- Entry point: `packages/services/src/cloud-worker.ts`

## See Also

- [Cloud Worker](../cloud-worker.md) — Schedule details and endpoints
- [Environment Variables](../configuration/env-vars.md) — Complete variable reference
- [Secrets Management](../configuration/secrets.md) — How to store API keys
- [Golems Architecture](../architecture.md) — System design
