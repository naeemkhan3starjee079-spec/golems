# Phase 2: Rename & Cleanup

> [Back to main plan](../README.md)

## Goal

Rename all `zikaron` references to `brainlayer` across the entire extracted repo, remove golems-specific files, and verify tests pass under the new name.

## Tools

- **Code:** Shell commands (sed, grep, find), manual edits for pyproject.toml
- **MCPs:** None

## Steps

1. Rename source directory: `mv src/zikaron src/brainlayer`
2. Find all files containing "zikaron" (case-insensitive) across `.py`, `.toml`, `.md`, `.yaml`, `.json`, `.sh`, `.txt`, `.plist`
3. Replace all Python imports: `from zikaron` -> `from brainlayer`, `import zikaron` -> `import brainlayer`, string refs
4. Update `pyproject.toml`: package name, all 3 entry points (`brainlayer`, `brainlayer-mcp`, `brainlayer-daemon`), description
5. Replace in all non-Python files (markdown, yaml, shell, txt, plist)
6. Update data paths: `~/.local/share/zikaron/` -> `~/.local/share/brainlayer/`, `zikaron.db` -> `brainlayer.db`, socket + lock paths
7. Verify no "zikaron" references remain (except Hebrew etymology comments)
8. Remove golems-specific files: `prd-json/`, `.claude-project-id`, `progress.txt`, `extract_samples.py`, `IMPLEMENTATION.md`, `test_dashboard.py`, `.deepsource.toml`, `.kiro/`
9. Audit for hardcoded golems paths, personal data/PII outside metadata, hardcoded absolute paths (`/Users/etanheyman/`)
10. Clean scripts/ -- remove golems-specific scripts, keep generic ones
11. Install in fresh venv, run `pytest tests/ -v` to verify all tests pass
12. Commit rename + cleanup as two separate commits

## Depends On

- Phase 1 (needs extracted repo with pre-rename tag)

## Key Commands

```bash
# Rename directory
mv src/zikaron src/brainlayer

# Bulk replace in Python files
find . -name "*.py" -exec sed -i '' 's/from zikaron/from brainlayer/g' {} +
find . -name "*.py" -exec sed -i '' 's/import zikaron/import brainlayer/g' {} +

# Verify no remaining refs
grep -r "zikaron" --include="*.py" --include="*.toml" . | grep -v "Hebrew for"

# Test under new name
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]" && pytest tests/ -v
```

## Status

- [ ] Rename src/zikaron -> src/brainlayer
- [ ] Replace all imports and string references
- [ ] Update pyproject.toml entry points
- [ ] Update data paths (DB, socket, lock)
- [ ] Remove golems-specific files
- [ ] Audit for hardcoded paths/PII
- [ ] Verify tests pass
- [ ] Commit
