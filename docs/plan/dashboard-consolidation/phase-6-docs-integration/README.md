# Phase 6: Docs Integration

> [Back to main plan](../README.md)

## Goal
Move the 30 golems documentation pages from `etanheyman.com/golems/docs/` into the dashboard as a `/docs` section.

## Tools
- **Research:** gemini — Next.js 16 MDX/markdown rendering patterns
- **Code:** cursor/opus — markdown renderer + page shell
- **MCPs:** none

## Steps

1. **Copy doc content** — Move `~/Gits/etanheyman.com/content/golems/*.md` into `packages/dashboard/content/docs/`.
2. **Add markdown renderer** — Install `next-mdx-remote` or similar. Create `[...slug]` catch-all route under `/docs`.
3. **Create docs sidebar** — Auto-generate from file structure. Support `_category_.json` for grouping.
4. **Style docs pages** — Match dashboard dark theme. Code blocks with syntax highlighting.
5. **Add search integration** — Connect docs to the existing Cmd+K search overlay.
6. **Add docs link to sidebar nav** — New "Docs" section in main sidebar.

## Depends On
- Phase 4 (deletes the old docs route from portfolio)

## Status
- [ ] Copy doc content
- [ ] Markdown renderer
- [ ] Docs sidebar
- [ ] Styling
- [ ] Search integration
- [ ] Sidebar nav link
