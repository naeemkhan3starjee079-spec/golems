# Gemini Deep Research: Enrichment Optimization

> Full research output from Gemini Deep Research (2026-02-16)

---

## Architectural Optimization for Large-Scale Metadata Enrichment

A Hybrid Cloud-Local Framework for Coding Conversation Repositories

The transition of a local knowledge base from a collection of raw text fragments into a high-utility, queryable asset requires an enrichment pipeline that is both architecturally sound and economically viable. In the context of 260,000 discrete coding conversation chunks, the existing bottleneck is a direct result of the computational mismatch between sequential local inference on consumer hardware and the massive scale of the data backlog.

---

## Analysis of Current Architectural Bottlenecks

The current infrastructure, centered on an Apple M1 Pro with 32GB of unified memory running GLM-4.7-Flash (30B), is currently operating at a significant deficit. A 30B parameter model at 4-bit quantization occupies approximately 19.5GB of unified memory, which represents over 60% of the total system capacity. This high memory occupancy leaves less than 12GB for the host operating system, database management operations, and the overhead required for the sqlite-vec indexing process.

The observed throughput of approximately 220 chunks per hour, or 2,700 chunks per day, is insufficient to address the 251,000-chunk backlog within a reasonable timeframe. When daily data growth of 1,000 new chunks is factored in, the net clearance rate is reduced to 1,700 chunks per 24-hour cycle. At this velocity, the backlog clearance window extends to roughly 148 days, or nearly five months.

| Metric | Current Setup (Local 30B) | Target Requirement | Improvement Factor |
|--------|--------------------------|-------------------|-------------------|
| Hourly Throughput | 220 Chunks | ~85,000 Chunks (Backfill) | 386x |
| Daily Net Clearance | 1,700 Chunks | 251,000 Chunks | 147x |
| Memory Occupancy | 19.5GB (Unified) | Scalable (Cloud) | N/A |
| Latency per Chunk | 3-13 Seconds | <1 Second (Equivalent) | 10x |

---

## Cloud-Scale Backfill Strategy: Gemini 2.5 Flash Ecosystem

The optimal path is the utilization of the **Gemini 2.5 Flash Batch API**. The selection of Gemini 2.5 over Gemini 2.0 is driven by long-term stability — official deprecation schedules indicate that Gemini 2.0 Flash models are slated for shutdown as early as **March 31, 2026**.

### Cost Engineering

The Gemini 2.5 Flash-Lite variant offers a significant price-to-performance advantage. The Batch API provides a **50% discount** for asynchronous requests that complete within a 24-hour window.

| Model | Input (per 1M) | Output (per 1M) | Batch Input (50% Off) | Batch Output (50% Off) |
|-------|---------------|----------------|----------------------|----------------------|
| Gemini 2.5 Flash | $0.30 | $2.50 | $0.15 | $1.25 |
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 | $0.05 | $0.20 |

For 251,000 chunks at ~500 input + ~200 output tokens each:
- Input: 125.5M tokens x $0.05 = $6.28
- Output: 50.2M tokens x $0.20 = $10.04
- **Total: ~$16.32**

### Throughput and Rate Limits

Real-time API: Tier 1 projects are capped at 1,000-1,500 RPD and 1-2M TPM. Would take 150+ days.

**Batch API bypasses these daily caps.** Batch limits are measured by "Enqueued Tokens" — 10M tokens per job for Flash-Lite at Tier 1. This requires splitting into ~18-20 batch jobs of ~14,000 chunks each.

### Request Packaging: 1:1 Ratio Recommended

| Approach | Packing (N Chunks/Prompt) | Atomic (1 Chunk/Request) |
|----------|--------------------------|-------------------------|
| Token Efficiency | High (Shares System Prompt) | Lower |
| JSON Mode | Not supported for arrays | Native Support |
| Accuracy | Decreases with context | High |
| Error Handling | Complex (Partial Failure) | Simple (Atomic Retry) |

For coding conversations (high-entropy, dense with file paths and syntax), use **1:1 request-to-chunk ratio** with native JSON Schema / Structured Output mode.

---

## Quality Comparison: Gemini vs. GLM-4.7-Flash

GLM-4.7-Flash is a Mixture-of-Experts (MoE) model that uses approximately 3.6B active parameters during inference. It provides snappiness but can result in hallucinations when tracing complex data flows.

Gemini 2.5 Flash is significantly larger and utilizes a hybrid reasoning architecture. In head-to-head evaluations on coding tasks, Gemini models have demonstrated:
- Higher reliability in referencing specific helper functions
- Lower tendency to hallucinate imports or file paths
- Gemini 2.5 Flash-Lite outperforms most 7B and 14B local models
- Rivals 30B-70B models on structured extraction benchmarks

### JSON Schema Gotchas

| Limitation | Impact on Enrichment | Mitigation |
|------------|---------------------|------------|
| Schema Complexity | Long property names increase tokens | Use concise keys (e.g., "tags" not "topic_tags") |
| Enum Support | Only string enums supported | Map importance score 1-10 to string if needed |
| Context Windows | Metadata schema counts toward limit | Keep schema flat; avoid deep nesting |

---

## Local Enrichment Optimization for Steady-State

### MLX vs. Ollama

MLX achieves between **21% and 87% higher throughput** than llama.cpp on Apple Silicon.

| Backend | M1 Pro Throughput (7B Model) | M1 Pro Throughput (14B Model) |
|---------|-----------------------------|-----------------------------|
| Ollama (GGUF) | 25-35 t/s | ~15 t/s |
| MLX (Native) | 60-65 t/s | ~27 t/s |

For a 30B parameter model, MLX typically achieves ~10 t/s on M1 Pro, compared to ~6 t/s in Ollama.

### Concurrent Inference with Smaller Model

The most effective configuration for M1 Pro 32GB is to switch to **Qwen2.5-Coder-14B** (~10GB at Q4). This allows:
- `OLLAMA_NUM_PARALLEL=3` or 4 without exceeding 32GB
- Prefill phase overlaps with Decode phase
- **2-3x throughput increase** over current sequential baseline

### Speculative Decoding

| Component | Role | Recommended Model |
|-----------|------|------------------|
| Main Model | Reasoning and extraction | Qwen2.5-Coder-14B or 32B |
| Draft Model | Fast token prediction | Qwen2.5-Coder-1.5B |
| Optimization | Continuous Batching | vllm-mlx or mlx-lm |

1.5-2x speedup for structured/predictable output like JSON tags.

---

## Strategic Architecture Recommendation

### Phase 1: Cloud Backfill (Estimated Time: 24 Hours)

1. **Extraction:** Query SQLite for 251,000 unenriched chunks
2. **JSONL Generation:** Format for Batch API with `response_mime_type: "application/json"` and strict schema
3. **Submission:** Upload JSONL via Gemini File API, create batch jobs with `ai.batches.create()`
4. **Polling:** Poll for `JOB_STATE_SUCCEEDED`, download results, bulk update SQLite

### Phase 2: Local Ongoing (Estimated Throughput: 1,500/hr)

1. **Framework Migration:** Ollama to MLX (`mlx-lm.server` for OpenAI-compatible endpoint)
2. **Model Downsizing:** GLM-4.7-Flash 30B to Qwen2.5-Coder-14B (Q4)
3. **Hardware Configuration:** Context window 8,192 tokens to preserve RAM for parallel KV-cache

### Implementation: TypeScript/Bun

```typescript
import { GoogleGenAI } from '@google/generative-ai';
import { Database } from 'bun:sqlite';

const db = new Database('kb.sqlite');
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function runBackfill() {
  const chunks = db.query('SELECT * FROM chunks WHERE enriched = 0 LIMIT 15000').all();
  const jsonlData = chunks.map(c => ({
    key: `chunk_${c.id}`,
    request: {
      contents: [{ parts: [{ text: c.content }] }],
      generationConfig: { responseMimeType: "application/json" }
    }
  }));
  // 1. Upload JSONL
  // 2. Create Batch Job
  // 3. Store batch_id in a checkpoints table
}
```

### Failure Recovery
- **Checkpoint Table:** `enrichment_log` stores batch_id, status, chunk_id range
- **Retry Logic:** Exponential backoff, resubmit failed chunks in smaller batches
- **Progress:** `ai.batches.list()` for real-time job state monitoring

---

## Long-Term Cost Projections (Cloud Ongoing)

| Daily Chunks | Monthly Total | Gemini 2.5 Flash-Lite Cost |
|-------------|--------------|---------------------------|
| 1,000 | 30,000 | $1.95 |
| 2,500 | 75,000 | $4.87 |

Calculations assume 700 tokens total per chunk and a 50% batch discount.
