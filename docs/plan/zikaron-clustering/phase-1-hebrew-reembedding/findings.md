# Phase 1 Findings

## Decisions
- **[DECIDED] Full re-embed** — BGE-M3 matches bge-large on English, dramatically better for Hebrew. Same 1024 dims = in-place replacement.

## Benchmark Results (2026-02-14)

### Hebrew Pair Similarity (cosine)
bge-large gives near-random high scores (0.47-0.81) — can't differentiate Hebrew.
BGE-M3 gives differentiated scores (0.40-0.64) — actually understands Hebrew.

### Cross-Language (Hebrew query → English docs)
| Query (Hebrew) | English Doc | BGE-M3 | bge-large |
|----------------|-------------|--------|-----------|
| "user auth problem" | "Fix authentication bug in login flow" | **0.771** | 0.457 |
| "user auth problem" | "DB migration before deployment" | 0.483 | 0.455 |
| "user auth problem" | "React component re-rendering" | 0.558 | 0.487 |

BGE-M3 correctly ranks auth-related content highest. bge-large gives near-identical scores for all.

### Speed
- BGE-M3: 59 texts/sec (benchmark), ~33 texts/sec (sustained with DB writes)
- bge-large: 71 texts/sec
- Both on M1 Pro MPS

### Implementation
- Re-embedding script: `scripts/reembed_bge_m3.py`
- Default model changed in `embeddings.py` from `BAAI/bge-large-en-v1.5` to `BAAI/bge-m3`
- Added `normalize_embeddings=True` to encode calls
- Total time: ~120 min for 245K chunks at 33 chunks/sec

## Research
- bge-large-en-v1.5 BERT tokenizer has ~zero Hebrew tokens → [UNK] decomposition
- BGE-M3 uses XLM-RoBERTa backbone, trained on multilingual web data including mixed-language
- BGE-M3 is MIRACL SOTA for multilingual, matches bge-large on English
- Code-switching (Hebrew + English tech terms) partially works with bge-large (English terms provide signal)
- Pure Hebrew messages → zero signal with bge-large

## Cursor Audit Results (2026-02-14)

### Audit 1: reembed_bge_m3.py + embeddings.py
- **Critical:** `batch_size` undefined in extract_embeddings. **FIXED.**
- **Low:** DELETE+INSERT without transaction — acceptable for one-time migration.

### Audit 2: clustering.py vs research spec
- **Critical:** `batch_size` undefined → NameError. **FIXED.**
- **Medium:** Centroids need L2 normalization. **FIXED.**
- **Low:** No seed=42 in Leiden. **FIXED.**
- **Info:** Schema aligned — added assignment_method, assigned_at, updated_at, avg_intra_dist, status.

### Audit 3: Plan vs research consistency
- **Strong alignment** overall. Fixed vec_chunks → chunk_vectors naming.

## Task Board
| Task | Owner | Status |
|------|-------|--------|
| Benchmark BGE-M3 Hebrew quality | Claude | done |
| Cost estimate for full re-embed | Claude | done (free, local M1 Pro) |
| Execute re-embedding | Claude | running (~38%, ETA ~3h) |
| Update embeddings.py default model | Claude | done |
| Cursor audit fixes (clustering.py) | Claude | done |
| Verify Hebrew search quality | Claude | pending |
