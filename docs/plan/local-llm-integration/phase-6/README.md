# Phase 6: Context Bloat Reduction

> [Back to main plan](../README.md)

## Goal

Wire the GLM MCP server into the daily workflow to pre-summarize content that currently bloats Opus context: PR comments, large files, search results, subagent output.

## Tools

- **Research:** none (we know the pain points from memory)
- **Code:** direct edit — skills, rules, memory docs

## Steps

1. **PR Comments skill** — update `/pr-comments` skill:
   - After fetching raw comments via `gh api`
   - Pipe through `mcp__glm__summarize` before presenting
   - Output: severity + 1-line summary per comment (not full diff hunks)
   - Save raw to scratchpad if details needed later
2. **Large file reads** — update `scripts/summarize-file.sh`:
   - Current: uses CLI helpers (gemini/cursor)
   - Add GLM option: `summarize-file.sh --glm <file>` (fastest, no network)
   - Auto-detect: if file >100 lines, suggest GLM summary first
3. **Web search results** — after Exa searches:
   - Add rule in `.claude/rules/`: "When search returns >5000 chars, use glm_summarize"
   - Extract only relevant facts for the query
4. **Zikaron search synthesis** — when multiple chunks returned:
   - Use `mcp__glm__synthesize(chunks)` to combine into one coherent answer
   - Instead of dumping 5 raw chunks into Opus context
5. **Subagent output** — update memory/cli-agents.md pattern:
   - Agent writes to file → `mcp__glm__summarize(file_content)` → read summary
   - Never read raw agent output into Opus context
6. **Rules documentation:**
   - Add `.claude/rules/glm-context-reduction.md` with patterns
   - Update memory/MEMORY.md "NEVER Read Large Files" section
7. Measure improvement: track context window usage before/after for typical tasks

## Expected Impact

| Bloater | Before (Opus tokens) | After (via GLM) |
|---------|---------------------|-----------------|
| PR comments (20 comments) | ~8,000 tokens | ~800 tokens |
| Large file read (500 lines) | ~5,000 tokens | ~500 tokens |
| Exa search (8 results) | ~10,000 tokens | ~1,500 tokens |
| Zikaron results (5 chunks) | ~3,000 tokens | ~500 tokens |
| Subagent transcript | ~100,000 tokens | ~500 tokens |

## Depends On

- Phase 2 (GLM MCP server working)

## Status

- [ ] Update /pr-comments skill
- [ ] Update summarize-file.sh
- [ ] Add web search summarization rule
- [ ] Add Zikaron synthesis integration
- [ ] Update subagent output pattern
- [ ] Write glm-context-reduction.md rule
- [ ] Update memory docs
- [ ] Measure context usage improvement
