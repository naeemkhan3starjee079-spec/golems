---
name: dataviz
description: Create data visualization charts and infographics from golem data
---

# Data Visualization Pipeline

> Branded infographics from live golem data. SVG charts -> PNG via sharp. Fast, no GPU needed.

## Step 1: Generate via CLI

```bash
cd ~/Gits/golems/packages/content

# Generate specific data viz
bun run dataviz jobs --format linkedin
bun run dataviz finance --format instagram
bun run dataviz brain --format story

# Generate all types
bun run dataviz all

# SVG only (skip PNG conversion)
bun run dataviz jobs --svg-only
```

## Data Sources

| Fetcher | Supabase Tables | Key Metrics |
|---------|----------------|-------------|
| `jobs` | `golem_jobs`, `scrape_activity` | Top tags, status distribution, weekly trends |
| `finance` | `llm_usage`, `subscriptions` | LLM costs by model, daily costs, totals |
| `brain` | Zikaron SQLite | Chunk growth, project coverage, enrichment % |
| `activity` | `golem_events`, `service_runs` | Golem activity, event types, health |

## Chart Types

| Chart | Function | Good For |
|-------|----------|----------|
| Bar | `renderBarChart()` | Rankings, comparisons |
| Donut | `renderDonutChart()` | Proportions, distributions |
| Line | `renderLineChart()` | Time series, growth trends |
| Stat Card | `renderStatCards()` | Key metrics with deltas |

## Template Sizes

| Template | Dimensions | Use Case |
|----------|-----------|----------|
| `linkedin-card` | 1200x627 | LinkedIn posts/articles |
| `instagram-square` | 1080x1080 | Instagram feed |
| `story-format` | 1080x1920 | Instagram/LinkedIn Stories |

## Step 2: Programmatic API

```typescript
import {
  fetchJobMarketData,
  renderBarChart,
  renderLinkedInCard,
  renderSvgToPng
} from "@golems/content/dataviz";
import { loadBrandConfig } from "@golems/content/brand";
import { themeFromBrand } from "@golems/content/dataviz";

// Load brand
const { config } = await loadBrandConfig("projects/golems-showcase");
const theme = themeFromBrand(config);

// Fetch + render
const data = await fetchJobMarketData();
const chart = renderBarChart({
  data: data.topTags.map(t => ({ label: t.tag, value: t.count })),
  horizontal: true,
  theme,
});
const infographic = renderLinkedInCard({ title: "Job Market This Week", chartSvg: chart });
await renderSvgToPng({ svg: infographic, outputPath: "out/jobs.png" });
```

## Step 3: Animated Versions (Remotion)

For animated data viz, use the Remotion compositions:

```bash
bun run render WeeklyJobs --project golems-showcase
bun run render MonthlyFinance --project golems-showcase --platform linkedin
bun run render BrainGrowth --project golems-showcase
```

## Step 4: HTTP API

```bash
curl -X POST http://127.0.0.1:3001/api/dataviz/render \
  -H "Content-Type: application/json" \
  -d '{
    "type": "jobs",
    "format": "linkedin",
    "project": "golems-showcase"
  }'
```
