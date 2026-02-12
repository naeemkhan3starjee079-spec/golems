# Local LLM Integration — Kill Haiku Costs, Enrich Zikaron, Reduce Context Bloat

> Replace paid Haiku API with free local GLM-4.7-Flash (Ollama) + free Gemini/Groq for cloud.
> Add GLM MCP server for context summarization. Enrich Zikaron with LLM-powered metadata.
> Add Kilo CLI + Qwen Code as free agents. Fine-tune Qwen3-8B for domain tasks.

---

## Why

1. **Cost:** Haiku API costs real money for simple scoring/classification. GLM-4.7-Flash is free locally.
2. **Privacy:** All golems data stays on Mac. No API calls for personal data processing.
3. **Context bloat:** PR comments, large files, search results waste Opus tokens. Local GLM summarizes first.
4. **Zikaron quality:** 226K chunks are raw text. LLM-powered metadata (tags, summaries, entities) = much better retrieval.
5. **New agent:** Kilo CLI adds another free option for non-sensitive projects.

## Hardware

- **Mac:** M1 Pro, 32GB, Ollama already installed
- **GLM-4.7-Flash:** 30B params, ~3B active (MoE), 19GB on disk, 18GB VRAM
- **Railway:** Gemini Flash-Lite (free, 1K RPD) + Groq (free, 1K RPD) — pivoted from Zhipu (Entity List)

## SDK Decision

**Vercel AI SDK** for all cloud LLM integrations (Phase 4+). Unified provider interface — swap Gemini/Groq/Ollama with one import. Already in TS/Bun ecosystem.

## Privacy Architecture

- **Local (Ollama):** Full email bodies, personal data, golems content — nothing leaves Mac
- **Cloud (Gemini/Groq):** Sanitized summaries, subjects, job descriptions only
- **Hybrid option:** Local enriches with full content → cloud does lightweight scoring on summaries

---

## Progress (Execution Order)

| Step | Phase | Folder | Status | PR |
|------|-------|--------|--------|----|
| 1 | Ollama GLM Setup + Benchmark | [phase-1](phase-1/) | `done` | — |
| 2 | Replace Local Haiku | [phase-3](phase-3/) | `done` | #121 |
| 3 | Training Data Collection | [phase-10](phase-10/) | `in-progress` | — (10a: batch scoring 1000 emails running) |
| 4 | Railway Free API (Gemini/Groq) | [phase-4](phase-4/) | `researched` | — (Vercel AI SDK, pivoted from Zhipu) |
| 5 | GLM MCP Server (2 tools) | [phase-2](phase-2/) | `in-progress` | — (Cursor created, needs Bun panic fix) |
| 6 | Kilo CLI + Qwen Code | [phase-7](phase-7/) | `researched` | — (Kilo confirmed, Qwen Code 1K free RPD) |
| 7 | Zikaron Enrichment Pipeline | [phase-5](phase-5/) | `pending` | — |
| 8 | Context Bloat Reduction | [phase-6](phase-6/) | `pending` | — |
| 9 | Fine-Tune Model (MLX QLoRA) | [phase-10](phase-10/) | `pending` | — (10b-e: after training data ready) |
| 10 | Knowledge Graph + Auto-Indexing | [phase-8](phase-8/) | `pending` | — |
| 11 | Obsidian Brain View | [phase-9](phase-9/) | `pending` | — |

### Also Built (Not Phase-Specific)

| What | File | Status |
|------|------|--------|
| CC Usage Tracker | `scripts/cc-usage.ts` | Done — daily/monthly/by-project/by-model views |
| CC StatusLine | `scripts/cc-statusline.ts` | Done — lightweight ccstatusline replacement |
| Batch Email Scorer | `scripts/batch-score-emails.ts` | Done — lazy-fetch, download-only, from-file modes |
| Gmail Pagination | `packages/shared/src/email/gmail-client.ts` | Done — listEmailIds, getEmailById, pagination |
| LLM Call Sites Audit | `docs/audit/llm-call-sites-audit.md` | Done — 10 call sites mapped |
| GLM Benchmark | `scripts/benchmark-glm.ts` | Done — 12-test suite |

---

## Dependencies

```
Phase 1 (done) ──> Phase 3 (replace local haiku) ──> Phase 5 (Zikaron enrichment)
               ──> Phase 2 (MCP server) ──> Phase 6 (context bloat reduction)
               ──> Phase 10a (training data) ──> Phase 10b-e (fine-tune)
Phase 4 (cloud free API) — independent, needs Vercel AI SDK
Phase 5 ──> Phase 8 (knowledge graph) ──> Phase 9 (Obsidian)
Phase 7 (Kilo/Qwen Code) — fully independent
```

## Execution Rules

1. One branch per phase: `feature/llm-phase-N-name`
2. Research with free CLI helpers (Gemini/Kiro) first, then implement
3. PR + CodeRabbit review before merge
4. Each phase must pass `bun test` before PR
5. Update CLAUDE.md / memory when adding new capabilities
6. **Privacy rule:** Local Ollama = full data (bodies, personal). Cloud APIs (Gemini/Groq) = sanitized only (subjects, summaries). Kilo/Qwen Code = non-sensitive projects only.
7. **Documentation per phase:** Each phase MUST update relevant docs:
   - Phase README `Status` checklist (mark steps done)
   - Phase `findings.md` with decisions, benchmarks, code patterns
   - Package `CLAUDE.md` if adding new modules/exports
   - Root `CLAUDE.md` MCP servers table if adding new servers
   - `docs/architecture/` for architectural decisions
   - Plan README cross-phase knowledge section

---

## Cross-Phase Knowledge

Update this section as phases complete:
- Ollama GLM performance benchmarks? See phase-1/findings.md (GLM 7/7, Haiku 7/7, GLM 29x slower but $0)
- LLM call site audit? See docs/audit/llm-call-sites-audit.md (10 call sites mapped)
- MCP server architecture? See phase-2/findings.md (Cursor created server + Bun panic issue)
- GLM backend routing? See phase-3/findings.md (glm-llm.ts + llm.ts wiring)
- Free cloud LLM APIs? See phase-4/findings.md (Gemini Flash-Lite > Groq > Zhipu, Entity List concerns)
- Zikaron schema changes? See phase-5/findings.md
- Kilo Code CLI? See phase-7/findings.md (confirmed: @kilocode/cli, plus 6 alternatives)
- Knowledge graph taxonomy (full tag list)? See phase-8/README.md
- Obsidian vault structure? See phase-9/README.md
- MLX fine-tuning? See phase-10/findings.md (Qwen3-8B 4-bit QLoRA, hot-swap adapters, chat JSONL)
- CC usage tracking? See docs/plan/unified-usage-tracker/design.md + scripts/cc-usage.ts
