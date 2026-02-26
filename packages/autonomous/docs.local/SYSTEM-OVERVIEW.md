# GolemsZikaron System Overview

> Local documentation - not pushed to git

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      GolemsZikaron v3                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │  Telegram   │───▶│  Bot Process │───▶│  Claude CLI     │   │
│  │  (grammy)   │    │  (Bun)       │    │  (--print -s)   │   │
│  └─────────────┘    └──────────────┘    └─────────────────┘   │
│        ▲                   │                    │              │
│        │                   │                    ▼              │
│        │                   │           ┌─────────────────┐    │
│        └───────────────────┼───────────│  GITS_CLAUDE.md │    │
│                            │           │  (context)      │    │
│                            ▼           └─────────────────┘    │
│                    ┌──────────────┐                           │
│                    │  state.json  │                           │
│                    │  (config)    │                           │
│                    └──────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Files

| File | Location | Purpose |
|------|----------|---------|
| `telegram-bot.ts` | `src/` | Main bot - receives Telegram, spawns Claude |
| `SOUL.md` | repo root | Bot persona (Zikaron-analyzed style) |
| `state.json` | `~/.golems-zikaron/` | Night Shift target, rotation, chat ID |
| `GITS_CLAUDE.md` | `~/Gits/` | Context loaded by spawned Claude |

## How It Works

### Message Flow

1. User sends Telegram message to @GolemZikaronBot
2. Bot queues message (prevents concurrent Claude spawns)
3. Bot spawns `claude --print -s` with prompt via stdin
4. Claude reads `GITS_CLAUDE.md` for context
5. Response sent back via Telegram

### On-Demand Architecture

Unlike persistent Claude sessions that consume tokens while idle:
- Each message spawns a fresh Claude
- No idle resource usage
- Full context available via `GITS_CLAUDE.md`
- Bot process is lightweight (just grammy/Bun)

## Configuration

### State File (`~/.golems-zikaron/state.json`)

```json
{
  "nightShiftTarget": "songscript",
  "rotation": ["songscript", "zikaron", "claude-golem"],
  "lastNightShift": null,
  "telegramChatId": 5417751491
}
```

### Commands

| Command | Action |
|---------|--------|
| `/start` | Register chat, show help |
| `/status` | Show queue, Night Shift target |
| `/tonight [repo]` | Set Night Shift target |
| `/repos` | List available repos |

## Claude Context

Claude spawns at `~/Gits/` and reads `GITS_CLAUDE.md` which contains:
- Project map (all repos in ~/Gits)
- Communication style (from Zikaron analysis)
- Telegram integration notes
- Cross-project references

### System Prompt (built dynamically)

```
You are gitsClaude responding via Telegram. Be BRIEF - this is mobile chat.

[first 3000 chars of GITS_CLAUDE.md]

CRITICAL: Keep response under 500 chars. No markdown unless needed.

User message: [actual message]
```

## Related Tools

### gitsClaude Function

```bash
# Opens interactive Claude session at ~/Gits
gitsClaude
```

Located in: `~/.config/ralphtools/gitsClaude.zsh`

### Telegram Skill (gitsClaude only)

Located in: `~/Gits/.claude/skills/telegram/`
- Only accessible to Claude sessions from ~/Gits
- Scripts: send.sh, check.sh, clear.sh

## Running the Bot

### Start

```bash
cd ~/Gits/golems-zikaron
bun run src/telegram-bot.ts
# Or background:
nohup bun run src/telegram-bot.ts > /tmp/golems-zikaron-bot.log 2>&1 &
```

### Check Logs

```bash
cat /tmp/golems-zikaron-bot.log
```

### Stop

```bash
pkill -f "bun run.*telegram-bot"
```

## Night Shift (TODO)

Planned 3am autonomous work:
- Picks repo from rotation
- Spawns Claude for improvements
- Runs CodeRabbit review
- Commits with review
- Rotates to next repo

## Moltbook Integration (TODO)

AI-only social network posting:
- Requires Twitter/X verification
- Posts about Zikaron project
- Approval workflow for safety
- Never mentions sensitive info

## Troubleshooting

### "No response from Claude"

- Check bot logs: `cat /tmp/golems-zikaron-bot.log`
- Verify Claude CLI works: `echo "test" | claude --print -s`
- Check `GITS_CLAUDE.md` exists at `~/Gits/`

### Bot not responding

- Verify bot is running: `pgrep -f telegram-bot`
- Check Telegram token is valid
- Look for errors in log file

### Claude errors

Bot captures stderr - check logs for details.

## Security Notes

- Token hardcoded in source (acceptable for personal bot)
- Only responds to registered chat ID
- Claude spawns with `-s` (skip permissions)
- No sensitive info in context files
