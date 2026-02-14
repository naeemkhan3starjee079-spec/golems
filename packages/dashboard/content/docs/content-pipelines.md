---
sidebar_position: 6
---

# Content Pipelines

ContentGolem orchestrates 5 visual content pipelines and a text publishing pipeline. Each pipeline follows the same pattern: idea in, Claude Code picks the right tool, output rendered.

## Pipeline Overview

```mermaid
flowchart LR
    I["Content Request"] --> R{"Router<br/><small>CC Opus</small>"}
    R --> P1["Remotion<br/><small>Video/GIF</small>"]
    R --> P2["ComfyUI/Flux<br/><small>AI Images</small>"]
    R --> P3["DataViz<br/><small>Charts</small>"]
    R --> P4["Satori<br/><small>Social Cards</small>"]
    R --> P5["Playwright<br/><small>Screenshots</small>"]
    P1 & P2 & P3 & P4 & P5 --> O["Output<br/><small>PNG/MP4/GIF/SVG</small>"]
```

## Pipelines

### Remotion Video

Renders React compositions into MP4/GIF videos using Remotion on the local Mac.

| Step | Component | What |
|------|-----------|------|
| 1 | Idea | Video concept description |
| 2 | CC (Opus) | Picks React composition, writes props |
| 3 | React | Renders animation frames |
| 4 | Remotion | Encodes MP4 or GIF |
| 5 | Output | Final video file |

**Use cases:** Product demos, feature showcases, social video content.

### ComfyUI / Flux Image Gen

Generates images using Flux on Apple Silicon via ComfyUI with a vision-based quality gate.

| Step | Component | What |
|------|-----------|------|
| 1 | Idea | Image concept description |
| 2 | CC (Opus) | Crafts Flux prompt |
| 3 | ComfyUI | Flux inference on Apple Silicon |
| 4 | Vision Gate | Quality review (auto-reject blurry/off-brand) |
| 5 | Output | PNG with brand overlay |

**Use cases:** Blog headers, social media images, product mockups.

### DataViz Charts

Creates data visualizations from Supabase queries or API data, rendered as SVG/PNG.

| Step | Component | What |
|------|-----------|------|
| 1 | Data | Supabase query or API fetch |
| 2 | CC (Opus) | Designs chart type and layout |
| 3 | SVG Builder | Generates vector markup |
| 4 | Sharp | Rasterizes to PNG |
| 5 | Output | PNG or SVG chart |

**Use cases:** Token usage graphs, job match trends, ecosystem health dashboards.

### Satori Template Fill

Fills JSX templates with dynamic data and renders to social card PNGs via Satori.

| Step | Component | What |
|------|-----------|------|
| 1 | Data | Content text + template selection |
| 2 | CC (Opus) | Fills template variables |
| 3 | Satori | JSX to SVG conversion |
| 4 | Output | Social card PNG |

**Use cases:** LinkedIn post cards, OG images, quote cards.

### Playwright Screenshots

Captures web page screenshots using Playwright browser automation.

| Step | Component | What |
|------|-----------|------|
| 1 | URL | Target page URL |
| 2 | CC (Opus) | Plans viewport, selectors, timing |
| 3 | Playwright | Browser renders and captures |
| 4 | Output | PNG screenshot |

**Use cases:** Portfolio screenshots, competitor analysis, visual regression.

## Routing

When a content request arrives, Claude Code (Opus) analyzes the request and routes to the appropriate pipeline. The routing decision considers:

- **Content type:** video vs image vs chart vs screenshot
- **Input data:** URL (Playwright), data (DataViz), concept (Remotion/Flux)
- **Output format:** MP4/GIF (Remotion), PNG (all others), SVG (DataViz)

## Pipeline Runs

Every pipeline execution is logged to the `pipeline_runs` Supabase table:

```sql
-- pipeline_runs table
pipeline    TEXT    -- remotion, comfyui, dataviz, satori, playwright
status      TEXT    -- pending, running, success, failed
input       JSONB   -- request parameters
output      JSONB   -- result metadata (file path, dimensions, duration)
duration_ms INTEGER -- execution time
error       TEXT    -- error message if failed
created_at  TIMESTAMP
```

View pipeline history and stats on the dashboard at `/content`.

## Text Publishing

Beyond visual content, ContentGolem handles text publishing:

- **LinkedIn posts** via the `/linkedin-post` skill (2026 algorithm optimization)
- **Soltome posts** via the Soltome API client (AI social network)
- **Ghostwriting** in the owner's Hebrew-English voice

Text content goes through a critique-waves quality process: parallel agents review, refine, and reach consensus before publishing.

## CC Skills

Content pipelines are invoked via Claude Code skills:

| Skill | Pipeline |
|-------|----------|
| `golem-powers/content/workflows/draft` | Text drafting + critique |
| `golem-powers/linkedin-post/workflows/draft` | LinkedIn-specific drafting |
| `golem-powers/linkedin-post/workflows/review` | Draft quality review |

## Dependencies

- **Remotion** — React video rendering (`@remotion/cli`, `@remotion/bundler`)
- **ComfyUI** — Flux image generation (local, Apple Silicon)
- **Sharp** — Image processing and rasterization
- **Satori** — JSX to SVG/PNG conversion
- **Playwright** — Browser automation for screenshots
- **Render Service** — Local Bun microservice for Remotion rendering (`launchd` managed)
