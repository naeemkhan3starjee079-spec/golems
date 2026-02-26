# Phase 8: Knowledge Graph Layer + Auto-Indexing

> [Back to main plan](../README.md)

## Goal

Transform Zikaron from flat vector search into a knowledge graph with deep structural understanding: operation grouping, git overlay, plan linking, temporal chains, and regression detection. Add daily auto-indexing at 5 AM via NightShift.

## The Vision

Query: "show all interactions with telegram-bot.ts in order"

```
2026-01-28  [read] telegram-bot.ts — checking askGolem function
2026-01-29  [edit] telegram-bot.ts:45 — added API key stripping  (PR #108)
2026-02-05  [edit] telegram-bot.ts:378 — added SIGTERM handler   (PR #110)
2026-02-11  [read] telegram-bot.ts — checking composers          (PR #112, last known working)
2026-02-12  [bug-report] "bot crashes on startup"                 ← broke here
```

Git blame meets conversation history meets plan tracking.

## Tools

- **Research:** gemini — "knowledge graph from conversation logs, temporal RAG, entity linking"
- **Code:** cursor (work mode) — Python enrichment pipeline in zikaron
- **MCPs:** glm MCP (Phase 2), zikaron MCP, supabase

## Full Taxonomy (what GLM tags per chunk)

### Structural (what the chunk IS)

| Tag | Examples |
|-----|---------|
| `tool_call:bash` | Running git, npm, test commands |
| `tool_call:edit` | File modifications |
| `tool_call:write` | New file creation |
| `tool_call:read` | Reading files |
| `tool_call:grep` / `tool_call:glob` | Searching codebase |
| `tool_call:mcp:{server}` | MCP calls (supabase, zikaron, exa, etc.) |
| `tool_result:success` | Successful tool output |
| `tool_result:error` | Failed tool output, stack traces |
| `user_message` | Human input |
| `assistant_reasoning` | Claude thinking/planning text |
| `code_block` | Inline code in messages |
| `long_tool_part:N/M` | Part N of M for split long tool calls |

### Intent (WHY it happened)

| Tag | When to apply |
|-----|--------------|
| `debugging` | Investigating bugs, reading logs, testing fixes |
| `designing` | Architecture discussions, approach decisions |
| `configuring` | Env vars, config files, settings |
| `deciding` | Choosing between approaches |
| `researching` | Web search, doc reading, exploring codebases |
| `reviewing` | PR review, code review, audit |
| `plan-execution` | Working through a plan phase |
| `bug-fix` | Fixing a known issue |
| `feature-work` | Building new functionality |
| `refactoring` | Restructuring existing code |
| `documenting` | Writing docs, READMEs, CLAUDE.md |
| `testing` | Writing or running tests |
| `context-management` | Reducing bloat, choosing models, optimizing workflow |
| `deployment` | Deploying, Railway, Vercel, launchd |
| `security-fix` | Security-related changes |
| `performance-tuning` | Speed, memory, cost optimization |

### Relationships (WHAT it connects to)

| Tag | Format | Source |
|-----|--------|--------|
| `plan:{name}/phase-{N}` | Plan + phase | Match timestamp to active plan |
| `pr:#{N}` | PR number | Git branch → `gh pr list` |
| `branch:{name}` | Git branch | `git log` at timestamp |
| `commit:{sha}` | Commit | `git log --after --before` |
| `modifies:{file}` | File path | Extract from tool_call:edit chunks |
| `reads:{file}` | File path | Extract from tool_call:read chunks |
| `caused-by:{chunk-id}` | Causal link | GLM identifies cause-effect |
| `follows-up:{chunk-id}` | Temporal link | Same topic, later session |
| `docs:{path}` | Doc reference | Links to architecture decisions, learnings |
| `session:{id}` | Session grouping | From .jsonl filename |

### Quality/Meta

| Tag | Values |
|-----|--------|
| `importance` | 1-10 (how useful for future retrieval) |
| `confidence` | high / medium / low (GLM's certainty in its tags) |
| `outcome` | success / failure / partial / abandoned |
| `reusable` | true/false (is this a pattern others could learn from?) |
| `noise` | true/false (system messages, empty outputs, skip these) |

## Steps

### 8a: Operation Grouping
1. For each session's chunks, GLM identifies logical operations:
   - "Read → Edit → Test" = one operation
   - "Search → Read multiple files → Decide" = one research operation
   - "User asks → Claude plans → Claude implements → User approves" = one feature cycle
2. Store operation boundaries as metadata (operation_id, operation_type, step_number)
3. Long tool calls (>5K chars) get split into parts with `long_tool_part:N/M` tags

### 8b: Git Overlay
4. For each session, cross-reference timestamp with git history:
   - `git log --after="session_start" --before="session_end" --format="%H %s"`
   - Extract: branch name, commit SHAs, PR number (from branch name pattern)
   - Files changed: `git diff --name-only` for those commits
5. Store as session-level metadata (not per-chunk — too redundant)
6. Create file-level index: for each file in the repo, list all sessions that touched it

### 8c: Plan Linking
7. For each session timestamp, check which plan was active:
   - Scan `docs/plan/*/README.md` progress tables
   - Match date ranges to plan phases
   - Also check: was a PRD being executed? Which story?
8. Store as session-level metadata: `plan`, `phase`, `story_id`

### 8d: Temporal Chains + Regression Detection
9. Build file-interaction timeline:
   - For each file, ordered list of: [timestamp, action, session, outcome]
   - GLM identifies: "last known working state" vs "first broken state"
10. Build topic chains:
    - Same topic across sessions (e.g., "telegram bot" across 5 sessions)
    - GLM links: "this is a follow-up to session X"
11. Regression query: "what changed between working and broken?"
    - Find last `outcome:success` session for a file
    - Find all changes after that
    - Present as timeline with diffs

### 8e: Daily Auto-Indexing (5 AM)
12. Add `zikaron index --enrich` command:
    - Indexes new conversations since last run
    - Runs GLM enrichment on new chunks (Pass 1: per-chunk)
    - Runs cross-chunk analysis (Pass 2: operations, git overlay, plan linking)
    - Skips already-enriched chunks (idempotent)
13. **Safety: session freshness check**
    - Before indexing a .jsonl file, check its `mtime`
    - If modified in the last 30 minutes → **SKIP IT** (session may still be active)
    - Claude Code writes to .jsonl during active sessions — indexing mid-session could:
      - Read partial conversation (incomplete operations)
      - Lock the file while Claude is writing
      - Generate misleading metadata from half-finished work
    - Log skipped files: `"Skipping session abc123 — modified 12 min ago (still active?)"`
    - Those files get picked up on the next day's run
    - Flag: `--force` to override (for manual runs when you know sessions are closed)
14. Add to NightShift rotation (5 AM slot):
    - After NightShift code improvements (3-4 AM)
    - Before Morning Briefing (6 AM)
    - At 5 AM, most sessions are hours old → 30 min check passes safely
    - Update `packages/services/src/nightshift.ts` schedule
15. Add launchd plist: `com.golems.zikaron-enrichment.plist`
    - `StartCalendarInterval: Hour=5, Minute=0`
    - WorkingDirectory: golems repo
    - Runs: `zikaron index --enrich --since yesterday`
16. Verify: Morning Briefing can reference enriched data from yesterday

## Schema Changes

```sql
-- New columns on existing chunks table (or new metadata table)
ALTER TABLE chunks ADD COLUMN metadata JSON;
-- metadata contains all tags as structured JSON

-- New tables
CREATE TABLE operations (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  operation_type TEXT,  -- read-edit-test, research, feature-cycle
  chunks TEXT[],        -- ordered chunk IDs
  summary TEXT,
  outcome TEXT
);

CREATE TABLE file_interactions (
  file_path TEXT,
  timestamp TEXT,
  session_id TEXT,
  action TEXT,          -- read, edit, write, delete
  chunk_id TEXT,
  outcome TEXT
);

CREATE TABLE session_context (
  session_id TEXT PRIMARY KEY,
  branch TEXT,
  pr_number INTEGER,
  commit_shas TEXT[],
  plan_name TEXT,
  plan_phase TEXT,
  story_id TEXT,
  files_changed TEXT[]
);
```

## Depends On

- Phase 1 (GLM working)
- Phase 5 (basic chunk enrichment — Phase 8 builds on top)

## Status

- [ ] 8a: Design operation grouping algorithm
- [ ] 8a: Implement operation boundary detection
- [ ] 8a: Handle long tool call splitting
- [ ] 8b: Implement git overlay (timestamp → git log)
- [ ] 8b: Build file-level interaction index
- [ ] 8c: Implement plan phase linking
- [ ] 8d: Build file-interaction timeline
- [ ] 8d: Build topic chains across sessions
- [ ] 8d: Implement regression detection query
- [ ] 8e: Add `zikaron index --enrich` command
- [ ] 8e: Add to NightShift schedule (5 AM)
- [ ] 8e: Create launchd plist
- [ ] 8e: Verify Morning Briefing integration
- [ ] Schema migration for new tables
- [ ] Test on 1 week of real sessions
