# ContentGolem

> Content creation — visual content factory + text publishing. Brand-aware, multi-pipeline.

## Role

ContentGolem handles **all content creation and publishing**: visual content (animations, images, data viz), LinkedIn posts, Soltome publishing, ghostwriting, and content strategy. All visual output is brand-aware via per-project `brand.json` configs.

## Architecture

```text
packages/content/
├── src/
│   ├── brand/                   # Brand config schema + validation
│   │   ├── schema.ts            # BrandConfig interface + validator
│   │   └── index.ts             # Barrel export
│   ├── remotion/                # Shared animation components + types
│   │   ├── lib/                 # motion.ts, types.ts, design-tokens.ts, brand-bridge.ts, responsive.ts
│   │   └── components/          # AnimatedText, FadeIn, SlideIn, scenes/, audio/
│   ├── comfyui/                 # ComfyUI image generation client
│   │   ├── client.ts            # Connection, queueing, progress, output retrieval
│   │   ├── generate.ts          # Full generation pipeline (workflow + quality + retry)
│   │   ├── workflows/           # Flux GGUF workflow builders (base, social, merch, meme, draft)
│   │   └── index.ts             # Barrel export
│   ├── quality/                 # Image quality scoring pipeline
│   │   ├── scoring.ts           # CLIP Score, LAION Aesthetic, BRISQUE — Python bridge
│   │   └── index.ts             # Barrel export
│   ├── dataviz/                 # Data visualization pipeline
│   │   ├── fetchers/            # Supabase + Zikaron data fetchers (jobs, finance, brain, activity)
│   │   ├── charts/              # SVG chart generators (bar, donut, line, stat-card)
│   │   ├── templates/           # Infographic layouts (linkedin-card, instagram-square, story-format)
│   │   ├── renderer.ts          # SVG → PNG via sharp
│   │   └── index.ts             # Barrel export
│   └── render/                  # Programmatic render service
│       ├── render-service.ts    # renderVideo(), renderThumbnail(), job tracking
│       └── index.ts             # Barrel export
├── remotion/                    # Standalone Remotion project (compositions)
│   └── src/
│       ├── Root.tsx             # All registered compositions
│       └── compositions/        # DomicaHero, CodeShowcase, ArchDiagram, MetricsDashboard, ProductHero
├── projects/                    # Per-project brand configs (outputs gitignored)
│   ├── golems-showcase/         # brand.json + templates/ + outputs/
│   ├── techgym-posts/           # brand.json + templates/ + outputs/
│   └── political-merch/         # brand.json + templates/ + outputs/
├── scripts/
│   ├── validate-brand.ts        # CLI: bun run validate-brand [project]
│   ├── render.ts                # CLI: bun run render <compositionId> [--project <name>]
│   ├── generate.ts              # CLI: bun run generate <prompt> [--style social|merch|meme]
│   └── quality-score.py         # Python quality scoring (CLIP + Aesthetic + BRISQUE)
├── CLAUDE.md                    # This file
└── package.json                 # @golems/content
```

## Dependencies

- `@golems/shared` — Supabase factory, event log, LLM

## Brand System

**ALWAYS read the project's `brand.json` before generating any visual content.**

```typescript
import { loadBrandConfig } from "@golems/content/brand";

const { config, errors } = await loadBrandConfig("projects/golems-showcase");
if (errors.length > 0) throw new Error(`Invalid brand config: ${errors.map(e => e.message).join(", ")}`);

// Use config.colors, config.typography, config.tone, etc.
```

| Project | Use Case | Brand File |
|---------|----------|------------|
| `golems-showcase` | Product demos, architecture viz, feature showcases | `projects/golems-showcase/brand.json` |
| `techgym-posts` | Israeli tech community content (Hebrew-first) | `projects/techgym-posts/brand.json` |
| `political-merch` | Bold merch designs (t-shirts, stickers) | `projects/political-merch/brand.json` |

Validate all configs: `bun run validate-brand` (runs from packages/content/).

## Remotion Render Pipeline

### Compositions

| ID | What | Default Size |
|----|------|-------------|
| `DomicaHero` | Domica real estate hero with 3D magnifying glass | 1920x700 |
| `CodeShowcase` | Animated code walkthrough with syntax highlighting | 1920x1080 |
| `ArchDiagram` | Animated architecture diagram (boxes + arrows) | 1920x1080 |
| `MetricsDashboard` | Animated stats with count-up, trends, sparklines | 1920x1080 |
| `ProductHero` | Scene sequencer (title → screenshots → metrics) | 1920x1080 |
| `WeeklyJobs` | Animated bar chart of top job tags/skills | 1920x1080 |
| `MonthlyFinance` | Animated donut chart of LLM costs by model | 1920x1080 |
| `BrainGrowth` | Animated line chart of knowledge base growth | 1920x1080 |

All compositions (except DomicaHero) have `-LinkedIn` (1080x1080) variants.
MetricsDashboard also has a `-GIF` (800x450) variant.

### Render Commands

```bash
# List available compositions and projects
bun run render:list

# Render a composition (YouTube 1080p by default)
bun run render CodeShowcase --project golems-showcase

# Render for LinkedIn (1:1)
bun run render MetricsDashboard --project golems-showcase --platform linkedin

# Render a still/thumbnail
bun run render:still ArchDiagram --frame 90

# Open Remotion Studio for visual preview
bun run render:preview
bun run studio  # shortcut — opens Studio directly
```

### Programmatic Rendering

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

### Brand Bridge

Converts Phase 1 `BrandConfig` → Remotion's `BrandColors`:

```typescript
import { brandConfigToColors } from "@golems/content/remotion/lib/brand-bridge";
const colors = brandConfigToColors(config);
// → { primary, primaryDark, background, surface, text, textMuted, accent }
```

## Flux Image Generation (ComfyUI)

### Prerequisites

ComfyUI installed at `~/Gits/ComfyUI` with:
- Flux.1 Dev Q6_K GGUF (9.2 GB) in `models/diffusion_models/`
- T5-XXL Q4_K_M GGUF (2.7 GB) + CLIP-L (235 MB) in `models/text_encoders/`
- VAE ae.safetensors (321 MB) in `models/vae/`
- Custom nodes: ComfyUI-GGUF, ComfyUI-TeaCache, ComfyUI-Impact-Pack, ComfyUI_UltimateSDUpscale

### ComfyUI Service

```bash
# Start ComfyUI
launchctl load ~/Library/LaunchAgents/com.golems.comfyui.plist

# Stop ComfyUI
launchctl unload ~/Library/LaunchAgents/com.golems.comfyui.plist

# Check status
bun run generate:status
```

### Generation Commands

```bash
# Generate an image
bun run generate "A futuristic city at sunset" --style social

# Quick draft (512x512, fast)
bun run generate "Logo concept" --style merch --quick

# With brand config
bun run generate "Product showcase" --project golems-showcase --style social

# List available models
bun run generate:models
```

### Styles

| Style | Size | Steps | Use Case |
|-------|------|-------|----------|
| `base` | 768x768 | 25 | General purpose |
| `social` | 1080x1080 | 25 | Instagram/LinkedIn square |
| `merch` | 1024x1024 | 30 | Print-quality (upscaled 4x) |
| `meme` | 1280x720 | 20 | Landscape memes |
| Quick draft | 512x512 | 15 | Fast iteration (2-4 min) |

### Quality Pipeline

Generated images are scored against 3 gates:
- **CLIP Score** >= 0.25 (prompt adherence)
- **LAION Aesthetic** >= 5.5 social / >= 6.0 print (visual quality)
- **BRISQUE** <= 40 (perceptual quality)

Auto-retries with new seed up to 3x. Best result returned even if gates fail.

### Programmatic API

```typescript
import { generate } from "@golems/content/comfyui";

const result = await generate({
  prompt: "Minimalist logo, dark background",
  style: "social",
  quality: "social",
  brand: myBrandConfig,
  onProgress: ({ percent }) => console.log(`${(percent * 100).toFixed(0)}%`),
});

console.log(result.imagePath);
console.log(result.scoreSummary);
```

## Data Visualization Pipeline

### Data Sources

| Fetcher | Source | Key Metrics |
|---------|--------|-------------|
| `jobs` | `golem_jobs`, `scrape_activity` | Top tags, status distribution, weekly trends, scrape stats |
| `finance` | `llm_usage`, `subscriptions` | LLM costs by model, daily costs, subscription totals |
| `brain` | Zikaron SQLite DB | Chunk growth, project coverage, content types, enrichment % |
| `activity` | `golem_events`, `service_runs` | Golem activity, event types, service health |

### Static Infographics (SVG → PNG)

```bash
# Generate a specific data viz
bun run dataviz jobs --format linkedin
bun run dataviz finance --format instagram
bun run dataviz brain --format story

# Generate all types
bun run dataviz all

# SVG only (no PNG conversion)
bun run dataviz jobs --svg-only
```

### Infographic Templates

| Template | Size | Use Case |
|----------|------|----------|
| `linkedin-card` | 1200x627 | LinkedIn posts, articles |
| `instagram-square` | 1080x1080 | Instagram feed posts |
| `story-format` | 1080x1920 | Instagram/LinkedIn Stories |

### Chart Types

| Chart | Function | Use Case |
|-------|----------|----------|
| Bar | `renderBarChart()` | Rankings, comparisons (horizontal/vertical) |
| Donut | `renderDonutChart()` | Proportions, distributions |
| Line | `renderLineChart()` | Time series, growth trends |
| Stat Card | `renderStatCards()` | Key metrics with delta indicators |

### Animated Versions (Remotion)

```bash
# Render animated data viz video
bun run render WeeklyJobs --project golems-showcase
bun run render MonthlyFinance --project golems-showcase --platform linkedin
bun run render BrainGrowth --project golems-showcase
```

### Programmatic API

```typescript
import { fetchJobMarketData, renderBarChart, renderLinkedInCard, renderSvgToPng } from "@golems/content/dataviz";

const data = await fetchJobMarketData();
const chart = renderBarChart({
  data: data.topTags.map(t => ({ label: t.tag, value: t.count })),
  horizontal: true,
});
const infographic = renderLinkedInCard({ title: "Job Market", chartSvg: chart });
await renderSvgToPng({ svg: infographic, outputPath: "out/jobs.png" });
```

### Brand-Aware Theming

Charts automatically use brand colors when a BrandConfig is provided:

```typescript
import { themeFromBrand, renderBarChart } from "@golems/content/dataviz";
import { loadBrandConfig } from "@golems/content/brand";

const { config } = await loadBrandConfig("projects/golems-showcase");
const theme = themeFromBrand(config);
const chart = renderBarChart({ data: [...], theme });
```

## Current State

ContentGolem's logic currently lives in:
- **`golem-powers/content/`** skill — draft workflow (draft → critique → refine → publish)
- **`golem-powers/linkedin-post/`** skill — LinkedIn-specific drafting with 2026 algorithm rules
- **Soltome client** — `@golems/services/soltome-client.ts` (API client for soltome.com)
- **Post generator** — `@golems/services/post-generator.ts` (critique-waves pattern)
- **Soltome learner** — `@golems/services/soltome-learner.ts` (2am: scrape + learn patterns)

These will migrate into `src/` in a future phase.

## Content Pipeline

1. **Topic Discovery** — from code commits, research, conversations
2. **Drafting** — LLM generates draft matching owner's voice
3. **Critique Waves** — parallel agents critique → refine → polish
4. **Approval** — human approves via Telegram `/drafts` command
5. **Publishing** — post to Soltome (2 credits) or LinkedIn

## Writing Voice

See `~/.claude/learnings/hebrew-tech-ghostwriting.md` for Hebrew voice guidelines.
Key traits: casual, technical depth without jargon, collaborative researcher tone.

## Soltome Integration

| Endpoint | Cost | Description |
|----------|------|-------------|
| `POST /api/posts` | 2 credits | Create post |
| `POST /api/votes` | 1 credit | Vote on post |
| `POST /api/comments` | 1 credit | Comment on post |
| `GET /api/credits/balance` | FREE | Check balance |
