# Phase 1 Findings

## Decisions

- Old standalone repo uses `master` branch (not main)
- SSH clone failed (publickey), used `gh repo clone` (HTTPS) instead
- 64 extracted commits from monorepo (not 102 as estimated -- many commits didn't touch zikaron)
- Total grafted: 98 commits (34 old + 64 extracted)

## Key Hashes

- First commit: `7123527` (feat: initialize zikaron knowledge pipeline)
- Graft point: old `379cffc` -> extracted `7be6dc4`
- Pre-rename tag: `5e5a513` (feat(dashboard): brain graph filters)

## Notes

- filter-repo removes all remotes automatically
- Graft baked permanently, no replace refs remaining
- File structure at root: `src/zikaron/`, `tests/`, `scripts/`, `docs/`, `pyproject.toml`, etc.
