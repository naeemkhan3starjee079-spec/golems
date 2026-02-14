---
name: content
description: Content creation and publishing for ClaudeGolem across platforms (Soltome, blog, social)
---

# ContentGolem — Visual Content Factory + Publishing

> Create visual content (images, videos, charts, screenshots) and publish text content. CC is the brain — pipelines are your tools.

## Prerequisites

```bash
# Check ComfyUI (image generation)
curl -s http://127.0.0.1:8188/system_stats | jq '.system.comfyui_version' 2>/dev/null || echo "ComfyUI not running"

# Check render service (video/dataviz HTTP API)
curl -s http://127.0.0.1:3001/api/health 2>/dev/null || echo "Render service not running"

# Start ComfyUI if needed
launchctl load ~/Library/LaunchAgents/com.golems.comfyui.plist

# Start render service if needed
launchctl load ~/Library/LaunchAgents/com.golems.render-service.plist
```

## Quick Actions

| What you want to do | Workflow |
|---------------------|----------|
| Generate an image with Flux AI | [workflows/generate.md](workflows/generate.md) |
| Render video/animation with Remotion | [workflows/render.md](workflows/render.md) |
| Create data visualization charts | [workflows/dataviz.md](workflows/dataviz.md) |
| Take screenshots / scrape visuals | [workflows/screenshot.md](workflows/screenshot.md) |
| AI-route an idea to the best pipeline | [workflows/pipeline.md](workflows/pipeline.md) |
| Draft text content for publishing | [workflows/draft.md](workflows/draft.md) |
| Manage local services (on/off) | [workflows/services.md](workflows/services.md) |

## Pipeline Overview

| Pipeline | Tool | Port | Best For | RAM Needed |
|----------|------|------|----------|------------|
| **ComfyUI/Flux** | Flux.1 Dev Q6_K GGUF | 8188 | Images, merch, social | ~12GB |
| **Remotion** | React compositions | N/A (local render) | Videos, animations | ~2GB |
| **DataViz** | SVG + sharp | N/A (imports) | Charts, infographics | <1GB |
| **Playwright** | Browser automation | N/A (MCP) | Screenshots, OG images | ~500MB |
| **Satori** | Template engine | N/A (imports) | Branded cards, quotes | <500MB |

## Decision Tree

```
User says "make me X"
  ├─ Photo/illustration/merch → /content generate
  ├─ Video/animation → /content render
  ├─ Chart/infographic → /content dataviz
  ├─ Screenshot/OG image → /content screenshot
  ├─ Branded card/template → /content dataviz (template mode)
  ├─ Not sure → /content pipeline (AI routes it)
  └─ Text post → /content draft
```

## Resource Management

Before using memory-intensive pipelines (ComfyUI/Flux), check available RAM:

```bash
# Check free RAM
python3 -c "import os; s=os.statvfs('/'); print(f'{os.sysconf(\"SC_PAGE_SIZE\") * os.sysconf(\"SC_AVPHYS_PAGES\") / 1024**3:.1f}GB free RAM')" 2>/dev/null || sysctl -n hw.memsize | awk '{print $1/1024/1024/1024 "GB total"}'
```

If <10GB free, use `golems services stop comfyui` before heavy Flux work, or close other apps first.

## Brand System

**ALWAYS load brand config before generating visual content:**

```typescript
import { loadBrandConfig } from "@golems/content/brand";
const { config, errors } = await loadBrandConfig("projects/golems-showcase");
```

Available projects: `golems-showcase`, `techgym-posts`, `political-merch`

## Output Location

All generated content goes to: `~/golems-content/outputs/`
Organized by pipeline: `flux/`, `remotion/`, `dataviz/`, `screenshots/`
