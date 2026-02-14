---
sidebar_position: 3
---

# Cloud Worker

Railway entry point running all cloud golems on timezone-aware schedules.

## Schedule (Israel/Asia/Jerusalem)

| Service | Times | Frequency |
|---------|-------|-----------|
| Email | 6am–7pm hourly (skip noon), 10pm | ~12/day |
| Jobs | 6am, 9am, 1pm Sun–Thu | ~15/week |
| Briefing | 8am daily | 1/day |
| Learner | 2am daily | 1/day |

Cost: 92% savings (email), 95% (jobs) vs always-on.

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
LLM_BACKEND=haiku
STATE_BACKEND=supabase
TELEGRAM_MODE=direct
TZ=Asia/Jerusalem
ANTHROPIC_API_KEY=sk-ant-...
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

Single Node process with independent schedules per golem:
- Timezone conversion UTC → Israel (auto DST)
- Check conditions every 1–10 minutes
- Errors notify Telegram, logged to stdout
- Stateless → easy to scale, auto-restart on Railway

## See Also

- [Railway Setup](./deployment/railway.md)
- [Config Reference](./configuration/env-vars.md)
