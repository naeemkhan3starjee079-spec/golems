# Research Context: Full Tech Stack for Golems Ecosystem

## Hardware
- MacBook Pro M1 Pro, 32GB RAM, macOS 15.6.1

## Runtimes
- Bun 1.0.25 (primary runtime for TypeScript services)
- Node.js 22.22.0 (for some tools)
- Python 3.13.5 (Zikaron memory layer)
- Ollama 0.15.1 (local LLM: qwen2.5-coder:7b for scoring)

## Cloud Services
- **Railway** — cloud worker running `cloud-worker.ts` (Bun + Dockerfile)
  - Runs: email poller, job scraper, briefing, soltome learner (dropping soltome)
  - Deploy: `railway up --detach` from packages/autonomous/
  - Health: `/health` endpoint, restart on failure (max 5 retries)
- **Supabase** — PostgreSQL database (project: mkijzwkuubtfjqcemorx)
  - Tables: emails, golem_jobs, golem_events, golem_state, outreach_contacts, email_senders, scrape_activity
  - RLS enabled, anon key for client access
- **Vercel** — hosts etanheyman.com (Next.js admin dashboard)
  - Auto-deploys from main branch
- **Gmail API** — OAuth2 for email polling + label management
- **Telegram Bot API** — grammy framework, notification server on port 3847

## Local Background Services (macOS launchd)

### email-golem
- Schedule: every 600 seconds (10 min)
- Entry: `bun src/email-golem/index.ts`
- Env: SUPABASE_URL, SUPABASE_ANON_KEY, GMAIL_*, OLLAMA_HOST
- Log: ~/.golems-zikaron/logs/email-golem.log
- Nice: 10 (low CPU priority)
- RunAtLoad: false
- NO health check, NO retry config, NO watchdog
- Env vars hardcoded in plist (not 1Password)

### job-golem
- Schedule: every 1800 seconds (30 min)
- Entry: `bun run src/job-golem/index.ts`
- Env: SUPABASE_URL, SUPABASE_ANON_KEY, OLLAMA_HOST
- Log: ~/.golems-zikaron/logs/job-golem.log
- RunAtLoad: true
- NO health check, NO retry config, NO watchdog
- Note: "bun run" vs "bun" direct (inconsistency with email-golem)

### briefing
- Schedule: StartCalendarInterval Hour=8 Minute=0 (daily 8am)
- Entry: `bun src/briefing.ts`
- Env: SUPABASE_*, TELEGRAM_BOT_TOKEN
- RunAtLoad: false

### nightshift
- Schedule: StartCalendarInterval Hour=4 Minute=0 (daily 4am)
- Entry: `bun src/night-shift.ts`
- Env: TELEGRAM_BOT_TOKEN, OLLAMA_HOST, OLLAMA_MODEL=qwen2.5-coder:7b
- RunAtLoad: false

### telegram
- Always-on (persistent service)
- Entry: telegram-bot.ts
- Runs notification HTTP server on port 3847

### ollama
- Always-on (persistent service)
- Runs Ollama LLM server on port 11434

### session-archiver + storage-cleanup
- Manual trigger only

## Known Issues
1. Services don't write last_run timestamps to Supabase → dashboard shows "never"
2. No alerting when a service crashes or exits with error
3. No health checks — if Ollama is down, email-golem and job-golem silently fail
4. Env vars hardcoded in plists instead of using 1Password/keychain
5. Logs rotate by overwrite (not append), so crash history is lost
6. No process watchdog — if a launchd job exits unexpectedly, it waits for next interval
7. Railway cloud-worker duplicates some local services (email, job) — unclear which is "primary"
8. No unified status view — have to check launchctl, Railway dashboard, and Supabase separately
9. Log files at ~/.golems-zikaron/logs/ — no structured logging, plain text
10. Inconsistent entry point syntax: "bun file.ts" vs "bun run file.ts"

## Data Flow
```
Gmail → email-golem (10min) → Ollama scores → Supabase → dashboard
Job boards → job-golem (30min) → Ollama matches → Supabase → dashboard
State changes → golem_events table → dashboard activity log
Notifications → Telegram bot (port 3847) → Telegram group
Railway → cloud-worker.ts → same Supabase (parallel path)
```

## What We Want
- Reliable background services that self-report status
- Alerting when something breaks (Telegram notification)
- Clear view of what's running, what's stale, what failed
- Minimize maintenance overhead
- Cost-efficient (use free tools where possible)
- Easy to debug when something goes wrong
