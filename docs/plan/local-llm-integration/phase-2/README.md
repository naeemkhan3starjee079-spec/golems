# Phase 2: GLM MCP Server (Simplified)

> [Back to main plan](../README.md)

## Goal

Build a thin MCP server wrapping local Ollama GLM-4.7-Flash, exposing 2 tools for any Claude Code session. Start small, add more tools when Phase 6 needs them.

## Scope Cut

Original plan had 5 tools. Deep research + scratchpad review recommend starting with 2:
- `glm_summarize` — condense text (immediate value for context bloat)
- `glm_score` — JSON scoring (reuse batch-scorer prompt pattern)
- Deferred: `glm_tag`, `glm_rerank`, `glm_synthesize` (Phase 6 add-ons)

## What Cursor Already Built

- `packages/shared/src/glm/mcp-server.ts` — 220 lines, 2 tools (summarize + score)
- Registered in `.mcp.json`
- **Has Bun panic issue:** `FilePoll.register failed: 22` at runtime
  - This is a Bun + MCP SDK compatibility issue, not a code quality problem
  - Needs investigation: may need to use `node` instead of `bun` for MCP server

## Remaining Steps

1. ~~Research MCP server patterns~~ (done by Cursor)
2. ~~Create MCP server file~~ (done by Cursor)
3. ~~Implement glm_summarize~~ (done by Cursor)
4. ~~Implement glm_score~~ (done by Cursor)
5. **Fix Bun panic** — `FilePoll.register failed: 22`
   - Try running with `node` instead of `bun`
   - If that fails, check MCP SDK version compatibility
6. Error handling verification (Ollama down → clear error message)
7. Test each tool with real golems content
8. Update `.mcp.json` command if switching to node
9. CLAUDE.md documentation

## Architecture

```
Claude Code session
  ├── mcp__glm__summarize("long PR comment text")
  │     └── POST 127.0.0.1:11434/api/generate
  │           └── GLM-4.7-Flash (local, ~3B active params)
  │                 └── "Summary: 3 key issues found..."
  └── uses summary in context (not the full raw text)
```

## Depends On

- Phase 1 (Ollama GLM verified working) — done

## Status

- [x] Research existing MCP patterns (Cursor)
- [x] Create MCP server file (Cursor)
- [x] Implement glm_summarize (Cursor)
- [x] Implement glm_score (Cursor)
- [ ] Fix Bun panic (FilePoll.register)
- [ ] Error handling verification
- [ ] Test with real content
- [ ] Update MCP config if needed
- [ ] CLAUDE.md documentation
