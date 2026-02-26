# Phase 1 Findings

## Decisions

- [12:55] H1 regex fix confirmed: `/m` flag is the correct fix. Already applied on `fix/dashboard-round2` branch.
- [12:55] Mermaid CDN approach: keep CDN (no bundling), fix styling only

## Research

- [12:55] Explore agent confirmed: mermaid rendering pipeline works correctly — regex matches, encoding round-trips, HTML output has `.mermaid-block` elements
- [12:55] CSS classes present: `.mermaid-block` has `my-8 rounded-lg border border-border/40 p-6 overflow-x-auto bg-zinc-900/50`
- [12:55] Mermaid theme: dark mode, `primaryColor: "#a78bfa"`, `primaryTextColor: "#e4e4e7"`, transparent background
- [12:55] Likely issue: SVG sizing/fonts, not rendering failure. User said "still shitty" not "doesn't render"

## Task Board

| Task | Owner | Status |
|------|-------|--------|
| H1 regex fix | opus | done (uncommitted) |
| Audit mermaid blocks | opus | pending |
| Debug mermaid live | opus | pending |
| Fix mermaid styling | opus | pending |

## Notes

- The H1 fix is a one-liner: add `/m` flag to regex in `docs/index.ts:74`
- Mermaid pages to test: `getting-started.md` (architecture flowchart), `architecture.md` (detailed system diagram)
