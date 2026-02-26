---
title: "ContentGolem — Visual Content Factory"
description: "Remotion animations, ComfyUI image generation, data visualizations, pipeline intelligence, and text publishing."
---

# ContentGolem

> Visual content factory + text publishing. Remotion animations, ComfyUI image generation, data visualizations, brand-aware pipelines, and AI-powered content routing.

## What It Does

ContentGolem handles **all content creation and publishing**: visual content (animations, images, data viz), LinkedIn posts, Soltome publishing, ghostwriting, and content strategy. All visual output is brand-aware via per-project `brand.json` configs.

## Architecture

ContentGolem has two distinct halves:

### Visual Content Factory (in `packages/content/src/`)

Fully implemented pipelines:

| Pipeline | What | Tech |
|----------|------|------|
| **Remotion** | Animated videos + thumbnails | react-three-fiber, Remotion |
| **ComfyUI** | AI image generation | Flux.1 Dev GGUF, quality scoring |
| **DataViz** | SVG charts + infographics | SVG generators, sharp PNG rendering |
| **Pipeline Router** | AI routing: idea to best pipeline | LLM-powered selection + execution |

### Text Publishing (in skills + services)

- **`golem-powers/content/`** skill — draft workflow (draft > critique > refine > publish)
- **`golem-powers/linkedin-post/`** skill — LinkedIn-specific drafting with 2026 algorithm rules
- **Soltome client** — API client in `@golems/services`
- **Soltome learner** — 2am scheduled task: scrapes trending posts and learns patterns

## Brand System

Every visual output uses a project-specific `brand.json`:

| Project | Use Case |
|---------|----------|
| `golems-showcase` | Product demos, architecture viz, feature showcases |
| `techgym-posts` | Israeli tech community content (Hebrew-first) |
| `political-merch` | Bold merch designs (t-shirts, stickers) |

## Remotion Compositions

| ID | What | Default Size |
|----|------|-------------|
| `DomicaHero` | Real estate hero with 3D magnifying glass | 1920x700 |
| `CodeShowcase` | Animated code walkthrough with syntax highlighting | 1920x1080 |
| `ArchDiagram` | Animated architecture diagram (boxes + arrows) | 1920x1080 |
| `MetricsDashboard` | Animated stats with count-up, trends, sparklines | 1920x1080 |
| `ProductHero` | Scene sequencer (title > screenshots > metrics) | 1920x1080 |
| `WeeklyJobs` | Animated bar chart of top job tags/skills | 1920x1080 |
| `MonthlyFinance` | Animated donut chart of LLM costs by model | 1920x1080 |
| `BrainGrowth` | Animated line chart of knowledge base growth | 1920x1080 |

All compositions (except DomicaHero) have `-LinkedIn` (1080x1080) variants.

## ComfyUI Image Generation

Flux.1 Dev GGUF model with quality scoring pipeline:

| Style | Size | Steps | Use Case |
|-------|------|-------|----------|
| `base` | 768x768 | 25 | General purpose |
| `social` | 1080x1080 | 25 | Instagram/LinkedIn square |
| `merch` | 1024x1024 | 30 | Print-quality (upscaled 4x) |
| `meme` | 1280x720 | 20 | Landscape memes |

Quality gates: CLIP Score >= 0.25, LAION Aesthetic >= 5.5, BRISQUE <= 40. Auto-retries with new seed up to 3x.

## Data Visualization

SVG-to-PNG infographics from live Supabase/Zikaron data:

| Fetcher | Source | Key Metrics |
|---------|--------|-------------|
| `jobs` | `golem_jobs`, `scrape_activity` | Top tags, weekly trends, scrape stats |
| `finance` | `llm_usage`, `subscriptions` | LLM costs by model, daily costs |
| `brain` | Zikaron SQLite | Chunk growth, project coverage, enrichment % |
| `activity` | `golem_events`, `service_runs` | Golem activity, service health |

Templates: `linkedin-card` (1200x627), `instagram-square` (1080x1080), `story-format` (1080x1920).

## Pipeline Intelligence

AI-powered routing: describe an idea, get the best pipeline(s) to produce it.

```bash
bun run pipeline route "Weekly job market bar chart"
bun run pipeline route "Animated code demo" --execute
```

| Pipeline ID | Inputs | Outputs | Best For |
|-------------|--------|---------|----------|
| `remotion` | text, code, data | mp4, gif, png | Animations, code demos, data stories |
| `comfyui` | prompt, image | png, jpg, webp | Social visuals, merch, memes |
| `dataviz` | data_source | png, svg | Charts, infographics, reports |

## Content Pipeline (Text)

1. **Topic Discovery** — from code commits, research, conversations
2. **Drafting** — LLM generates draft matching owner's voice
3. **Critique Waves** — parallel agents critique, refine, polish
4. **Approval** — human approves via Telegram
5. **Publishing** — post to Soltome or LinkedIn

## Soltome Integration

| Endpoint | Cost | Description |
|----------|------|-------------|
| `POST /api/posts` | 2 credits | Create post |
| `POST /api/votes` | 1 credit | Vote on post |
| `POST /api/comments` | 1 credit | Comment on post |
| `GET /api/credits/balance` | FREE | Check balance |

## Dependencies

- `@golems/shared` — Supabase factory, event log, LLM
- `remotion` + `@remotion/cli` — Video rendering
- `sharp` — SVG to PNG conversion
- `@ai-sdk/google` — Pipeline routing LLM

## Source

[`packages/content/`](https://github.com/EtanHey/golems/tree/master/packages/content)
