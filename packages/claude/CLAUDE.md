# ClaudeGolem

> CLI remote control via Telegram + notification server.

## Role

ClaudeGolem receives Telegram messages, routes them to Claude CLI, and sends notifications. Simplified to a command-only bot — no conversational UX, no domain composers, no personas.

## Architecture

```text
packages/claude/
├── src/
│   ├── telegram-bot.ts          # Auth (fail-closed) + rate limit → composer → shutdown
│   ├── composers/
│   │   └── claude-composer.ts   # /status, /trigger, /tonight, /schedule + free text → Claude CLI
│   └── lib/
│       ├── bot-shared.ts        # State, Claude CLI spawning, queue processing
│       └── notify-server.ts     # HTTP notification server (port 3847)
├── .claude-plugin/plugin.json
├── CLAUDE.md                    # This file
└── package.json                 # @golems/claude
```

## Dependencies

- `@golems/shared` — Supabase, event log, state store, Axiom, email infra
- `@golems/jobs` — runJobSearch (used by /trigger jobs)
- `@golems/services` — Night shift, briefing (used by /trigger)
- `grammy` — Telegram Bot Framework

## Key Patterns

### Auth (Fail-Closed)
- `TELEGRAM_ALLOWED_IDS` must contain owner user ID
- Empty list = reject all users (fail-closed)
- Rate limit: 10 messages per minute per user

### Claude CLI Spawning
- **ALWAYS strip `ANTHROPIC_API_KEY`** from env when spawning `claude --print`
- Uses `--continue` for main chat with system prompt (SOUL.md + recent events)
- 5-minute timeout with 60s typing heartbeat

### SIGTERM Handling
- Bot MUST handle SIGTERM gracefully (launchd `KeepAlive=true`)
- Call `notifyServer.stop(true)` + `bot.stop()` before `process.exit(0)`
- Without this: EADDRINUSE crash loop on port 3847

## Telegram Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome + command list |
| `/status` | Health, queue, Railway, daily stats |
| `/trigger <svc>` | Manual runs (email/jobs/briefing/nightshift) |
| `/morning` | Morning briefing |
| `/tonight` | Night Shift target selection |
| `/schedule` | Weekly Night Shift rotation |
| `/repos` | List available repos |
| Free text | Spawn Claude CLI |

## Notify Server

HTTP on `127.0.0.1:3847`:
- `POST /notify` — Send notification to Telegram (validated: title required, body truncated, source-based routing)
- `GET /health` — Health check

## Communication Style

See `SOUL.md` for full persona. Key traits:
- Formality: 2/10 — very casual
- Brief, direct messages (mobile chat)
- Hebrew/English code-switching
