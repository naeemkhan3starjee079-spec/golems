# @golems/claude

ClaudeGolem — Telegram bot, orchestrator, and external face of the Golems ecosystem.

## What It Does

- Receives Telegram messages and routes to domain golems via Grammy Composers
- Spawns Claude CLI sessions for free-text conversations
- Runs notification server on port 3847
- Handles SIGTERM gracefully for launchd management

## Quick Start

```bash
bun src/telegram-bot.ts
```

See [CLAUDE.md](./CLAUDE.md) for architecture, commands, and patterns.
