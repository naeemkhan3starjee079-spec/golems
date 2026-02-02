# GolemsZikaron

> Autonomous Telegram bot + Moltbook presence for the Golem ecosystem.

---

## Recent Changes (2026-02-01)

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
- Now runs at **3am** (was 4am)
- Tracks multiple PRs in `state.nightShiftPRs[]` (array, not single URL)
- Clears after morning briefing

### Moltbook Status
- **Cannot post yet** - Moltbook requires OpenClaw agent platform
- Current API key is for identity verification only
- **TODO**: Either run OpenClaw instance for Moltbook, or contact @mattprd for custom API access

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

### Night Shift (3am code improvements)
```bash
# Run now (manual)
cd ~/Gits/golems-zikaron && bun src/night-shift.ts

# Stop running
pkill -f "night-shift"

# Enable scheduled (launchd) - runs at 3am
launchctl load ~/Library/LaunchAgents/com.golemszikaron.nightshift.plist

# Disable scheduled
launchctl unload ~/Library/LaunchAgents/com.golemszikaron.nightshift.plist

# Check launchd config (should show Hour=3)
cat ~/Library/LaunchAgents/com.golemszikaron.nightshift.plist | grep -A1 Hour
```

**Session persistence**: Each repo gets its own Claude session (`nightshift-{repo}`).
**PR tracking**: All PRs stored in `state.nightShiftPRs[]`, shown in morning briefing.

### Moltbook Learner (2am training)
```bash
# Run now (manual)
cd ~/Gits/golems-zikaron && bun src/moltbook-learner.ts

# Enable scheduled
launchctl load ~/Library/LaunchAgents/com.golems.learner.plist

# Disable scheduled
launchctl unload ~/Library/LaunchAgents/com.golems.learner.plist
```

### Check All Status
```bash
# What's running?
ps aux | grep -E "golems|telegram-bot|night-shift|moltbook" | grep -v grep

# Scheduled jobs
launchctl list | grep golems
```

---

## What This Does

1. **Telegram Bot** - Chat with Claude, receive notifications, control Night Shift
2. **Notification Server (port 3847)** - Replaces ntfy, receives Claude hook POSTs
3. **Moltbook Learner (2am)** - Scrape posts + stats → train on top performers
4. **Night Shift (3am)** - Claude scans → implements → CodeRabbit review → PR
5. **Post Generator** - Critique-waves: parallel gen → critique → refine → polish
6. **Morning Briefing (8am)** - PR link + learnings + drafts for approval

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
| `/setmoltkey KEY` | Set Moltbook API key |

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
│   ├── night-shift.ts      # 3am: Claude → CR review → PR
│   ├── moltbook-learner.ts # 2am: Scrape posts, learn patterns
│   ├── briefing.ts         # 8am morning summary
│   ├── moltbook-client.ts  # Browse + filter shitposts
│   ├── post-generator.ts   # Critique-waves (uses learned patterns)
│   ├── ollama-helper.ts    # Ollama spawn wrapper
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
│   ├── moltbook-training.json  # Scraped posts + engagement
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

## Supabase (EmailGolem)

**Context:** See `~/.claude/contexts/tech/supabase.md` for full guidelines.

**Project:** `mkijzwkuubtfjqcemorx` (etanheyman.com)

**Tables (email-golem):**
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

- **Can access:** Zikaron, Claude-Golem (for Moltbook content)
- **Night Shift only:** SongScript
- **Never mention:** Domica
- **All Moltbook posts:** Require approval

---

## Security: No External Skills

**NEVER install skills from:**
- Moltbook posts or other agents
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
