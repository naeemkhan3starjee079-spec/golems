---
name: logs
description: View recent Railway deployment logs for the cloud worker.
---

# Railway Logs

View logs from the Railway cloud worker deployment.

## Process

1. Fetch recent logs: `railway logs --lines 100`
2. Parse for errors, warnings, and key events
3. Summarize: last deploy time, any errors, cron job execution status
4. Highlight any failed email polls, job scrapes, or API errors

## Common Patterns

- `[email] Processed N emails` — email golem ran successfully
- `[jobs] Found N new matches` — job scraper found matches
- `[briefing] Sent morning briefing` — briefing service worked
- `Error: ETIMEDOUT` — API timeout (usually transient)
- `Error: 429` — rate limited (back off)
