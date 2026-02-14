---
title: "@golems/shared — Foundation Library"
description: "Supabase ORM, LLM abstraction, email processing, state management, and notifications for all golem packages."
---

# @golems/shared

> Foundation library that every golem depends on. Supabase, LLM, email, state, notifications, and shared types.

## What It Does

Shared is the **infrastructure layer** of the Golems ecosystem. It provides database access, multi-backend LLM calls, email processing, state management, and Telegram notifications. No golem-specific logic lives here — only reusable utilities that all packages import.

## Key Modules

| Module | Import | Purpose |
|--------|--------|---------|
| `supabase-factory` | `@golems/shared/lib/supabase-factory` | Singleton Supabase client creation |
| `llm` | `@golems/shared/lib/llm` | Multi-backend LLM runner (Haiku, Ollama) |
| `telegram-direct` | `@golems/shared/lib/telegram-direct` | Dual-mode notifications (localhost:3847 or Bot API) |
| `state-store` | `@golems/shared/lib/state-store` | File/Supabase state abstraction |
| `event-log` | `@golems/shared/lib/event-log` | Action logging ("while you were down" context) |
| `load-env` | `@golems/shared/lib/load-env` | .env loader for launchd (must be first import) |
| `cost-tracker` | `@golems/shared/lib/cost-tracker` | API cost logging (JSONL) |
| `config` | `@golems/shared/lib/config` | Centralized config paths |

## Email Infrastructure

The email subsystem lives in `@golems/shared/email/` and provides the full Gmail pipeline:

- **Gmail client** — OAuth2-based Gmail API access
- **Scorer** — LLM-powered email scoring (1-10 urgency)
- **Router** — Routes scored emails to the appropriate domain golem
- **Draft replies** — Template-based reply generation
- **Follow-up tracking** — Due date management for pending responses
- **MCP server** — 7 email tools exposed to Claude Code

### Email MCP Tools

| Tool | Description |
|------|-------------|
| `email_getRecent` | Recent emails by hours + minimum score |
| `email_search` | Keyword search in subject/sender |
| `email_subscriptions` | Monthly subscription summary |
| `email_urgent` | Unnotified urgent emails |
| `email_stats` | 24h category breakdown |
| `email_getByGolem` | Emails routed to a specific golem |
| `email_draftReply` | Generate reply draft by intent |

## LLM Abstraction

Switch between backends with a single env var:

```bash
LLM_BACKEND=haiku    # Cloud: Anthropic Haiku via API
LLM_BACKEND=ollama   # Local: Ollama on your Mac
```

```typescript
import { runLLMJSON, runLLMText } from "@golems/shared/lib/llm";

// Works identically regardless of backend
const result = await runLLMJSON({ prompt: "Categorize this email", schema: emailSchema });
```

## State Management

Dual-backend state storage:

```bash
STATE_BACKEND=supabase   # Cloud: Supabase database
STATE_BACKEND=file       # Local: ~/.golems-zikaron/
```

```typescript
import { getState, setState } from "@golems/shared/lib/state-store";

const nightTarget = await getState("nightShiftTarget");
await setState("nightShiftTarget", "songscript");
```

## Dependencies

- `@supabase/supabase-js` — Database client
- `googleapis` — Gmail API
- No internal @golems/* dependencies (shared is the root)

## Source

[`packages/shared/`](https://github.com/EtanHey/golems/tree/master/packages/shared)
