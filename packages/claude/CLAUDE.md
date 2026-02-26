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
- `@golems/coach` — CoachGolem Composer (/plan, /golems)
- `@golems/teller` — TellerGolem Composer (/spending)
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
| `/start` | claude-composer | Welcome v6 + persistent menu |
| `/status` | claude-composer | Health, queue, Railway, stats |
| `/admin` | claude-composer | Dashboard links |
| `/trigger` | claude-composer | Manual runs (email/jobs/briefing/nightshift) |
| `/fork` | claude-composer | Fork Claude session for task |
| `/setup` | claude-composer | Register topic thread IDs |
| `/tonight` | claude-composer | Night Shift target selection |
| `/schedule` | claude-composer | Weekly Night Shift rotation |
| `/repos` | claude-composer | List available repos |
| `/plan` | coach-composer | Today's schedule + pending tasks |
| `/golems` | coach-composer | All golem ecosystem statuses |
| `/spending` | teller-composer | Monthly/tax financial reports |
| `/jobs` | job-composer | Job matches with pagination |
| `/jobq` | job-composer | Ask questions about jobs |
| `/practice` | recruiter-composer | Interview practice (Elo-rated) |
| `/stats` | recruiter-composer | Practice statistics |
| `/outreach` | recruiter-composer | Outreach pipeline |
| `/followup` | recruiter-composer | Overdue follow-ups |
| Free text | claude-composer | Spawn Claude CLI |

### Keyboard Buttons

| Button | Action |
|--------|--------|
| 📊 Status | System health + stats |
| 📋 Plan | Today's daily plan |
| 🌙 Tonight | Night Shift target picker |
| 🤖 Golems | Ecosystem golem statuses |

## Communication Style

See `../autonomous/SOUL.md` for full persona. Key traits:
- Formality: 2/10 — very casual
- Brief, direct messages (it's mobile chat)
- Hebrew ↔ English code-switching
- Emojis sparingly (🫶)
