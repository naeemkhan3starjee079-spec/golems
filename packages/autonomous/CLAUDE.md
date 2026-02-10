# ClaudeGolem (autonomous)

> Autonomous Telegram bot + Soltome presence for the Golem ecosystem.

---

## Recent Changes (2026-02-06) — Phase 2: Cloud Offload

### Architecture: Mac = Brain, Railway = Body
- **Cloud (Railway):** Email poller, job scraper, briefing, soltome learner
- **Local (Mac):** Telegram bot, Night Shift, notification server

### Track 1: LLM Abstraction
- **`lib/cloud-llm.ts`** — Haiku 4.5 backend with token usage tracking (cost/source)
- **`ollama-wrapper.ts`** — `LLM_BACKEND` env: `"ollama"` (default) | `"haiku"` — zero consumer changes
- **Usage endpoint:** `/usage` on cloud worker shows calls, tokens, cost by source

### Track 2: Telegram Direct Sender
- **`lib/telegram-direct.ts`** — dual-mode: `TELEGRAM_MODE=local` (localhost:3847) | `direct` (Telegram Bot API)
- **Topic routing** via `TELEGRAM_TOPIC_*` env vars (matches local bot config)

### Track 3: Supabase Migration
- **`003_cloud_offload.sql`** — 8 new tables: golem_state, golem_events, golem_seen_jobs, outreach_contacts/messages/companies, practice_sessions/questions
- All tables RLS-enabled (service_role bypasses)

### Track 4: State Store Abstraction
- **`lib/state-store.ts`** — `STATE_BACKEND=file` (default) | `supabase`
- Covers: key-value state, event log, seen jobs
- `GOLEMS_STATE_DIR` env for test isolation

### Track 5: SQLite → Supabase Adapters
- **`outreach-db-cloud.ts`** — same interface as outreach-db.ts, Supabase-backed
- **`practice-db-cloud.ts`** — same interface as practice-db.ts, Supabase-backed

### Track 6: Cloud Worker
- **`cloud-worker.ts`** — single Railway service running all cloud golems on schedules
- **Email:** hourly 6am-7pm (skip 12pm lunch), one 10pm check, OFF overnight
- **Jobs:** 6am + 9am + 1pm, Sun-Thu only (Israeli work week)
- **Briefing:** 8am daily | **Soltome:** 2am daily
- Health endpoint on `$PORT`, usage tracking endpoint

### Track 7: Railway Config
- **`Dockerfile`** — `oven/bun:1.2-alpine`, runs cloud-worker.ts
- **`railway.json`** — build + deploy config with healthcheck

### Track 8: Data Migration
- **`scripts/migrate-to-supabase.ts`** — one-time idempotent migration (dry-run default)
- Migrates: state.json, event-log.json, seen-jobs.json, outreach.db, practice.db

### Test Results
- **376 pass, 0 fail**, 1834 expect() calls across 382 tests in 33 files

### Env Var Reference (Cloud)
```
LLM_BACKEND=haiku          # Use Haiku instead of Ollama
STATE_BACKEND=supabase      # Use Supabase instead of JSON files
TELEGRAM_MODE=direct        # Send via Bot API instead of localhost:3847
ANTHROPIC_API_KEY=sk-...    # Required for haiku backend
TELEGRAM_CHAT_ID=...        # Group chat ID for direct mode (negative number for groups)
TELEGRAM_TOPIC_ALERTS=...   # Thread IDs for topic routing (get from /setup command)
TELEGRAM_TOPIC_EMAIL=...
TELEGRAM_TOPIC_JOBS=...
```

### Rollback
Switch back to local with: `LLM_BACKEND=ollama STATE_BACKEND=file TELEGRAM_MODE=local`

---

## Recent Changes (2026-02-06) — Phase 1: Ship What's Built

### Track A: PR#7 Bug Fixes
- **8 deferred bugs fixed** (unreachable contacts guard, shared-types.ts, Hebrew topic seeds, numpy guard, logger migration, job_match event logging)
- **Pre-commit hook** added (`bun test --bail` on staged .ts files)

### Track B: Email Routing
- **`router.ts`** — routes emails to domain golems by category (job/interview → recruitergolem, subscription → tellergolem, tech-update/urgent → claudegolem, rest → emailgolem)
- **New event type:** `email_routed` in event-log.ts
- **New actors:** `recruitergolem`, `tellergolem` in GolemActor union
- **New MCP tool:** `email_getByGolem` — filter emails by target golem
- **`db-client.ts`** — added `getEmailsByGolem()` function

### Track C: Content Skill Merge
- **Deleted** `soltome/` and `soltome-influencer/` skills from repo
- **Created** unified `/content` skill with draft workflow
- **Updated** `contexts/skill-index.md`

### Track D: Email Reply Drafting
- **`draft-reply.ts`** — template-based reply drafting (category + intent)
- **New MCP tool:** `email_draftReply` — generate reply drafts with intent (accept/decline/interested/followup/acknowledge)

### Track E: Agent Runner + Helpers Layer
- **`lib/helpers.ts`** — CLI helper layer with rate limiting, fallback chain (gemini → kiro → codex → cursor → haiku)
- **`lib/agent-runner.ts`** — research workflows on top of helpers.ts (save-to-file, verification, discovery)
- **`helpers-status.ts`** — CLI for `golems helpers` command (shows all backend status)
- **telegram-bot.ts** import updated from cursor-helper to agent-runner

### Track F: Follow-up Tracking
- **`followup.ts`** — category-based due dates (interview=3d, job=5d, urgent=1d, other=7d)
- Functions: `createFollowup`, `isOverdue`, `getOverdueFollowups`, `resolveFollowup`

### Test Results
- **333 pass, 0 fail**, 1749 expect() calls across 339 tests in 28 files
- CodeRabbit review: 10 findings addressed

---

## Recent Changes (2026-02-05)

### Launchd Environment Fix

- **Problem:** Bun auto-loads `.env` from cwd. Launchd runs from `/`, not package root.
- **Solution:** `src/lib/load-env.ts` - shared utility that finds package root and loads `.env`
- **Usage:** Import at TOP of any entry point that needs env vars:

  ```typescript
  import "../lib/load-env";  // FIRST import
  ```

- **Symptom when broken:** `Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars` even though .env exists
- **Files fixed:** `job-golem/sync-to-supabase.ts`, `email-golem/db-client.ts`

---

## Recent Changes (2026-02-02)

### ClaudeGolem Timeout & Heartbeat
- **Timeout: 5 minutes** (was 2 min) - complex tasks need time
- **Typing heartbeat** every 60s while Claude works
- **Acknowledge pattern** (SOUL.md) - Claude says "Got it. I'll do X, Y, Z." before complex tasks
- This prevents "No response." on research/subagent tasks

### Session Architecture
- **ClaudeGolem** (main chat) uses `--continue` from `~/Gits` — continues most recent session
- **Per-Golem Topics** use `--resume <uuid>` from each golem's own cwd — dedicated Telegram session per golem, stored in `state.golemSessions`
- **Night Shift** uses `--resume nightshift-{repo}` - per-repo sessions (focused memory)
- Chat context persists across bot restarts

### ⚠️ ANTHROPIC_API_KEY vs Claude CLI Auth
- `claude --print` uses `ANTHROPIC_API_KEY` env var if set, ignoring OAuth/subscription auth
- If the key is invalid → "Invalid API key · Fix external API key" error
- **ALWAYS strip `ANTHROPIC_API_KEY`** from env when spawning `claude --print` for subscription auth:
  ```typescript
  const { ANTHROPIC_API_KEY: _, ...cleanEnv } = process.env;
  ```
- This is already done in `askGolem()`. If adding new Claude CLI spawns, follow the same pattern.

### Interactive Telegram Features
- **Reply Keyboard** - persistent menu buttons at bottom (📝 Drafts, 🌙 Tonight, 📊 Status)
- **Inline Keyboards** - buttons for /drafts approval and /tonight repo selection
- Commands are instant (no Claude spawn) - only regular chat spawns Claude

### Notifications
- **Stop hook disabled** - was causing duplicate "Pushed X commits" spam
- **Inline notifications** - Claude sends via `curl localhost:3847/notify` when tasks complete
- **CLAUDE_COUNTER** in global `~/.claude/CLAUDE.md` - every 10 responses, re-check context

### Morning Briefing (/morning)
- Concise format: PR count, repo name, draft count with categories
- Draft categories: AI/claude, agents/ralph, zikaron, other
- Runs at 8am via launchd, or on-demand via /morning

### Night Shift
- Runs at **4am**
- Tracks multiple PRs in `state.nightShiftPRs[]` (array, not single URL)
- Clears after morning briefing

### Soltome Integration
- **Active** - ClaudeGolem posts to soltome.com
- Uses ntls_ API key (set via `SOLTOME_API_KEY` env or `state.json`)
- Credit costs: Post=2, Vote=1, Comment=1
- See `~/.claude/contexts/tech/soltome.md` for full API reference

### Event Log
- **New** - Gives ClaudeGolem memory of actions taken while "asleep"
- Storage: `~/.golems-zikaron/event-log.json`
- Injected into Claude's context at spawn time ("While You Were Down")
- ClaudeGolem actions show as "YOU", other golems by name

### Telegram Topics (2026-02-03)
- **Group with Topics** - Notifications routed to separate threads by type
- **Topics configured:**
  - 💬 General (no thread ID) - ClaudeGolem interactive conversation
  - 🔔 Alerts - CLI updates, commits, healthchecks
  - 🌙 Night Shift - Autonomous 4am work
  - 📧 Email - Urgent email alerts
  - 🎯 Jobs - Job matches
- **Setup:** `/setup <topic>` in each topic to register thread IDs (bot will tell you the ID)
- **Routing:** Based on `source` field in notification payload

---

## Golem Roles

Each golem has a distinct role and attribution in the event log:

| Golem | Role | Event Types |
|-------|------|-------------|
| **ClaudeGolem** | External face - chat, post, represent | `soltome_post`, `draft_approved`, `draft_rejected` |
| **OllamaGolem** | Internal work - scoring, reviewing, patterns | `draft_scored`, `pattern_extracted` |
| **NightShift** | Autonomous code improvements (4am) | `nightshift_pr` |
| **EmailGolem** | Email triage, routing, and alerts | `email_alert`, `email_routed` |
| **JobGolem** | Job board scraping and matching | `job_match` |
| **RecruiterGolem** | Outreach for high-scoring jobs (8+) | `outreach_draft`, `contact_found` |
| **TellerGolem** | Finance - subscriptions, payments, tax | _(planned: subscription_alert)_ |

**Actor attribution:** When reading event log, ClaudeGolem sees "YOU" for its own actions, helping maintain identity continuity across sessions.

---

## Quick Start

```bash
cd ~/Gits/golems-zikaron
bun install
bun run bot
```

Then message [@GolemZikaronBot](https://t.me/GolemZikaronBot) on Telegram.

---

## 🎛️ Control Panel (On/Off)

### Golems CLI (Recommended)
```bash
# Quick status
golems                  # or: golems status

# Deploy latest code (restarts all services)
golems latest

# Hibernation
golems off              # Stop everything
golems on               # Start everything

# Individual services
golems start telegram
golems stop job-golem
golems restart email-golem

# Logs
golems logs telegram
golems logs job-golem

# Trigger job scrape now
golems scrape
```

### Telegram Bot (notifications + chat)
```bash
# Start
cd ~/Gits/golems-zikaron && bun run bot

# Stop
pkill -f "bun.*telegram-bot"

# Check if running
pgrep -fl "telegram-bot"
```

### Night Shift (4am code improvements)
```bash
# Run now (manual)
cd ~/Gits/golems-zikaron && bun src/night-shift.ts

# Stop running
pkill -f "night-shift"

# Enable scheduled (launchd) - runs at 4am
launchctl load ~/Library/LaunchAgents/com.golemszikaron.nightshift.plist

# Disable scheduled
launchctl unload ~/Library/LaunchAgents/com.golemszikaron.nightshift.plist

# Check launchd config (should show Hour=3)
cat ~/Library/LaunchAgents/com.golemszikaron.nightshift.plist | grep -A1 Hour
```

**Session persistence**: Each repo gets its own Claude session (`nightshift-{repo}`).
**PR tracking**: All PRs stored in `state.nightShiftPRs[]`, shown in morning briefing.

### Soltome Learner (2am training)
```bash
# Run now (manual)
cd ~/Gits/golems-zikaron && bun src/soltome-learner.ts

# Enable scheduled
launchctl load ~/Library/LaunchAgents/com.golems.learner.plist

# Disable scheduled
launchctl unload ~/Library/LaunchAgents/com.golems.learner.plist
```

### Daily Healthcheck (9am)
```bash
# Run now (manual)
cd ~/Gits/golems/packages/autonomous && bun src/healthcheck.ts

# Enable scheduled (9am daily)
launchctl load ~/Library/LaunchAgents/com.golemszikaron.healthcheck.plist

# Disable scheduled
launchctl unload ~/Library/LaunchAgents/com.golemszikaron.healthcheck.plist
```

**Checks:** Telegram bot, Notify server, Ollama, State file, Launchd jobs.
**Report:** Sent to Telegram with status of each service.

### Check All Status
```bash
# What's running?
ps aux | grep -E "golems|telegram-bot|night-shift|soltome" | grep -v grep

# Scheduled jobs
launchctl list | grep golems
```

---

## What This Does

1. **Telegram Bot** - Chat with Claude, receive notifications, control Night Shift
2. **Notification Server (port 3847)** - Replaces ntfy, receives Claude hook POSTs
3. **Soltome Learner (2am)** - Scrape posts + stats → train on top performers
4. **Night Shift (4am)** - Claude scans → implements → CodeRabbit review → PR
5. **Post Generator** - Critique-waves: parallel gen → critique → refine → polish
6. **Morning Briefing (8am)** - PR link + learnings + drafts for approval
7. **Event Log** - Records golem actions for context injection at spawn

---

## Owner Communication Style

Based on Zikaron analysis (`~/Gits/zikaron/data/archives/style-2026-01-31-2121/`):

| Trait | Value |
|-------|-------|
| Formality | 2/10 - Very casual |
| Languages | Hebrew ↔ English code-switching |
| Laughter | "חחח" / "חח" |
| Emojis | 🫶 sparingly |
| Length | Brief, direct |
| Tone | Friendly, playful sarcasm |

### DO's
- Keep messages short and direct
- Use casual expressions: "yeah", "nope", "wdyt?"
- Emojis sparingly but meaningfully
- Ask questions directly

### DON'Ts
- No formal corporate speak
- No long paragraphs
- No excessive punctuation
- No fake enthusiasm

See `SOUL.md` for full persona guidelines.

---

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome + persistent menu buttons |
| `/status` | Current state, queue, mode |
| `/morning` | Trigger morning briefing on-demand |
| `/tonight` | Show/select Night Shift target (inline buttons) |
| `/repos` | List available repos |
| `/drafts` | Show pending drafts with approve/reject buttons |
| `/setsoltomekey KEY` | Set Soltome API key |

**Reply Keyboard buttons** (persistent at bottom):
- 📝 Drafts → triggers /drafts
- 🌙 Tonight → triggers /tonight
- 📊 Status → triggers /status

---

## Night Shift Rotation

| Day | Repo |
|-----|------|
| Mon, Thu | songscript |
| Tue, Fri | zikaron |
| Wed, Sat, Sun | claude-golem |

Override: `/tonight zikaron`

---

## Notification API

Port 3847 receives POST from Claude hooks (replaces ntfy):

```bash
curl -X POST http://localhost:3847/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Done","body":"Details","source":"claude","priority":"default"}'
```

| Source | Icon | Use |
|--------|------|-----|
| `claude` | 🤖 | Interactive Claude sessions |
| `ralph` | 🔄 | Ralph autonomous loop |
| `nightshift` | 🌙 | Night Shift runs |

---

## File Structure

```
golems-zikaron/                    # Code repo: ~/Gits/golems-zikaron/
├── src/
│   ├── telegram-bot.ts            # Telegram bot + notification server (3847)
│   ├── night-shift.ts             # 4am: Claude → CR review → PR
│   ├── soltome-learner.ts         # 2am: Scrape posts, learn patterns
│   ├── soltome-client.ts          # Soltome API client
│   ├── event-log.ts               # Event log for ClaudeGolem memory
│   ├── briefing.ts                # 8am morning summary
│   ├── post-generator.ts          # Critique-waves (uses learned patterns)
│   ├── ollama-wrapper.ts          # Ollama spawn wrapper
│   ├── lib/
│   │   ├── load-env.ts            # Env loader for launchd (import first!)
│   │   ├── shared-types.ts        # Canonical TopicStyle/SemanticStyleData
│   │   ├── helpers.ts             # CLI helper layer (gemini/cursor/codex/kiro/haiku) + rate limits
│   │   └── agent-runner.ts        # Research workflows using helpers.ts
│   ├── email-golem/               # Email triage + routing + drafts
│   │   ├── index.ts               # Main entry (10min cron)
│   │   ├── gmail-client.ts        # Gmail API wrapper
│   │   ├── scorer.ts              # Ollama scoring (urgent/job/subscription)
│   │   ├── router.ts              # Email → domain golem routing
│   │   ├── draft-reply.ts         # Template-based reply drafting
│   │   ├── followup.ts            # Follow-up tracking with due dates
│   │   ├── db-client.ts           # Supabase + offline queue
│   │   └── mcp-server.ts          # MCP server (7 tools)
│   ├── job-golem/                 # Job board scraping
│   └── recruiter-golem/           # Outreach pipeline (E1-E6)
├── launchd/
│   ├── *.plist                    # macOS schedulers
│   └── install.sh                 # One-command setup
├── data/
│   ├── drafts.json                # ⚠️ DRAFTS ARRAY - bot reads from here!
│   ├── soltome-training.json      # Scraped posts + engagement
│   └── learned-patterns.json      # Extracted patterns for drafting
├── SOUL.md                        # Bot persona & constraints
├── CLAUDE.md                      # This file
├── .env                           # Secrets (gitignored)
└── README.md
```

---

## ⚠️ Data Locations (IMPORTANT)

**Two separate directories - don't confuse them:**

| Path | Purpose | Examples |
|------|---------|----------|
| `~/Gits/golems-zikaron/` | **Code repo** + static data | `src/*.ts`, `data/drafts.json` |
| `~/.golems-zikaron/` | **Runtime state** | `state.json`, `event-log.json` |

### Soltome Drafts

| File | Location | Purpose |
|------|----------|---------|
| `drafts.json` | `~/Gits/golems-zikaron/data/` | **Array of drafts** - bot's `/drafts` reads this |
| `content-calendar.json` | `~/Gits/golems-zikaron/data/` | Posting schedule, queue, backlog |

**Draft status flow:** `draft` → `polished` → `approved` → posted

Only `polished` or `refined` status shows in `/drafts` command.

### Runtime State

| File | Location | Purpose |
|------|----------|---------|
| `state.json` | `~/.golems-zikaron/` | Bot state, night shift target, pending draft IDs |
| `event-log.json` | `~/.golems-zikaron/` | Golem actions for "While You Were Down" |
| `job-golem/` | `~/.golems-zikaron/` | Scraped jobs, sync state |

---

## Research (docs.local/)

Research conducted via Ralph (gitignored, local only):

| File | Topic |
|------|-------|
| `docs.local/research/telegram-features.md` | Voice messages, threading, inline mode |
| `docs.local/research/agent-memory.md` | LangChain, Redis, multi-agent patterns |
| `docs.local/research/night-shift-patterns.md` | Task prioritization, quality gates, rollback |

---

## Related Projects

| Project | Path | Purpose |
|---------|------|---------|
| **Zikaron** | `~/Gits/zikaron/` | Memory layer, style analysis |
| **Claude-Golem** | `~/Gits/claude-golem/` | Ralph autonomous loop |
| **SongScript** | `~/Gits/songscript/` | Night Shift target (private) |

---

## 📧 EmailGolem (Email Triage)

Smart email triage that runs every 10 minutes via launchd.

### What It Does

1. **Polls Gmail** via OAuth2 API
2. **Scores emails 1-10** using Ollama (qwen2.5-coder:32b)
3. **Alerts immediately** on score 10 (interviews, payment failures)
4. **Morning digest** of job updates in briefing.ts
5. **Tracks subscriptions** for monthly spending reports

### Scoring System

| Score | Action | Examples |
|-------|--------|----------|
| 10 | Telegram NOW | Interview, payment failed, urgent deadline |
| 7-9 | Morning briefing | Job status, recruiter message |
| 5-6 | Monthly tracking | Subscription receipts |
| 1-4 | Ignore | Newsletters, promos, spam |

### Files

```
src/email-golem/
├── index.ts           # Main loop (CLI: --dry-run, --max=N)
├── gmail-client.ts    # Gmail API wrapper
├── scorer.ts          # Ollama scoring + categories
├── router.ts          # Email → domain golem routing
├── draft-reply.ts     # Template-based reply drafting
├── followup.ts        # Follow-up tracking with due dates
├── db-client.ts       # Supabase + offline queue + getEmailsByGolem
├── mcp-server.ts      # MCP server (email_getRecent, search, urgent, stats, getByGolem, draftReply)
├── types.ts           # TypeScript interfaces
├── CONTEXT.md         # Agent documentation
└── README.md          # Setup + troubleshooting
```

### Email Routing

Emails are routed to domain golems after scoring:

| Category | Target Golem | Reason |
|----------|-------------|--------|
| job, interview | RecruiterGolem | Job pipeline |
| subscription | TellerGolem | Financial tracking |
| tech-update, urgent | ClaudeGolem | Knowledge integration / immediate handling |
| newsletter, promo, social, other | EmailGolem | Default handler |

### MCP Tools (golems-email server)

| Tool | Description |
|------|-------------|
| `email_getRecent` | Recent emails filtered by hours and min score |
| `email_search` | Keyword search in subject/sender |
| `email_subscriptions` | Monthly subscription summary |
| `email_urgent` | Unnotified urgent emails |
| `email_stats` | 24h category breakdown |
| `email_getByGolem` | Emails routed to a specific golem |
| `email_draftReply` | Generate reply draft by intent |

### Control Panel

```bash
# Dry run (safe)
bun run src/email-golem/index.ts --dry-run

# Full run
bun run src/email-golem/index.ts

# Enable scheduler (every 10 min)
launchctl load ~/Library/LaunchAgents/com.golemszikaron.email-golem.plist

# Disable scheduler
launchctl unload ~/Library/LaunchAgents/com.golemszikaron.email-golem.plist

# View logs
golems logs email-golem
```

### Environment Variables

```bash
# Gmail OAuth
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...

# Supabase
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

### State Files

| Path | Purpose |
|------|---------|
| `~/.golems-zikaron/state.json` | lastEmailCheck, processedEmailIds |
| `~/.golems-zikaron/offline-queue.json` | Queued items when offline |

### Integration Points

- **Notifications:** POST to `localhost:3847/notify` (requires telegram-bot running)
- **Briefing:** `briefing.ts` imports `getRecentEmails()`, `getSubscriptionSummary()`
- **Offline resilience:** All Supabase calls queue locally on failure

---

## Soltome (Discussion Platform)

Credit-powered discussion platform for AI agents. See `~/.claude/contexts/tech/soltome.md` for full reference.

### Quick Reference

| Endpoint | Method | Cost | Body |
|----------|--------|------|------|
| `/api/posts` | GET | FREE | `?limit=N` |
| `/api/posts` | POST | 2 credits | `{title, content}` |
| `/api/votes` | POST | 1 credit | `{target, targetId}` |
| `/api/comments` | POST | 1 credit | `{postId, content}` |
| `/api/credits/balance` | GET | FREE | none |

### Files

- `src/soltome-client.ts` - API client with `SoltomePost` type
- `src/soltome-learner.ts` - Fetches, scores, extracts patterns (runs 2am)
- `data/soltome-training.json` - Scraped posts + engagement data

### Usage

```bash
# Check balance
bun src/soltome-client.ts balance

# Fetch posts
bun src/soltome-client.ts posts

# Run learner manually
bun src/soltome-learner.ts
```

---

## Event Log (Golem Memory)

Gives ClaudeGolem memory of actions taken while "asleep".

### How It Works

1. Golems log events to `~/.golems-zikaron/event-log.json`
2. When Claude spawns, recent events are injected into system prompt
3. ClaudeGolem sees "YOU" for its own actions (ownership feeling)
4. Other golems appear by name

### Event Types

| Type | Actor | Data |
|------|-------|------|
| `soltome_post` | ClaudeGolem | `{title, postId, creditsRemaining}` |
| `draft_approved` | ClaudeGolem | `{title, draftId}` |
| `draft_rejected` | ClaudeGolem | `{title, reason}` |
| `draft_scored` | OllamaGolem | `{count, avgScore}` |
| `pattern_extracted` | OllamaGolem | `{patternCount}` |
| `email_alert` | EmailGolem | `{subject, sender}` |
| `email_routed` | EmailGolem | `{subject, targetGolem, reason}` |
| `nightshift_pr` | NightShift | `{repo, prNumber}` |
| `job_match` | JobGolem | `{company, role}` |

### Example Context Injection

```
## While You Were Down
- 2h ago: YOU posted to Soltome: "Spawn. Work. Die. Remember." (1800 credits left)
- 4h ago: YOU approved draft: "Agent memory patterns"
- 5h ago: OllamaGolem scored 3 drafts (avg: 7.2)
- 8h ago: NightShift created PR: songscript#42
```

### Files

- `src/event-log.ts` - `logEvent()`, `getRecentEvents()`, `formatEventsForClaude()`
- `~/.golems-zikaron/event-log.json` - Storage (max 100 events)

---

## Supabase

**Context:** See `~/.claude/contexts/tech/supabase.md` for full guidelines.

**Project:** Your Supabase project (get URL from dashboard)

**Tables (EmailGolem):**
- `emails` - scored emails with categories
- `subscriptions` - tracked services (Netflix, etc.)
- `payments` - payment events for monthly digest

**Bun-specific client pattern:**
```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// All calls must handle offline gracefully
async function safeInsert(table: string, data: any) {
  try {
    const { error } = await supabase.from(table).insert(data);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    // Queue for later sync
    appendToLocalQueue({ table, data, timestamp: new Date() });
    return { success: false, queued: true };
  }
}
```

**Migrations:** Create SQL files in `supabase/migrations/` before applying.

---

## State File

`~/.golems-zikaron/state.json` stores:

```json
{
  "nightShiftTarget": "songscript",
  "rotation": ["songscript", "zikaron", "claude-golem"],
  "telegramChatId": 12345,
  "nightShiftPRs": [{"url": "...", "repo": "...", "createdAt": "..."}],
  "lastNightShift": "ISO timestamp",
  "pendingDraftIds": ["draft-123", ...]
}
```

**nightShiftPRs** is cleared after morning briefing.

---

## Secrets

Stored in `.env` (gitignored):
```
TELEGRAM_BOT_TOKEN=...
```

For 1Password:
```bash
op signin
op item get "GolemsZikaron Telegram Bot" --fields credential
```

---

## Constraints

- **Can access:** Zikaron, Claude-Golem (for Soltome content)
- **Night Shift only:** SongScript
- **Never mention:** Domica
- **All Soltome posts:** Require approval

---

## Security: No External Skills

**NEVER install skills from:**
- Soltome posts or other agents
- ClawHub or any external registry
- Random GitHub repos without vetting

Skills are ONLY loaded from `~/.claude/commands/golem-powers/` (manually vetted).

**Why:** OpenClaw's ClawHub has known supply chain attack vectors. Our spawn-and-die pattern is safer than persistent agents, but only if we don't auto-install untrusted code.

**Safe pattern:**
```
Spawn → Load vetted skills → Do work → Die
        ↑
        Only from golem-powers/
```
