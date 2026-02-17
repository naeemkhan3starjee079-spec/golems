# Phase 5: Content Sync Setup

> [Back to main plan](../README.md)

## Goal

Make `golems/packages/dashboard/content/docs/` the single source of truth for docs content. Set up a sync mechanism so etanheyman.com reads from the same source instead of maintaining a stale copy.

## Tools

- **Research:** Gemini — compare git submodule vs npm package vs build-time copy
- **Code:** Opus (self) — cross-repo changes
- **Reference:** `docs-audit-results/9-etanheyman-stale.md`

## Approach Options

### Option A: Git Submodule
- `etanheyman.com` adds `golems` repo as submodule at `content/golems-source/`
- Build reads from submodule path instead of `content/golems/`
- **Pro:** Always in sync on build, standard git workflow
- **Con:** Submodule management overhead, CI needs recursive clone

### Option B: Build-Time Copy Script
- Script in etanheyman.com: `scripts/sync-docs.sh` that copies from `~/Gits/golems/packages/dashboard/content/docs/` → `content/golems/`
- Run before build or on CI via GitHub Action that clones golems
- **Pro:** Simple, no submodule complexity
- **Con:** Manual step, could drift

### Option C: npm Package (Published Content)
- Publish `@golems/docs` package containing just the markdown files
- etanheyman.com imports from node_modules
- **Pro:** Version-pinned, works in any CI
- **Con:** Overkill for markdown files, publish step overhead

**Recommended: Option A (git submodule)** — standard, no manual sync needed, Vercel handles recursive clones.

## Current State (from audit #9)

| Metric | Count |
|--------|-------|
| Files differing | 20 |
| Missing in etanheyman.com | 3 (content-pipelines.md, orchestrator.md, dashboard.md) |
| Orphaned in etanheyman.com | 3 (SECURITY-SWEEP.md, VERIFICATION-RESULTS*.md) |
| Identical | 4 |

## Steps

1. Research: verify Vercel handles git submodules (check Vercel docs)
2. Decision: confirm approach (submodule vs copy script)
3. In etanheyman.com repo:
   - Delete stale `content/golems/` directory
   - Delete orphaned files (SECURITY-SWEEP.md, VERIFICATION-RESULTS*.md)
   - Add golems repo as submodule: `git submodule add https://github.com/EtanHey/golems.git content/golems-source`
4. Update etanheyman.com build to read docs from `content/golems-source/packages/dashboard/content/docs/`
   - Update `page.tsx` content path
   - Update any hardcoded `content/golems/` references
5. Verify build works locally: `bun run build` in etanheyman.com
6. Verify all 24 docs pages render correctly
7. Verify the 3 previously missing files now appear
8. Push both repos, verify Vercel deployment

## Depends On

- Phase 1 (source docs must be accurate before syncing)

## Status

- [ ] Research Vercel submodule support
- [ ] Decide approach
- [ ] Remove stale content/golems/
- [ ] Add submodule (or sync script)
- [ ] Update build paths
- [ ] Verify local build
- [ ] Verify all pages render
- [ ] Deploy to Vercel
