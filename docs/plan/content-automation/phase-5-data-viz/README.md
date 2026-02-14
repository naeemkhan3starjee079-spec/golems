# Phase 5: Data Visualization Pipeline

> [Back to main plan](../README.md)

## Goal

Turn golem data (job stats, finance summaries, brain graph snapshots) into branded visual content — charts, infographics, animated data stories.

## Tools

- **Research:** gemini — "D3.js to Remotion pipeline, programmatic infographic generation 2026"
- **Code:** cursor — D3/Recharts components, data fetchers, Remotion compositions
- **MCPs:** supabase (pull job stats, finance data), zikaron (brain graph data)

## Steps

1. Build data fetchers: pull stats from each golem's data source
   - JobGolem: match counts, skill demand trends, salary ranges
   - TellerGolem: expense categories, monthly totals, tax deductions
   - Zikaron: session counts, chunk growth, project coverage
2. Create D3/Recharts → SVG pipeline (server-side rendering)
3. Create Remotion compositions for animated data stories:
   - "Weekly job market" — animated bar chart of top skills
   - "Monthly finance" — animated pie chart of spending categories
   - "Brain growth" — animated line chart of knowledge base growth
4. Create static infographic templates (Sharp/Canvas):
   - LinkedIn-sized data card (1200x627)
   - Instagram square (1080x1080)
   - Story format (1080x1920)
5. n8n scheduled workflows: "every Monday → pull job stats → render infographic → Telegram"
6. Brand-aware: all charts use project colors, fonts, logo from brand.json

## Depends On

- Phase 1 (brand.json for chart styling)
- Phase 2 (Remotion for animated versions)
- Phase 4 (n8n for scheduled workflows)

## Status

- [x] Data fetchers for each golem (jobs, finance, brain, activity)
- [x] SVG chart generators (bar, donut, line, stat-card) — pure TypeScript, no React needed
- [x] Animated Remotion compositions (WeeklyJobs, MonthlyFinance, BrainGrowth)
- [x] Static infographic templates (LinkedIn 1200x627, Instagram 1080x1080, Story 1080x1920)
- [x] SVG → PNG renderer via sharp
- [x] n8n scheduled workflow (data-viz-schedule.json — every Monday 9am)
- [x] Brand-aware chart styling (themeFromBrand + BrandConfig.templates.dataViz)
- [x] CLI: `bun run dataviz <type> [--format linkedin|instagram|story]`
- [x] Render service route: POST /api/dataviz/render
- [x] CLAUDE.md updated with full dataviz documentation
