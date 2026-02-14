# Phase 12: Docs Final Verification

> [Back to main plan](../README.md)

## Goal
Multi-agent verification sweep across all documentation to catch inaccuracies, broken links, and gaps.

## Tools
- **Research:** gemini + cursor — parallel verification sweep
- **Code:** cursor — fix any issues found
- **MCPs:** zikaron (cross-reference with codebase)

## Steps

1. **Cross-reference docs against CLAUDE.md files** — Every package CLAUDE.md should be consistent with its docs page. Flag any discrepancies.
2. **Verify all code examples** — Run/check every code snippet in docs. Remove examples that reference deleted files or APIs.
3. **Check all internal links** — Verify every markdown link between docs pages resolves. Fix broken links.
4. **Verify CLI commands** — Every `golems X`, `bun run X`, `zikaron X` command in docs should work. Update any that have changed.
5. **Verify env var documentation** — Cross-reference documented env vars against `.env.example` files, Railway vars, Vercel vars.
6. **Add missing sections** — Any new features from Phases 1-8 that aren't mentioned in docs.
7. **Final build test** — Dashboard builds, docs render correctly, all pages accessible.
8. **Commit + PR** — Single PR for entire docs verification pass.

## Depends On
- Phase 11 (all docs should be updated before verification)

## Status
- [ ] Cross-reference CLAUDE.md ↔ docs
- [ ] Verify code examples
- [ ] Check internal links
- [ ] Verify CLI commands
- [ ] Verify env var docs
- [ ] Add missing sections
- [ ] Final build test
- [ ] Commit + PR
