# GLM Context Reduction Rules

> Use local GLM-4.7-Flash (via MCP or Ollama) to summarize content before loading into Opus context.

## When to Summarize

| Content Type | Threshold | Action |
|-------------|-----------|--------|
| PR comments | >5 comments | Use `mcp__glm__summarize` on each comment body |
| File reads | >100 lines | Use `scripts/summarize-file.sh <file> "<prompt>" glm` |
| Web search results | >5000 chars | Use `mcp__glm__summarize` on combined results |
| BrainLayer results | >3 chunks | Use `mcp__glm__summarize` to synthesize into one answer |
| Subagent output | Always | Agent writes to file, use `mcp__glm__summarize` before reading |

## Pattern: Summarize Before Reading

```text
WRONG: Read large file → dump into Opus context
RIGHT: summarize-file.sh large-file.ts "key functions" glm → read summary
```

```text
WRONG: gh api pulls/N/comments → parse 20 comments in Opus
RIGHT: gh api pulls/N/comments → save to file → glm_summarize each → triage summaries
```

## Available GLM Tools

- **`mcp__glm__summarize(text, maxSentences?)`** — condense to key points (default: 3 sentences)
- **`mcp__glm__score(text, prompt, schema)`** — structured JSON classification/scoring
- **`scripts/summarize-file.sh <file> "<prompt>" glm`** — file summary via local Ollama

## When NOT to Use GLM

- Short content (<100 lines, <2000 chars) — just read it directly
- Code you need to edit — you need the actual code, not a summary
- Security-sensitive content — GLM is local so it's safe, but you need exact details
- When GLM/Ollama isn't running — fall back to `gemini` or read directly

## Performance Notes

- GLM-4.7-Flash: ~3-8 seconds per summarization on M1 Pro
- For batch work (many comments/chunks): process sequentially, don't wait for all
- `scripts/summarize-file.sh` with `glm` is fastest (no network), but slower than `gemini` for short content
