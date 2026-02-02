# Event Log Implementation Notes

## What's Done ✅

- `src/event-log.ts` - Full implementation with:
  - `logEvent(type, data, actor, path)` - Appends events to JSON file
  - `getRecentEvents(hours, path)` - Filters events by time window
  - `formatEventsForClaude(events)` - Human-readable summary with "YOU" prefix for ClaudeGolem
  - Max 100 events rotation
  - Graceful corruption handling

- `src/__tests__/event-log.test.ts` - 17 passing tests covering:
  - File creation and appending
  - Event structure validation
  - Time-based filtering
  - Rotation at 100 events
  - Formatting for all event types
  - Edge cases (corruption, missing fields)

## Gaps / TODOs 🔧

### Integration (Session C)
- [ ] Wire `logEvent()` into `telegram-bot.ts`:
  - On draft approval: `logEvent("draft_approved", {...}, "claudegolem")`
  - On Soltome post: `logEvent("soltome_post", {...}, "claudegolem")`
  - On draft rejection: `logEvent("draft_rejected", {...}, "claudegolem")`
- [ ] Inject `getRecentEvents()` into `askClaude()` system prompt
- [ ] Wire into `briefing.ts` for morning summaries

### Event Types Not Yet Used
- `draft_scored` - Will be used by OllamaGolem in soltome-learner.ts
- `pattern_extracted` - Will be used when extracting post patterns
- `job_match` - For future JobGolem integration

### Nice-to-Have
- [ ] Event archiving (weekly archive to `event-log-archive-YYYY-WW.json`)
- [ ] Event metrics (counts by type/actor for analytics)
- [ ] Backup before rotation (in case of accidental data loss)

### Testing Gaps
- No test for concurrent writes (unlikely issue with single-process bot)
- No test for very large data payloads (shouldn't be an issue practically)

## Usage Example

```typescript
import { logEvent, getRecentEvents, formatEventsForClaude } from "./event-log";

// Log an event
await logEvent("soltome_post", {
  title: "My first post",
  postId: "abc-123",
  creditsUsed: 2,
  creditsRemaining: 1800,
}, "claudegolem");

// Get recent events for Claude context
const events = await getRecentEvents(24); // last 24h
const summary = formatEventsForClaude(events);

// Inject into Claude system prompt
const systemPrompt = `${SOUL_CONTENT}

## While You Were Down
${summary}
`;
```

## Files Created

- `src/event-log.ts` - Main implementation
- `src/__tests__/event-log.test.ts` - Tests

## Dependencies

- Node.js built-ins only (fs, path, crypto, os)
- No external packages needed

---

# Soltome Learner Implementation Notes

**Session A Complete**: 2026-02-02

## What's Done ✅

### Files Created
- `src/soltome-learner.ts` - Main learner module
- `src/__tests__/soltome-learner.test.ts` - 8 tests (all passing)

### Features
1. **fetchPosts()** - Uses soltome-client.ts (HTTP only, no LLM)
2. **scorePosts()** - Ollama scores each post 1-10 for quality
3. **extractPatterns()** - Ollama extracts what makes posts good/bad
4. **mergeTrainingData()** - Dedupe by id, newer data wins
5. **saveTrainingData() / loadTrainingData()** - JSON persistence

### Types
- `TrainingPost extends SoltomePost` - adds qualityScore, scrapedAt
- `LearnedPatterns` - topPerformers, patterns, stats, updatedAt
- All types tied to `SoltomePost` from soltome-client.ts

### Output Files
- `~/Gits/golems-zikaron/data/soltome-training.json` - All scored posts
- `~/Gits/golems-zikaron/data/soltome-patterns.json` - Learned patterns

## Gaps / TODOs 🔧

### 1. No Embeddings
Unlike moltbook-learner.ts, soltome-learner.ts does NOT use embeddings for semantic search.

**Why:** Kept it simple per plan instructions. Embeddings can be added later if needed.

### 2. No Scheduler Integration
Not wired into launchd yet. moltbook-learner runs at 2am.

**To add:** Create `launchd/com.golemszikaron.soltome-learner.plist`

### 3. post-generator.ts Not Updated
Still imports from moltbook-learner.ts, not soltome-learner.ts.

**Session C will handle this.**

### 4. Stats topAuthor Threshold
Requires 2+ posts to be "top author" - may be too strict for small datasets.

### 5. Rate Limiting
No rate limiting for Ollama calls. Scores each post sequentially.

## Test Coverage

| Test Suite | Tests | Status |
|------------|-------|--------|
| Types | 1 | PASS |
| Scoring | 2 | PASS |
| Pattern Extraction | 2 | PASS |
| Data Persistence | 2 | PASS |
| Main Flow | 1 | PASS |
| **Total** | **8** | **ALL PASS** |

## CLI Usage

```bash
# Run learner manually
bun src/soltome-learner.ts

# Run tests
bun test soltome-learner

# Check output files
cat ~/Gits/golems-zikaron/data/soltome-training.json | jq '.[:3]'
cat ~/Gits/golems-zikaron/data/soltome-patterns.json | jq '.patterns'
```
