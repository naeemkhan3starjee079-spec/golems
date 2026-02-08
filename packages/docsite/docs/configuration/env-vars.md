---
sidebar_position: 1
---

# Environment Variables

All environment variables used by Golems v2. Store sensitive values in 1Password (see [Secrets Management](./secrets.md)).

## Core Configuration

| Variable | Default | Description | Required For |
|----------|---------|-------------|--------------|
| `LLM_BACKEND` | `ollama` | Which LLM to use: `haiku` (cloud) or `ollama` (local); cloud-worker sets `haiku` explicitly | Agent execution |
| `STATE_BACKEND` | `file` | State storage: `supabase` (cloud) or `file` (local) | Persistent state |
| `TELEGRAM_MODE` | `local` | Notification mode: `direct` (cloud) or `local` (launchd) | Telegram notifications |
| `TZ` | `UTC` | Timezone (only used in helpers-status.ts); cloud-worker hardcodes `Asia/Jerusalem` | Status display |
| `GOLEMS_STATE_DIR` | `~/.golems-zikaron` | Override state directory for tests or alternate environments | Test isolation |

## LLM Configuration

### Cloud Backend (Haiku)

| Variable | Default | Description | Required For |
|----------|---------|-------------|--------------|
| `ANTHROPIC_API_KEY` | — | Anthropic API key from 1Password (any item name you choose) | Cloud LLM calls |
| `RAILWAY_URL` | `https://your-service.up.railway.app` | Cloud worker endpoint for health checks | Health monitoring |

### Local Backend (Ollama)

Requires Ollama running locally on `http://localhost:11434`.

## Database Configuration

| Variable | Default | Description | Required For |
|----------|---------|-------------|--------------|
| `SUPABASE_URL` | — | Your Supabase project URL (format: `https://YOUR_PROJECT.supabase.co`) | Cloud state backend |
| `SUPABASE_SERVICE_KEY` | — | Service role key (bypasses RLS, for cloud worker only) from 1Password | Cloud database access |
| `SUPABASE_ANON_KEY` | — | Anonymous key for job sync | Job golem sync |

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
| `TELEGRAM_TOPIC_ALERTS` | — | Topic ID for 🔔 Alerts (system notifications) | Alert routing |
| `TELEGRAM_TOPIC_NIGHTSHIFT` | — | Topic ID for 🌙 Night Shift (autonomous tasks) | Night Shift logs |
| `TELEGRAM_TOPIC_EMAIL` | — | Topic ID for 📧 Email (email events) | Email notifications |
| `TELEGRAM_TOPIC_JOBS` | — | Topic ID for 💼 Jobs (job scraper results) | Job notifications |
| `TELEGRAM_TOPIC_RECRUITER` | — | Topic ID for 👥 Recruiter (outreach events) | Recruiter notifications |
| `TELEGRAM_TOPIC_UPTIME` | — | Topic ID for ⏰ Uptime (health checks) | Uptime monitoring |

## Ollama Configuration

| Variable | Default | Description | Required For |
|----------|---------|-------------|--------------|
| `OLLAMA_MODEL` | `qwen2.5-coder:7b` (direct), `qwen3-coder-64k` (sandboxed) | Local Ollama model name | Email scoring, categorization |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL | Local LLM calls |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Alias for `OLLAMA_HOST` (sandboxed mode) | Sandboxed execution |
| `OLLAMA_SANDBOXED` | — | Set to `1` to enable sandboxed Ollama execution | Sandboxed mode |
| `VALIDATION_DIR` | `~/.golems-zikaron/validation-queue` | Directory for sandboxed validation queue | Sandboxed execution |

## Job Scraper Configuration

| Variable | Default | Description | Required For |
|----------|---------|-------------|--------------|
| `SKIP_DRUSHIM` | — | Set to `1` to skip Drushim.co.il scraper | Job scraper |
| `SKIP_INDEED` | — | Set to `1` to skip Indeed scraper | Job scraper |
| `SKIP_SECRETLV` | — | Set to `1` to skip Secret Tel Aviv scraper | Job scraper |

## Recruiter Configuration

| Variable | Default | Description | Required For |
|----------|---------|-------------|--------------|
| `HUNTER_API_KEY` | — | Hunter.io API key for finding contact emails | Contact finder |
| `EXA_API_KEY` | — | Exa API key for web search and contact finding | Contact finder |

## Night Shift & Bot Configuration

| Variable | Default | Description | Required For |
|----------|---------|-------------|--------------|
| `REPOS_PATH` | `~/Gits` | Base path for git repositories | Night Shift |
| `ACTIVITY_DAYS_TO_KEEP` | `7` | Days of session history to retain | Session archiver |
| `TELEGRAM_ALLOWED_IDS` | — | Comma-separated Telegram user IDs allowed to interact | Telegram bot security |
| `OLLAMA_CHAT_BOT_TOKEN` | — | Separate bot token for Ollama chat bot | Ollama chat bot |

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

# Telegram (get token from @BotFather, chat ID from your group)
export TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
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
  "model": "claude-haiku-4-5-20251001",
  "source": "email-golem",
  "input_tokens": 1250,
  "output_tokens": 342,
  "cost_usd": 0.002352
}
```

Pricing (Haiku 4.5):
- Input: $0.80/MTok
- Output: $4.00/MTok

## See Also

- [Secrets Management](./secrets.md) — How to store sensitive variables
- [Railway Deployment](../deployment/railway.md) — Production deployment guide
