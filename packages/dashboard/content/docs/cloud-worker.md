---
sidebar_position: 3
---

# Cloud Worker

Railway entry point running all cloud golems on timezone-aware schedules.

## Schedule (Israel/Asia/Jerusalem)

| Service | Times | Frequency | Model |
|---------|-------|-----------|-------|
| Email Poller | 6am–7pm hourly (skip noon), 10pm | ~12/day | Gemini Flash-Lite |
| Job Scraper | 6am, 9am, 1pm Sun–Thu | ~15/week | Gemini Flash-Lite |
| Briefing | 8am daily | 1/day | Gemini Flash-Lite |

Cloud jobs use **Gemini 2.5 Flash-Lite** (free tier) for cost efficiency. Each job publishes events to Supabase that trigger Mac-side Golems.

## Running

```bash
bun run src/cloud-worker.ts                  # All services
bun run src/cloud-worker.ts --email-only     # Email only
bun run src/cloud-worker.ts --jobs-only      # Jobs only
```

Railway auto-runs on startup.

## Endpoints (Port 8080)

| Endpoint | Returns |
|----------|---------|
| `/health` | Status, uptime, config, Israel time |
| `/usage` | API costs by source |
| `/webhook/uptimerobot` | Sends UptimeRobot alerts to Telegram |

## Required Environment Variables

```
LLM_BACKEND=gemini
STATE_BACKEND=supabase
TELEGRAM_MODE=direct
TZ=Asia/Jerusalem
GOOGLE_GENERATIVE_AI_API_KEY=...
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=-1001...
```

See [Env Vars](./configuration/env-vars.md) for complete list.

## Logging

```bash
railway logs -f
# [CloudWorker] EmailGolem completed (120.3s)
# [CloudWorker] EmailGolem FAILED: Error message
```

## Architecture

Single Bun process with independent schedules per golem:
- Timezone conversion UTC → Israel (auto DST)
- Check conditions every 1–10 minutes
- Errors notify Telegram, logged to stdout + Axiom telemetry
- Stateless → easy to scale, auto-restart on Railway
- Health endpoint at `/health` with uptime, config, and Israel time

## See Also

- [Railway Setup](./deployment/railway.md)
- [Config Reference](./configuration/env-vars.md)
