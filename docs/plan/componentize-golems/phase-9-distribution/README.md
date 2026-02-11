# Phase 9: Distribution + Documentation

> [Back to main plan](../README.md)

## Goal
Package golems for distribution (npm, CC marketplace), update docsite, write READMEs for each package.

## Tools
- **Research:** gemini — npm publishing, CC marketplace format, GitHub packages
- **Code:** Opus — README writing, docsite updates
- **Verify:** `npm pack` dry run, docsite build, marketplace validation

## Steps

1. **[Cursor work]** Prepare each golem for npm publishing
   - `package.json` metadata: description, keywords, repository, license
   - `files` field: only include src/, commands/, skills/, .claude-plugin/
   - `main` / `exports` for TypeScript consumers
2. **[Gemini research]** CC marketplace format — what's needed for distribution in 2026
3. **[Cursor work]** Bundle @golems/shared into each plugin for CC distribution
   - CC plugins are copied to cache dir — can't rely on workspace resolution
   - Build step that inlines shared deps
4. **[Opus]** Create CC marketplace entry
   - `marketplace.json` with plugin entries
   - Host on GitHub (EtanHey/golems-marketplace)
   - Users: `/plugin marketplace add EtanHey/golems-marketplace`
5. **[Opus]** Write README per package
   - What it does, how to install, how to use
   - For friends: 3-step quickstart
6. **[Cursor work]** Update docsite (etanheyman.com/golems/)
   - Architecture page with new structure
   - Per-golem pages
   - Installation guide
   - "Give to friends" guide
7. **[Opus]** Write migration guide
   - For anyone using the old packages/autonomous structure
8. **[Opus]** Update root CLAUDE.md with new package map
9. **[Opus]** Update memory files with new architecture
10. **[bun test + manual]** Final verification + documentation PR

## Depends On
- Phase 8 (everything must work before documenting/distributing)

## Status
- [ ] npm package metadata
- [ ] Bundle shared for CC plugins
- [ ] CC marketplace entry
- [ ] README per package
- [ ] Update docsite
- [ ] Migration guide
- [ ] Update CLAUDE.md files
- [ ] Update memory files
- [ ] Final documentation PR
