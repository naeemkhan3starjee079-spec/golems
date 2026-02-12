# Phase 3: Replace Local Haiku with GLM

> [Back to main plan](../README.md)

## Goal

Add `LLM_BACKEND=glm` option so all local Mac processes use Ollama GLM-4.7-Flash instead of paid Haiku API.

## Tools

- **Research:** Cursor (done) — created glm-llm.ts + updated llm.ts
- **Code:** direct edit — remaining wiring (helpers.ts, exploration.ts, agent-runner.ts, env, launchd)

## What Cursor Already Built

- `packages/shared/src/lib/glm-llm.ts` — Ollama HTTP wrapper with cost tracking (tier: "free")
- `packages/shared/src/lib/llm.ts` — Added `LLM_BACKEND=glm` routing + import

## Remaining Steps

1. ~~Create glm-llm.ts~~ (done by Cursor)
2. ~~Update llm.ts backend switch~~ (done by Cursor)
3. Update `helpers.ts` fallback chain:
   - Before: `gemini → kiro → codex → cursor → haiku`
   - After: `gemini → kiro → codex → cursor → glm → haiku`
4. Update `exploration.ts` to add `glm` as ExplorationAgent
5. Update `agent-runner.ts` to support `glm` backend
6. Update `.env.example` with `LLM_BACKEND=glm` option
7. Update local launchd plists to use `LLM_BACKEND=glm`
8. Test: email scoring, job matching with GLM backend
9. Verify cost tracker logs GLM calls as `tier: "free"`

## Key Files

| File | Change | Status |
|------|--------|--------|
| `packages/shared/src/lib/glm-llm.ts` | New — Ollama GLM wrapper | Done (Cursor) |
| `packages/shared/src/lib/llm.ts` | Add `glm` backend switch | Done (Cursor) |
| `packages/shared/src/lib/cloud-llm.ts` | Keep as-is (Haiku fallback) | No change |
| `packages/shared/src/lib/helpers.ts` | Add `glm` to chain | Pending |
| `packages/shared/src/lib/exploration.ts` | Add `glm` agent | Pending |
| `packages/shared/src/lib/agent-runner.ts` | Add `glm` option | Pending |
| `.env.example` | Add `LLM_BACKEND=glm` | Pending |
| `launchd/*.plist` | Set `LLM_BACKEND=glm` | Pending |

## Depends On

- Phase 1 (benchmarks confirm GLM is good enough) — done

## Status

- [x] Create glm-llm.ts (Cursor)
- [x] Update llm.ts backend switch (Cursor)
- [ ] Update helpers.ts fallback chain
- [ ] Update exploration.ts
- [ ] Update agent-runner.ts
- [ ] Update .env.example
- [ ] Update launchd plists
- [ ] Test email + job scoring
- [ ] Verify cost tracking
