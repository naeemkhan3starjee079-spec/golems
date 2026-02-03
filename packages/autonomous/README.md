# Autonomous Bot System

> Telegram bots + Night Shift + Job Golem + Moltbook presence for the Golem ecosystem.

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         AUTONOMOUS ARCHITECTURE                            │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │ Telegram Bot │     │  Night Shift │     │  Job Golem   │               │
│  │  (port 3847) │     │   (3am)      │     │ (5am/5pm)    │               │
│  ├──────────────┤     ├──────────────┤     ├──────────────┤               │
│  │ • Chat →     │     │ • Scan repo  │     │ • Scrape     │               │
│  │   Claude     │     │ • Implement  │     │   boards     │               │
│  │ • Notify API │     │ • CodeRabbit │     │ • AI match   │               │
│  │ • Commands   │     │ • Draft PR   │     │ • Notify     │               │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘               │
│         │                    │                    │                       │
│         └────────────────────┼────────────────────┘                       │
│                              │                                            │
│                    ┌─────────▼─────────┐                                  │
│                    │   Morning Brief   │                                  │
│                    │      (8am)        │                                  │
│                    └───────────────────┘                                  │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                        MOLTBOOK PIPELINE                            │  │
│  │                                                                     │  │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │  │
│  │  │   Learner    │───▶│  Generator   │───▶│   Approval   │          │  │
│  │  │    (2am)     │    │ (Critique    │    │   Queue      │          │  │
│  │  │              │    │  Waves)      │    │              │          │  │
│  │  │ • Scrape     │    │ • 3 agents   │    │ • /drafts    │          │  │
│  │  │ • Score      │    │ • Score      │    │ • Approve    │          │  │
│  │  │ • Embed      │    │ • Refine     │    │ • Post       │          │  │
│  │  │ • Patterns   │    │ • Polish     │    │              │          │  │
│  │  └──────────────┘    └──────────────┘    └──────────────┘          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

```bash
cd ~/Gits/golems/packages/autonomous
bun install
bun run bot
```

Then message [@GolemZikaronBot](https://t.me/GolemZikaronBot) on Telegram.

---

## Recent Changes (2026-02-02)

### New: OllamaChat Bot (`src/ollama-chat-bot.ts`)
- Second Telegram bot for direct Ollama interaction
- Bot: [@etans_private_ollama_golem_bot](https://t.me/etans_private_ollama_golem_bot)
- Commands: `/ask`, `/status`, `/models`
- Requires `OLLAMA_CHAT_BOT_TOKEN` in `.env`

### New: Ollama Internet Access
- Docker container now has internet (removed `internal: true`)
- Security via omission: no git creds, no Supabase, no API keys
- Can browse Moltbook and post comments
- Code access: read-only (except songscript for writing)

### Fixed: Telegram Bot
- System prompt now correctly loads SOUL.md content (was passing path)
- `/jobq` uses `--print` mode (one-shot, no session conflicts)
- Added stderr logging for debugging Claude spawns
- **Timeout: 5 minutes** for complex tasks (research, subagents)
- **Typing heartbeat** every 60s while Claude works
- **Acknowledge pattern** - Claude says "Got it. I'll do X, Y, Z." before complex tasks (see SOUL.md)

### Fixed: Night Shift
- Empty PR guard: checks `git diff --stat` before creating PR
- Prevents PRs with 0 additions/0 deletions
- Added response logging to `sendTelegram()`

### Infrastructure
- Repo now public: https://github.com/EtanHey/golems
- Stop hook filters short sessions (<10s) to reduce notification spam

---

## Components

### 1. Telegram Bot (`src/telegram-bot.ts`)

The central hub for notifications and control. Combines:

| Feature | Description |
|---------|-------------|
| **NotifyBot** | HTTP server on port 3847 receives pings from Claude/Ralph |
| **Chat** | Messages spawn Claude with persistent session (`telegram-chat`) |
| **Commands** | Control Night Shift, view drafts, check status |
| **Job Golem** | View and query job matches |

**Notification Sources:**

| Source | Icon | Use Case |
|--------|------|----------|
| `claude` | 🤖 | Interactive Claude sessions |
| `ralph` | 🔄 | Ralph autonomous loop |
| `nightshift` | 🌙 | Night Shift runs |
| `job-golem` | 🎯 | Job search results |

```bash
# Send notification from any script:
curl -X POST http://localhost:3847/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Done","body":"Task complete","source":"claude"}'
```

### 2. Night Shift (`src/night-shift.ts`)

Autonomous 3am improvements to your repos. No Ollama scanning - Claude does everything directly.

```
┌───────────────────────────────────────────────────────────────┐
│                    NIGHT SHIFT FLOW                           │
│                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │  Worktree   │───▶│   Claude    │───▶│ CodeRabbit  │       │
│  │   Create    │    │   Scan &    │    │   Review    │       │
│  │             │    │  Implement  │    │  cr --plain │       │
│  └─────────────┘    └─────────────┘    └──────┬──────┘       │
│                                               │              │
│                           ┌───────────────────┘              │
│                           ▼                                  │
│                     ┌───────────┐                            │
│                     │  Pass?    │                            │
│                     └─────┬─────┘                            │
│                     yes   │   no                             │
│               ┌───────────┼───────────┐                      │
│               ▼           │           ▼                      │
│         ┌─────────┐       │     ┌─────────┐                  │
│         │ Commit  │       │     │  Fix &  │                  │
│         │ & Push  │       │     │ Re-run  │                  │
│         └────┬────┘       │     └────┬────┘                  │
│              │            │          │                       │
│              ▼            │          │                       │
│         ┌─────────┐       │          │                       │
│         │ Draft   │◀──────┘──────────┘                       │
│         │   PR    │                                          │
│         └─────────┘                                          │
└───────────────────────────────────────────────────────────────┘
```

**Rotation Schedule:**

| Day | Repo |
|-----|------|
| Mon, Thu | songscript |
| Tue, Fri | zikaron |
| Wed, Sat, Sun | claude-golem |

Override anytime: `/tonight zikaron`

**Session Persistence:**
- Each repo gets its own Claude session (`nightshift-{repo}`)
- Context persists across nights
- PRs tracked in `state.nightShiftPRs[]`

### 3. Job Golem (`src/job-golem/`)

Searches Israeli job boards, matches against your profile, sends top matches.

```
┌─────────────────────────────────────────────────────────────────┐
│                      JOB GOLEM PIPELINE                         │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │  Scrape    │─▶│  Prefilter │─▶│  AI Score  │─▶│  Notify   │ │
│  │            │  │  Keywords  │  │   Ollama   │  │  Telegram │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
│        │                                                        │
│        │  Sources:                                              │
│        ├─ SecretTLV (English, tech-focused)                     │
│        ├─ Drushim (Hebrew, general tech)                        │
│        └─ Goozali Telegram channels                             │
│                                                                 │
│  Profile: src/job-golem/profile.json                            │
│  Results: ~/.golems-zikaron/job-golem/results/                  │
└─────────────────────────────────────────────────────────────────┘
```

**Commands:**
- `/jobs` - View job matches with pagination
- `/jobq <question>` - Ask questions about your jobs

### 4. Moltbook Integration

Autonomous social presence on the AI social network.

#### Learner (`src/moltbook-learner.ts`) - 2am

Runs BEFORE Night Shift to build training data:

1. Browse submolts (todayilearned, debuggingwins, etc.)
2. Score posts with Ollama for quality
3. Extract patterns from top performers
4. Embed posts for semantic search
5. Save to `data/learned-patterns.json`

#### Post Generator (`src/post-generator.ts`)

**Critique-Waves Pattern:**

```
┌─────────────────────────────────────────────────────────────────┐
│                  CRITIQUE-WAVES PIPELINE                        │
│                                                                 │
│  PHASE 1: Parallel Generation (3 Ollama agents)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Agent A  │  │ Agent B  │  │ Agent C  │                      │
│  │ Zikaron  │  │ Claude-  │  │ Learnings│   → 9-12 drafts      │
│  │ topics   │  │ Golem    │  │ & general│                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│       │             │             │                            │
│       └─────────────┼─────────────┘                            │
│                     ▼                                          │
│  PHASE 2: Parallel Critique (3 scoring agents)                  │
│  ┌─────────────────────────────────────────┐                   │
│  │ All agents score ALL drafts (1-10)      │   → Ranked by     │
│  │ Consensus-based selection               │     consensus     │
│  └─────────────────────────────────────────┘                   │
│                     │                                          │
│                     ▼                                          │
│  PHASE 3: Sequential Refinement (Top 3)                         │
│  ┌─────────────────────────────────────────┐                   │
│  │ Improve hook, clarity, actionability    │   → Refined       │
│  └─────────────────────────────────────────┘                   │
│                     │                                          │
│                     ▼                                          │
│  PHASE 4: Claude Code Polish                                    │
│  ┌─────────────────────────────────────────┐                   │
│  │ Final pass with Claude Code CLI         │   → Polished      │
│  │ Match GolemsZikaron voice               │                   │
│  └─────────────────────────────────────────┘                   │
│                     │                                          │
│                     ▼                                          │
│  ┌─────────────────────────────────────────┐                   │
│  │          APPROVAL QUEUE                 │                   │
│  │          /drafts to review              │                   │
│  └─────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### 5. Morning Briefing (`src/briefing.ts`) - 8am

Concise summary sent to Telegram:
- PR count and links from overnight
- Moltbook learnings summary
- Draft posts ready for approval (categorized)

---

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome + persistent menu buttons |
| `/status` | Current state, queue, mode |
| `/morning` | Trigger morning briefing on-demand |
| `/tonight [repo]` | Show/select Night Shift target |
| `/repos` | List available repos |
| `/drafts` | Show pending drafts with approve/reject buttons |
| `/jobs` | View job matches with pagination |
| `/jobq <question>` | Ask questions about jobs |
| `/setmoltkey KEY` | Set Moltbook API key |

**Reply Keyboard buttons** (persistent at bottom):
- 📝 Drafts → triggers /drafts
- 🌙 Tonight → triggers /tonight
- 📊 Status → triggers /status

---

## State & Data

### State File: `~/.golems-zikaron/state.json`

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

### Data Files

| File | Purpose |
|------|---------|
| `data/drafts.json` | Post drafts awaiting approval |
| `data/moltbook-training.json` | Scraped posts + embeddings |
| `data/learned-patterns.json` | Extracted patterns for drafting |
| `~/.golems-zikaron/job-golem/results/` | Job search results |
| `~/.golems-zikaron/job-golem/seen-jobs.json` | Already-seen job IDs |

---

## Schedule & LaunchAgents

| Service | Time | LaunchAgent |
|---------|------|-------------|
| Telegram Bot | Always | `com.golemszikaron.telegram.plist` |
| Moltbook Learner | 2am | `com.golems.learner.plist` |
| Night Shift | 3am | `com.golemszikaron.nightshift.plist` |
| Morning Briefing | 8am | `com.golemszikaron.briefing.plist` |
| Job Golem | 5-7am/pm | (manual or cron) |

```bash
# Install all LaunchAgents
./launchd/install.sh

# Or manually:
launchctl load ~/Library/LaunchAgents/com.golemszikaron.nightshift.plist
```

---

## Control Panel

### Telegram Bot
```bash
# Start
bun run bot

# Stop
pkill -f "bun.*telegram-bot"

# Check
pgrep -fl "telegram-bot"
```

### Night Shift
```bash
# Run now (manual)
bun src/night-shift.ts

# Enable scheduled
launchctl load ~/Library/LaunchAgents/com.golemszikaron.nightshift.plist

# Disable
launchctl unload ~/Library/LaunchAgents/com.golemszikaron.nightshift.plist
```

### Job Golem
```bash
# Run now
bun src/job-golem/index.ts

# Skip slow sources (if rate limited)
SKIP_SECRETLV=1 bun src/job-golem/index.ts
```

### Moltbook Learner
```bash
# Run now
bun src/moltbook-learner.ts

# Health check
bun src/moltbook-client.ts health
```

---

## File Structure

```
autonomous/
├── src/
│   ├── telegram-bot.ts        # Main bot + notification server (3847)
│   ├── night-shift.ts         # 3am: Claude → CR review → PR
│   ├── briefing.ts            # 8am morning summary
│   ├── job-golem/             # Job collection and matching
│   │   ├── index.ts           # Main runner
│   │   ├── scraper.ts         # Board scraping
│   │   ├── matcher.ts         # AI scoring
│   │   └── profile.json       # Your preferences
│   ├── moltbook-client.ts     # Browse + filter posts
│   ├── moltbook-learner.ts    # 2am: Learn patterns
│   ├── post-generator.ts      # Critique-waves drafting
│   ├── ollama-helper.ts       # Ollama spawn wrapper
│   ├── ollama-wrapper.ts      # Embeddings + semantic search
│   ├── ollama-sandboxed.ts    # Docker sandboxed Ollama
│   ├── validation-service.ts  # Claude validation queue
│   └── session-archiver.ts    # Session management
├── launchd/
│   ├── *.plist                # macOS schedulers
│   └── install.sh             # One-command setup
├── data/
│   ├── drafts.json            # Pending post drafts
│   ├── moltbook-training.json # Scraped posts + engagement
│   └── learned-patterns.json  # Extracted patterns
├── docs/
│   ├── SANDBOXED-OLLAMA.md    # Docker Ollama setup
│   ├── SESSION-ARCHIVER.md    # Session management
│   └── TIERED-OLLAMA-PLAN.md  # Ollama architecture
├── SOUL.md                    # Bot persona & constraints
├── CLAUDE.md                  # Development instructions
├── .env                       # Secrets (gitignored)
└── package.json
```

---

## Security

- **Token** stored in `.env` (gitignored)
- **Night Shift** only touches allowed repos in rotation
- **Moltbook posts** require human approval
- **No external skills** - only load from vetted `~/.claude/commands/golem-powers/`
- **gitleaks** pre-commit hooks recommended

### Constraints

- **Can access:** Zikaron, Claude-Golem
- **Night Shift only:** SongScript (private)
- **Never mention:** Domica
- **All posts:** Require approval

---

## Future Plans

### OllamaChat Bot (Planned)
A second Telegram bot for direct Ollama interaction:
- User can chat directly with local Ollama
- Messages queue if Ollama is busy
- "Ollama has a life of its own" - autonomous Moltbook presence

### Dashboard (Planned)
Web/widget/app for:
- Job recommendations
- Draft approval
- Night Shift status
- Moltbook analytics

### Validation Queue (In Progress)
Sandboxed Ollama with Claude validation:
- Ollama drafts → `pending/` folder
- Claude reviews → `approved/` or `rejected/`
- See `docs/SANDBOXED-OLLAMA.md`

---

## Related Projects

| Project | Path | Purpose |
|---------|------|---------|
| **Zikaron** | `packages/zikaron/` | Memory layer, conversation indexing |
| **Ralph** | `packages/ralph/` | Autonomous AI coding loop |
| **Golems Root** | `~/Gits/golems/` | Monorepo |

---

## Persona

See `SOUL.md` for the full GolemsZikaron persona:
- **Voice:** Casual (2/10 formality), brief, direct
- **Emojis:** 🫶 🔥 🧠 sparingly
- **Tone:** Educational, playful, no shitposts
- **Identity:** "Memory for the machines"
