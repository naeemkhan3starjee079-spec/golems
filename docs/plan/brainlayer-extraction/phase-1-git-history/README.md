# Phase 1: Git History Extraction

> [Back to main plan](../README.md)

## Goal

Extract packages/zikaron/ history from golems monorepo using git-filter-repo and graft it onto the old standalone zikaron repo history. Result: ~136 commits, linear, chronological.

## Tools

- **Code:** Shell commands (git, git-filter-repo)
- **MCPs:** None

## Steps

1. Create temp workspace at `/tmp/brainlayer-extraction/`
2. Clone golems monorepo to temp workspace
3. Run `git filter-repo --subdirectory-filter packages/zikaron/ --force` — extracts only zikaron commits, rewrites paths
4. Verify extraction: check file structure (`src/zikaron/` at root), count commits (~102)
5. Clone old standalone repo `github.com/EtanHey/zikaron` (34 commits)
6. Verify junction: diff old repo's final tree vs extracted repo's first commit
7. Add old standalone as remote, fetch history
8. Find commit hashes: first extracted commit (child) + last old commit (parent)
9. Graft: `git replace --graft <first-extracted> <last-old>`
10. Verify graft: `git log --oneline | wc -l` should be ~136
11. Bake graft permanently: `git filter-repo --force`
12. Final verification: first commits from Jan 2026, last from Feb 2026
13. Tag pre-rename state: `git tag pre-rename`

## Depends On

- None (first phase)

## Key Commands

```bash
# Extract
git filter-repo --subdirectory-filter packages/zikaron/ --force

# Graft
git replace --graft $FIRST_EXTRACTED $LAST_OLD
git filter-repo --force  # Bakes graft permanently
```

## Status

- [ ] Create temp workspace
- [ ] Clone + filter-repo extraction
- [ ] Clone old standalone repo
- [ ] Verify junction compatibility
- [ ] Graft histories together
- [ ] Bake graft + verify final count
- [ ] Tag pre-rename
