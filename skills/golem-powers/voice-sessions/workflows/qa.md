---
name: qa
description: Voice-powered QA testing — uses qa-voice schemas (qa-categories.ts, checklist.ts)
---

# QA Workflow

> Stub — delegates to qa-voice package's built-in QA session flow.

## How to Use

This workflow uses the qa-voice MCP's existing QA infrastructure:
- `packages/qa-voice/src/schemas/qa-categories.ts` — 40+ checks across 6 categories
- `packages/qa-voice/src/schemas/checklist.ts` — checklist tracking
- `packages/qa-voice/src/report.ts` — report generation

See `packages/qa-voice/CLAUDE.md` for full QA session documentation.

## Quick Start

1. Navigate to the site in Playwright
2. Use qa_voice_ask for each check category
3. Generate report with qa-voice report tools
