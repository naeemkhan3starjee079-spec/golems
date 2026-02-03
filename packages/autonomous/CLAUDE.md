# ClaudeGolem (autonomous)

> Autonomous Telegram bot + Soltome presence for the Golem ecosystem.

---

## Recent Changes (2026-02-02)

### ClaudeGolem Timeout & Heartbeat
- **Timeout: 5 minutes** (was 2 min) - complex tasks need time
- **Typing heartbeat** every 60s while Claude works
- **Acknowledge pattern** (SOUL.md) - Claude says "Got it. I'll do X, Y, Z." before complex tasks
- This prevents "No response." on research/subagent tasks

### Session Architecture
- **Master Golem** uses `--resume telegram-chat` - single persistent session for all chat
- **Night Shift** uses `--resume nightshift-{repo}` - per-repo sessions (focused memory)
- This means chat context persists across bot restarts

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

---

## Golem Roles

Each golem has a distinct role and attribution in the event log:

| Golem | Role | Event Types |
|-------|------|-------------|
| **ClaudeGolem** | External face - chat, post, represent | `soltome_post`, `draft_approved`, `draft_rejected` |
| **OllamaGolem** | Internal work - scoring, reviewing, patterns | `draft_scored`, `pattern_extracted` |
| **NightShift** | Autonomous code improvements (4am) | `nightshift_pr` |
| **EmailGolem** | Email triage and alerts | `email_alert` |
| **JobGolem** | Job board scraping and matching | `job_match` |

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
golems-zikaron/
├── src/
│   ├── telegram-bot.ts     # Telegram bot + notification server (3847)
│   ├── night-shift.ts      # 4am: Claude → CR review → PR
│   ├── soltome-learner.ts  # 2am: Scrape posts, learn patterns
│   ├── soltome-client.ts   # Soltome API client
│   ├── event-log.ts        # Event log for ClaudeGolem memory
│   ├── briefing.ts         # 8am morning summary
│   ├── post-generator.ts   # Critique-waves (uses learned patterns)
│   ├── ollama-wrapper.ts   # Ollama spawn wrapper
│   ├── email-golem/        # Email triage + subscription tracking
│   │   ├── index.ts        # Main entry (10min cron)
│   │   ├── gmail-client.ts # Gmail API wrapper
│   │   ├── scorer.ts       # Ollama scoring (urgent/job/subscription)
│   │   └── db-client.ts    # Supabase + offline queue
│   └── job-golem/          # Job board scraping
├── launchd/
│   ├── *.plist             # macOS schedulers
│   └── install.sh          # One-command setup
├── data/
│   ├── drafts.json         # Pending post drafts
│   ├── soltome-training.json   # Scraped posts + engagement
│   └── learned-patterns.json   # Extracted patterns for drafting
├── SOUL.md                 # Bot persona & constraints
├── CLAUDE.md               # This file
├── .env                    # Secrets (gitignored)
└── README.md
```

---

## Research (docs.local/)

Research conducted via Ralph (gitignored, local only):

| File | Topic |
|------|-------|
| `docs.local/research/telegram-features.md` | Voice messages, threading, inline mode |
| `docs.local/research/agent-memory.md` | LangChain, Redis, multi-agent patterns |
| `docs.local/research/moltbook-integration.md` | Posting strategies, scheduling, authenticity |
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
├── db-client.ts       # Supabase + offline queue
├── types.ts           # TypeScript interfaces
├── CONTEXT.md         # Agent documentation
└── README.md          # Setup + troubleshooting
```

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
tail -f /tmp/golemszikaron-email-golem.log
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

**Project:** `mkijzwkuubtfjqcemorx` (etanheyman.com)

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
