# Phase 5: Verify & Publish

> [Back to main plan](../README.md)

## Goal

Run full verification suite on the extracted repo, create the GitHub repo, push with full history, and publish to PyPI (deferred if no account).

## Tools

- **Code:** Shell commands (pytest, ruff, git, gh CLI)
- **MCPs:** None

## Steps

### Verification

1. Clean install in fresh venv: `rm -rf .venv && python3 -m venv .venv && pip install -e ".[dev]"`
2. Run full test suite: `pytest tests/ -v`
3. Run linter: `ruff check src/ tests/` and `ruff format --check src/ tests/`
4. Verify CLI works: `brainlayer --help`, `brainlayer-mcp --help`
5. Verify git log: `git log --oneline | wc -l` should be ~140+ commits, first from Jan 2026, last from Feb 2026
6. Final audit: no `zikaron` in code (except etymology), no `/Users/` paths, no `golems` imports

### GitHub

7. Create GitHub repo: `gh repo create EtanHey/brainlayer --public --description "Like git for your AI conversations"`
8. Add remote: `git remote add origin git@github.com:EtanHey/brainlayer.git`
9. Push: `git branch -M main && git push -u origin main --tags`
10. Verify on GitHub: `gh repo view EtanHey/brainlayer`

### PyPI (deferred -- user needs account)

11. Tag v1.0.0: `git tag -a v1.0.0 -m "v1.0.0 -- Initial open-source release"`
12. Push tag (triggers publish workflow): `git push origin v1.0.0`
13. Monitor: `gh run watch`
14. Verify: `pip install brainlayer && brainlayer --help`

## Depends On

- Phase 4 (needs complete README, LICENSE, CI/CD, docs)

## Key Commands

```bash
# Full verification
pytest tests/ -v
ruff check src/ tests/
brainlayer --help
git log --oneline | wc -l

# Publish
gh repo create EtanHey/brainlayer --public --description "Like git for your AI conversations"
git push -u origin main --tags
```

## Special Notes

- **PyPI publish is deferred** -- user needs to create PyPI account first
- GitHub Actions workflow will be ready to trigger on tag push
- Can do manual publish with `python -m build && twine upload dist/*` if needed

## Status

- [ ] Clean install in fresh venv
- [ ] Full test suite passes
- [ ] Linter passes
- [ ] CLI works
- [ ] Git history verified (~140+ commits)
- [ ] Final audit (no zikaron/golems/hardcoded paths)
- [ ] Create GitHub repo
- [ ] Push with full history
- [ ] Tag + publish to PyPI (deferred)
