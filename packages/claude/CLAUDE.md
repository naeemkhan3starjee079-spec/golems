# ClaudeGolem

> Orchestrator, Telegram router, and external face of the Golems ecosystem.

## Role

ClaudeGolem is the **central hub** — it receives all Telegram messages, routes domain-specific requests to other golems via Grammy Composers, and handles anything that doesn't belong to a specific domain golem. It's the "general intelligence" that coordinates the ecosystem.

## Architecture

```text
packages/claude/
├── src/
│   ├── telegram-bot.ts          # Thin router: auth → composers → startup/shutdown
│   ├── composers/
│   │   └── claude-composer.ts   # /start, /status, /admin, /trigger, /fork, /setup, /tonight, /repos + free text
│   └── lib/
│       ├── bot-shared.ts        # Shared bot utilities (auth, keyboard, state)
│       ├── chat-queue.ts        # Message queue for Claude CLI spawns
│       ├── notify-server.ts     # HTTP notification server (port 3847)
│       └── session-fork.ts      # Per-golem Claude session forking
├── .claude-plugin/plugin.json
├── CLAUDE.md                    # This file
└── package.json                 # @golems/claude
```

## Dependencies

- `@golems/shared` — Supabase, event log, state store, LLM, email infra
- `@golems/jobs` — JobGolem Composer (registered in telegram-bot.ts)
- `@golems/recruiter` — RecruiterGolem Composer
- `@golems/services` — Cloud worker, night shift, briefing
- `grammy` — Telegram Bot Framework

## Key Patterns

### Telegram Bot Lifecycle
1. `telegram-bot.ts` creates bot, applies auth middleware, registers composers
2. Each golem's composer handles its own commands + callbacks
3. Free-text messages go to ClaudeGolem composer → spawns `claude --print`
4. Notification server on port 3847 receives POST from Claude hooks

### Claude CLI Spawning
- **ALWAYS strip `ANTHROPIC_API_KEY`** from env when spawning `claude --print`
- Uses `--continue` for main chat, `--resume <uuid>` for per-golem sessions
- 5-minute timeout with 60s typing heartbeat

### SIGTERM Handling
- Bot MUST handle SIGTERM gracefully (launchd `KeepAlive=true`)
- Call `notifyServer.stop(true)` + `bot.stop()` before `process.exit(0)`
- Without this: EADDRINUSE crash loop on port 3847

## Telegram Commands

| Command | Handler | Description |
|---------|---------|-------------|
| `/start` | claude-composer | Welcome + persistent menu |
| `/status` | claude-composer | Current state, queue, mode |
| `/admin` | claude-composer | Admin controls |
| `/trigger` | claude-composer | Trigger golem actions |
| `/fork` | claude-composer | Fork Claude session for golem |
| `/setup` | claude-composer | Register topic thread IDs |
| `/tonight` | claude-composer | Night Shift target selection |
| `/repos` | claude-composer | List available repos |
| Free text | claude-composer | Spawn Claude CLI |

## Communication Style

See `../autonomous/SOUL.md` for full persona. Key traits:
- Formality: 2/10 — very casual
- Brief, direct messages (it's mobile chat)
- Hebrew ↔ English code-switching
- Emojis sparingly (🫶)
