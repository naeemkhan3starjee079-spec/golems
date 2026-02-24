---
name: render
description: Render video/animation using Remotion compositions
---

# Render Video with Remotion

> Programmatic video from React compositions. Code demos, architecture diagrams, metric dashboards, product showcases.

## Step 1: List Available Compositions

```bash
cd ~/Gits/golems/packages/content
bun run render:list
```

## Available Compositions

| ID | What | Default Size | LinkedIn Variant |
|----|------|-------------|-----------------|
| `CodeShowcase` | Animated code walkthrough with syntax highlighting | 1920x1080 | 1080x1080 |
| `ArchDiagram` | Animated architecture diagram (boxes + arrows) | 1920x1080 | 1080x1080 |
| `MetricsDashboard` | Animated stats with count-up, trends, sparklines | 1920x1080 | 1080x1080 + GIF |
| `ProductHero` | Scene sequencer (title -> screenshots -> metrics) | 1920x1080 | 1080x1080 |
| `DomicaHero` | Domica real estate hero with 3D magnifying glass | 1920x700 | N/A |
| `WeeklyJobs` | Animated bar chart of top job tags | 1920x1080 | 1080x1080 |
| `MonthlyFinance` | Animated donut chart of LLM costs | 1920x1080 | 1080x1080 |
| `BrainGrowth` | Animated line chart of knowledge base growth | 1920x1080 | 1080x1080 |

## Step 2: Render via CLI

```bash
cd ~/Gits/golems/packages/content

# Render for YouTube (1920x1080)
bun run render CodeShowcase --project golems-showcase

# Render for LinkedIn (1080x1080)
bun run render MetricsDashboard --project golems-showcase --platform linkedin

# Render a still frame
bun run render:still ArchDiagram --frame 90

# Preview in Remotion Studio (visual editor)
bun run render:preview
# or
bun run studio
```

## Step 3: Render Programmatically

```typescript
import { renderVideo, buildBrandProps } from "@golems/content/render";

const brand = await buildBrandProps("projects/golems-showcase");
const job = await renderVideo({
  compositionId: "CodeShowcase",
  inputProps: { ...brand },
  outputPath: "out/code-showcase.mp4",
  onProgress: (p) => console.log(`${p}%`),
});
```

## Step 4: Render via HTTP API

```bash
# Render video
curl -X POST http://127.0.0.1:3001/api/remotion/render \
  -H "Content-Type: application/json" \
  -d '{
    "compositionId": "ArchDiagram",
    "project": "golems-showcase",
    "platform": "linkedin"
  }'

# Render still frame
curl -X POST http://127.0.0.1:3001/api/remotion/still \
  -H "Content-Type: application/json" \
  -d '{
    "compositionId": "MetricsDashboard",
    "frame": 90
  }'
```

## Creating New Compositions

CC can create new Remotion compositions:

1. Create a new file in `packages/content/remotion/src/compositions/`
2. Register it in `packages/content/remotion/src/Root.tsx`
3. Add it to the registry in `packages/content/src/pipeline/registry.ts`

Use existing compositions as patterns. The shared animation library is in `packages/content/src/remotion/lib/`:
- `motion.ts` — spring animations, easing
- `design-tokens.ts` — spacing, typography, colors
- `brand-bridge.ts` — BrandConfig -> Remotion theme
- `responsive.ts` — platform-aware sizing

## Brand Bridge

Converts brand.json -> Remotion theme colors:

```typescript
import { brandConfigToColors } from "@golems/content/remotion/lib/brand-bridge";
const colors = brandConfigToColors(config);
// -> { primary, primaryDark, background, surface, text, textMuted, accent }
```
