# Phase 6: Docs Integration

> [Back to main plan](../README.md)

## Goal
Move the 30 golems documentation pages from `etanheyman.com/golems/docs/` into the dashboard as a `/docs` section.

## Tools
- **Research:** gemini — Next.js 16 MDX/markdown rendering patterns
- **Code:** cursor/opus — markdown renderer + page shell
- **Design:** `/frontend-design` skill — for docs layout, sidebar, code blocks, search
- **MCPs:** none

## Steps

1. **Copy doc content** — Move `~/Gits/etanheyman.com/content/golems/*.md` into `packages/dashboard/content/docs/`.
2. **Add markdown renderer** — Install `next-mdx-remote` or similar. Create `[...slug]` catch-all route under `/docs`.
3. **Create docs sidebar** — Auto-generate from file structure. Support `_category_.json` for grouping. **USE `/frontend-design` SKILL.**
4. **Style docs pages** — Match dashboard dark theme. Code blocks with syntax highlighting. **USE `/frontend-design` SKILL.**
5. **Add search integration** — Connect docs to the existing Cmd+K search overlay. **USE `/frontend-design` SKILL.**
6. **Add docs link to sidebar nav** — New "Docs" section in main sidebar.

## Depends On
- Phase 4 (deletes the old docs route from portfolio)

## Status
- [x] Copy doc content
- [x] Markdown renderer
- [x] Docs sidebar
- [x] Styling
- [ ] Search integration
- [x] Sidebar nav link
