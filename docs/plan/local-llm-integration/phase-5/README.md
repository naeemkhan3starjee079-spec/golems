# Phase 5: Zikaron Enrichment Pipeline

> [Back to main plan](../README.md)

## Goal

Batch-process Zikaron's 226K chunks through local GLM to add summaries, tags, entities, and intent metadata — transforming dumb vector search into rich, filterable retrieval.

## Tools

- **Research:** gemini — "best practices LLM-powered metadata extraction for RAG, chunk enrichment pipelines"
- **Code:** cursor (work mode) — Python pipeline in zikaron package
- **MCPs:** glm MCP server (from Phase 2) for testing, direct Ollama API for batch

## Steps

1. Design enrichment schema — what metadata per chunk:
   ```python
   {
     "summary": "Fixed auth bug by stripping ANTHROPIC_API_KEY from spawn env",
     "tags": ["bug-fix", "environment-variables", "claude-cli"],
     "entities": {"files": ["telegram-bot.ts"], "functions": ["askGolem"], "packages": ["@golems/claude"]},
     "intent": "debugging",  # debugging | designing | configuring | discussing | deciding
     "problem_solution": {"problem": "claude --print fails with invalid API key", "solution": "strip key from env"},
     "importance": 7,  # 1-10, how useful is this for future retrieval
     "conversation_context": "Part of Telegram bot EADDRINUSE fix session"
   }
   ```
2. Add metadata columns to Zikaron sqlite-vec schema (new table or JSON column)
3. Create `packages/zikaron/src/zikaron/enrichment.py`:
   - Read chunks in batches (100 at a time)
   - For each batch: send surrounding context (not just the chunk) to GLM
   - Parse structured JSON response
   - Store metadata alongside existing embeddings
4. **Context window strategy:** GLM-4.7-Flash has 200K context. For each chunk:
   - Include 3-5 surrounding chunks from same conversation
   - Include conversation metadata (project, date, session)
   - Prompt: "Given this conversation excerpt, generate metadata for the highlighted chunk"
5. Create enrichment prompt template (tested against sample chunks first)
6. Run on small sample (100 chunks), evaluate quality
7. Optimize: batch size, prompt, which chunks to skip (very short, system messages)
8. Full batch run on 226K chunks (estimate time, could be hours)
9. Update Zikaron search to use metadata:
   - `mcp__zikaron__zikaron_search` gains `tag`, `intent`, `importance_min` filters
   - Results include summary in output (faster context understanding)
10. Update Zikaron MCP tool descriptions

## Performance Estimate

- 226K chunks / 100 per batch = 2,260 batches
- ~2-5 sec per batch on M1 Pro (GLM-4.7-Flash)
- Total: ~1-3 hours for full enrichment
- Can run as background task, resumable

## Depends On

- Phase 1 (GLM working)
- Phase 2 (MCP server for testing, optional)

## Status

- [x] Design enrichment schema (Gemini + Cursor research → same-table approach)
- [x] Add metadata columns to sqlite-vec (summary, importance, intent, enriched_at)
- [x] Create enrichment.py (batch pipeline with context, resumable)
- [x] Design context window strategy (2 before + 1 after, truncate at 4000 chars)
- [x] Create + test prompt template (structured JSON with tag taxonomy)
- [x] Small sample run (26+ chunks enriched, continuing in background)
- [x] Evaluate quality (PASS — see findings.md)
- [ ] Optimize batch size + prompt (deferred — current quality is good)
- [ ] Full batch run (238K chunks, operational — ~2 days at 30s/chunk)
- [x] Update search with metadata filters (tag, intent, importance_min)
- [x] Update MCP tool descriptions (new params + summary in output)
- [x] Add `zikaron enrich` CLI command
- [x] Delete dead exploration.ts
