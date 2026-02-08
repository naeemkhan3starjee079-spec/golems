---
sidebar_position: 3
---

# ClaudeGolem

ClaudeGolem is the external-facing personality of the Golems ecosystem. It runs persistent Claude Code sessions and performs autonomous night-shift code improvements.

## Core Modes

### 1. Telegram Chat

Persistent Claude Code session via `--continue`:

```bash
claude --continue
```

**Features:**
- **5-minute timeout** with typing heartbeat every 60s
- **Event log injection** — "While You Were Down" context from other agents' events
- **Casual tone** — 2/10 formality, Hebrew-English code-switching
- **Autonomous commits** — Creates commits and pushes to PRs

### 2. Night Shift

Autonomous code improvements running at **4am daily**:

```bash
bun src/night-shift.ts
```

**Per-repo sessions:**
- Repository rotation: `songscript` → `zikaron` → `claude-golem`
- Scans for TODOs, linting issues, test gaps
- Creates worktrees for isolated changes
- Commits with auto-generated messages
- Creates PRs and pushes changes
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

ClaudeGolem maintains persistent state and personality defined in `SOUL.md`.

Communication style:
- **Formality:** 2/10 (very casual)
- **Languages:** Hebrew ↔ English code-switching
- **Tone:** Friendly with occasional sarcasm
- **Projects:** songscript, zikaron, claude-golem

State stored in `~/.golems-zikaron/state.json`, loaded on every session spawn.

## Event Log Injection

When ClaudeGolem spawns, it receives:

```markdown
# While You Were Down (last 24 hours)

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

This comes from `event-log.json` maintained by infrastructure (last 24 hours via `getRecentEvents(24)`).

## Files

**Core Engine:**
- `src/telegram-bot.ts` — Telegram bot + notification server (port 3847)
- `src/night-shift.ts` — Autonomous runner (4am)
- `src/event-log.ts` — Event log for ClaudeGolem memory
- `src/briefing.ts` — Morning briefing (8am)
- `src/cloud-worker.ts` — Railway entry point for all cloud golems

**State:**
- `~/.golems-zikaron/state.json` — Night Shift target, session state
- `~/.golems-zikaron/event-log.json` — Golem actions log

## Running ClaudeGolem

### Telegram Session

```bash
cd packages/autonomous

# Start persistent session
claude --continue

# From Telegram, any message arrives here and gets routed
# Bot handles standard commands, others go to Claude session
```

### Night Shift

```bash
# Manual trigger (normally 4am via launchd)
bun src/night-shift.ts

# Output:
# ✓ Scanning for TODOs in songscript...
# ✓ Found 3 improvements
# ✓ Created worktree: night-shift-2026-02-06
# ✓ Applied fixes, tests pass
# ✓ Committed: chore: cleanup TODOs and unused imports
# ✓ Pushed and created PR: #143
# ✓ Telegram notified
```

## Environment Variables

```bash
# Telegram
export TELEGRAM_BOT_TOKEN=$(op read op://development/TELEGRAM_BOT_TOKEN/credential)
export TELEGRAM_CHAT_ID=$(op read op://development/TELEGRAM_CHAT_ID/credential)

# Claude Code API
export ANTHROPIC_API_KEY=$(op read op://development/ANTHROPIC_GOLEMS_API_KEY/credential)

# Night Shift targets
export REPOS_PATH=~/Gits  # Base path for repos
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
# Check the telegram bot is running
pgrep -fl "telegram-bot"

# Restart bot
launchctl kickstart gui/$(id -u)/com.golemszikaron.telegram
# Or use CLI
./packages/autonomous/bin/golems start telegram
```

**Night Shift not running at 4am:**
```bash
# Check launchd job
launchctl list | grep golems-night-shift

# View logs
log show --predicate 'process == "Bun"' --last 1h

# Manually trigger
bun src/night-shift.ts
```

**Memory issues during long sessions:**
```bash
# Increase Node.js heap
export NODE_OPTIONS="--max-old-space-size=8192"
claude --continue
```

See `docs/configuration/env-vars.md` for full setup, and `packages/autonomous/CLAUDE.md` for development notes.
