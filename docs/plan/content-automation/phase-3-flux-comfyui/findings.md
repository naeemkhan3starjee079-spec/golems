# Phase 3 Findings

## Decisions

- **Model:** Flux.1 Dev Q6_K GGUF (~8.6 GB) — best balance for 32GB M1 Pro
- **UI:** ComfyUI ONLY — Forge doesn't work with Flux on Mac, A1111 has no Flux support
- **Quantization:** GGUF only — FP8/NF4 NOT supported on Apple MPS backend
- **Speed:** 5-15 min per 1024x1024 image (2-4 min at 512x512 with TeaCache)
- **ControlNet:** LoRA versions (Canny, Depth) + InstantX Union-Pro for multi-mode control
- **Upscaling:** Real-ESRGAN ncnn-vulkan (native Apple Silicon GPU)
- **Quality gating:** LAION Aesthetic >=5.5 (social) / >=6.0 (print), CLIP Score >=0.25, BRISQUE <=40
- **Non-AI tools dominate:** Satori (50ms for templated content) handles majority of work. Reserve Flux for generative AI only.
- **Mockups:** Blender Python scripting (highest quality) or OpenCV perspective transform (fastest)
- **Typography:** node-canvas with registerFont() — Sharp lacks text API, Satori for Flexbox layouts

## Research

Full deep research: `compass_artifact_wf-b082cb34-a4e5-4789-bed2-956f9c6ee2ce_text_markdown.md`

### Key Numbers
- Flux Q6_K + T5 Q4 + CLIP + VAE = ~12-15 GB disk, ~15 GB runtime
- Satori: ~10-50ms per templated image (1000x faster than AI)
- Sharp: ~5-20ms per compositing operation
- Remotion: 15s video renders in 10-30s on M1 Pro
- Real-ESRGAN 4x: 1024→4096 (13.6" at 300 DPI for merch)
- ComfyUI-TeaCache: 1.5-2x speedup (threshold 0.2-0.4)

### Installation Requirements
```bash
# ComfyUI launch flags for M1 Pro
export PYTORCH_ENABLE_MPS_FALLBACK=1
export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0
python main.py --use-pytorch-cross-attention --force-fp16
```

### Required Models
- `city96/FLUX.1-dev-gguf` Q6_K (~8.6 GB)
- T5-XXL GGUF Q4_K_M (~2.9 GB)
- CLIP-L (~246 MB)
- VAE (~335 MB)
- NOTE: Avoid K_M quant variants for diffusion model (issues on Apple Silicon)

### Essential ComfyUI Custom Nodes
- ComfyUI-GGUF (model loading)
- ComfyUI-TeaCache (speed optimization)
- ComfyUI-Impact-Pack (FaceDetailer, iterative upscale)
- ComfyUI_UltimateSDUpscale (tiled diffusion)
- ComfyUI-batching-nodes (folder batch processing)

### TypeScript API Client
`@stable-canvas/comfyui-client` — pipeline DSL, zero deps, CLI codegen from workflow JSON

### Quality Pipeline
```text
Generate → CLIP Score ≥0.25 → Aesthetic Score ≥5.5 → BRISQUE ≤40
  → PASS: upscale + post-processing
  → FAIL: regenerate with new seed (up to 3x), then flag for human review
```

### Multi-Pass Strategy for Max Quality
1. Generate at 768x768, Q6_K, 25 steps (5-8 min)
2. FaceDetailer pass
3. 4x upscale with 4x-UltraSharp model
4. Optional img2img refinement at 0.3 denoise
5. Quality score validation
6. Brand overlay post-processing

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| Deep research | user (Claude.ai) | done |
| Update phase README with findings | opus | pending |

## Notes

- Flux.2 (32B params) NOT viable on 32GB — requires ~90GB VRAM
- Penpot (self-hosted Figma) has unlimited API + official MCP server — worth exploring
- Figma free tier: only 6 API requests/month — useless
- Strategy: generate quick drafts at 512x512 with TeaCache, quality-gate, then full gen only on approved concepts
