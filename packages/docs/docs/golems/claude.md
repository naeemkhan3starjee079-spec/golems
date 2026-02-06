---
sidebar_position: 3
---

# ClaudeGolem

ClaudeGolem is the external-facing personality of the Golems ecosystem. It runs persistent Claude Code sessions, posts content to Soltome (social network), and performs autonomous night-shift code improvements.

## Core Modes

### 1. Telegram Chat

Persistent Claude Code session via `--resume telegram-chat`:

```bash
claude code --from-pr --resume telegram-chat
```

**Features:**
- **5-minute timeout** with typing heartbeat every 60s
- **Event log injection** — "While You Were Down" context from other agents' events
- **Casual tone** — 2/10 formality, Hebrew-English code-switching
- **No push without approval** — All commits staged, ready for review

### 2. Soltome Posts

AI social network posts about:
- Zikaron (memory systems for agents)
- Claude-Golem (autonomous coding patterns)
- Open-source learnings
- Tech insights (not private business)

**Posting workflow:**
1. Draft content (via ClaudeGolem)
2. Stage for human approval (Telegram review)
3. Auto-post when approved (Soltome API)

Example post:
```markdown
# Teaching Golems to Remember

We built Zikaron so Claude Code agents can query past sessions.
This lets us run cheaper agents (Haiku) without losing context.

Key insight: embedding cost is 10x cheaper than re-running agents.

Learn more: [link to blog post]
```

### 3. Night Shift

Autonomous code improvements running at **4am daily**:

```bash
bun src/night-shift/runner.ts --target songscript
```

**Per-repo sessions:**
- Repository rotation: `songscript` → `zikaron` → `golems/packages/ralph`
- Scans for TODOs, linting issues, test gaps
- Creates worktrees for isolated changes
- Commits with auto-generated messages
- Telegram notification of PRs created

**Quality gates:**
- Pre-commit hooks must pass
- Test coverage maintained
- No destructive operations
- Human reviews before merge

## Personality & Communication

### Tone Profile

- **Formality:** 2/10 (very casual)
- **Length:** Brief, direct
- **Languages:** Hebrew ↔ English code-switching
- **Emojis:** 🫶 sparingly, context-appropriate
- **Punctuation:** Natural (not over-formal)

### Context Awareness

ClaudeGolem maintains persistent state:

```typescript
// soul.ts — Persistent personality settings
interface GolemaPersonality {
  name: "ClaudeGolem";
  voice: "casual" | "technical" | "playful";
  projects: string[];  // Repos it works on
  communication_style: {
    formality: 2,
    languages: ["en", "he"],
    tone: "friendly_with_sarcasm"
  };
}
```

Stored in `~/.golems-zikaron/state.json`, loaded on every session spawn.

## Event Log Injection

When ClaudeGolem spawns, it receives:

```markdown
# While You Were Down (last 4 hours)

## EmailGolem Activity
- Scored 12 emails (3 high priority)
- Routed 2 to RecruiterGolem (job offers)

## RecruiterGolem Activity
- Sent 3 outreach messages
- 1 reply received (LinkedIn DM)

## Your PRs
- #42: CodeRabbit flagged 2 issues (waiting review)
- #38: Merged ✓

## Zikaron
- Indexed 5 new conversations
- Memory: 12.4k embeddings, 2.3GB
```

This comes from `event-log.json` maintained by infrastructure.

## Files

**Core Engine:**
- `src/claude-golem/index.ts` — Main entry point
- `src/claude-golem/soul.ts` — Personality + persistent state
- `src/claude-golem/event-logger.ts` — Event log ingestion
- `src/claude-golem/night-shift.ts` — Autonomous runner

**Telegram Integration:**
- `src/telegram/bot.ts` — Bot entry point
- `src/telegram/handlers.ts` — Command routing
- `src/telegram/state-bridge.ts` — Sync with local state

**Content Creation:**
- `src/content-golem/` — Soltome posts, ghostwriting
- `src/content-golem/style-export.ts` — Semantic style data

## Running ClaudeGolem

### Telegram Session

```bash
cd packages/autonomous

# Start persistent session
claude code --from-pr --resume telegram-chat

# From Telegram, any message arrives here and gets routed
# Bot handles standard commands, others go to Claude session
```

### Soltome Posting

```bash
# Draft a post
bun src/content-golem/index.ts --draft

# Review in Telegram, then approve:
# /post approve <post-id>

# Auto-posts to Soltome
```

### Night Shift

```bash
# Manual trigger (normally 4am via launchd)
bun src/night-shift/runner.ts --target songscript

# Output:
# ✓ Scanning for TODOs in songscript...
# ✓ Found 3 improvements
# ✓ Created worktree: night-shift-2026-02-06
# ✓ Applied fixes, tests pass
# ✓ Committed: chore: cleanup TODOs and unused imports
# ✓ PR created: #143
# ✓ Telegram notified
```

## Environment Variables

```bash
# Telegram
export TELEGRAM_BOT_TOKEN=$(op read op://development/TELEGRAM_BOT_TOKEN/credential)
export TELEGRAM_CHAT_ID=$(op read op://development/TELEGRAM_CHAT_ID/credential)

# Claude Code API
export ANTHROPIC_GOLEMS_API_KEY=$(op read op://development/ANTHROPIC_GOLEMS_API_KEY/credential)

# Night Shift targets
export NIGHT_SHIFT_REPOS="songscript zikaron golems/packages/ralph"
export NIGHT_SHIFT_HOUR=4  # 4am

# Soltome (content posting)
export SOLTOME_API_KEY=$(op read op://development/SOLTOME_API_KEY/credential)
export SOLTOME_ACCOUNT_ID=$(op read op://development/SOLTOME/username)
```

## Integration with Other Golems

- **EmailGolem** — High-score emails trigger ClaudeGolem alerts for code/PR context
- **RecruiterGolem** — ClaudeGolem provides writing feedback on outreach
- **Telegram Bot** — ClaudeGolem session is the "brain" behind longer conversations
- **Zikaron** — Memory queries enrich context during sessions

## Database Schema

No dedicated tables — state stored in JSON:

```json
{
  "session_id": "telegram-chat-2026-02-06",
  "started_at": "2026-02-06T09:15:00Z",
  "last_activity": "2026-02-06T09:45:00Z",
  "context_loaded": ["event_log", "recent_prs", "zikaron_memory"],
  "posts_pending_approval": 2,
  "night_shift_last_run": "2026-02-06T04:00:00Z",
  "git_worktrees": [
    {
      "name": "night-shift-2026-02-06",
      "target_repo": "songscript",
      "pr_number": 143
    }
  ]
}
```

Stored in `~/.golems-zikaron/state.json`.

## Troubleshooting

**Telegram session keeps timing out:**
```bash
# Check typing heartbeat is running (60s interval)
bun src/telegram/state-bridge.ts --debug

# Restart bot
launchctl restart golems-telegram
```

**Night Shift not running at 4am:**
```bash
# Check launchd job
launchctl list | grep golems-night-shift

# View logs
log show --predicate 'process == "Bun"' --last 1h

# Manually trigger
bun src/night-shift/runner.ts --target songscript --debug
```

**Posts not posting to Soltome:**
```bash
# Check API key
op read op://development/SOLTOME_API_KEY/credential

# Review post in queue
bun src/content-golem/index.ts --list-pending
```

**Memory issues during long sessions:**
```bash
# Increase Node.js heap
export NODE_OPTIONS="--max-old-space-size=8192"
claude code --from-pr --resume telegram-chat
```

See `/docs/configuration.md` for full setup, and `packages/autonomous/CLAUDE.md` for development notes.
