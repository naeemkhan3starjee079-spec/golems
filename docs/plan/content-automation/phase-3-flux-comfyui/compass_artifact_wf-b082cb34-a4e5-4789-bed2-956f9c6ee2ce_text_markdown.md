# The definitive local visual pipeline for Mac M1 Pro in 2026

**GGUF-quantized Flux.1 Dev running through ComfyUI is the only production-viable AI image generation stack on Apple Silicon today, delivering high-quality 1024×1024 images in 5–15 minutes per image with zero cloud dependencies.** Combined with Remotion for video, Satori/Sharp for programmatic design, and a brand.json-driven post-processing pipeline, a single M1 Pro with 32GB unified memory can power an autonomous "Golem" agent ecosystem that routes creative briefs through the right visual pipeline—all free and fully local. This report covers every layer of that stack, from model selection to quality gating, based on the actual state of these tools as of early 2026.

---

## Flux.1 Dev on Apple Silicon: GGUF is the only path that works

The Flux.1 family from Black Forest Labs is a **12-billion parameter** rectified flow transformer released in August 2024, with three variants. Flux.1 **Pro** is API-only (no local weights). Flux.1 **Schnell** (Apache 2.0) generates images in 1–4 steps but produces noticeably lower quality. Flux.1 **Dev** (guidance-distilled, non-commercial license) requires 20–30 steps and delivers the best local quality—this is the model to run.

The critical technical constraint: **FP8 (Float8_e4m3fn) is not supported on Apple's MPS backend**, which immediately rules out fp8 safetensors checkpoints and NF4 quantizations. Attempting to load them produces a hard `TypeError`. **GGUF is the only practical quantization format for Apple Silicon.** The `city96/FLUX.1-dev-gguf` collection on Hugging Face provides the key models:

| Variant | File size | Quality | Recommendation |
|---|---|---|---|
| flux1-dev-**Q8_0** | ~11.3 GB | Excellent (near full precision) | Best quality if memory allows |
| flux1-dev-**Q6_K** | ~8.6 GB | Very good | **Best balance for 32GB systems** |
| flux1-dev-**Q4_K_S** | ~6.8 GB | Good | Fast drafts and iteration |
| flux1-dev-**Q4_1** | ~6.7 GB | Good | Confirmed working on Apple Silicon |

Alongside the model, you need the T5-XXL text encoder (quantized to GGUF Q4_K_M at ~2.9 GB), CLIP-L (~246 MB), and the VAE (~335 MB). Total model footprint: **~12–15 GB**, leaving comfortable headroom in 32GB unified memory for macOS and ComfyUI overhead. One important caveat: **K_M quant variants have reported issues on Apple Silicon**—stick to non-K_M versions for the diffusion model itself.

**ComfyUI is the only viable UI.** Forge explicitly does not work with Flux on Mac (confirmed across multiple GitHub issues). AUTOMATIC1111 has no Flux support at all. ComfyUI requires the `ComfyUI-GGUF` custom node from city96, and must be launched with specific flags:

```bash
export PYTORCH_ENABLE_MPS_FALLBACK=1
export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0
python main.py --use-pytorch-cross-attention --force-fp16
```

Realistic generation times on M1 Pro 32GB with Q6_K GGUF and **25 steps** (the quality sweet spot): roughly **2–4 minutes at 512×512**, **5–8 minutes at 768×768**, and **8–15 minutes at 1024×1024**. These are slower than NVIDIA GPUs by a factor of 20–50×, but quality is identical—speed is the tradeoff for local-only Apple Silicon generation. Installing **ComfyUI-TeaCache** provides a 1.5–2× speedup with minimal quality loss (threshold 0.2–0.4), useful for drafting.

**Flux.2** (November 2025, 32B parameters) is not viable on 32GB—it requires ~90GB VRAM at full precision. The Klein 4B variant may eventually become usable once GGUF quantizations mature, but Flux.1 Dev remains the practical choice today.

### ControlNet support for precise layouts

Black Forest Labs released official control tools in November 2024. The full Flux.1 Canny and Depth models are ~23 GB each—too large to coexist with the base model in 32GB—but **LoRA versions** of both Canny and Depth are available and recommended for Mac. The **InstantX FLUX.1-dev-ControlNet-Union-Pro** model is particularly valuable: a single model providing Canny, Tile, Depth, Blur, and Pose control modes. Flux Fill handles inpainting/outpainting (GGUF versions exist). **Flux Redux** provides IP-Adapter-like image variation capabilities. Expect ControlNet to roughly double generation time on Mac (adding 5–15 minutes). There is no dedicated OpenPose ControlNet for Flux yet, but the Union model includes a pose mode, and depth maps can substitute.

---

## ComfyUI as the automation backbone: API-first by design

ComfyUI runs as an HTTP/WebSocket server on port 8188, making it natively API-driven. The Golem agent ecosystem can treat it as a headless image generation service.

The **REST API** exposes these key endpoints: `POST /prompt` queues a workflow and returns a `prompt_id`; `GET /history/{prompt_id}` retrieves results; `GET /view` fetches generated images by filename; `POST /interrupt` cancels the current job; `POST /free` unloads all models for memory recovery. The **WebSocket** at `ws://127.0.0.1:8188/ws?clientId={uuid}` streams real-time progress updates, execution events, and even raw image data via binary messages.

The critical pattern for automation is **workflow-as-template**: design a workflow in the ComfyUI browser UI, export it in "API format" (a flat JSON dictionary keyed by node ID), then programmatically modify parameters before submission. Every node input—prompt text, seed, dimensions, model name, LoRA strength, sampler settings—is addressable by node ID:

```python
workflow["6"]["inputs"]["text"] = "vibrant product photography, brand colors #0066FF"
workflow["5"]["inputs"]["width"] = 1080
workflow["5"]["inputs"]["height"] = 1080
workflow["3"]["inputs"]["seed"] = 42
workflow["9"]["inputs"]["filename_prefix"] = "social/instagram_post"
```

For Python integration, **`comfy_api_simplified`** (pip installable) provides the simplest wrapper, addressing nodes by their human-readable title rather than ID. **ComfyScript** goes further, letting you declare workflows imperatively in Python with full autocompletion. For TypeScript, **`@stable-canvas/comfyui-client`** is the most mature option, offering a pipeline DSL, zero dependencies, and a CLI code generator that converts workflow JSON into executable TypeScript.

**Batch processing** is straightforward: loop over parameter sets, POST each to `/prompt`, track completion via WebSocket, and download results from `/history`. Use `filename_prefix` with subdirectories (e.g., `"social/post_2026-02-13"`) to organize outputs automatically. The API supports queue management—check queue state, clear pending items, delete specific jobs. For the Golem ecosystem, this means an orchestrator script can maintain a priority queue of creative briefs, translate each into ComfyUI workflow parameters, and process them sequentially on the single M1 Pro.

Essential custom nodes to install via **ComfyUI-Manager**: `ComfyUI-GGUF` (GGUF model loading), `ComfyUI-TeaCache` (speed optimization), `ComfyUI-Impact-Pack` (FaceDetailer, iterative upscale), `ComfyUI_UltimateSDUpscale` (tiled diffusion upscale), and `ComfyUI-batching-nodes` (folder-based batch processing).

---

## Remotion turns AI images into polished video locally

Remotion v4.0.421 is a React-based framework that renders components frame-by-frame via headless Chrome, then encodes with FFmpeg. It ships native Apple Silicon binaries for both (`@remotion/compositor-darwin-arm64`), requires zero cloud services, and is **free for individuals and teams of 3 or fewer**.

The template system is built for exactly the kind of parameterized generation Golems need. Define a Zod schema for your video's inputs (product images, headline text, brand colors, feature bullets), register a `<Composition>` with default props and a `calculateMetadata()` function for dynamic duration computation, then pass different props at render time via CLI flags or the Node.js API. A single Remotion project can contain dozens of compositions—social promos, carousel slideshows, product reveals, data visualizations—each as a separate template.

**Consuming ComfyUI outputs is trivial.** Copy generated images to Remotion's `public/` directory (or pass absolute file paths as props), reference them via `staticFile()` or `<Img>` component (which waits for load before frame capture), and animate with `useCurrentFrame()`, `interpolate()`, and `spring()`. The `<TransitionSeries>` component handles scene-to-scene transitions (fade, slide, wipe) declaratively.

For the Golem pipeline, the integration pattern is:

```
ComfyUI generates images → Orchestrator copies to public/ → 
Orchestrator calls renderMedia() with inputProps → MP4 output
```

The `@remotion/renderer` package provides complete programmatic control: `bundle()` your project once, then call `selectComposition()` and `renderMedia()` repeatedly with different props for each video. Hardware-accelerated encoding via **VideoToolbox** (available since v4.0.228) is a major M1 Pro advantage—use `--hardware-acceleration=if-possible` with `--video-bitrate=8M` for H.264 or ProRes output.

Expected render performance on M1 Pro: a **15-second social video renders in ~10–30 seconds**; a 60-second video in ~40–120 seconds. Optimal concurrency is likely 6–8 parallel Chrome instances. Run `npx remotion benchmark MyComp --concurrency=4,6,8` to find your sweet spot.

---

## From AI design to product mockup without leaving your machine

The image-to-merch pipeline requires three stages: upscale AI output to print resolution, perspective-transform the design onto a product template, and composite with realistic lighting effects.

**Upscaling**: Generate at Flux's native 1024×1024, then apply **Real-ESRGAN** at 4× to reach 4096×4096—sufficient for **~13.6-inch prints at 300 DPI**, covering t-shirts, phone cases, mugs, and small posters. The `realesrgan-ncnn-vulkan` binary runs natively on Apple Silicon GPU via Vulkan. For larger posters (24×36"), chain two 4× upscales or use ComfyUI's Ultimate SD Upscale with tiled diffusion. **FreeScaler** (free, Mac App Store) and **Upscayl** wrap Real-ESRGAN in GUI apps for quick standalone use.

**Perspective transforms and compositing** form the core mockup generation step. Three approaches ranked by realism:

**Blender Python scripting** (highest quality): Create product .blend files with UV-mapped surfaces, then automate texture swapping and rendering via `bpy`. Running `blender --background mockup.blend --python render.py` produces photorealistic 3D mockups with proper cloth simulation for t-shirts, cylindrical mapping for mugs, and realistic lighting. Blender runs natively on M1 Pro with Metal GPU acceleration.

**OpenCV/Pillow perspective transform** (mid-tier, fastest): Define four destination points on the product template, compute a perspective matrix via `cv2.getPerspectiveTransform()`, warp the design, and alpha-composite onto the template. The `CTDave001/automated_mockups` Python project (MIT license) automates this entire flow—detect colored placement boxes on templates, calculate position/rotation, and batch-generate mockups across hundreds of designs.

**ImageMagick** `-distort Perspective` (good for shell scripting): Handles perspective warping, displacement maps for fabric texture, and lighting/shadow layers via blend modes. The `kashifulhaque/product-mockup-node-python` project demonstrates a full pipeline combining displacement maps, lighting maps, and mask-based compositing.

For the Sharp/Node.js path, Sharp handles fast compositing and blend modes (`multiply`, `screen`, `overlay`) but **lacks native perspective transform**—pre-warp with ImageMagick or OpenCV, then pipe the result to Sharp for final layer assembly. **Printful's API** is free to use and provides 2,550+ mockup templates via cloud, useful as a supplement when local mockup quality isn't sufficient for a specific product type.

---

## Brand consistency through a multi-layer enforcement system

AI models don't inherently understand brand guidelines. Consistency requires enforcement at four layers: generation input, model conditioning, post-processing, and quality validation.

**Layer 1: brand.json as single source of truth.** Define a JSON configuration file containing hex color palette, typography specs (font family, weights, file paths to .ttf), logo assets, safe zones, layout rules, prompt templates, and generation parameters (LoRA path, IP-Adapter reference image). Every pipeline component reads this file at runtime. The pattern aligns with the W3C Design Tokens Community Group standard and can be transformed into CSS/Swift/Sass via Amazon's Style Dictionary tool.

**Layer 2: Prompt engineering for Flux.** Flux natively understands hex color codes when preceded by "color" or "hex" keywords. Build a boilerplate prompt prefix from brand.json: lock lighting ("soft daylight, studio softbox"), texture ("clean surfaces, product-grade reflections"), composition ("centered, rule of thirds, copy-safe margins"), and color palette ("limited palette of #0066FF and #FFD700 accents"). Vary only the subject across generations. **Word order matters**—put brand-critical elements first, as Flux attends most strongly to early tokens.

**Layer 3: Model conditioning via LoRA and IP-Adapter.** Training a style LoRA for Flux is feasible on M1 Pro 32GB using the `hughescr/ai-toolkit` fork (MPS-compatible), requiring only **20–50 curated brand images** and 1000–2000 training steps. Expect 150–250+ minutes per 1000 steps. Apply the LoRA at strength 0.7–1.0 during generation. Alternatively, **IP-Adapter** (XLabs v2 or InstantX/Shakker-Labs) can condition generation on a brand reference image without training—feed an approved brand visual as the style reference and adjust the scale parameter to balance brand adherence against prompt flexibility.

**Layer 4: Post-processing overlay pipeline.** Generate images without text (AI text rendering is unreliable), then programmatically composite brand elements:

- **Typography**: Use `node-canvas` with `registerFont()` for precise custom font rendering, or Pillow's `ImageFont.truetype()` in Python. Sharp can overlay SVG text but requires system-installed fonts.
- **Logo placement**: Read position and opacity from brand.json, resize logo proportionally, composite at the specified location with safe zone padding.
- **Color validation**: Extract dominant colors via K-Means clustering, compare against the brand palette using Delta-E in Lab color space, and flag or auto-correct images exceeding the tolerance threshold. ImageMagick's `-remap` with a brand palette image provides aggressive palette enforcement when needed.

---

## Quality gating: automated scoring before any human sees the output

A Golem pipeline producing visual content must enforce quality thresholds automatically, reserving human review for borderline cases. Three complementary scoring models run comfortably on M1 Pro:

**LAION Aesthetic Predictor V2** is the highest-value quality signal—a tiny linear layer (~1 MB) on top of CLIP ViT-L/14 embeddings that predicts aesthetic quality on a 0–10 scale. Images scoring **≥5.5 are acceptable for social media; ≥6.0 for print**; exceptional outputs score 7.0+. Total memory: ~1 GB including CLIP. **CLIP Score** measures prompt-text alignment (reject below 0.25). **BRISQUE** (pure NumPy, no GPU) measures naturalness via spatial statistics—lower is better; reject above 40.

The recommended quality gating pipeline:

```
Generate → CLIP Score ≥0.25 → Aesthetic Score ≥5.5 → BRISQUE ≤40
  → PASS: proceed to upscale and post-processing
  → FAIL: regenerate with new seed (up to 3 attempts), then flag for human review
```

For **face and detail fixing**, ComfyUI Impact Pack's **FaceDetailer** auto-detects faces via YOLO, crops, runs img2img at higher resolution, and blends back—the direct equivalent of ADetailer. It works with Flux models since v6.0 and is memory-efficient since it only processes cropped regions. **HandFixer** custom node handles the notoriously difficult hand problem via Flux Fill inpainting.

The optimal **multi-pass generation strategy** for maximum quality:

1. Generate at 768×768 with Q6_K GGUF, 25 steps (5–8 min)
2. FaceDetailer pass on the base image
3. Upscale 4× with **4x-UltraSharp** model in ComfyUI (~67 MB feedforward model)
4. Optional: img2img refinement pass at 0.3 denoise to add high-frequency detail
5. Quality score validation
6. Post-processing (brand overlays, typography)

Resolution targets by output type:

| Output | Target resolution | Generation strategy |
|---|---|---|
| Instagram post | 1080×1080 or 1080×1350 | Generate 1024×1024 → slight upscale |
| Instagram/TikTok story | 1080×1920 | Generate 576×1024 → 2× upscale |
| YouTube thumbnail | 1280×720 | Generate 1024×576 → slight upscale |
| T-shirt print | 3600×4800 | Generate 1024×1024 → 4× upscale |
| Poster (24×36") | 7200×10800 | Generate 1024×1024 → 4× → tiled refinement |
| Video frame (1080p) | 1920×1080 | Generate 1024×576 → 2× upscale |

---

## The non-AI visual toolkit: Satori, Sharp, and friends

Not every visual asset needs AI generation. Social cards, data overlays, carousel text slides, and branded templates are better handled by deterministic programmatic tools that are orders of magnitude faster.

**Satori** (by Vercel, MIT license) is the standout tool—it converts JSX/HTML+CSS into SVG using Yoga Layout (React Native's Flexbox engine), producing images in **~10–50 milliseconds**. Pair it with `@resvg/resvg-js` for SVG-to-PNG conversion. Satori supports custom fonts (TTF/OTF/WOFF), borders, gradients, shadows, transforms, and images. It runs in pure Node.js with no browser dependency. For templated social cards, OG images, and branded banners, this is 100–1000× faster than any AI approach with pixel-perfect output.

**Sharp** (libvips-powered, ARM64 native binaries for Mac) handles image compositing at ~5–20ms per operation. Use it for layering AI-generated images with brand overlays, resizing for different platforms, format conversion, and quality optimization. It supports **18 blend modes** including multiply, screen, and overlay. The limitation: no native perspective transform and no text API (use SVG overlay workaround for simple text).

**node-canvas** provides the full Canvas 2D API with `registerFont()` for custom font rendering—the best option when Satori's Flexbox-only layout is insufficient. **Fabric.js v6** offers an object-oriented canvas API with full server-side support via `fabric/node`, capable of complex designs with SVG import/export.

**Puppeteer/Playwright** (headless Chromium) is the escape hatch for designs requiring full CSS Grid, complex typography, or existing web components. Each screenshot costs ~500ms–2s plus ~200MB memory, so reserve it for layouts that can't be achieved with lighter tools.

**Penpot** deserves special mention as an open-source, self-hostable Figma alternative built on SVG/CSS/HTML standards. Unlike Figma (whose free API tier allows only **6 requests per month**—essentially useless), a self-hosted Penpot instance provides unlimited API access with a REST API and an official MCP server for AI-assisted design workflows.

**FFmpeg** rounds out the toolkit for simple text overlays via the `drawtext` filter, image-to-image operations, and thumbnail generation from video. It's installed via `brew install ffmpeg` and requires no runtime overhead.

---

## Bringing it together: the Golem visual pipeline architecture

The complete stack operates as a set of microservices orchestrated by the Golem agent:

```
┌─────────────────── Golem Orchestrator (Node.js/TypeScript) ──────────────────┐
│                                                                               │
│  brand.json ─────────────────────────────────────┐                           │
│                                                    │                           │
│  Creative Brief → Router ─┬─ AI Image Path ──────┼─→ ComfyUI API (Flux GGUF)│
│                            │                       │     ↓                     │
│                            │                       │   Quality Scorer          │
│                            │                       │     ↓                     │
│                            │                       │   FaceDetailer + Upscale  │
│                            │                       │     ↓                     │
│                            ├─ Template Path ───────┼─→ Satori / Sharp          │
│                            │                       │     ↓                     │
│                            ├─ Video Path ──────────┼─→ Remotion renderMedia()  │
│                            │                       │     ↓                     │
│                            └─ Merch Path ──────────┼─→ Real-ESRGAN + Blender   │
│                                                    │     ↓                     │
│                                                    └─→ Brand Overlay Pipeline  │
│                                                          ↓                     │
│                                                      Output Directory          │
└───────────────────────────────────────────────────────────────────────────────┘
```

The router analyzes each creative brief and selects the appropriate pipeline: AI generation for photographic/illustrative content (5–15 min per image), Satori for templated cards and banners (~50ms), Remotion for video content (~30s–2min), or the merch pipeline for product mockups. All paths converge through the brand overlay pipeline that reads brand.json to apply logos, typography, color validation, and safe zones.

For installation, the entire stack fits comfortably on an M1 Pro with 32GB:

- **ComfyUI** + Flux Q6_K GGUF + T5 Q4 + custom nodes: ~15 GB disk, ~15 GB runtime memory
- **Node.js ecosystem** (Satori, Sharp, Remotion, canvas): ~500 MB disk, ~200 MB–1 GB runtime
- **Real-ESRGAN** ncnn-vulkan: ~100 MB disk, ~2 GB runtime
- **Blender** (optional, for 3D mockups): ~500 MB disk, ~2–4 GB runtime
- **ImageMagick + FFmpeg**: ~200 MB disk, minimal runtime

The quality-over-speed tradeoff is explicit: AI image generation at 5–15 minutes per image means a Golem processing 50 creative briefs will take several hours. The staged approach mitigates this—generate quick drafts at 512×512 with TeaCache (2–4 min), quality-gate them, then only invest full generation time on approved concepts. Non-AI pipelines (Satori, Sharp, FFmpeg) operate in milliseconds and should handle the majority of templated content, reserving Flux for assets that genuinely require generative AI.

## Conclusion

The Mac M1 Pro local visual pipeline in 2026 is constrained but genuinely functional. **GGUF quantization unlocked Flux on Apple Silicon** where FP8 and NF4 cannot run, and ComfyUI's API-first architecture makes it automatable without any GUI interaction. The non-obvious insight is that most visual content in a brand pipeline—social cards, data overlays, carousel slides, branded frames—shouldn't use AI generation at all. Satori produces pixel-perfect templated output 1000× faster than Flux. The Golem's intelligence lies in routing: knowing when a brief needs generative AI versus deterministic rendering, and orchestrating the handoff between ComfyUI, Remotion, Sharp, and Blender through a unified brand.json configuration. Quality gating via LAION Aesthetic scoring closes the loop, ensuring that slow-but-powerful AI generation only produces assets that meet the threshold before expensive post-processing begins.