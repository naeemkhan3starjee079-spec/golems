# Zikaron Enrichment Overhaul

> Cloud backfill of 251K chunks + local LLM optimization + data cleanup + project consolidation

**Budget:** ~$16 (Gemini 2.5 Flash-Lite Batch API)
**Research:** [research/](research/) (5 Cursor audits + 2 Gemini deep research reports)

---

## Progress

| # | Phase | Folder | Status | PR | Notes |
|---|-------|--------|--------|-----|-------|
| 1 | Project Consolidation + Worktree Normalization | [phase-1](phase-1/) | DONE | #195 | 149K rows consolidated (34→9 projects) |
| 2 | WhatsApp Reindex | [phase-2](phase-2/) | PARTIAL | #196 | ChatStorage.sqlite missing; fixed 11.7K chunks in-place |
| 3 | Gemini Batch Backfill | [phase-3](phase-3/) | ... | | Build + run cloud backfill (~$16) |
| 4 | MLX Local Backend | [phase-4](phase-4/) | ... | | Add MLX alongside Ollama |
| 5 | Ongoing Enrichment Tuning | [phase-5](phase-5/) | ... | | MLX parallelism, monitoring, defaults |

---

## Key Constraints

- **Additive:** Keep Ollama working. MLX is an option, not a replacement.
- **Enrichment stays local for ongoing:** Cloud is for one-time backfill only.
- **No data loss:** Always backup DB before bulk operations.
- **Same quality:** Gemini Batch must produce same schema as local GLM enrichment.

## Safety Protocol (every phase)

1. **Before ANY bulk operation:** Run `bash packages/ralph/scripts/backup-golem-system.sh` (WAL-safe DB + JSONL to iCloud)
2. **Before any DELETE:** Export affected rows to JSON first (safety net)
3. **Rollback scripts:** Phase 1 generates `rollback.sql` before consolidation
4. **Never overwrite enriched chunks:** Backfill targets `WHERE enriched_at IS NULL` only
5. **Integrity check:** Run `PRAGMA integrity_check` after every bulk UPDATE/DELETE
6. **Quality gate:** Phase 3 validates 100-chunk sample before full run
7. **WhatsApp guard:** Phase 2 verifies ChatStorage.sqlite exists before deleting chunks

## Research Index

| Document | What |
|----------|------|
| [audit-enrichment-pipeline.md](research/audit-enrichment-pipeline.md) | Complete enrichment flow, all functions, constants, hardcoded values |
| [audit-llm-backends.md](research/audit-llm-backends.md) | LLM routing map, backend implementations, abstraction layers |
| [audit-whatsapp-indexing.md](research/audit-whatsapp-indexing.md) | WhatsApp data flow, root causes, 3 fix options |
| [audit-project-consolidation.md](research/audit-project-consolidation.md) | Project naming, merge safety, normalization at index time |
| [audit-worktree-workflow.md](research/audit-worktree-workflow.md) | Worktree gaps, ideal flow, Zikaron-side fix |
| [audit-data-safety.md](research/audit-data-safety.md) | Data locations, backup coverage gaps, iCloud/TM status |
| [gemini-research.md](research/gemini-research.md) | Cost analysis, Batch API mechanics, MLX benchmarks |
| [gemini-enrichment-backup.md](research/gemini-enrichment-backup.md) | Enrichment schema expansion (6 new fields), Litestream backup, analytics |
| [original-plan.md](research/original-plan.md) | Original plan summary (TL;DR) |

---

## Execution Rules

Each phase = one branch = one PR. See `/large-plan` skill for the full protocol.

## Cross-Phase Knowledge

Update this section as phases complete:
- Project merge SQL → phase-1/findings.md
- WhatsApp reindex counts → phase-2/findings.md
- Gemini Batch API gotchas → phase-3/findings.md
- MLX model benchmarks → phase-4/findings.md
