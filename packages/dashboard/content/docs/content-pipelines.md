---
sidebar_position: 6
---

# Content Pipelines

ContentGolem orchestrates 5 visual content pipelines and a text publishing pipeline. Each pipeline follows the same pattern: idea in, Claude Code picks the right tool, output rendered.

## Pipeline Overview

```mermaid
flowchart TD
    REQ["Content Request"]
    REQ --> ANALYZE["CC Opus analyzes intent"]
    ANALYZE --> ROUTER{"Pipeline Router"}

    ROUTER -->|"video concept"| REM["Remotion"]
    ROUTER -->|"image prompt"| FLUX["ComfyUI / Flux"]
    ROUTER -->|"data query"| DVZ["DataViz"]
    ROUTER -->|"card template"| SAT["Satori"]
    ROUTER -->|"page URL"| PW["Playwright"]
    ROUTER -->|"Figma file"| FIG["Figma to Video"]

    REM --> QA{"Quality Gate"}
    FLUX --> QA
    DVZ --> QA
    SAT --> QA
    PW --> QA
    FIG --> QA

    QA -->|"pass"| OUT["Published Output"]
    QA -->|"reject"| RETRY["Refine + Retry"]
    RETRY --> ROUTER
```

## Pipelines

### Remotion Video

Renders React compositions into MP4/GIF videos using Remotion on the local Mac.

```mermaid
flowchart TD
    IDEA["Video Concept"] --> OPUS["CC Opus"]
    OPUS -->|"selects composition + writes props"| REACT["React Renderer"]
    REACT -->|"renders frames"| REMOTION["Remotion Encoder"]
    REMOTION -->|"MP4 or GIF"| PREVIEW["Preview"]
    PREVIEW -->|"looks good"| DONE["Final Video"]
    PREVIEW -->|"needs tweaks"| OPUS
```

**Use cases:** Product demos, feature showcases, social video content.

### ComfyUI / Flux Image Gen

Generates images using Flux on Apple Silicon via ComfyUI with a vision-based quality gate.

```mermaid
flowchart TD
    IDEA["Image Concept"] --> OPUS["CC Opus"]
    OPUS -->|"crafts detailed prompt"| COMFY["ComfyUI Server"]
    COMFY -->|"Flux inference on M1"| RAW["Raw Image"]
    RAW --> VISION{"Vision Quality Gate"}
    VISION -->|"CLIP + LAION + BRISQUE pass"| BRAND["Brand Overlay"]
    VISION -->|"blurry or off-brand"| RETRY["New Seed"]
    RETRY -->|"retry up to 3x"| COMFY
    BRAND --> OUT["Final PNG"]
```

**Use cases:** Blog headers, social media images, product mockups.

### DataViz Charts

Creates data visualizations from Supabase queries or API data, rendered as SVG/PNG.

```mermaid
flowchart TD
    SRC["Data Source"] --> FETCH["Supabase Query or API"]
    FETCH -->|"raw data"| OPUS["CC Opus"]
    OPUS -->|"picks chart type + layout"| SVG["SVG Builder"]
    SVG -->|"vector markup"| SHARP["Sharp Rasterizer"]
    SHARP -->|"1200x627 or 1080x1080"| REVIEW{"Looks Right?"}
    REVIEW -->|"yes"| OUT["PNG or SVG"]
    REVIEW -->|"adjust colors or layout"| OPUS
```

**Use cases:** Token usage graphs, job match trends, ecosystem health dashboards.

### Satori Template Fill

Fills JSX templates with dynamic data and renders to social card PNGs via Satori.

```mermaid
flowchart TD
    DATA["Content + Template"] --> OPUS["CC Opus"]
    OPUS -->|"fills template variables"| SATORI["Satori Engine"]
    SATORI -->|"JSX to SVG"| PNG["PNG Export"]
    PNG --> OUT["Social Card"]
```

**Use cases:** LinkedIn post cards, OG images, quote cards.

### Figma to Video

Design-validated video pipeline. CC extracts the target design from Figma, builds a Remotion composition, then iterates until the rendered output matches the Figma design 1:1.

```mermaid
flowchart TD
    FIGMA["Figma Design File"] --> EXTRACT["CC Opus extracts layout"]
    EXTRACT -->|"colors, typography, spacing"| BUILD["Build React Composition"]
    BUILD -->|"render frame"| COMPARE{"Figma Comparison Gate"}
    COMPARE -->|"pixel match"| ENCODE["Remotion Encoder"]
    COMPARE -->|"mismatch detected"| ADJUST["Adjust Props + CSS"]
    ADJUST -->|"iteration N+1"| BUILD
    ENCODE -->|"MP4 or GIF"| OUT["Design-Faithful Video"]
```

**Example:** DomicaHero composition — went through 21 iterations to achieve 1:1 fidelity.

### Playwright Screenshots

Captures web page screenshots using Playwright browser automation.

```mermaid
flowchart TD
    URL["Target Page URL"] --> OPUS["CC Opus"]
    OPUS -->|"plans viewport + selectors"| BROWSER["Playwright Browser"]
    BROWSER -->|"waits for load + animations"| CAPTURE["Screenshot Capture"]
    CAPTURE -->|"full page or element"| CROP["Crop + Optimize"]
    CROP --> OUT["Final PNG"]
```

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
