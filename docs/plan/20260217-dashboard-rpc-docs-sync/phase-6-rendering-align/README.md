# Phase 6: Rendering Alignment

> [Back to main plan](../README.md)

## Goal

Align Table of Contents, sidebar navigation, slug generation, and prev/next links between golems dashboard and etanheyman.com so both repos render shared content identically.

## Tools

- **Research:** Gemini — github-slugger compatibility
- **Code:** Opus (self) — React component edits in etanheyman.com repo
- **Reference:** `docs-audit-results/10-table-of-contents.md`, `11-sidebar-nav.md`

## Changes in etanheyman.com

### 1. Sidebar: Replace Hardcoded Config

| Current | Target |
|---------|--------|
| `sidebarConfig` array in `Sidebar.tsx` | Auto-generated from `sidebar_position` frontmatter + `_category_.json` |
| `docsSections` array in `Header.tsx` | Same auto-generated nav data |
| `DOC_ORDER` array in `page.tsx` | `flattenNav(getDocsNav())` for prev/next |

**How:** Port `getDocsNav()`, `flattenNav()`, `readCategory()` from `packages/dashboard/src/lib/docs/index.ts` into etanheyman.com. Adjust `DOCS_DIR` to point at submodule path.

### 2. TOC: Align Heading Depth

| Current | Target |
|---------|--------|
| etanheyman.com: h2 + h3 + h4 | h2 + h3 only (match dashboard) |

**Why:** Dashboard only indexes h2+h3. Including h4 in etanheyman.com TOC creates different UX for same content. Align down to h2+h3.

**How:** Change `querySelectorAll('h2, h3, h4')` → `querySelectorAll('h2, h3')` in `TableOfContents.tsx`.

### 3. Slug Algorithm: Align to github-slugger

| Current | Target |
|---------|--------|
| Dashboard: custom `slugify()` | github-slugger (or compatible) |
| etanheyman.com: rehype-slug (github-slugger) | Keep as-is |

**How:** Replace dashboard's custom `slugify()` in `lib/docs/index.ts` with `github-slugger` package. This ensures `#heading-id` anchors match across both sites.

### 4. H1 Handling

| Current | Target |
|---------|--------|
| Dashboard: strips first H1 from content | Both strip first H1 |
| etanheyman.com: does NOT strip H1 | Strip in MDX preprocessing |

**How:** Add H1 stripping in etanheyman.com's `page.tsx` before passing to MDXRemote. Use `content.replace(/^#\s+.+\n/, '')` or equivalent.

### 5. URL Prefix Mapping

Dashboard uses `/docs/slug`. etanheyman.com uses `/golems/docs/slug`. Ensure the ported `getDocsNav()` generates correct `href` values with the `/golems/docs/` prefix.

## Steps

1. Port `getDocsNav()` and helpers from dashboard to etanheyman.com
2. Replace `sidebarConfig` in Sidebar.tsx with auto-generated nav
3. Replace `docsSections` in Header.tsx with same nav data
4. Replace `DOC_ORDER` in page.tsx with `flattenNav()` for prev/next
5. Change TOC heading depth from h2+h3+h4 to h2+h3
6. Install `github-slugger` in dashboard, replace custom `slugify()`
7. Add H1 stripping in etanheyman.com page.tsx
8. Test: all docs pages render with correct sidebar, TOC, prev/next
9. Test: anchor links (`#heading`) work identically on both sites
10. Verify mobile nav (hamburger dropdown) still works

## Depends On

- Phase 5 (content sync must be set up — submodule paths needed for `getDocsNav()`)

## Status

- [ ] Port getDocsNav() to etanheyman.com
- [ ] Replace sidebarConfig with auto-generated nav
- [ ] Replace docsSections in Header.tsx
- [ ] Replace DOC_ORDER with flattenNav()
- [ ] Align TOC to h2+h3 only
- [ ] Align slug algorithm (github-slugger)
- [ ] Add H1 stripping
- [ ] Test all pages
- [ ] Test anchor links
- [ ] Test mobile nav
