# Phase 5: Ongoing Enrichment Tuning

> [Back to main plan](../README.md)

## Goal

Configure ongoing enrichment for maximum throughput: MLX parallel inference, smaller model, monitoring, and auto-scheduling so daily chunk growth (~700-2500/day) is always caught up.

## Tools

- **Research:** Done — [gemini-research.md](../research/gemini-research.md) (parallelism section)
- **Code:** Claude Opus (Python + shell scripts)
- **Benchmarks:** Phase 4 findings (MLX vs Ollama results)

## Context

After Phase 3 backfill, the enrichment backlog is cleared. Ongoing:
- ~700/day average growth (30-day), ~2,500/day during heavy usage
- Current: ~220 chunks/hr sequential (GLM-4.7-Flash via Ollama)
- Target: ~1,500 chunks/hr with MLX + Qwen2.5-Coder-14B + parallel

At 1,500/hr, even 2,500 new chunks/day = ~1.7 hours of enrichment. Can run overnight easily.

## Steps

### 1. Enable parallel enrichment
In `enrichment.py`, add `--parallel N` flag:
- Use `asyncio` or `concurrent.futures.ThreadPoolExecutor`
- MLX `mlx-lm.server` supports concurrent requests (prefill overlaps with decode)
- Start with `N=3` for 14B model on 32GB

Update `enrich_batch()`:
```python
if parallel > 1:
    with ThreadPoolExecutor(max_workers=parallel) as pool:
        futures = [pool.submit(enrich_one, chunk) for chunk in chunks]
        results = [f.result() for f in as_completed(futures)]
```

### 2. Add adaptive scheduling
New: `packages/zikaron/scripts/auto-enrich.sh`

Logic:
1. Check `zikaron stats` — how many unenriched chunks?
2. If > 500 unenriched: run enrichment window (3hr max)
3. If < 100 unenriched: skip (already caught up)
4. Schedule via launchd (run every 6 hours, or at 2am nightly)

### 3. Create enrichment monitoring dashboard
Update Supabase `enrichment_stats` sync to include:
- Throughput (chunks/hr over last hour)
- Queue depth (unenriched count)
- Backend in use (ollama/mlx/gemini-batch)
- Error rate

Expose via `daemon.py` `/stats/enrichment` (already exists — extend it).

### 4. Add enrichment alert
If queue depth > 5000 (3+ days backlog), send Telegram notification:
```
notify "Enrichment Behind" "Queue: 5234 chunks, ~3.5 days behind"
```

Wire into auto-enrich.sh or daemon health check.

### 5. Optimize enrichment prompt
Based on Phase 3 quality validation and Phase 4 benchmarks:
- If Qwen2.5-Coder-14B produces good results, simplify prompt (fewer instructions = faster)
- If quality drops, keep full prompt
- Test: prompt length vs output quality tradeoff

### 6. Document the enrichment config
Add to `packages/zikaron/CLAUDE.md`:
- How to switch backends (`ZIKARON_ENRICH_BACKEND`)
- How to start/stop enrichment
- How to run cloud backfill
- How to monitor queue depth
- Recommended models per backend

### 7. Update golems doctor + wizard
- Doctor: check enrichment queue depth, warn if > 1000
- Doctor: check MLX or Ollama is running
- Wizard: offer enrichment backend selection during setup

### 8. Performance test full pipeline
End-to-end:
1. Index 100 new sessions
2. Run enrichment with MLX parallel=3
3. Measure time to fully enrich new chunks
4. Compare to old sequential Ollama baseline

Log results to `phase-5/findings.md`.

## Depends On

- Phase 3 (backfill must complete first — can't tune ongoing if backlog exists)
- Phase 4 (MLX backend must be available)

## Status

- [ ] Enable parallel enrichment (ThreadPoolExecutor + --parallel flag)
- [ ] Add adaptive scheduling (auto-enrich.sh + launchd)
- [ ] Extend enrichment monitoring (throughput, queue depth, backend)
- [ ] Add enrichment backlog alert (Telegram)
- [ ] Optimize enrichment prompt for Qwen2.5-Coder-14B
- [ ] Document enrichment config in CLAUDE.md
- [ ] Update Doctor + Wizard
- [ ] Performance test full pipeline
