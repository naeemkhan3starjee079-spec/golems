---
sidebar_position: 1
---

# Environment Variables

All environment variables used by Golems v2. Store sensitive values in 1Password (see [Secrets Management](./secrets.md)).

## Core Configuration

| Variable | Default | Description | Required For |
|----------|---------|-------------|--------------|
| `LLM_BACKEND` | `haiku` | Which LLM to use: `haiku` (cloud) or `ollama` (local) | Cloud agent execution |
| `STATE_BACKEND` | `file` | State storage: `supabase` (cloud) or `file` (local) | Persistent state |
| `TELEGRAM_MODE` | `local` | Notification mode: `direct` (cloud) or `local` (launchd) | Telegram notifications |
| `TZ` | `UTC` | Timezone for scheduling, set to `Asia/Jerusalem` for local time | Night Shift scheduling |
| `GOLEMS_STATE_DIR` | `~/.golems-zikaron` | Override state directory for tests or alternate environments | Test isolation |

## LLM Configuration

### Cloud Backend (Haiku)

| Variable | Default | Description | Required For |
|----------|---------|-------------|--------------|
| `ANTHROPIC_API_KEY` | — | Anthropic API key from 1Password `ANTHROPIC_GOLEMS_API_KEY` | Cloud LLM calls |
| `RAILWAY_URL` | `https://golems-production.up.railway.app` | Cloud worker endpoint for health checks | Health monitoring |

### Local Backend (Ollama)

Requires Ollama running locally on `http://localhost:11434`.

## Database Configuration

| Variable | Default | Description | Required For |
|----------|---------|-------------|--------------|
| `SUPABASE_URL` | — | Supabase project URL from [console.supabase.com](https://console.supabase.com) | Cloud state backend |
| `SUPABASE_SERVICE_KEY` | — | Service role key (bypasses RLS, for cloud worker only) from 1Password | Cloud database access |

## Gmail Configuration

| Variable | Default | Description | Required For |
|----------|---------|-------------|--------------|
| `GMAIL_CLIENT_ID` | — | OAuth 2.0 Client ID from Google Cloud Console | Email sync |
| `GMAIL_CLIENT_SECRET` | — | OAuth 2.0 Client Secret from Google Cloud Console | Email sync |
| `GMAIL_REFRESH_TOKEN` | — | Gmail refresh token (generate via oauth-cli) | Email sync |

## Telegram Configuration

| Variable | Default | Description | Required For |
|----------|---------|-------------|--------------|
| `TELEGRAM_BOT_TOKEN` | — | Bot token from @BotFather on Telegram | Telegram bot |
| `TELEGRAM_CHAT_ID` | — | Chat/group ID for notifications (negative number for groups) | Telegram messages |
| `TELEGRAM_TOPIC_ALERTS` | `3` | Topic ID for 🔔 Alerts (system notifications) | Alert routing |
| `TELEGRAM_TOPIC_NIGHTSHIFT` | `4` | Topic ID for 🌙 Night Shift (autonomous tasks) | Night Shift logs |
| `TELEGRAM_TOPIC_EMAIL` | `5` | Topic ID for 📧 Email (email events) | Email notifications |
| `TELEGRAM_TOPIC_JOBS` | `7` | Topic ID for 💼 Jobs (job scraper results) | Job notifications |
| `TELEGRAM_TOPIC_RECRUITER` | `126` | Topic ID for 👥 Recruiter (outreach events) | Recruiter notifications |
| `TELEGRAM_TOPIC_UPTIME` | `282` | Topic ID for ⏰ Uptime (health checks) | Uptime monitoring |

## Setup Examples

### Development (Local)

```bash
# Use local Ollama and file-based state
export LLM_BACKEND=ollama
export STATE_BACKEND=file
export TELEGRAM_MODE=local
export TZ=Asia/Jerusalem

# Gmail
export GMAIL_CLIENT_ID=your_client_id
export GMAIL_CLIENT_SECRET=your_client_secret
export GMAIL_REFRESH_TOKEN=your_refresh_token

# Telegram
export TELEGRAM_BOT_TOKEN=your_bot_token
export TELEGRAM_CHAT_ID=-1001234567890
```

### Production (Railway)

```bash
# Use cloud LLM and Supabase
export LLM_BACKEND=haiku
export STATE_BACKEND=supabase
export TELEGRAM_MODE=direct

# All secrets from 1Password (handled by Railway)
# ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, etc.
```

## Loading Variables

Variables are loaded from:

1. **Environment** — System variables (highest priority)
2. **.env file** — Project root `.env` file (git-ignored)
3. **Defaults** — Built-in fallbacks

For launchd jobs, use `load-env.ts` at the entry point:

```typescript
import "../lib/load-env";  // MUST be first import
```

This ensures `.env` files are loaded before any code runs.

## API Cost Logging

All LLM calls are logged to `~/.golems-zikaron/api_costs.jsonl` as JSONL:

```json
{
  "timestamp": "2026-02-06T10:30:00Z",
  "model": "claude-3-5-haiku-20241022",
  "source": "email-golem",
  "input_tokens": 1250,
  "output_tokens": 342,
  "cost_usd": 0.00812
}
```

Pricing (Haiku 4.5):
- Input: $0.80/MTok
- Output: $4.00/MTok

## See Also

- [Secrets Management](./secrets.md) — How to store sensitive variables
- [Railway Deployment](../deployment/railway.md) — Production deployment guide
