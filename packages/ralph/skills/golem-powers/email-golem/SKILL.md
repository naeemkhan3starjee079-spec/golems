---
name: email-golem
description: Check email status, run manual triage, view recent scores. Use when asking about emails or wanting to check urgent messages.
---

# EmailGolem - Email Triage Control

Check status, run manual triage, view recent scores, and manage the email system.

## Commands

### Check Status

```bash
# View scheduler status
launchctl list | grep email-golem

# View recent logs
tail -20 /tmp/golemszikaron-email-golem.log

# View offline queue
cat ~/.golems-zikaron/offline-queue.json 2>/dev/null || echo "Queue empty"
```

### Manual Run

```bash
# Dry run (safe - no DB writes, no notifications)
cd ~/Gits/golems/packages/autonomous && bun run src/email-golem/index.ts --dry-run

# Full run (will score, save, and notify if urgent)
cd ~/Gits/golems/packages/autonomous && bun run src/email-golem/index.ts

# Check specific number of emails
cd ~/Gits/golems/packages/autonomous && bun run src/email-golem/index.ts --dry-run --max=5
```

### Scheduler Control

```bash
# Enable (runs every 10 minutes)
launchctl load ~/Library/LaunchAgents/com.golemszikaron.email-golem.plist

# Disable
launchctl unload ~/Library/LaunchAgents/com.golemszikaron.email-golem.plist

# Reload (after changes)
launchctl unload ~/Library/LaunchAgents/com.golemszikaron.email-golem.plist
launchctl load ~/Library/LaunchAgents/com.golemszikaron.email-golem.plist
```

## When To Use

- **"Check my emails"** → Run dry-run to see what would be scored
- **"Any urgent emails?"** → Run dry-run and check for score 10
- **"Is email checker running?"** → Check launchctl status
- **"Why no email notifications?"** → Check logs for errors

## Scoring Reference

| Score | Category | Action |
|-------|----------|--------|
| 10 | interview, urgent | Telegram alert NOW |
| 7-9 | job | Morning briefing |
| 5-6 | subscription | Monthly tracking |
| 1-4 | newsletter, promo | Ignore |

## Troubleshooting

### No emails scoring

1. Check Gmail credentials in `.env`
2. Check Ollama is running: `curl http://localhost:11434/api/tags`
3. Check logs: `tail -50 /tmp/golemszikaron-email-golem.log`

### Notifications not working

1. Check telegram-bot is running: `pgrep -fl telegram-bot`
2. Check port 3847: `curl http://localhost:3847/health`

### Items stuck in queue

```bash
# View queue
cat ~/.golems-zikaron/offline-queue.json

# Clear queue (if corrupt)
rm ~/.golems-zikaron/offline-queue.json
```

## Related Files

- `~/Gits/golems/packages/autonomous/src/email-golem/` - Source code
- `~/Gits/golems/packages/autonomous/src/email-golem/README.md` - Setup docs
- `~/.golems-zikaron/state.json` - State (lastEmailCheck, processedIds)

## Requirements

- Telegram bot running on port 3847 (for notifications)
- Ollama running with `qwen2.5-coder:32b`
- Gmail OAuth configured
- Supabase tables created
