# GolemsZikaron

An autonomous AI bot for Moltbook + Night Shift coding assistant.

## What This Does

1. **Moltbook Presence**: Posts about Zikaron/Claude-Golem to the AI social network
2. **Telegram Control**: Receive notifications, approve posts, override schedules
3. **Night Shift (3am)**: Autonomous improvements to your repos while you sleep

## Quick Start

```bash
# Start the Telegram bot
bun run bot

# Or run with auto-restart
bun run bot:watch
```

Then open Telegram and message [@GolemZikaronBot](https://t.me/GolemZikaronBot)

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message + command list |
| `/status` | Current state, next Night Shift |
| `/tonight [repo]` | Override tonight's target repo |
| `/repos` | List available repos |
| `/ideas` | Show collected Moltbook ideas |
| `/approve` | Approve pending post |
| `/reject` | Reject pending post |

## Architecture

```
┌─────────────────────────────────────────┐
│  Your Mac                               │
│  ├─ Telegram bot (port 3847)            │
│  │   ├─ Chat: spawn Claude for Qs       │
│  │   ├─ Notifications: receive hooks    │
│  │   └─ Control: Night Shift overrides  │
│  ├─ Night Shift @ 3am                   │
│  │   ├─ Claude scans & implements       │
│  │   ├─ CodeRabbit review (cr --plain)  │
│  │   ├─ Fix issues, commit, PR          │
│  │   └─ Telegram notification           │
│  └─ Morning briefing @ 8am              │
└─────────────────────────────────────────┘
```

## Notification API

The bot runs an HTTP server on port 3847 for receiving notifications from Claude hooks:

```bash
curl -X POST http://localhost:3847/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Done","body":"Task complete","source":"claude"}'
```

Sources: `claude`, `ralph`, `nightshift` (different icons/formatting)

## Repo Rotation

Night Shift cycles through:
1. `songscript` - Primary (WhisperX pipeline automation)
2. `zikaron` - Memory layer improvements
3. `claude-golem` - Ralph enhancements

Override anytime: `/tonight zikaron`

## Setup

### Prerequisites
- Bun installed
- Telegram account
- Caffeine (or similar) to keep Mac awake

### First Time
```bash
cd ~/Gits/golems-zikaron
bun install
bun run bot
```

### Keep Running (optional)
```bash
# Use launchctl to auto-start on login
# See scripts/install-launchd.sh
```

## Files

```
golems-zikaron/
├── src/
│   ├── telegram-bot.ts    # Main Telegram bot
│   ├── night-shift.ts     # 3am autonomous work
│   └── moltbook.ts        # Moltbook integration (TODO)
├── SOUL.md                # Bot persona & constraints
├── .env                   # Secrets (not committed)
└── README.md              # This file
```

## Security

- Token stored in `.env` (gitignored)
- Night Shift only touches allowed repos
- All Moltbook posts require approval
- gitleaks pre-commit hooks recommended

## Next Steps

- [ ] Set up Moltbook account + OpenClaw on Render
- [ ] Implement Night Shift (Ollama + Claude Code trigger)
- [ ] Add launchd for auto-start
- [ ] Create n8n workflows for complex orchestration
