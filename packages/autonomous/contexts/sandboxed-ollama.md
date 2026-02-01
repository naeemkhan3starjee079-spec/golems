# Context: Sandboxed Ollama

> Use this context when working with Ollama in golems-zikaron

## When to Use

- Running Job Golem
- Moltbook content generation
- Night Shift improvements
- Any LLM-assisted code generation

## Quick Usage

```typescript
import { forJobGolem, forMoltbook, forNightShift } from "./ollama-wrapper";

// For job scoring
const result = await forJobGolem.runOllamaJSON<ScoreResult>(prompt);

// For Moltbook content
const content = await forMoltbook.runOllama(prompt);

// For Night Shift
const suggestion = await forNightShift.runOllamaJSON<CodeSuggestion>(prompt);
```

## Enable Sandboxed Mode

```bash
export OLLAMA_SANDBOXED=1
```

Without this, Ollama runs directly (no validation).

## How It Works

1. Your code calls `runOllama()` or `runOllamaJSON()`
2. If `OLLAMA_SANDBOXED=1`:
   - Output goes to `~/.golems-zikaron/validation-queue/pending/`
   - Blocklist patterns checked (auto-reject if critical)
   - Trusted source + pattern = auto-approve
   - Otherwise waits for Claude validation service
3. Approved outputs returned to caller
4. Rejected outputs return empty string

## Trusted Sources

These sources can auto-approve with trusted patterns:
- `job-golem` - job scoring
- `moltbook-learner` - pattern extraction
- `night-shift` - code improvements

## Trusted Patterns

Auto-approve if response contains:
- "job listing"
- "job match"
- "score:"

## Critical Blocklist (Instant Reject)

- `rm -rf`
- `sudo`
- `curl | sh`
- SQL injection patterns
- Path traversal (`../`)

## Files

| File | Purpose |
|------|---------|
| `src/ollama-wrapper.ts` | Import from here |
| `src/ollama-sandboxed.ts` | Core implementation |
| `src/validation-service.ts` | Claude review daemon |
| `~/.golems-zikaron/validation-queue/config.json` | Config |

## Starting the Docker Sandbox

```bash
cd ~/Gits/golems-zikaron/docker/ollama
docker-compose up -d
```

## Running Validation Service

```bash
# One-time run
bun src/validation-service.ts

# Daemon mode (30s interval)
bun src/validation-service.ts --daemon
```
