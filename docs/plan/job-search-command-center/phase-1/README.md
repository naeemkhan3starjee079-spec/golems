# Phase 1: Code Audit + Soltome Removal

> [Back to main plan](../README.md)

## Goal

Remove all Soltome/social media pipeline code. Audit for dead code and unused exports. Shrink maintenance surface.

## Tools

- **Research:** Cursor agent (`--model gpt-5.2-codex-xhigh`) — full codebase scan
- **Code:** Opus direct for deletions + cleanup

## Steps

### 1. Run CLI Helper Audit (background)

```bash
cd ~/Gits/golems/packages/autonomous && cursor agent "Scan src/ for:
1. All Soltome references (soltome-*, post-generator, content pipeline, draft approval)
2. Dead imports and unreachable code from any entry point
3. Unused exports (exported but never imported elsewhere)
4. Files that could be deleted entirely

Output a deletion manifest as markdown table:
| File | Action | Reason |
with 'delete', 'remove-lines X-Y', or 'remove-export NAME'

Do NOT modify any files. Read-only audit." --model gpt-5.2-codex-xhigh --output-format text > docs/plan/job-search-command-center/phase-1/findings.md 2>&1
```

### 2. Review audit findings

Read `phase-1/findings.md`, classify each suggestion:
- **Delete entire file** → safe if no imports
- **Remove export** → check all importers first
- **Remove lines** → review context

### 3. Delete Soltome files

Known targets:
- `src/soltome-learner.ts` — Soltome pattern learner (runs on Railway 2am)
- `src/soltome-client.ts` — Soltome API client
- `src/post-generator.ts` — Content draft generator
- Remove Soltome schedule from `src/cloud-worker.ts`
- Remove Soltome-related MCP tools if any
- Remove Soltome event types from shared types

### 4. Remove Content page from dashboard

Delegated to etanheyman.com Claude session (or Phase 2/3 dashboard work):
- Remove `/admin/golem/content` page
- Remove "Content" from nav in `layout.tsx`

### 5. Clean up dead imports revealed by audit

### 6. Run tests: `bun test`

### 7. Commit + push

## Depends On

- None (can run in parallel with Phase 0)

## Status

- [ ] Run Cursor audit (background)
- [ ] Review audit findings
- [ ] Delete Soltome files
- [ ] Remove Content page reference
- [ ] Clean up dead imports
- [ ] Tests pass
- [ ] Committed
