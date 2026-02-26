# Phase 4: Open Source Polish

> [Back to main plan](../README.md)

## Goal

Make the repo ready for public consumption: hero README, Apache 2.0 license, GitHub Actions CI/CD, architecture docs, CHANGELOG, and .gitignore.

## Tools

- **Code:** Direct writing (markdown, YAML, TOML)
- **MCPs:** None

## Steps

### README

1. Write hero `README.md` with dual-audience structure:
   - Title + tagline: "BrainLayer -- Like git for your AI conversations"
   - What it does (1 paragraph)
   - Quick Start (4 lines: pip install, init, index, search)
   - Architecture diagram (ASCII pipeline)
   - Features grid (Search, Enrichment, Brain Graph, MCP, Style, Multi-source)
   - MCP Integration config snippets (Claude Code, Zed, Cursor)
   - The Vision (DeltaDB complement narrative, open style profiles)
   - Extras (optional features with wizard)
   - Deep Dive links to docs/
   - Contributing + Apache 2.0
   - Origin Story (Zikaron = Hebrew for memory)
2. Commit README

### License + Metadata

3. Add Apache 2.0 `LICENSE` file (Copyright 2026 Etan Heyman)
4. Update `pyproject.toml` with full metadata: version 1.0.0, license, readme, authors, keywords, classifiers, project URLs
5. Commit LICENSE + pyproject.toml

### CI/CD

6. Create `.github/workflows/ci.yml`: pytest + ruff on PR/push to main, Python 3.11 + 3.12 matrix
7. Create `.github/workflows/publish.yml`: PyPI via trusted publisher on `v*` tag push
8. Commit CI/CD workflows

### Documentation

9. Write `docs/architecture.md`: pipeline stages, sqlite-vec, embeddings, enrichment schema, brain graph, daemon, MCP server, storage
10. Write `docs/extending.md`: how to add sources, enrichment fields, MCP tools, CLI commands
11. Update `docs/mcp-tools.md`: rename all tool references
12. Commit docs

### CHANGELOG + .gitignore

13. Write `CHANGELOG.md` for v1.0.0 (all features listed)
14. Update `.gitignore` (pycache, venv, dist, build, egg-info, pytest-cache, ruff-cache, *.db)
15. Commit

## Depends On

- Phase 3 (README needs to reference new features: storage, wizard)

## Status

- [ ] Write hero README
- [ ] Add Apache 2.0 LICENSE
- [ ] Update pyproject.toml metadata
- [ ] Create CI workflow (ci.yml)
- [ ] Create publish workflow (publish.yml)
- [ ] Write architecture.md
- [ ] Write extending.md
- [ ] Update mcp-tools.md
- [ ] Write CHANGELOG.md
- [ ] Update .gitignore
- [ ] Commit all (incremental commits per section)
