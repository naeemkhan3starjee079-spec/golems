---
name: notify
description: Send Telegram notification to user when task completes
---

# Telegram Notifications

Notifications are sent to a **group with Topics**. Each source routes to a different topic.

## Quick Usage (CLI)

```bash
# Goes to 🔔 Alerts (default for CLI sessions)
notify "Task Done" "Finished implementing the feature"

# Specify source to route elsewhere
notify "Title" "Body" "jobs"     # → 🎯 Jobs
notify "Title" "Body" "email"    # → 📧 Email
```

## Topic Routing

| Source | Routes To | Used By |
|--------|-----------|---------|
| `alerts` | 🔔 Alerts | CLI sessions (default), Ralph |
| `claude` | 💬 Chat | ClaudeGolem only (DO NOT use from CLI) |
| `nightshift` | 🌙 Night Shift | Night Shift golem |
| `email` | 📧 Email | EmailGolem |
| `jobs` | 🎯 Jobs | JobGolem |
| `healthcheck` | 🔔 Alerts | Daily healthcheck |

## HTTP API (for TypeScript)

```typescript
await fetch("http://localhost:3847/notify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "Title",
    body: "Message body",
    source: "alerts",  // or email, jobs, nightshift
    priority: "default",  // or "high" for urgent
  }),
});
```

## When to Notify

**DO notify:**
- Task complete (commit, PR, feature done)
- Waiting for input (blocked, need decision)
- CLAUDE_COUNTER hits 0 (still working)
- Errors or failures

**DON'T notify:**
- Routine progress (reading files)
- Every small step
- Questions (use AskUserQuestion instead)

## Tips

- **Title:** 2-4 words max
- **Body:** 1 sentence max
- **Escaping:** The `notify` CLI handles special chars automatically
- **High priority:** Only use for urgent issues needing immediate attention
