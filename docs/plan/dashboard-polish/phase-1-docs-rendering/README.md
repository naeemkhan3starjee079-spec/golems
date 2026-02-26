# Phase 1: Docs & Mermaid Rendering

> [Back to main plan](../README.md)

## Goal

Fix double H1 headers in docs pages and make mermaid flowcharts render properly with dark theme styling.

## Tools

- **Research:** gemini — debug mermaid CDN rendering issues
- **Code:** opus — edit docs-client.tsx and docs/index.ts

## Context

### Double H1 (already fixed, uncommitted)
- `packages/dashboard/src/lib/docs/index.ts` line 74
- Bug: regex `^#\s+.+\n?` lacks `/m` flag — after frontmatter, content starts with `\n#`
- Fix: add `/m` → `content.replace(/^#\s+.+\n?/m, "")`
- **Already fixed on `fix/dashboard-round2` branch, just needs commit**

### Mermaid Flowcharts
- Pipeline: `marked.parse()` → regex replaces mermaid code blocks → `<div class="mermaid-block" data-mermaid="encoded">` → CDN load → `window.mermaid.render()`
- CDN: `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js`
- Theme: dark mode with `primaryColor: "#a78bfa"`, `primaryTextColor: "#e4e4e7"`
- User says "still shitty" — likely sizing, font, or contrast issues, not complete render failure

## Steps

1. Commit the H1 regex fix
2. Grep `content/docs/` for mermaid blocks — know which pages need testing
3. Debug mermaid live: load a mermaid-containing docs page, check:
   - Is CDN script loading? (network tab)
   - Does `.mermaid-rendered` class get added?
   - Any `.mermaid-error` blocks?
   - SVG sizing and readability
4. Fix issues found — likely candidates:
   - Flowchart SVGs too small/wide: add `min-h-[200px]`, better width constraints
   - Text unreadable: adjust `primaryTextColor`, `secondaryTextColor`, `nodeBorder`, `edgeLabelBackground`
   - Arrow lines invisible: fix `lineColor` in themeVariables
   - Font too small: set `fontSize` in mermaid config
5. Build passes, test all mermaid pages locally

## Depends On

- None

## Status

- [x] Fix double H1 regex (add /m flag)
- [ ] Audit mermaid blocks in docs
- [ ] Debug mermaid rendering
- [ ] Fix mermaid styling
- [ ] Build + local test
