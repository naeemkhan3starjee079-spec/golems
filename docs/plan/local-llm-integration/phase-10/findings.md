# Phase 10 Findings: MLX Fine-Tuning on Apple Silicon

> [Back to Phase 10 README](./README.md)
> Source: Claude Desktop deep research (Feb 2026) + earlier research

## Decisions

- **Framework:** mlx-lm v0.30.6 (only viable option on Apple Silicon)
- **Base model:** Qwen3-8B 4-bit QLoRA (~4.3 GB, Apache 2.0)
- **Alternative:** Qwen3-4B-Instruct-2507 (#1 for fine-tuned perf, lighter)
- **Data format:** Chat JSONL (not ShareGPT — works with --mask-prompt)
- **Adapter serving:** mlx-lm HTTP server with per-request hot-swap
- **Pin versions:** mlx==0.30.6, mlx-lm==0.30.6, mlx-metal==0.30.6

## Research

### MLX Fine-Tuning Viability (2026-02-12, updated)
- MLX + QLoRA fully supported on Apple Silicon (M1/M2/M3/M4)
- Qwen3-8B fits in ~4.3 GB with 4-bit QLoRA (32GB M1 Pro has plenty of margin)
- Training time: ~1-3 hours for 1000-2000 examples per adapter
- Unsloth does NOT support MPS — use MLX directly
- GLM-4.7-Flash is NOT fine-tunable locally (closed weights). Use open models instead.
- **Updated:** Qwen3-8B preferred over Qwen3-7B (better benchmarks, native JSON mode)

### Model Selection Details

| Model | Size (4-bit) | Benchmark | JSON Mode | License | Notes |
|-------|-------------|-----------|-----------|---------|-------|
| **Qwen3-8B** | ~4.3 GB | Beats Qwen2.5-14B | Native | Apache 2.0 | **Primary choice** |
| Qwen3-4B-2507 | ~2.5 GB | #1 fine-tuned perf | Native | Apache 2.0 | Lighter, July 2025 update |
| Phi-4-mini | ~2.1 GB | Good | Best native tokens | MIT | Best for JSON schemas |
| Gemma 3 4B | ~2.5 GB | Good | Prompt-based | — | Multimodal, 128K context |
| Llama 4 Scout | ~27 GB min | — | — | — | NOT viable (too large) |

### Training Configuration

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

### Hot-Swap Adapter Pattern

```bash
# Server
mlx_lm.server --model mlx-community/Qwen3-8B-4bit --port 8080

# Per-request adapter
curl localhost:8080/v1/chat/completions \
  -d '{"messages": [...], "adapters": "./adapters/email_scoring"}'
```

- Each adapter: ~10-50 MB
- Total footprint: ~6-8 GB (base + 3 adapters + KV cache)
- Server implements OpenAI API format

### Version Pinning (CRITICAL)

| Version | Issue |
|---------|-------|
| v0.30.4 | Garbage output after ~1000 tokens (Qwen3) |
| v0.26.x | bfloat16 kernel mismatch — broke ALL LoRA training |

Always: `rm -rf ~/Library/Caches/mlx` after upgrading.

### Memory Budget (M1 Pro 32GB)

| Component | Memory |
|-----------|--------|
| Qwen3-8B 4-bit base | ~4.3 GB |
| 3 LoRA adapters | ~30-150 MB total |
| KV cache + overhead | ~2-4 GB |
| **Total** | **~6-8 GB** |

### Rejected Alternatives
- PyTorch + MPS: No bitsandbytes, worse memory efficiency
- llama.cpp: Inference only, basic training
- Unsloth: Just wraps mlx-lm underneath
- Axolotl: No Apple Silicon support

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Batch score 1000 emails | — | Running |
| Extract job matching examples | — | Pending |
| Format chat JSONL | — | Pending |
| Install MLX + model | — | Pending |
| Train 3 adapters | — | Pending |
