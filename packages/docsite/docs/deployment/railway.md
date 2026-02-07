---
sidebar_position: 1
---

# Railway Deployment

Golems Phase 2 runs on **Railway** as the cloud "body" while the Mac remains the "brain" (Telegram bot, Night Shift, notifications).

## Railway Project

Create a new project in Railway with these settings:

- **Organization:** Your Railway org
- **Project:** golems (or any name you choose)
- **Service:** golems
- **Region:** Any region (US West, Europe, etc.)
- **Root:** `packages/autonomous`
- **Builder:** Dockerfile

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

From repo root or `packages/autonomous/`:

```bash
railway link
# Select your org
# Select your project
```

### Deploy

```bash
railway up
# Rebuilds Docker image and deploys
```

Watch logs:

```bash
railway logs -f
```

## Environment Variables

Set all 18 variables in Railway dashboard (`Settings` → `Variables`):

### Core Configuration

| Variable | Value | Notes |
|----------|-------|-------|
| `LLM_BACKEND` | `haiku` | Cloud execution |
| `STATE_BACKEND` | `supabase` | Cloud state |
| `TELEGRAM_MODE` | `direct` | Direct API calls |
| `TZ` | `Asia/Jerusalem` | Scheduling |

### API Keys (from 1Password)

| Variable | Source | Required |
|----------|--------|----------|
| `ANTHROPIC_API_KEY` | Your Anthropic Console | ✅ Yes |
| `SUPABASE_URL` | Your Supabase project (format: `https://YOUR_PROJECT.supabase.co`) | ✅ Yes |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard → Settings → API | ✅ Yes |
| `GMAIL_CLIENT_ID` | Google Cloud Console → OAuth credentials | ✅ Yes |
| `GMAIL_CLIENT_SECRET` | Google Cloud Console | ✅ Yes |
| `GMAIL_REFRESH_TOKEN` | OAuth flow (see Gmail setup docs) | ✅ Yes |
| `TELEGRAM_BOT_TOKEN` | @BotFather on Telegram | ✅ Yes |
| `TELEGRAM_CHAT_ID` | Your Telegram group/chat ID | ✅ Yes |

### Telegram Topics

| Variable | Example Value | How to Get |
|----------|---------------|-----------|
| `TELEGRAM_TOPIC_ALERTS` | `3` | Create topic, send `/setup alerts` in that topic |
| `TELEGRAM_TOPIC_NIGHTSHIFT` | `4` | Create topic, send `/setup nightshift` in that topic |
| `TELEGRAM_TOPIC_EMAIL` | `5` | Create topic, send `/setup email` in that topic |
| `TELEGRAM_TOPIC_JOBS` | `7` | Create topic, send `/setup jobs` in that topic |
| `TELEGRAM_TOPIC_RECRUITER` | `126` | Create topic, send `/setup recruiter` in that topic |
| `TELEGRAM_TOPIC_UPTIME` | `282` | Create topic, send `/setup uptime` in that topic |

### Monitoring

| Variable | Value | Purpose |
|----------|-------|---------|
| `RAILWAY_URL` | Auto-populated by Railway | Health check endpoint |

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
  "backend": "haiku",
  "stateBackend": "supabase",
  "telegramMode": "direct",
  "israelTime": "2026-02-06T12:30:00+02:00",
  "isWorkHours": true,
  "isWorkday": true
}
```

Railway automatically checks `/health` every 30 seconds.

### Usage Metrics Endpoint

```
GET /usage
```

Returns API cost stats:

```json
{
  "totalCalls": 145,
  "totalInputTokens": 28450,
  "totalOutputTokens": 12890,
  "estimatedCostUSD": 0.58,
  "recentCalls": [
    {
      "timestamp": "2026-02-06T10:30:00Z",
      "model": "claude-haiku-4-5-20251001",
      "source": "email-golem",
      "inputTokens": 1250,
      "outputTokens": 342
    }
  ],
  "bySource": {
    "email-golem": { "calls": 52, "cost": 0.23 },
    "job-golem": { "calls": 93, "cost": 0.35 }
  }
}
```

### Uptime Monitoring

Configure **UptimeRobot** (free tier):

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Add monitor: `https://your-service.up.railway.app/health`
3. Check every 5 minutes
4. Set webhook notification to Telegram (optional - configure bot webhook)
5. Receives alerts in Telegram `⏰ Uptime` topic

## Rollback Strategy

All configs are **environment-based** for quick rollback:

### Revert LLM Backend

If cloud LLM has issues:

```bash
railway variables set LLM_BACKEND=ollama
railway up
```

Then switch back:

```bash
railway variables set LLM_BACKEND=haiku
railway up
```

### Revert State Backend

If Supabase has issues:

```bash
railway variables set STATE_BACKEND=file
railway up
```

### Revert Telegram Mode

If direct notifications fail:

```bash
railway variables set TELEGRAM_MODE=local
railway up
```

## Database Migrations

Supabase migrations live in `packages/autonomous/supabase/migrations/`:

```bash
# List pending migrations
supabase migration list --linked

# Apply migration
supabase db push
```

Phase 2 migration: `003_cloud_offload.sql`

## Logs & Debugging

### View Logs

```bash
# Stream live logs
railway logs -f

# Last 100 lines
railway logs
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
- Check ANTHROPIC_API_KEY is set
- Verify account has sufficient credits
- Check logs for rate limiting

### Debug Command

```bash
railway exec bash
# Now in Railway container
bun run src/cloud-worker.ts
```

## Cost Management

Monitor API costs in three places:

1. **Railway dashboard** — Compute (usually $5-10/month)
2. **Anthropic console** — LLM calls (`/usage` endpoint)
3. **Supabase dashboard** — Database queries

Haiku 4.5 pricing:
- Input: $0.80 per million tokens
- Output: $4.00 per million tokens

Typical monthly cost: $20-40 depending on activity.

## Scaling

### Horizontal

Railway auto-scales based on CPU/memory:

```bash
# Check current plan
railway environments list

# Upgrade to Pro for auto-scaling
# (requires paid Railway account)
```

### Vertical

Increase memory in `railway.json`:

```json
{
  "services": {
    "golems": {
      "runtime": "dockerfile",
      "memory": "512",
      "cpus": "1"
    }
  }
}
```

## See Also

- [Environment Variables](../configuration/env-vars.md) — Complete variable reference
- [Secrets Management](../configuration/secrets.md) — How to store API keys
- [Golems Architecture](../architecture.md) — System design
