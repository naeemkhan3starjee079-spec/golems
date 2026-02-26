# Phase 3 Findings — Thin Telegram Router

## Research: Grammy Composer Pattern

Grammy `Composer<Context>` is a middleware container that works exactly like the `Bot` class for registering handlers. Usage:

```typescript
// In golem file:
import { Composer } from "grammy";
export const jobComposer = new Composer<MyContext>();
jobComposer.command("jobs", async (ctx) => { ... });
jobComposer.callbackQuery(/^jobs:/, async (ctx) => { ... });

// In main bot:
import { jobComposer } from "./composers/job-composer";
bot.use(jobComposer);
```

Key properties:
- `Composer.use()`, `.command()`, `.on()`, `.callbackQuery()` all work identically to `Bot`
- Handlers registered on a Composer after it's added to Bot still work (late binding)
- Each Composer can have its own middleware chain
- No runtime overhead — same middleware tree

## Current telegram-bot.ts Anatomy (1957 lines)

### Shared Infrastructure (STAYS in telegram-bot.ts)
| Lines | What | Notes |
|-------|------|-------|
| 1-41 | Imports | Will be split per composer |
| 42-81 | Auth middleware, bot creation | Core bot setup |
| 83-156 | State, paths, loadState/saveState | Shared |
| 158-296 | GOLEM_REGISTRY, askGolem | Per-golem routing infrastructure |
| 298-308 | getSystemPromptContent | Shared by askClaude |
| 310-342 | checkRailwayHealth, getDailyStats | Shared status functions |
| 344-553 | Queue, askClaude, askClaudeForked, processQueue | Core Claude spawning |
| 555-596 | Keyboard, Personas, Maps | Shared state |
| 1749-1957 | Notification server + auto-scrape + startup + shutdown | Infrastructure |

### Commands to Extract into Composers

**JobGolem Composer (~180 lines)**
| Lines | Handler | Type |
|-------|---------|------|
| 848-901 | `/jobs` | command |
| 903-947 | `/jobq` | command |
| 1267-1305 | `jobs:*` pagination | callbackQuery |

**RecruiterGolem Composer (~320 lines)**
| Lines | Handler | Type |
|-------|---------|------|
| 949-1048 | `/practice` | command |
| 1050-1073 | `/stats` | command |
| 1075-1099 | `/outreach` | command |
| 1101-1139 | `/followup` | command |
| 1142-1162 | `followup:*` | callbackQuery |
| 1164-1221 | `practice:*` mode selection | callbackQuery |
| 1223-1265 | `practice-result:*` | callbackQuery |

**ClaudeGolem Composer (~600 lines)** — the interactive chat
| Lines | Handler | Type |
|-------|---------|------|
| 598-618 | `/start` | command |
| 620-637 | `/status` | command |
| 639-648 | `/admin` | command |
| 650-687 | `/trigger` | command |
| 689-698 | `/morning` | command |
| 700-777 | `/fork` | command |
| 779-845 | `/setup` | command |
| 1307-1335 | `/tonight`, `/repos` | commands |
| 1342-1371 | `tonight:*`, `persona:*` | callbackQuery |
| 1373-1477 | `fork-task:*`, `fork-decline` | callbackQuery |
| 1479-1483 | Unknown callback catch-all | on |
| 1486-1747 | `message:text` handler | on (the big one) |

### Notification Server (STANDALONE — Step 3.5)
| Lines | What |
|-------|------|
| 1749-1911 | SOURCE_CONFIG, sendNotificationToTelegram, Bun.serve |

### Auto-Scrape Loop (REMOVE — Step 3.7)
| Lines | What |
|-------|------|
| 1913-1931 | setTimeout + setInterval for runJobSearch |

## Decisions

1. **Composer files go in `src/composers/`** — each golem gets `{name}-composer.ts`
2. **Shared deps** (askClaude, processQueue, state, etc.) stay in telegram-bot.ts and get imported by composers
3. **Notification server** → `src/lib/notify-server.ts` (standalone Bun.serve)
4. **Auto-scrape loop removed** — Railway handles scheduling now (cloud-worker.ts)
5. **`runContentPipeline` is dead code** — called at line 1532 but never imported/defined. Remove during extraction.
6. **GOLEM_REGISTRY** paths currently point to non-existent dirs (e.g., `~/Gits/recruiterGolem`). Update in Step 3.8 to point to actual golem source dirs.

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| 3.1 Research Grammy Composer | Opus | DONE |
| 3.2 JobGolem Composer | Opus | TODO |
| 3.3 RecruiterGolem Composer | Opus | TODO |
| 3.4 ClaudeGolem Composer | Opus | TODO |
| 3.5 Extract notify server | Opus | TODO |
| 3.6 Thin router | Opus | TODO |
| 3.7 Remove auto-scrape | Opus | TODO |
| 3.8 Update GOLEM_REGISTRY | Opus | TODO |
| 3.9 Test commands | Manual | TODO |
| 3.10 Commit + PR | Opus | TODO |

## Challenge: Shared State

The composers need access to shared state from telegram-bot.ts:
- `queue`, `isProcessing`, `processQueue()` — message processing
- `askClaude()`, `askClaudeForked()` — Claude CLI spawning
- `loadState()`, `saveState()` — state management
- `pendingPracticeSessions`, `pendingContentTopics`, `activeForkSessions` — Maps
- `menuKeyboard`, `PERSONAS`, `activePersona` — UI state

**Solution:** Extract these into a `src/lib/bot-shared.ts` module that both telegram-bot.ts and all composers import. This keeps the Composer files self-contained while sharing necessary state.
