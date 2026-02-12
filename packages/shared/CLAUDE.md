# @golems/shared

> Foundation library — Supabase, LLM, email, state, notifications, and shared types for all golem packages.

## Role

Shared is the **infrastructure layer** that every golem depends on. It provides database access, LLM abstraction, email processing, state management, and Telegram notifications. No golem-specific logic lives here — only reusable utilities.

## Architecture

```text
packages/shared/src/
├── lib/
│   ├── supabase-factory.ts      # Supabase client creation (singleton)
│   ├── llm.ts                   # Multi-backend LLM runner (Haiku, Ollama)
│   ├── cloud-llm.ts             # Haiku backend with token/cost tracking
│   ├── ollama-helper.ts         # Local Ollama wrapper
│   ├── telegram-direct.ts       # Dual-mode: localhost:3847 or Bot API
│   ├── state-store.ts           # File/Supabase state abstraction
│   ├── event-log.ts             # Golem action logging ("while you were down")
│   ├── load-env.ts              # .env loader for launchd (import FIRST)
│   ├── shared-types.ts          # GolemStatus, TopicStyle, GolemActor
│   ├── wizard-state.ts          # Wizard/doctor health check functions
│   ├── session-registry.ts      # Claude session tracking
│   ├── config.ts                # Centralized config paths
│   ├── cost-tracker.ts          # API cost logging (JSONL)
│   ├── helpers.ts               # CLI helper layer (gemini/cursor/codex/kiro)
│   ├── agent-runner.ts          # Research workflows on helpers
│   ├── ascii-mascots.ts         # Golem mascot art + skill catalog
│   ├── style-export.ts          # Communication style export
│   └── i18n.ts                  # Internationalization utilities
├── email/
│   ├── index.ts                 # Email golem entry point (10min cron)
│   ├── gmail-client.ts          # Gmail API (OAuth2)
│   ├── scorer.ts                # Email scoring 1-10 (Ollama/Haiku)
│   ├── router.ts                # Email → domain golem routing
│   ├── draft-reply.ts           # Template reply drafts
│   ├── followup.ts              # Follow-up tracking with due dates
│   ├── db-client.ts             # Supabase email storage + offline queue
│   ├── mcp-server.ts            # MCP tools (7 tools)
│   └── types.ts                 # Email-specific types
└── package.json                 # @golems/shared
```

## Key Modules

### `lib/supabase-factory`
Creates singleton Supabase client. All packages import from here.
```typescript
import { getSupabase } from "@golems/shared/lib/supabase-factory";
```

### `lib/llm`
Multi-backend LLM runner. Switch via `LLM_BACKEND` env var (`ollama` | `glm` | `haiku`).
```typescript
import { runLLM, runLLMJSON } from "@golems/shared/lib/llm";
```
- `ollama` (default): Local Ollama CLI, model from `OLLAMA_MODEL` env
- `glm`: GLM-4.7-Flash via Ollama HTTP (free, local, 127.0.0.1:11434)
- `haiku`: Claude Haiku 4.5 via Anthropic API (paid)

### `lib/glm-llm`
GLM-4.7-Flash backend via Ollama HTTP. Used when `LLM_BACKEND=glm`.
```typescript
import { runGLM, runGLMJSON } from "@golems/shared/lib/glm-llm";
```

### `lib/telegram-direct`
Dual-mode notification sender. `TELEGRAM_MODE=local|direct`.
```typescript
import { sendNotification } from "@golems/shared/lib/telegram-direct";
```

### `lib/state-store`
State abstraction. `STATE_BACKEND=file|supabase`.
```typescript
import { getState, setState } from "@golems/shared/lib/state-store";
```

### `lib/event-log`
Action logging for "While You Were Down" context injection.
```typescript
import { logEvent, getRecentEvents } from "@golems/shared/lib/event-log";
```

### `lib/load-env`
**Must be first import** in any launchd entry point. Finds package root and loads `.env`.
```typescript
import "@golems/shared/lib/load-env"; // FIRST import
```

## Email MCP Tools

| Tool | Description |
|------|-------------|
| `email_getRecent` | Recent emails by hours + min score |
| `email_search` | Keyword search in subject/sender |
| `email_subscriptions` | Monthly subscription summary |
| `email_urgent` | Unnotified urgent emails |
| `email_stats` | 24h category breakdown |
| `email_getByGolem` | Emails routed to a specific golem |
| `email_draftReply` | Generate reply draft by intent |

## Dependencies

- `@supabase/supabase-js` — Database client
- `googleapis` — Gmail API
- External: no internal @golems/* dependencies (except teller for MCP reports)
