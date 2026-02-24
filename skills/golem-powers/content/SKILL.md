---
name: content
description: Use when generating images, videos, charts, or publishing text content. Routes to ComfyUI/Flux, Remotion, DataViz, or Playwright pipelines. Covers visual content, publishing, brand system. NOT for: code generation.
---

# ContentGolem — Visual Content Factory + Publishing

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

## Decision Tree

```
User says "make me X"
  ├─ Photo/illustration/merch → /content generate
  ├─ Video/animation → /content render
  ├─ Chart/infographic → /content dataviz
  ├─ Screenshot/OG image → /content screenshot
  ├─ Not sure → /content pipeline (AI routes it)
  └─ Text post → /content draft
```

## Brand System

**Always load brand config before generating visual content:**
```typescript
import { loadBrandConfig } from "@golems/content/brand";
const { config } = await loadBrandConfig("projects/golems-showcase");
```

Available projects: `golems-showcase`, `techgym-posts`, `political-merch`

## Output Location

All generated content: `~/golems-content/outputs/` (organized by pipeline)
