---
title: "@golems/shared — Foundation Library"
description: "Supabase ORM, LLM abstraction, email processing, Whoop client, state management, and notifications for all golem packages."
---

# @golems/shared

> Foundation library that every golem depends on. Supabase, LLM, email, Whoop, state, notifications, and shared types.

## What It Does

Shared is the **infrastructure layer** of the Golems ecosystem. It provides database access, multi-backend LLM calls, email processing, Whoop biometric client, state management, and Telegram notifications. No golem-specific logic lives here — only reusable utilities that all packages import.

## Key Modules

| Module | Import | Purpose |
|--------|--------|---------|
| `supabase-factory` | `@golems/shared/lib/supabase-factory` | Singleton Supabase client creation |
| `llm` | `@golems/shared/lib/llm` | Multi-backend LLM runner (Gemini, Ollama, GLM, MLX) |
| `vercel-llm` | `@golems/shared/lib/vercel-llm` | Free cloud LLM (Gemini Flash-Lite, Groq) |
| `glm-llm` | `@golems/shared/lib/glm-llm` | Local GLM-4.7-Flash via Ollama HTTP |
| `mlx-llm` | `@golems/shared/lib/mlx-llm` | Local MLX inference on Apple Silicon (OpenAI-compatible API) |
| `telegram-direct` | `@golems/shared/lib/telegram-direct` | Dual-mode notifications (localhost:3847 or Bot API) |
| `state-store` | `@golems/shared/lib/state-store` | File/Supabase state abstraction |
| `event-log` | `@golems/shared/lib/event-log` | Action logging ("while you were down" context) |
| `load-env` | `@golems/shared/lib/load-env` | .env loader for launchd (must be first import) |
| `cost-tracker` | `@golems/shared/lib/cost-tracker` | API cost logging (JSONL) |
| `config` | `@golems/shared/lib/config` | Centralized config paths |

## Whoop Client

The Whoop subsystem lives in `@golems/shared/whoop/` and provides biometric data access:

- **Client** (`whoop/client.ts`) — OAuth2 token refresh + API v2 calls
- **Types** (`whoop/types.ts`) — `WhoopRecovery`, `WhoopSleep`, `WhoopStrain` interfaces
- **Sync** (`whoop/sync.ts`) — `syncWhoopToSupabase()` for dashboard caching
- **Auth Server** (`whoop/auth-server.ts`) — Local OAuth2 callback server for token exchange

```typescript
import { getLatestRecovery, getLatestSleep, getTodayStrain } from "@golems/shared/whoop/client";

const recovery = await getLatestRecovery(); // { score, hrv, restingHR, spo2, ... }
const sleep = await getLatestSleep();       // { duration, rem, deep, light, ... }
const strain = await getTodayStrain();      // { strain, kilojoule, avgHR, maxHR }
```

## Email Infrastructure

The email subsystem lives in `@golems/shared/email/` and provides the full Gmail pipeline:

- **Gmail client** — OAuth2-based Gmail API access
- **Scorer** — LLM-powered email scoring (1-10 urgency)
- **Router** — Routes scored emails to the appropriate domain golem
- **Draft replies** — Template-based reply generation
- **Follow-up tracking** — Due date management for pending responses
- **MCP server** — 12 email tools exposed to Claude Code

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
| `email_getSenders` | List email senders with stats and actions |
| `email_setSenderAction` | Set action for a sender (archive, star, etc.) |
| `email_unsubscribe` | Unsubscribe from a sender |
| `email_sendersByCategory` | Senders grouped by category |
| `email_unsubscribeHistory` | History of unsubscribe attempts |

## LLM Abstraction

Switch between backends with a single env var:

```bash
LLM_BACKEND=gemini   # Cloud: Gemini Flash-Lite (free, default)
LLM_BACKEND=ollama   # Local: Ollama on your Mac
LLM_BACKEND=haiku    # Cloud: Anthropic Haiku (paid fallback)
LLM_BACKEND=glm      # Local: GLM-4.7-Flash via Ollama HTTP
LLM_BACKEND=gemini   # Cloud: Gemini 2.5 Flash-Lite (free)
LLM_BACKEND=groq     # Cloud: Llama 4 Scout (free)
```

```typescript
import { runLLMJSON, runLLMText } from "@golems/shared/lib/llm";

// Works identically regardless of backend
const result = await runLLMJSON({ prompt: "Categorize this email", schema: emailSchema });
```

### Free Cloud LLM (Vercel AI SDK)

For services that need free cloud LLM without API keys (e.g., CoachGolem coaching engine):

```typescript
import { runCloudFree, runCloudFreeJSON } from "@golems/shared/lib/vercel-llm";

const advice = await runCloudFree({ prompt: "Generate daily coaching advice", maxTokens: 500 });
```

Supports Gemini Flash-Lite and Groq with auto-fallback on 429 rate limits.

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
- `@ai-sdk/google` + `@ai-sdk/groq` — Vercel AI SDK for free cloud LLM
- No internal @golems/* dependencies (shared is the root)

## Source

[`packages/shared/`](https://github.com/EtanHey/golems/tree/master/packages/shared)
