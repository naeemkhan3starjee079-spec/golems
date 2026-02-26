# BrainLayer Extraction Design

> Extract Zikaron from the golems monorepo into a standalone open-source project.

**Date:** 2026-02-19
**Branch:** feature/zikaron-extraction
**Status:** Design approved, ready for implementation plan

---

## Summary

Extract `packages/zikaron/` from the golems monorepo into `github.com/EtanHey/brainlayer` — a standalone, pip-installable knowledge pipeline branded for open source. Full git history from both the old standalone repo (34 commits) and the monorepo (102 commits) merged chronologically.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Name** | BrainLayer | Available on PyPI + GitHub. Name IS the positioning. |
| **Tagline** | "Like git for your AI conversations" | Instant understanding via analogy. DeltaDB narrative. |
| **Audience** | Tiered: Claude Code → AI tool users → developers | Attract Zed (MCP memory layer), Wispr Flow (open style profiles) |
| **Goal** | Portfolio for recognition/hiring | Not commercial. Show engineering depth. |
| **Distribution** | PyPI package (`pip install brainlayer`) | Most professional. Golems consumes via pip. |
| **License** | Apache 2.0 | Patent protection without scaring companies. Matches FastAPI. |
| **Git history** | Full merge (136 commits) | filter-repo + graft. Shows 5 weeks of evolution. |
| **Architecture** | Core + optional extras with wizard | `brainlayer init` for setup, `brainlayer install <extra>` for more |
| **Storage** | Centralized at `~/.local/share/brainlayer/storage/` | All docs.local, plans, research live here. Copy to repo for public. |
| **Extraction** | Approach A: filter-repo + graft | Gold standard tool, clean path rewriting, permanent graft. |

---

## Positioning

**The narrative:**
- Zed is building DeltaDB — operation-based version control for code (CRDT-based, announced Aug 2025 Series B)
- BrainLayer is the conversation-side complement — operation-based memory for AI conversations
- DeltaDB tracks code changes continuously; BrainLayer tracks AI conversations continuously
- Together: complete memory of a developer's work

**For editors (Zed, Cursor):** Persistent conversation memory via MCP server
**For voice/writing tools (Wispr Flow):** Open style profile standard (not a black box)
**For developers:** Local knowledge pipeline infrastructure

---

## Repository Structure

```
brainlayer/
├── src/brainlayer/
│   ├── __init__.py
│   ├── cli/                    # Typer CLI
│   │   ├── __init__.py         # All CLI commands
│   │   └── wizard.py           # brainlayer init — interactive setup
│   ├── client.py               # Python client for daemon API
│   ├── clustering.py           # Topic clustering (HDBSCAN + UMAP)
│   ├── daemon.py               # FastAPI HTTP daemon
│   ├── embeddings.py           # bge-large-en-v1.5 embedding model
│   ├── index_new.py            # Unified indexer
│   ├── migrate.py              # DB schema migrations
│   ├── vector_store.py         # sqlite-vec storage layer
│   ├── storage.py              # Centralized artifact storage manager
│   ├── mcp/                    # MCP server (8+ tools)
│   │   └── __init__.py
│   └── pipeline/               # Processing stages
│       ├── extract.py          # CORE: Parse JSONL conversations
│       ├── classify.py         # CORE: Content classification
│       ├── chunk.py            # CORE: AST-aware chunking
│       ├── enrichment.py       # CORE: LLM enrichment (10-field schema)
│       ├── brain_graph.py      # CORE: Brain graph generation
│       ├── operation_grouping.py  # CORE: read→edit→test cycles
│       ├── plan_linking.py     # CORE: Session → plan/phase linking
│       ├── temporal_chains.py  # CORE: Topic chain detection
│       ├── git_overlay.py      # CORE: Git diff enrichment
│       ├── extract_whatsapp.py    # EXTRA [whatsapp]
│       ├── extract_markdown.py    # EXTRA [markdown]
│       ├── extract_claude_desktop.py  # EXTRA [desktop]
│       ├── semantic_style.py      # EXTRA [style]
│       ├── analyze_communication.py   # EXTRA [style]
│       ├── style_embed.py        # EXTRA [style]
│       ├── style_index.py        # EXTRA [style]
│       ├── obsidian_export.py    # EXTRA [obsidian]
│       ├── cloud_backfill.py     # EXTRA [cloud]
│       └── unified_timeline.py   # EXTRA [style]
├── tests/
├── docs/
│   ├── architecture.md          # Deep dive: how it works
│   ├── extending.md             # How to add new sources/stages
│   ├── enrichment-runbook.md    # Enrichment guide
│   └── mcp-tools.md            # MCP tool reference
├── pyproject.toml
├── README.md                    # Hero README (dual-audience)
├── LICENSE                      # Apache 2.0
├── CHANGELOG.md
└── .github/
    └── workflows/
        ├── ci.yml               # Tests + lint on PR
        └── publish.yml          # PyPI publish on git tag
```

---

## Data Layout

```
~/.local/share/brainlayer/
├── brainlayer.db                  # Main sqlite-vec database
├── prompts/                        # Deduplicated system prompts (SHA-256)
├── storage/                        # Centralized artifact storage
│   ├── golems/
│   │   ├── docs.local/            # Research, logs, scratch
│   │   └── plans/                 # Active plans
│   ├── songscript/
│   │   └── docs.local/
│   └── {project-name}/
│       └── ...
└── exports/                        # Brain graph JSON, Obsidian vaults
```

**Key principle:** Files LIVE in brainlayer storage, not in project repos. To make something public, copy from storage into the git repo. This eliminates archiving, survives across worktrees/branches/deletions, and everything is auto-indexed for search.

---

## Package Configuration (pyproject.toml)

```toml
[project]
name = "brainlayer"
version = "1.0.0"
description = "Like git for your AI conversations — the brain layer for AI development"
license = "Apache-2.0"
requires-python = ">=3.11"

dependencies = [
    "apsw>=3.45.0",
    "sqlite-vec>=0.1.0",
    "sentence-transformers>=2.2.0",
    "fastapi>=0.100.0",
    "uvicorn>=0.20.0",
    "httpx>=0.24.0",
    "tree-sitter>=0.21.0",
    "mcp>=1.0.0",
    "typer>=0.9.0",
    "rich>=13.0.0",
    "pydantic>=2.0.0",
    "orjson>=3.9.0",
    "pyyaml>=6.0",
    "numpy>=1.22,<3.0",
    "scikit-learn>=1.0.0",
]

[project.optional-dependencies]
style = ["spacy>=3.7,<4.0"]
youtube = ["youtube-transcript-api>=1.0.0"]
cloud = ["google-genai>=1.0.0"]
brain = ["igraph>=0.11.0", "leidenalg>=0.10.0", "umap-learn>=0.5.0"]
whatsapp = []  # Pure Python parser
obsidian = []  # Pure Python markdown generation
desktop = []   # Pure Python parser
dev = ["pytest>=7.0.0", "pytest-asyncio>=0.21.0", "ruff>=0.1.0"]
all = ["brainlayer[style,youtube,cloud,brain,whatsapp,obsidian,desktop]"]

[project.scripts]
brainlayer = "brainlayer.cli:app"
brainlayer-mcp = "brainlayer.mcp:serve"
brainlayer-daemon = "brainlayer.daemon:main"
```

---

## README Structure

```markdown
# BrainLayer

> Like git for your AI conversations.

[One-paragraph hook: what it does, the vision]

## Quick Start
pip install brainlayer
brainlayer init
brainlayer search "how did I implement auth"

## What It Does
[Architecture diagram — pipeline visualization]

## Features
[Grid/table of capabilities with icons]

## MCP Integration
[How to add to Claude Code, Zed, Cursor — the editor sell]

## The Vision
[DeltaDB complement, open style profiles, brain layer]

## Extras
brainlayer install style youtube obsidian

## Deep Dive
[Links to docs/architecture.md, docs/extending.md]

## Contributing / License (Apache 2.0)
```

---

## Git History Extraction Steps

### Phase 1: Extract + Merge History

1. `git clone` golems monorepo to temp directory
2. `pip install git-filter-repo` (if not installed)
3. `git filter-repo --subdirectory-filter packages/zikaron/ --force` on the temp clone
   - Rewrites `packages/zikaron/src/...` → `src/...`
   - Keeps only commits touching zikaron files
4. `git clone github.com/EtanHey/zikaron` (old standalone, 34 commits)
5. Verify junction: diff old repo's final tree vs extracted repo's first commit
6. In extracted repo:
   - `git remote add old-standalone /path/to/old-clone`
   - `git fetch old-standalone`
   - `git replace --graft <first-extracted-commit> <last-old-commit>`
   - `git filter-repo --force` (bakes the graft permanently)
7. Result: 136 commits, linear, chronological

### Phase 2: Rename zikaron → brainlayer

1. `mv src/zikaron src/brainlayer`
2. Find-and-replace all imports: `from zikaron` → `from brainlayer`, `import zikaron` → `import brainlayer`
3. Update pyproject.toml: name, scripts, metadata
4. Update CLI help text, README references
5. Commit: "chore: rename zikaron to brainlayer"

### Phase 3: Open-Source Polish

1. Write hero README
2. Add LICENSE (Apache 2.0)
3. Add .github/workflows/ (CI: pytest + ruff on PR, publish: PyPI on tag)
4. Implement `brainlayer init` wizard
5. Implement centralized storage manager (`storage.py`)
6. Add/update docs/ (architecture, extending, MCP tools)
7. Clean up golems-specific references, hardcoded paths
8. PII audit: ensure no personal data in committed files
9. Remove golems-only files (prd-json/, .claude-project-id, etc.)

### Phase 4: Golems Integration Update

1. Remove `packages/zikaron/` from golems monorepo
2. Update golems CLAUDE.md: reference BrainLayer as external dependency
3. Update MCP config: `zikaron-mcp` → `brainlayer-mcp`
4. Update golems rules that reference `docs.local/` to use brainlayer storage
5. Update .gitignore if needed

### Phase 5: Publish

1. Push to `github.com/EtanHey/brainlayer`
2. Create v1.0.0 tag + GitHub release
3. `python -m build && twine upload dist/*` (or via CI)
4. Verify: `pip install brainlayer` works from PyPI
5. Update golems to consume from PyPI

---

## Golems Integration After Extraction

**What stays in golems:**
- MCP config in `.claude/settings.json` (updated command name)
- References to BrainLayer in CLAUDE.md
- Rules about using brainlayer storage instead of docs.local/

**What moves to BrainLayer repo:**
- ALL Python code from packages/zikaron/
- Tests
- Documentation
- Scripts

**What gets removed from both:**
- Golems-specific hardcoded paths (e.g., `~/Gits/golems/...`)
- prd-json/ (Ralph-specific)
- .claude-project-id (golems-specific)
- progress.txt (internal tracking)
- extract_samples.py (one-off script)
- IMPLEMENTATION.md (internal notes)

---

## Success Criteria

1. `pip install brainlayer` works from PyPI
2. `brainlayer init` wizard guides new users through setup
3. `brainlayer search` works out of the box after indexing
4. `brainlayer-mcp` works as MCP server in Claude Code / Zed
5. `git log` shows 136 commits with full history
6. README tells a compelling story for both quick-scan and deep-dive readers
7. Centralized storage works: files persist across worktrees/branches
8. All existing Zikaron tests pass under the new name
9. Golems monorepo continues to work with BrainLayer as external dep
