# Phase 3: Flux/ComfyUI Image Generation

> [Back to main plan](../README.md)

## Goal

Set up local AI image generation via Flux.1 Dev Q6_K GGUF + ComfyUI on Mac M1 Pro, with TypeScript API client, quality gating pipeline, and brand-aware post-processing.

## Key Decisions (from deep research)

- **Model:** Flux.1 Dev Q6_K GGUF (~8.6 GB) — best balance for 32GB M1 Pro
- **UI:** ComfyUI ONLY — Forge doesn't work with Flux on Mac, A1111 has no Flux support
- **Quantization:** GGUF only — FP8/NF4 NOT supported on Apple MPS backend
- **Speed:** 5-15 min per 1024x1024 (2-4 min at 512x512 with TeaCache)
- **TS Client:** `@stable-canvas/comfyui-client` — pipeline DSL, zero deps, CLI codegen
- **Quality gating:** LAION Aesthetic >=5.5 (social) / >=6.0 (print), CLIP Score >=0.25, BRISQUE <=40
- **Upscaling:** Real-ESRGAN ncnn-vulkan (native Apple Silicon GPU)
- **ControlNet:** LoRA versions (Canny, Depth) + InstantX Union-Pro for multi-mode control
- **Non-AI dominates:** Satori (50ms for templated content) handles majority — reserve Flux for generative AI only

## Tools

- **Research:** deep research (user) — DONE (see findings.md)
- **Research:** gemini — "ComfyUI workflow-as-code, @stable-canvas/comfyui-client patterns"
- **Code:** cursor — ComfyUI workflow JSON, TS API client, quality pipeline
- **MCPs:** none (all local)

## Steps

1. **Install ComfyUI locally**
   - Clone ComfyUI, create venv, install with `--use-pytorch-cross-attention`
   - Set env: `PYTORCH_ENABLE_MPS_FALLBACK=1`, `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0`
   - Launch flags: `python main.py --use-pytorch-cross-attention --force-fp16`
   - Verify MPS backend works with basic SDXL test

2. **Download required models**
   - `city96/FLUX.1-dev-gguf` Q6_K (~8.6 GB)
   - T5-XXL GGUF Q4_K_M (~2.9 GB)
   - CLIP-L (~246 MB)
   - VAE (~335 MB)
   - NOTE: Avoid K_M quant variants for diffusion model (issues on Apple Silicon)

3. **Install essential custom nodes**
   - ComfyUI-GGUF (model loading)
   - ComfyUI-TeaCache (1.5-2x speedup, threshold 0.2-0.4)
   - ComfyUI-Impact-Pack (FaceDetailer, iterative upscale)
   - ComfyUI_UltimateSDUpscale (tiled diffusion)
   - ComfyUI-batching-nodes (folder batch processing)

4. **Create launchd service for ComfyUI**
   - Plist in `launchd/com.golems.comfyui.plist`
   - Runs on port 8188 (default), starts on demand
   - Wire into `golems doctor` health check

5. **Build TypeScript API client**
   - Use `@stable-canvas/comfyui-client` package
   - Create `packages/content/src/comfyui/client.ts` wrapper
   - Implement: queue workflow, poll status, download output
   - Support both REST and WebSocket connections

6. **Create base workflow JSON templates**
   - `workflows/flux-base.json` — text prompt → Flux Q6_K → output
   - `workflows/flux-social.json` — 1080x1080, brand colors overlay
   - `workflows/flux-merch.json` — high-res, transparent background
   - `workflows/flux-meme.json` — top/bottom text, branded watermark
   - Use `@stable-canvas/comfyui-client` codegen from saved workflows

7. **Build quality scoring pipeline**
   - LAION Aesthetic Predictor (>=5.5 social, >=6.0 print)
   - CLIP Score (>=0.25 prompt adherence)
   - BRISQUE (<=40 perceptual quality)
   - Auto-retry with new seed (up to 3x), then flag for human review

8. **Build upscaling pipeline**
   - Real-ESRGAN ncnn-vulkan (native Apple Silicon GPU)
   - 4x-UltraSharp model (1024→4096 = 13.6" at 300 DPI for merch)
   - FaceDetailer pass before upscale
   - Optional img2img refinement at 0.3 denoise

9. **Build brand overlay pipeline**
   - Read brand.json (Phase 1) for colors, fonts, logo, tone
   - Prompt prefix injection from brand.json
   - Post-processing: logo watermark, color palette enforcement
   - Quality validation against brand rules

10. **Add ControlNet LoRA support**
    - Canny LoRA (edge detection for layout control)
    - Depth LoRA (spatial depth)
    - InstantX Union-Pro (multi-mode: canny + depth + pose in one)

11. **CLI command**
    - `golems content generate <project> <prompt> [--style merch|social|meme] [--quick]`
    - `--quick`: 512x512 with TeaCache (2-4 min draft)
    - Default: 768x768, 25 steps, full quality pipeline (5-8 min)

12. **Telegram preview**
    - Send generated image to Telegram for approval
    - Include: prompt, quality scores, generation time, style used
    - User can: approve, regenerate, or adjust prompt

## Multi-Pass Strategy (Max Quality)

```text
1. Generate at 768x768, Q6_K, 25 steps (5-8 min)
2. FaceDetailer pass
3. 4x upscale with 4x-UltraSharp model
4. Optional img2img refinement at 0.3 denoise
5. Quality score validation
6. Brand overlay post-processing
```

## Draft Strategy (Fast Iteration)

```text
1. Generate at 512x512 with TeaCache (2-4 min)
2. Quick quality gate (CLIP Score only)
3. Show draft in Telegram
4. If approved → full quality pipeline on approved concept
```

## Depends On

- Phase 1 (brand.json schema for overlays and prompt prefixes)

## Status

- [x] Deep research results incorporated
- [x] ComfyUI + Flux installed locally (~/Gits/ComfyUI with venv)
- [x] Required models downloaded (Q6_K 9.2GB + T5 2.7GB + CLIP 235MB + VAE 321MB)
- [x] Custom nodes installed (GGUF, TeaCache, Impact-Pack, UltimateSDUpscale)
- [x] Launchd service created (com.golems.comfyui.plist)
- [x] TypeScript API client (`@stable-canvas/comfyui-client` v1.5.9)
- [x] Flux GGUF workflow builders (base, social, merch, meme, draft)
- [x] Quality scoring pipeline (Python bridge: CLIP + Aesthetic + BRISQUE)
- [x] Generation pipeline (generate.ts: workflow + quality + auto-retry)
- [x] CLI command (bun run generate)
- [x] Brand overlay (prompt prefix injection from brand.json)
- [x] CLAUDE.md documented
- [ ] Upscaling pipeline (Real-ESRGAN + FaceDetailer) — deferred to Phase 4
- [ ] ControlNet LoRA support — deferred (needs more models)
- [ ] Telegram preview — deferred to Phase 4 (n8n integration)
- [ ] Performance benchmarks — needs ComfyUI running with GPU
