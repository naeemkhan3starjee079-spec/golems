# GLM Context Reduction

> Use `glm_summarize` to reduce content before loading into Opus context.

## Pattern: Summarize Before Reading

```
WRONG: Read large file → dump into Opus context
RIGHT: glm_summarize(text) → read summary
```

## When to Summarize

- PR comments: >5 comments → `glm_summarize` each
- File reads: >100 lines → `scripts/summarize-file.sh <file> "<prompt>" glm`
- Web/BrainLayer results: >5000 chars or >3 chunks → `glm_summarize`

## When NOT to Use

- Short content (<100 lines, <2000 chars) — read directly
- Code you need to edit — need actual code
- When GLM/Ollama isn't running — fall back to `gemini`
