# Phase 4: Bun Workspaces

> [Back to main plan](../README.md)

## Goal
Convert from monolithic `packages/autonomous` to Bun workspace monorepo with separate packages per golem.

## Tools
- **Research:** context7 — Bun workspace config, inter-package resolution
- **Code:** cursor (work mode) — bulk file moves; Opus for package.json wiring
- **Verify:** `bun install` from root + `bun test` per package

## Steps

1. **[Opus]** Create root workspace config
   - Root `package.json`: `"workspaces": ["packages/*"]`
   - Root `tsconfig.base.json` with shared compiler options
2. **[Cursor work]** Create package scaffolds (package.json + tsconfig per golem)
   - `packages/shared/`, `packages/claude/`, `packages/recruiter/`, `packages/teller/`
   - `packages/jobs/`, `packages/content/`, `packages/coach/`, `packages/services/`
3. **[Cursor work]** Move files to new packages (per Cursor C file move manifest in findings.md)
   - Each golem's src/ files move to their package
   - Tests move with their golem
   - Shared files already in packages/shared/ from Phase 1
4. **[Cursor work]** Update all imports to use `@golems/shared` workspace resolution
   - Inter-package: `"@golems/shared": "workspace:*"`
5. **[Opus]** Keep `packages/autonomous/` as thin re-export wrappers (strangler pattern)
   - Re-export entry points so launchd/cloud-worker still work
   - Remove wrappers in Phase 8 when infra updates
6. **[Cursor work]** Move 2 recruiter tests from non-standard location
   - `src/recruiter-golem/__tests__/` → `packages/recruiter/__tests__/`
7. **[bun install]** Verify workspace resolution from root
8. **[bun test]** Run tests per package + full suite
9. **[Gemini research]** Verify `.gitignore` covers all packages, no stale paths

## Depends On
- Phase 3 (bot must be split before moving files to separate packages)

## Status
- [ ] Create root workspace config
- [ ] Create package scaffolds
- [ ] Move files to new packages
- [ ] Update all imports
- [ ] Create strangler wrappers in packages/autonomous
- [ ] Move recruiter tests
- [ ] bun install works from root
- [ ] All tests pass per package
- [ ] .gitignore updated
