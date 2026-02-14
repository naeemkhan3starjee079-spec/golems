---
name: generate
description: Generate images using ComfyUI + Flux.1 Dev Q6_K GGUF locally
---

# Generate Image with Flux

> AI image generation via local ComfyUI. Supports social, merch, meme, and base styles.

## Step 1: Check ComfyUI is Running

```bash
curl -s http://127.0.0.1:8188/system_stats | jq '.system.comfyui_version' 2>/dev/null
```

If not running:
```bash
launchctl load ~/Library/LaunchAgents/com.golems.comfyui.plist
sleep 5  # Wait for startup
```

## Step 2: Check Available RAM

Flux Q6_K needs ~12GB RAM. Check before generating:

```bash
# macOS: check memory pressure
memory_pressure | head -5
```

If memory is tight (>75% used), see [services.md](services.md) for freeing resources.

## Step 3: Generate via CLI

```bash
cd ~/Gits/golems/packages/content

# Basic generation
bun run generate "A futuristic cityscape at sunset" --style social

# Merch quality (1024x1024, upscaled to 4096x4096)
bun run generate "Bold satirical poster design" --style merch --project political-merch

# Quick draft (512x512, fast iteration)
bun run generate "Logo concept" --style base --quick

# With brand colors
bun run generate "Product showcase" --project golems-showcase --style social
```

## Step 4: Generate Programmatically

```typescript
import { generate } from "@golems/content/comfyui";
import { loadBrandConfig } from "@golems/content/brand";

const { config: brand } = await loadBrandConfig("projects/golems-showcase");

const result = await generate({
  prompt: "Minimalist tech logo, dark background, neon accents",
  style: "social",       // base | social | merch | meme
  quality: "social",     // social | print | draft
  brand,
  onProgress: ({ percent }) => console.log(`${(percent * 100).toFixed(0)}%`),
});

console.log(`Image: ${result.imagePath}`);
console.log(`Quality: ${result.scoreSummary}`);
console.log(`Passed gates: ${result.qualityPassed}`);
console.log(`Attempts: ${result.attempts}`);
```

## Step 5: Generate via Render Service HTTP API

```bash
curl -X POST http://127.0.0.1:3001/api/comfyui/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Soviet propaganda poster style, satirical, bold red tones",
    "style": "merch",
    "quality": "print",
    "maxRetries": 3
  }'
```

## Styles Reference

| Style | Size | Steps | CFG | Use Case |
|-------|------|-------|-----|----------|
| `base` | 768x768 | 25 | 1.0 | General purpose |
| `social` | 1080x1080 | 25 | 1.0 | Instagram/LinkedIn |
| `merch` | 1024x1024 | 30 | 1.5 | Print quality (upscaled 4x) |
| `meme` | 1280x720 | 20 | 1.0 | Landscape memes |
| Quick draft | 512x512 | 15 | 1.0 | Fast iteration |

## Quality Gates

Auto-retry up to 3x with new seeds. Best result returned even if gates fail.

| Gate | Social Threshold | Print Threshold |
|------|-----------------|-----------------|
| CLIP Score | >= 0.25 | >= 0.25 |
| LAION Aesthetic | >= 5.5 | >= 6.0 |
| BRISQUE | <= 40 | <= 40 |

## Prompt Engineering Tips

- Be specific and detailed — Flux responds well to detailed descriptions
- Include style keywords: "digital art", "photorealistic", "illustration", "propaganda poster"
- Color guidance: "bold red and black", "neon palette", "muted earth tones"
- Composition: "centered composition", "rule of thirds", "wide angle view"
- For merch: "clean lines, high contrast, suitable for print, transparent background intent"
- Brand prefix is auto-injected when brand config is provided

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `ComfyUI server not reachable` | Start with `launchctl load ~/Library/LaunchAgents/com.golems.comfyui.plist` |
| `BrokenPipeError on MPS` | Not enough RAM. Close apps or use `--quick` mode |
| `No images generated` | Check ComfyUI logs: `tail -100 /tmp/comfyui.log` |
| `Quality gates always fail` | Lower thresholds or use `quality: "draft"` for iteration |
