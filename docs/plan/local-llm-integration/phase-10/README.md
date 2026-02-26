# Phase 10: Fine-Tune Local Model (MLX + QLoRA)

> [Back to main plan](../README.md)

## Goal

Fine-tune Qwen3-8B on our specific tasks using MLX + QLoRA on M1 Pro. Target: beat GLM-4.7-Flash (30B general) on email scoring, job matching, and tagging while running 3-5x faster.

## Deep Research Findings (Feb 2026)

- **mlx-lm v0.30.6** — still the only viable option on Apple Silicon (no competition)
- **Qwen3-8B** — best base model for structured output (beats Qwen2.5-14B on benchmarks, Apache 2.0)
  - Alternative: Qwen3-4B-Instruct-2507 (#1 for fine-tuned perf, lighter)
- **4-bit QLoRA** — model fits in ~4.3 GB, leaving 25 GB headroom for training
- **Chat-format JSONL** — recommended over ShareGPT (auto-applies chat template, works with --mask-prompt)
- **Hot-swap adapters** — mlx-lm server supports per-request adapter switching
- **Training time** — ~1-3 hours per adapter (1000-2000 examples, M1 Pro)
- **Pin versions!** — mlx==0.30.6, mlx-lm==0.30.6 (garbage output regression in 0.30.4)

## Steps

### 10a: Data Preparation (IN PROGRESS)

1. ~~Build batch email scorer~~ — `scripts/batch-score-emails.ts` (done)
2. ~~Download raw emails~~ — `/tmp/email-raw-data.jsonl` (2MB, done)
3. **Running now:** Score 1000 emails with GLM-4.7-Flash
4. Extract job matching examples from Supabase `golem_jobs` table
5. Format to **chat JSONL** (not ShareGPT):
   ```json
   {"messages": [
     {"role": "system", "content": "Rate this email 1-10. Return JSON with score and reasoning."},
     {"role": "user", "content": "Subject: Q3 Revenue Update..."},
     {"role": "assistant", "content": "{\"score\": 8, \"reasoning\": \"Relevant financial update\"}"}
   ]}
   ```
6. Manual quality review of 100 examples
7. Split: 80% train, 10% validation, 10% test
8. Target: 1000-2000 high-quality examples per task

### 10b: Environment Setup

9. Install MLX: `pip3 install mlx==0.30.6 mlx-lm==0.30.6` (**pin versions!**)
10. Download Qwen3-8B 4-bit: `mlx-community/Qwen3-8B-4bit` (~4.3 GB)
11. Verify model loads and runs inference on M1 Pro
12. Smoke test with 10 training examples

### 10c: Training

13. Train email scoring adapter:
    ```bash
    mlx_lm.lora \
      --model mlx-community/Qwen3-8B-4bit \
      --train --data ./data/email_scoring \
      --batch-size 1 --grad-accumulation-steps 4 \
      --num-layers 8 --iters 1000 --learning-rate 1e-5 \
      --max-seq-length 512 --grad-checkpoint --mask-prompt \
      --steps-per-report 10 --steps-per-eval 100 \
      --adapter-path ./adapters/email_scoring --save-every 200
    ```
14. Train job matching adapter (separate LoRA, same params)
15. Train tagging adapter (separate LoRA)
16. Monitor validation loss, stop if overfitting

### 10d: Evaluation

17. Run existing benchmark (12 tests) against fine-tuned model
18. Compare: base Qwen3-8B vs fine-tuned vs GLM-4.7-Flash vs Haiku
19. Measure: accuracy, latency, JSON compliance, reasoning quality
20. A/B test on 1 week of real emails/jobs

### 10e: Integration

21. Start mlx-lm server with hot-swap adapters:
    ```bash
    mlx_lm.server --model mlx-community/Qwen3-8B-4bit --port 8080
    ```
22. Per-request adapter switching:
    ```bash
    curl localhost:8080/v1/chat/completions \
      -d '{"messages": [...], "adapters": "./adapters/email_scoring"}'
    ```
23. Wire into llm.ts as `LLM_BACKEND=finetuned` option
24. Monitor quality for 1 week

## Memory Budget (M1 Pro 32GB)

| Component | Memory |
|-----------|--------|
| Qwen3-8B 4-bit base | ~4.3 GB |
| 3 LoRA adapters (loaded) | ~30-150 MB total |
| KV cache + overhead | ~2-4 GB |
| **Total** | **~6-8 GB** |
| **Remaining for other apps** | **~24 GB** |

## Version Pinning (CRITICAL)

```
mlx==0.30.6
mlx-lm==0.30.6
mlx-metal==0.30.6
```

Known regressions:
- v0.30.4: Garbage output after ~1000 tokens with Qwen3
- v0.26.x: Broke LoRA training entirely (bfloat16 kernel)
- Always clear Metal shader cache after upgrading: `rm -rf ~/Library/Caches/mlx`

## Depends On

- Phase 1 (benchmark baseline — done)
- Phase 5 (Zikaron enrichment data — can extract raw data without Phase 5)

## Status

- [x] 10a: Build batch email scorer
- [x] 10a: Download raw emails (2MB)
- [ ] 10a: Score 1000 emails with GLM (running now)
- [ ] 10a: Extract job matching examples
- [ ] 10a: Format to chat JSONL
- [ ] 10a: Quality review + train/val/test split
- [ ] 10b: Install MLX + download Qwen3-8B-4bit
- [ ] 10b: Smoke test training
- [ ] 10c: Train email scoring adapter
- [ ] 10c: Train job matching adapter
- [ ] 10c: Train tagging adapter
- [ ] 10d: Run benchmark comparison
- [ ] 10d: A/B test on real data
- [ ] 10e: Start mlx-lm server with hot-swap
- [ ] 10e: Wire into llm.ts
