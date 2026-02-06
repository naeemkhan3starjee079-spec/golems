---
sidebar_position: 2
---

# Architecture

## Mac = Brain, Railway = Body

Golems splits work between your local Mac (cognitive tasks) and Railway cloud (data collection and polling).

```
┌─────────────────────────────────┐
│           YOUR MAC (BRAIN)      │
│  Telegram Bot • Night Shift     │
│  Notification Server • Zikaron  │
│                                 │
│  • Processes notifications      │
│  • Makes decisions              │
│  • Learns from interactions     │
│  • Runs autonomous improvements │
└─────────────────────────────────┘
                ↕ (HTTPS API + State Sync)
┌─────────────────────────────────┐
│        RAILWAY (BODY)           │
│  Email Poller • Job Scraper     │
│  Briefing Generator • Learner   │
│                                 │
│  • Collects data (10-30min)     │
│  • Scores with Haiku LLM        │
│  • Stores in Supabase           │
│  • Publishes events             │
└─────────────────────────────────┘
```

## Cloud Worker Schedule

The Railway cloud worker runs these jobs on a timer:

| Job | Interval | What | Model |
|-----|----------|------|-------|
| Email Poller | 10 min | Fetch Gmail, route to Golems | Haiku 4.5 |
| Job Scraper | 30 min | Find relevant jobs, score | Haiku 4.5 |
| Briefing | 8:00 AM | Daily summary email | Haiku 4.5 |
| Soltome Learner | 2:00 AM | Learn from past content | Haiku 4.5 |

All cloud jobs use **Haiku 4.5** for cost efficiency. Each job publishes events to Supabase that trigger Mac-side Golems.

## Local Services (Mac)

Your Mac runs these always-on services:

| Service | What | Tech |
|---------|------|------|
| **Telegram Bot** | Receive commands, send notifications | grammy.js |
| **Night Shift** | Scan repos for improvements, auto-commit | Claude + Ralph |
| **Notification Server** | Queue and send Telegram messages | HTTP server |
| **Zikaron Memory** | Semantic search over past conversations | FastAPI + sqlite-vec |

The local services have **direct compute access** — they run Claude Opus 4.5 queries when needed for complex decisions.

## Event Flow

When an email arrives:

```
1. Gmail API (10-min poller)
   ↓
2. Cloud Worker reads email, calls Haiku
   ↓
3. Haiku scores & routes (e.g., "recruiter outreach")
   ↓
4. Event published: email_routed
   ↓
5. Mac reads event → wakes RecruiterGolem
   ↓
6. RecruiterGolem drafts response, stores in Supabase
   ↓
7. Telegram notification: "New outreach draft ready"
   ↓
8. You review in Telegram, hit /approve or /edit
   ↓
9. Mac sends via Gmail API, logs follow-up date
```

## Environment Variables (Dual Mode)

Golems supports **dual mode** — run cloud or local via three env vars:

```bash
# LLM Backend: where LLM calls happen
export LLM_BACKEND=haiku      # Cloud: Haiku via Railway
export LLM_BACKEND=ollama     # Local: Ollama on Mac (for testing)

# State Storage: where data lives
export STATE_BACKEND=supabase # Cloud: Supabase database
export STATE_BACKEND=file     # Local: ~/.golems-zikaron/data/

# Notifications: where Telegram messages go
export TELEGRAM_MODE=direct   # Cloud worker sends directly
export TELEGRAM_MODE=local    # Mac notifier (HTTP) sends
```

## Switching Modes

### Full Cloud Mode (Production)
```bash
export LLM_BACKEND=haiku
export STATE_BACKEND=supabase
export TELEGRAM_MODE=direct
# Deploy to Railway, monitor /api/usage for token counts
```

### Full Local Mode (Testing)
```bash
export LLM_BACKEND=ollama    # Run: ollama pull mistral
export STATE_BACKEND=file
export TELEGRAM_MODE=local
# Run Mac services: bun src/telegram/bot.ts
```

### Hybrid Mode (Development)
```bash
export LLM_BACKEND=haiku      # Use cloud LLM
export STATE_BACKEND=file     # Store locally for iteration
export TELEGRAM_MODE=local    # Debug Telegram messages
# Perfect for testing new features before cloud deploy
```

## Rollback

If something breaks in cloud, roll back in **under 1 minute**:

```bash
# Switch back to local-only (everything still works)
export LLM_BACKEND=ollama
export STATE_BACKEND=file
export TELEGRAM_MODE=local

# Restart Mac services
bun src/cli/golems.ts restart

# Check status
bun src/cli/golems.ts status
```

No data loss, no disruption. The state in Supabase is still there for when you re-enable cloud.

## API Cost Tracking

All LLM calls are logged to a JSONL file:

```bash
# Location (Mac):
cat ~/.golems-zikaron/api_costs.jsonl

# Location (Cloud):
curl https://your-railway.app/api/usage
```

**Format:**
```json
{"timestamp": "2026-02-06T10:30:45Z", "model": "claude-haiku-4-5-20251001", "source": "email-poller", "input_tokens": 1240, "output_tokens": 340, "cost_usd": 0.00157}
```

**Haiku 4.5 Pricing:**
- Input: $0.80 / 1M tokens
- Output: $4.00 / 1M tokens

## Database Schema

### Supabase Tables (Cloud Backend)

| Table | Purpose |
|-------|---------|
| `emails` | Routed emails, drafts, follow-ups |
| `outreach_contacts` | Recruiter targets, score, last contacted |
| `outreach_drafts` | Generated outreach messages |
| `jobs` | Scraped job listings + match scores |
| `events` | Audit log of all system events |
| `notifications` | Telegram queue + delivery status |
| `practice_sessions` | Interview practice recordings |
| `style_data` | Topic styles, Hebrew/English norms |

### Local File Storage (~/.golems-zikaron/)

| File | Purpose |
|------|---------|
| `state.json` | Current Night Shift target, system state |
| `event-log.json` | Local copy of recent events |
| `api_costs.jsonl` | Cost tracking (append-only) |
| `data/embeddings.db` | sqlite-vec memory index |
| `style/semantic-style-data.json` | Your writing style profile |

## Deployment Architecture

```
┌─────────────────────────┐
│   GitHub (Source)       │
│   branch:               │
│   feature/phase2-cloud  │
└──────────┬──────────────┘
           │
           ↓
┌─────────────────────────┐
│   Railway (Build & Run) │
│   - Docker image build  │
│   - Start cloud worker  │
│   - Set env vars        │
│   - Health: /health     │
└─────────────────────────┘
           ↕
┌─────────────────────────┐
│   Supabase (Postgres)   │
│   + Migrations          │
│   + RLS policies        │
│   + Real-time subs      │
└─────────────────────────┘
           ↕
┌─────────────────────────┐
│   Your Mac (Services)   │
│   Telegram API          │
│   Gmail API             │
│   Claude API            │
└─────────────────────────┘
```

## Security

- **1Password for secrets** — never hardcode API keys
- **Supabase RLS** — row-level security on all tables
- **Separate API keys per project** — different keys for Golems vs SongScript
- **State sync over HTTPS** — encrypted Mac ↔ Railway communication
- **Event audit log** — all actions logged to `events` table

## Next Steps

1. Read `/docs/deployment.md` to set up Supabase and Railway
2. Check `/docs/golems/` to understand each domain expert
3. Review `/docs/configuration.md` for env var reference
