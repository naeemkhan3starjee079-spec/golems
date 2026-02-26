# BrainLayer Extraction

> Extract Zikaron from golems monorepo into a standalone open-source project.
> **Design doc:** `docs/plans/2026-02-19-brainlayer-extraction-design.md`

**Name:** BrainLayer | **Tagline:** "Like git for your AI conversations"
**License:** Apache 2.0 | **Target:** `github.com/EtanHey/brainlayer` + PyPI
**Goal:** Portfolio project for recognition/hiring. Not commercial.

---

## Progress

| # | Phase | Folder | Status | Branch | Notes |
|---|-------|--------|--------|--------|-------|
| 1 | Git History Extraction | [phase-1-git-history](phase-1-git-history/) | done | n/a (temp workspace) | 98 commits (34 old + 64 extracted) |
| 2 | Rename & Cleanup | [phase-2-rename-cleanup](phase-2-rename-cleanup/) | done | n/a (in extracted repo) | 194 files changed, all zikaron -> brainlayer |
| 3 | New Features (TDD) | [phase-3-new-features](phase-3-new-features/) | done | n/a (in extracted repo) | BrainStorage + wizard, 10/10 tests |
| 4 | Open Source Polish | [phase-4-open-source-polish](phase-4-open-source-polish/) | done | n/a (in extracted repo) | README, LICENSE, CI/CD, CHANGELOG |
| 5 | Verify & Publish | [phase-5-verify-publish](phase-5-verify-publish/) | done | n/a (in extracted repo) | 118 pass, pushed to github.com/EtanHey/brainlayer |
| 6 | Golems Update | [phase-6-golems-update](phase-6-golems-update/) | done | feature/zikaron-extraction | PR #217, all references updated |
| 7 | WhatsApp & Style | [phase-7-whatsapp-style](phase-7-whatsapp-style/) | done | in brainlayer repo | Threshold TDD (6 tests), style card script, pushed to GitHub |

---

## Execution Rules

- **Phases 1-5** work in a temp workspace (`/tmp/brainlayer-extraction/`) — NOT in the golems worktree
- **Phase 6** works in the golems monorepo (this worktree)
- **Phase 7** works in the new brainlayer repo
- Each phase commits incrementally in the extracted repo
- Phase 5 pushes everything to GitHub as a single repo creation
- Phase 6 is the only one that creates a PR in golems

## Special Notes

- **PyPI publish deferred** — user needs to create PyPI account first. GitHub Actions workflow will be ready.
- **Old standalone repo:** `github.com/EtanHey/zikaron` (private, 34 commits) — needs clone for graft
- **No @golems/shared dependency** — Zikaron is already pure Python, zero golems code deps

## Cross-Phase Knowledge

- Phase 1 findings: commit hashes for graft junction
- Phase 2 findings: list of all renamed files, any import issues
- Phase 4 findings: README draft, architecture doc structure
- Phase 7 findings: style card v3 comparison with v2
