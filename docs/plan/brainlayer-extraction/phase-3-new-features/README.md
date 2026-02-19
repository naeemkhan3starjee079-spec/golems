# Phase 3: New Features (TDD)

> [Back to main plan](../README.md)

## Goal

Add two new features to the extracted repo using TDD: centralized storage manager (`BrainStorage`) and interactive setup wizard (`brainlayer init`).

## Tools

- **Code:** Direct implementation (Python, pytest)
- **MCPs:** None

## Steps

### BrainStorage Manager

1. Write failing tests for `BrainStorage` class in `tests/test_storage.py`:
   - `get_project_dir` creates structure with `docs.local/` and `plans/` subdirs
   - `store` / `read` round-trip
   - `list_projects` returns all project names
   - `list_files` returns files in a project
   - Default base dir is `~/.local/share/brainlayer/storage/`
   - Deeply nested paths are created automatically
2. Run tests to verify they fail
3. Implement `src/brainlayer/storage.py` with `BrainStorage` class
4. Run tests to verify they pass
5. Add CLI commands: `brainlayer store`, `brainlayer projects`
6. Commit

### Wizard (`brainlayer init`)

7. Write failing tests for wizard in `tests/test_wizard.py`:
   - `detect_environment()` finds Ollama, Apple Silicon, Claude Code conversations
   - `WizardConfig` has sane defaults
8. Run tests to verify they fail
9. Implement `src/brainlayer/cli/wizard.py`:
   - `detect_environment()` checks Ollama, MLX, Claude Code dir, existing DB
   - `WizardConfig` dataclass for generated config
   - `run_wizard()` interactive Rich UI flow
10. Run tests to verify they pass
11. Wire wizard into CLI: `brainlayer init` calls `run_wizard()`
12. Commit

## Depends On

- Phase 2 (needs renamed package for correct imports)

## Key Files

```
src/brainlayer/storage.py       # BrainStorage class
src/brainlayer/cli/wizard.py    # Wizard module
src/brainlayer/cli/__init__.py  # CLI wiring (store, projects, init commands)
tests/test_storage.py           # 7 tests
tests/test_wizard.py            # 4 tests
```

## Status

- [ ] Write + run failing storage tests
- [ ] Implement BrainStorage
- [ ] Verify storage tests pass
- [ ] Add storage CLI commands
- [ ] Commit storage feature
- [ ] Write + run failing wizard tests
- [ ] Implement wizard module
- [ ] Verify wizard tests pass
- [ ] Wire wizard into CLI
- [ ] Commit wizard feature
