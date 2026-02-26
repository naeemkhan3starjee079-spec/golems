# BrainLayer Extraction Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract packages/zikaron/ from the golems monorepo into a standalone open-source BrainLayer repo with full git history, renamed package, new features (wizard + centralized storage), and PyPI publishing.

**Architecture:** Git filter-repo extracts monorepo history, grafts onto old standalone repo history. Rename zikaron→brainlayer across all files. Add `storage.py` for centralized artifact storage, `wizard.py` for interactive setup. Polish for open source (README, LICENSE, CI/CD, docs). Update golems monorepo to reference BrainLayer as external.

**Tech Stack:** Python 3.11+, git-filter-repo, sqlite-vec, sentence-transformers, FastAPI, Typer, MCP, GitHub Actions, PyPI (twine/build)

**Design doc:** `docs/plans/2026-02-19-brainlayer-extraction-design.md`

---

## Task 1: Install git-filter-repo and Verify Tools

**Files:** None (tooling check)

**Step 1: Check if git-filter-repo is installed**

Run: `git filter-repo --version`
Expected: version output OR "command not found"

**Step 2: Install git-filter-repo if needed**

Run: `pip install git-filter-repo`
Expected: Successfully installed

**Step 3: Verify git version supports replace/graft**

Run: `git --version`
Expected: git 2.x (any recent version supports `git replace --graft`)

**Step 4: Verify old standalone repo is accessible**

Run: `gh repo view EtanHey/zikaron --json name,defaultBranchRef`
Expected: JSON showing repo exists

---

## Task 2: Clone Monorepo and Extract Zikaron History

**Files:** Work in `/tmp/brainlayer-extraction/` (temp workspace, will become the new repo)

**Step 1: Create temp workspace and clone monorepo**

```bash
mkdir -p /tmp/brainlayer-extraction
git clone /Users/etanheyman/Gits/golems /tmp/brainlayer-extraction/golems-clone
```

Expected: Full golems clone

**Step 2: Run git filter-repo to extract packages/zikaron/**

```bash
cd /tmp/brainlayer-extraction/golems-clone
git filter-repo --subdirectory-filter packages/zikaron/ --force
```

Expected: Repository rewritten. Only commits touching zikaron files remain. Paths rewritten from `packages/zikaron/src/...` to `src/...`.

**Step 3: Verify extraction — check file structure**

```bash
ls /tmp/brainlayer-extraction/golems-clone/src/zikaron/
```

Expected: `__init__.py`, `cli/`, `daemon.py`, `embeddings.py`, `mcp/`, `pipeline/`, etc.

**Step 4: Count extracted commits**

```bash
cd /tmp/brainlayer-extraction/golems-clone
git log --oneline | wc -l
```

Expected: ~102 commits (monorepo commits touching zikaron)

**Step 5: Record the first extracted commit hash**

```bash
cd /tmp/brainlayer-extraction/golems-clone
git log --oneline --reverse | head -1
```

Expected: The first commit hash and message (should be "feat: add zikaron as packages/zikaron" or similar)

---

## Task 3: Clone Old Standalone Repo and Verify Junction

**Files:** Work in `/tmp/brainlayer-extraction/`

**Step 1: Clone the old standalone zikaron repo**

```bash
git clone git@github.com:EtanHey/zikaron.git /tmp/brainlayer-extraction/old-standalone
```

Expected: 34 commits cloned

**Step 2: Check old repo's last commit**

```bash
cd /tmp/brainlayer-extraction/old-standalone
git log --oneline -1
```

Expected: Last commit hash and message

**Step 3: Check old repo's file structure**

```bash
ls /tmp/brainlayer-extraction/old-standalone/src/zikaron/ 2>/dev/null || ls /tmp/brainlayer-extraction/old-standalone/
```

Expected: Similar structure to the extracted repo's first commit. Need to verify paths match.

**Step 4: Diff the junction point**

Compare old repo's final tree with extracted repo's first commit tree to see how similar they are:

```bash
# List files in old repo
cd /tmp/brainlayer-extraction/old-standalone
find . -name "*.py" | sort > /tmp/brainlayer-extraction/old-files.txt

# List files at extracted repo's first commit
cd /tmp/brainlayer-extraction/golems-clone
FIRST_COMMIT=$(git log --oneline --reverse | head -1 | cut -d' ' -f1)
git ls-tree -r --name-only "$FIRST_COMMIT" | sort > /tmp/brainlayer-extraction/extracted-first-files.txt

# Compare
diff /tmp/brainlayer-extraction/old-files.txt /tmp/brainlayer-extraction/extracted-first-files.txt
```

Expected: Shows differences (some files added/removed between old repo and monorepo import). Record the diff for reference.

---

## Task 4: Graft Histories Together

**Files:** Work in `/tmp/brainlayer-extraction/golems-clone/`

**Step 1: Add old standalone as a remote**

```bash
cd /tmp/brainlayer-extraction/golems-clone
git remote add old-standalone /tmp/brainlayer-extraction/old-standalone
git fetch old-standalone
```

Expected: Remote added, history fetched

**Step 2: Find the commit hashes for grafting**

```bash
# First commit of extracted monorepo history (the child)
FIRST_EXTRACTED=$(git log --oneline --reverse | head -1 | cut -d' ' -f1)
echo "First extracted: $FIRST_EXTRACTED"

# Last commit of old standalone repo (the parent)
LAST_OLD=$(git log --oneline old-standalone/main | head -1 | cut -d' ' -f1)
# If main doesn't exist, try master:
# LAST_OLD=$(git log --oneline old-standalone/master | head -1 | cut -d' ' -f1)
echo "Last old: $LAST_OLD"
```

Expected: Two commit hashes printed

**Step 3: Create the graft**

```bash
cd /tmp/brainlayer-extraction/golems-clone
git replace --graft $FIRST_EXTRACTED $LAST_OLD
```

Expected: No output (success)

**Step 4: Verify the graft — check full log**

```bash
git log --oneline | wc -l
```

Expected: ~136 commits (102 + 34)

```bash
git log --oneline --reverse | head -5
```

Expected: First 5 commits should be from the old standalone repo (Jan 2026)

**Step 5: Bake the graft permanently with filter-repo**

```bash
cd /tmp/brainlayer-extraction/golems-clone
git filter-repo --force
```

Expected: Repository rewritten with graft baked in. `git replace` refs removed.

**Step 6: Final verification — count commits**

```bash
git log --oneline | wc -l
```

Expected: ~136 commits, linear, chronological

```bash
git log --oneline --reverse | head -3
echo "---"
git log --oneline | head -3
```

Expected: First commits from Jan 2026 (old standalone), last commits from Feb 2026 (monorepo)

**Step 7: Commit checkpoint — tag the pre-rename state**

```bash
git tag pre-rename
```

---

## Task 5: Rename zikaron → brainlayer (Directory + Imports)

**Files:** All files in `/tmp/brainlayer-extraction/golems-clone/`

**Step 1: Rename the source directory**

```bash
cd /tmp/brainlayer-extraction/golems-clone
mv src/zikaron src/brainlayer
```

**Step 2: Find all files containing "zikaron" (case-insensitive)**

```bash
grep -rl "zikaron" --include="*.py" --include="*.toml" --include="*.md" --include="*.yaml" --include="*.yml" --include="*.json" --include="*.txt" --include="*.sh" --include="*.plist" . | sort
```

Expected: List of all files needing updates (should be ~40+ files based on our earlier grep)

**Step 3: Replace all Python imports**

```bash
# Replace in all Python files
find . -name "*.py" -exec sed -i '' 's/from zikaron/from brainlayer/g' {} +
find . -name "*.py" -exec sed -i '' 's/import zikaron/import brainlayer/g' {} +
find . -name "*.py" -exec sed -i '' "s/'zikaron'/'brainlayer'/g" {} +
find . -name "*.py" -exec sed -i '' 's/"zikaron"/"brainlayer"/g' {} +
```

**Step 4: Replace in pyproject.toml**

Update name, description, scripts entry points:
- `name = "zikaron"` → `name = "brainlayer"`
- `zikaron = "zikaron.cli:app"` → `brainlayer = "brainlayer.cli:app"`
- `zikaron-mcp = "zikaron.mcp:serve"` → `brainlayer-mcp = "brainlayer.mcp:serve"`
- `zikaron-daemon = "zikaron.daemon:main"` → `brainlayer-daemon = "brainlayer.daemon:main"`

**Step 5: Replace in all markdown, yaml, txt, shell files**

```bash
find . -name "*.md" -exec sed -i '' 's/zikaron/brainlayer/g' {} +
find . -name "*.yaml" -o -name "*.yml" | xargs sed -i '' 's/zikaron/brainlayer/g'
find . -name "*.sh" -exec sed -i '' 's/zikaron/brainlayer/g' {} +
find . -name "*.txt" -exec sed -i '' 's/zikaron/brainlayer/g' {} +
find . -name "*.plist" -exec sed -i '' 's/zikaron/brainlayer/g' {} +
```

**Step 6: Update data paths**

In `vector_store.py` (or wherever the DB path is defined):
- `~/.local/share/zikaron/` → `~/.local/share/brainlayer/`
- `zikaron.db` → `brainlayer.db`
- `/tmp/zikaron.sock` → `/tmp/brainlayer.sock`
- `/tmp/zikaron-enrichment.lock` → `/tmp/brainlayer-enrichment.lock`

**Step 7: Verify no "zikaron" references remain (except Hebrew meaning comments)**

```bash
grep -r "zikaron" --include="*.py" --include="*.toml" . | grep -v "Hebrew for"
```

Expected: No output (all references replaced except etymology comments)

**Step 8: Verify tests still pass**

```bash
cd /tmp/brainlayer-extraction/golems-clone
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest tests/ -v
```

Expected: All existing tests pass under the new name

**Step 9: Commit the rename**

```bash
git add -A
git commit -m "chore: rename zikaron to brainlayer

Rename package from 'zikaron' (Hebrew for memory) to 'brainlayer'
for open-source release. All imports, paths, CLI entry points,
and documentation updated.

The brain layer for AI development."
```

---

## Task 6: Implement Centralized Storage Manager (TDD)

**Files:**
- Create: `src/brainlayer/storage.py`
- Create: `tests/test_storage.py`

**Step 1: Write failing tests for storage manager**

```python
# tests/test_storage.py
import os
import tempfile
from pathlib import Path
import pytest
from brainlayer.storage import BrainStorage


@pytest.fixture
def storage(tmp_path):
    """Create a BrainStorage instance with temp base dir."""
    return BrainStorage(base_dir=tmp_path)


def test_get_project_dir_creates_structure(storage, tmp_path):
    """Project dir is created with docs.local/ and plans/ subdirs."""
    project_dir = storage.get_project_dir("golems")
    assert project_dir.exists()
    assert (project_dir / "docs.local").exists()
    assert (project_dir / "plans").exists()


def test_store_file(storage):
    """Store a file into a project's storage."""
    storage.store("golems", "docs.local/research/thing.md", "# Research\nSome content")
    stored = storage.read("golems", "docs.local/research/thing.md")
    assert stored == "# Research\nSome content"


def test_list_projects(storage):
    """List all projects that have storage."""
    storage.get_project_dir("golems")
    storage.get_project_dir("songscript")
    projects = storage.list_projects()
    assert set(projects) == {"golems", "songscript"}


def test_list_files(storage):
    """List files in a project's storage."""
    storage.store("golems", "docs.local/a.md", "a")
    storage.store("golems", "docs.local/b.md", "b")
    storage.store("golems", "plans/plan.md", "plan")
    files = storage.list_files("golems")
    assert len(files) == 3
    assert any("a.md" in str(f) for f in files)


def test_default_base_dir():
    """Default base dir is ~/.local/share/brainlayer/storage/."""
    s = BrainStorage()
    assert str(s.base_dir).endswith("brainlayer/storage")


def test_store_creates_subdirectories(storage):
    """Deeply nested paths are created automatically."""
    storage.store("golems", "docs.local/research/deep/nested/file.md", "content")
    assert storage.read("golems", "docs.local/research/deep/nested/file.md") == "content"
```

**Step 2: Run tests to verify they fail**

Run: `cd /tmp/brainlayer-extraction/golems-clone && pytest tests/test_storage.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'brainlayer.storage'`

**Step 3: Implement storage manager**

```python
# src/brainlayer/storage.py
"""Centralized artifact storage for BrainLayer.

All docs.local, plans, research, and logs live here — not in project repos.
Files persist across worktrees, branches, and repo deletions.
To make something public, copy from storage into the git repo.
"""
from pathlib import Path
from typing import Optional


DEFAULT_BASE_DIR = Path.home() / ".local" / "share" / "brainlayer" / "storage"


class BrainStorage:
    """Manages centralized file storage organized by project."""

    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = Path(base_dir) if base_dir else DEFAULT_BASE_DIR
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def get_project_dir(self, project: str) -> Path:
        """Get or create a project's storage directory with standard subdirs."""
        project_dir = self.base_dir / project
        project_dir.mkdir(parents=True, exist_ok=True)
        (project_dir / "docs.local").mkdir(exist_ok=True)
        (project_dir / "plans").mkdir(exist_ok=True)
        return project_dir

    def store(self, project: str, relative_path: str, content: str) -> Path:
        """Store a file in a project's storage. Creates subdirs as needed."""
        self.get_project_dir(project)
        full_path = self.base_dir / project / relative_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding="utf-8")
        return full_path

    def read(self, project: str, relative_path: str) -> str:
        """Read a file from a project's storage."""
        full_path = self.base_dir / project / relative_path
        return full_path.read_text(encoding="utf-8")

    def list_projects(self) -> list[str]:
        """List all projects that have storage directories."""
        return sorted(
            d.name for d in self.base_dir.iterdir()
            if d.is_dir() and not d.name.startswith(".")
        )

    def list_files(self, project: str, subdir: str = "") -> list[Path]:
        """List all files in a project's storage (or a subdirectory)."""
        project_dir = self.base_dir / project
        if subdir:
            project_dir = project_dir / subdir
        if not project_dir.exists():
            return []
        return sorted(f for f in project_dir.rglob("*") if f.is_file())

    def exists(self, project: str, relative_path: str) -> bool:
        """Check if a file exists in storage."""
        return (self.base_dir / project / relative_path).exists()
```

**Step 4: Run tests to verify they pass**

Run: `pytest tests/test_storage.py -v`
Expected: All 7 tests PASS

**Step 5: Add storage CLI commands**

Add to `src/brainlayer/cli/__init__.py`:

```python
@app.command()
def store(
    project: str,
    path: str,
    content: str = typer.Argument(None),
    file: Path = typer.Option(None, "--file", "-f", help="Read content from file"),
):
    """Store a file in centralized BrainLayer storage."""
    from brainlayer.storage import BrainStorage
    storage = BrainStorage()
    if file:
        content = file.read_text()
    elif content is None:
        import sys
        content = sys.stdin.read()
    result = storage.store(project, path, content)
    typer.echo(f"Stored: {result}")


@app.command()
def projects():
    """List all projects with BrainLayer storage."""
    from brainlayer.storage import BrainStorage
    storage = BrainStorage()
    for project in storage.list_projects():
        typer.echo(project)
```

**Step 6: Commit**

```bash
git add src/brainlayer/storage.py tests/test_storage.py src/brainlayer/cli/__init__.py
git commit -m "feat: add centralized storage manager

BrainStorage manages project artifacts in ~/.local/share/brainlayer/storage/.
Files live there permanently — copy to git repo when making public.
Organized by project with docs.local/ and plans/ subdirs.

CLI: brainlayer store, brainlayer projects"
```

---

## Task 7: Implement brainlayer init Wizard (TDD)

**Files:**
- Create: `src/brainlayer/cli/wizard.py`
- Create: `tests/test_wizard.py`

**Step 1: Write failing tests for wizard**

```python
# tests/test_wizard.py
import os
from pathlib import Path
from unittest.mock import patch
import pytest
from brainlayer.cli.wizard import detect_environment, WizardConfig


def test_detect_ollama_running():
    """Detects if Ollama is available."""
    env = detect_environment()
    assert "ollama_available" in env
    assert isinstance(env["ollama_available"], bool)


def test_detect_claude_code_conversations():
    """Detects Claude Code conversation directory."""
    env = detect_environment()
    assert "claude_projects_dir" in env
    assert isinstance(env["conversation_count"], int)


def test_detect_apple_silicon():
    """Detects Apple Silicon for MLX backend recommendation."""
    env = detect_environment()
    assert "is_apple_silicon" in env
    assert isinstance(env["is_apple_silicon"], bool)


def test_wizard_config_defaults():
    """WizardConfig has sane defaults."""
    config = WizardConfig()
    assert config.enrich_backend in ("ollama", "mlx", "none")
    assert isinstance(config.extras, list)
```

**Step 2: Run tests to verify they fail**

Run: `pytest tests/test_wizard.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'brainlayer.cli.wizard'`

**Step 3: Implement wizard module**

```python
# src/brainlayer/cli/wizard.py
"""Interactive setup wizard for BrainLayer.

Detects the user's environment, recommends configuration,
and guides through first-time setup.
"""
import platform
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class WizardConfig:
    """Configuration generated by the wizard."""
    enrich_backend: str = "none"  # "ollama", "mlx", "none"
    extras: list[str] = field(default_factory=list)
    claude_projects_dir: Optional[Path] = None
    db_path: Optional[Path] = None


def detect_environment() -> dict:
    """Detect available tools and data sources."""
    env = {}

    # Check Ollama
    env["ollama_available"] = shutil.which("ollama") is not None
    if env["ollama_available"]:
        try:
            result = subprocess.run(
                ["ollama", "list"], capture_output=True, text=True, timeout=5
            )
            env["ollama_models"] = result.stdout.strip().split("\n") if result.returncode == 0 else []
        except (subprocess.TimeoutExpired, FileNotFoundError):
            env["ollama_available"] = False
            env["ollama_models"] = []
    else:
        env["ollama_models"] = []

    # Check Apple Silicon (for MLX)
    env["is_apple_silicon"] = (
        platform.system() == "Darwin" and platform.machine() == "arm64"
    )

    # Check Claude Code conversations
    claude_dir = Path.home() / ".claude" / "projects"
    env["claude_projects_dir"] = claude_dir if claude_dir.exists() else None
    env["conversation_count"] = (
        len(list(claude_dir.rglob("*.jsonl"))) if claude_dir.exists() else 0
    )

    # Check for WhatsApp exports
    env["whatsapp_available"] = False  # User provides path manually

    # Check for existing DB
    default_db = Path.home() / ".local" / "share" / "brainlayer" / "brainlayer.db"
    env["existing_db"] = default_db.exists()

    return env


def run_wizard() -> WizardConfig:
    """Run the interactive setup wizard. Returns configuration."""
    from rich.console import Console
    from rich.panel import Panel
    from rich.prompt import Confirm, Prompt

    console = Console()
    config = WizardConfig()

    console.print(Panel.fit(
        "[bold]BrainLayer Setup Wizard[/bold]\n"
        "Like git for your AI conversations.",
        border_style="blue",
    ))

    # Detect environment
    console.print("\n[dim]Detecting your environment...[/dim]")
    env = detect_environment()

    # Report findings
    console.print(f"\n  Claude Code conversations: [green]{env['conversation_count']}[/green] JSONL files")
    console.print(f"  Ollama: {'[green]available[/green]' if env['ollama_available'] else '[yellow]not found[/yellow]'}")
    console.print(f"  Apple Silicon (MLX): {'[green]yes[/green]' if env['is_apple_silicon'] else '[dim]no[/dim]'}")
    console.print(f"  Existing DB: {'[green]found[/green]' if env['existing_db'] else '[dim]none[/dim]'}")

    # Enrichment backend
    if env["is_apple_silicon"] and env["ollama_available"]:
        backend = Prompt.ask(
            "\nEnrichment backend",
            choices=["ollama", "mlx", "none"],
            default="ollama",
        )
    elif env["ollama_available"]:
        backend = Prompt.ask(
            "\nEnrichment backend",
            choices=["ollama", "none"],
            default="ollama",
        )
    else:
        console.print("\n[yellow]No local LLM found. Enrichment disabled.[/yellow]")
        console.print("[dim]Install Ollama (ollama.ai) for local enrichment.[/dim]")
        backend = "none"
    config.enrich_backend = backend

    # Extras
    extras = []
    if Confirm.ask("\nInstall style analysis (communication patterns)?", default=False):
        extras.append("style")
    if Confirm.ask("Install YouTube transcript indexing?", default=False):
        extras.append("youtube")
    if Confirm.ask("Install Obsidian export?", default=False):
        extras.append("obsidian")
    config.extras = extras

    # Claude projects dir
    if env["claude_projects_dir"]:
        config.claude_projects_dir = env["claude_projects_dir"]
    else:
        custom = Prompt.ask(
            "Path to Claude Code projects directory",
            default=str(Path.home() / ".claude" / "projects"),
        )
        config.claude_projects_dir = Path(custom)

    console.print(Panel.fit(
        f"[bold green]Setup complete![/bold green]\n\n"
        f"  Backend: {config.enrich_backend}\n"
        f"  Extras: {', '.join(config.extras) or 'none'}\n"
        f"  Source: {config.claude_projects_dir}\n\n"
        f"Run [bold]brainlayer index[/bold] to index your conversations.",
        border_style="green",
    ))

    return config
```

**Step 4: Run tests to verify they pass**

Run: `pytest tests/test_wizard.py -v`
Expected: All 4 tests PASS

**Step 5: Wire wizard into CLI**

Add to `src/brainlayer/cli/__init__.py`:

```python
@app.command()
def init():
    """Interactive setup wizard for BrainLayer."""
    from brainlayer.cli.wizard import run_wizard
    config = run_wizard()
    # Install extras if requested
    if config.extras:
        import subprocess
        extras_str = ",".join(config.extras)
        subprocess.run(
            ["pip", "install", f"brainlayer[{extras_str}]"],
            check=True,
        )
```

**Step 6: Commit**

```bash
git add src/brainlayer/cli/wizard.py tests/test_wizard.py src/brainlayer/cli/__init__.py
git commit -m "feat: add brainlayer init wizard

Interactive setup that detects environment (Ollama, MLX, Claude Code),
asks about extras (style, youtube, obsidian), and configures first run.
Rich UI with panels and prompts."
```

---

## Task 8: Remove Golems-Specific Files and Clean References

**Files:** Various files in the extracted repo

**Step 1: Remove golems-only files**

```bash
cd /tmp/brainlayer-extraction/golems-clone
rm -rf prd-json/
rm -f .claude-project-id
rm -f progress.txt
rm -f extract_samples.py
rm -f IMPLEMENTATION.md
rm -f test_dashboard.py  # Root-level duplicate
rm -f .deepsource.toml   # Golems-specific DeepSource config
rm -rf .kiro/             # Golems-specific Kiro config
```

**Step 2: Audit for hardcoded golems paths**

```bash
grep -r "golems" --include="*.py" --include="*.md" --include="*.sh" . | grep -v ".git/"
```

Expected: List of remaining golems references. Replace or remove each one.

**Step 3: Audit for personal data / PII**

```bash
grep -r "etanheyman\|EtanHey\|Etan Heyman" --include="*.py" --include="*.md" . | grep -v ".git/" | grep -v "README.md" | grep -v "LICENSE" | grep -v "pyproject.toml"
```

Expected: List any personal references in code/docs (not in metadata). Remove from code, keep in pyproject.toml author field.

**Step 4: Check for hardcoded absolute paths**

```bash
grep -r "/Users/etanheyman\|/home/" --include="*.py" . | grep -v ".git/"
```

Expected: No results (all paths should be relative or use Path.home())

**Step 5: Clean scripts/ — remove golems-specific scripts**

Review each script. Keep generic ones (cloud_backfill.py, index_youtube.py), remove golems-specific ones (consolidate_projects.py, install_service.py if it references golems launchd).

**Step 6: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove golems-specific files and references

Remove prd-json/, .claude-project-id, progress.txt, extract_samples.py,
IMPLEMENTATION.md, .deepsource.toml, .kiro/.
Clean hardcoded paths and golems references from code."
```

---

## Task 9: Write Hero README

**Files:**
- Rewrite: `README.md`

**Step 1: Write the README**

The README should follow this structure (see design doc for full spec):

1. **Title + tagline**: "BrainLayer — Like git for your AI conversations"
2. **What it does** (1 paragraph): Pipeline that indexes AI conversations into searchable, enriched knowledge
3. **Quick Start** (4 lines): pip install, init, index, search
4. **Architecture diagram**: ASCII pipeline visualization (reuse from CLAUDE.md, update names)
5. **Features grid**: Search, Enrichment, Brain Graph, MCP, Style, Multi-source
6. **MCP Integration**: Config snippets for Claude Code, Zed, Cursor
7. **The Vision**: DeltaDB complement narrative, open style profiles
8. **Extras**: How to install optional features
9. **Deep Dive**: Links to docs/
10. **Contributing**: Guidelines, Apache 2.0
11. **Origin Story**: Brief note about Zikaron (Hebrew for memory) and the golems project

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: write hero README for open-source launch

Dual-audience README: quick start for users, deep dive for engineers.
Positions BrainLayer as the conversation-layer complement to DeltaDB."
```

---

## Task 10: Add LICENSE and Update pyproject.toml

**Files:**
- Create: `LICENSE`
- Modify: `pyproject.toml`

**Step 1: Add Apache 2.0 license file**

Download or create the standard Apache 2.0 LICENSE file with:
- Year: 2026
- Copyright holder: Etan Heyman

**Step 2: Update pyproject.toml with full metadata**

Add/update these fields:
```toml
[project]
name = "brainlayer"
version = "1.0.0"
description = "Like git for your AI conversations — the brain layer for AI development"
license = "Apache-2.0"
readme = "README.md"
requires-python = ">=3.11"
authors = [{name = "Etan Heyman", email = "etan@etanheyman.com"}]
keywords = ["ai", "memory", "mcp", "claude", "knowledge-graph", "embeddings", "sqlite-vec"]
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: Apache Software License",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Topic :: Software Development :: Libraries",
]

[project.urls]
Homepage = "https://github.com/EtanHey/brainlayer"
Documentation = "https://github.com/EtanHey/brainlayer/tree/main/docs"
Repository = "https://github.com/EtanHey/brainlayer"
Issues = "https://github.com/EtanHey/brainlayer/issues"
```

**Step 3: Commit**

```bash
git add LICENSE pyproject.toml
git commit -m "chore: add Apache 2.0 license and update package metadata

Add LICENSE file, project URLs, classifiers, keywords for PyPI."
```

---

## Task 11: Add GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/publish.yml`

**Step 1: Create CI workflow (test + lint on PR)**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: pip install -e ".[dev]"
      - run: ruff check src/ tests/
      - run: pytest tests/ -v --tb=short

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install ruff
      - run: ruff check src/ tests/
      - run: ruff format --check src/ tests/
```

**Step 2: Create publish workflow (PyPI on tag)**

```yaml
# .github/workflows/publish.yml
name: Publish to PyPI

on:
  push:
    tags: ["v*"]

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: pypi
    permissions:
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install build
      - run: python -m build
      - uses: pypa/gh-action-pypi-publish@release/v1
```

**Step 3: Commit**

```bash
mkdir -p .github/workflows
git add .github/workflows/ci.yml .github/workflows/publish.yml
git commit -m "ci: add GitHub Actions for testing and PyPI publishing

CI: pytest + ruff on PR/push to main (Python 3.11 + 3.12)
Publish: PyPI via trusted publisher on version tag"
```

---

## Task 12: Write Architecture and Extension Docs

**Files:**
- Rewrite: `docs/architecture.md` (deep dive for engineers)
- Create: `docs/extending.md` (how to add new sources)
- Update: `docs/mcp-tools.md` (reference)

**Step 1: Write architecture.md**

Cover:
- Pipeline stages (extract → classify → chunk → embed → index)
- sqlite-vec + APSW architecture
- Embedding model choice (bge-large-en-v1.5)
- Enrichment schema (10 fields)
- Brain graph generation
- Daemon architecture (FastAPI + Unix socket)
- MCP server design
- Centralized storage design

**Step 2: Write extending.md**

Cover:
- How to add a new source extractor (implement `extract_*.py`)
- How to add a new enrichment field
- How to add a new MCP tool
- How to add a new CLI command

**Step 3: Update mcp-tools.md**

Update all tool names from `zikaron_*` to `brainlayer_*` (if applicable, or keep generic).

**Step 4: Commit**

```bash
git add docs/
git commit -m "docs: add architecture deep dive and extension guide

architecture.md: pipeline stages, sqlite-vec, embeddings, enrichment, daemon
extending.md: how to add sources, fields, MCP tools, CLI commands
mcp-tools.md: updated tool reference"
```

---

## Task 13: Update CHANGELOG and Add .gitignore

**Files:**
- Rewrite: `CHANGELOG.md`
- Update: `.gitignore`

**Step 1: Write CHANGELOG for v1.0.0**

```markdown
# Changelog

## [1.0.0] - 2026-02-XX

### Added
- Initial open-source release as BrainLayer (formerly Zikaron)
- Semantic search across AI conversation history (sqlite-vec + bge-large-en-v1.5)
- 10-field LLM enrichment pipeline (Ollama / MLX backends)
- Brain graph visualization (clustering + 3D layout)
- MCP server with 8 tools for Claude Code, Zed, Cursor
- Interactive setup wizard (`brainlayer init`)
- Centralized artifact storage (`~/.local/share/brainlayer/storage/`)
- Multi-source indexing: Claude Code, WhatsApp, YouTube, Markdown, Claude Desktop
- Communication style analysis pipeline
- Obsidian vault export
- FastAPI daemon with 25+ HTTP endpoints
- GitHub Actions CI/CD with PyPI publishing
```

**Step 2: Update .gitignore**

Ensure it covers:
```
__pycache__/
*.pyc
.venv/
dist/
build/
*.egg-info/
.pytest_cache/
.ruff_cache/
*.db
```

**Step 3: Commit**

```bash
git add CHANGELOG.md .gitignore
git commit -m "docs: add changelog for v1.0.0 and update gitignore"
```

---

## Task 14: Final Verification — Full Test Suite

**Files:** None (verification only)

**Step 1: Clean install in fresh venv**

```bash
cd /tmp/brainlayer-extraction/golems-clone
rm -rf .venv
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
```

**Step 2: Run full test suite**

```bash
pytest tests/ -v
```

Expected: All tests pass

**Step 3: Run linter**

```bash
ruff check src/ tests/
ruff format --check src/ tests/
```

Expected: No errors

**Step 4: Verify CLI works**

```bash
brainlayer --help
brainlayer-mcp --help 2>&1 | head -5
```

Expected: Help text shows, commands work

**Step 5: Verify git log is complete**

```bash
git log --oneline | wc -l
git log --oneline --reverse | head -5
echo "---"
git log --oneline | head -5
```

Expected: ~140+ commits (136 original + ~8 new), starting from Jan 2026

**Step 6: Check for any remaining issues**

```bash
# No zikaron references in code
grep -r "zikaron" --include="*.py" src/ | grep -v "Hebrew"

# No hardcoded paths
grep -r "/Users/" --include="*.py" src/

# No golems-specific imports
grep -r "golems" --include="*.py" src/
```

Expected: No output for all three

---

## Task 15: Create GitHub Repo and Push

**Files:** None (git operations)

**Step 1: Create the GitHub repo**

```bash
gh repo create EtanHey/brainlayer --public --description "Like git for your AI conversations — the brain layer for AI development" --license Apache-2.0
```

Note: Don't initialize with README (we have our own)

**Step 2: Add remote and push**

```bash
cd /tmp/brainlayer-extraction/golems-clone
git remote add origin git@github.com:EtanHey/brainlayer.git
git branch -M main
git push -u origin main --tags
```

**Step 3: Verify on GitHub**

```bash
gh repo view EtanHey/brainlayer --web
```

Expected: Repo visible with full commit history, README rendered

---

## Task 16: Publish to PyPI

**Files:** None (publishing)

**Step 1: Create PyPI account/token if needed**

Ensure PyPI account exists and has a token for publishing. Or set up trusted publisher (GitHub Actions OIDC).

**Step 2: Tag v1.0.0**

```bash
cd /tmp/brainlayer-extraction/golems-clone
git tag -a v1.0.0 -m "v1.0.0 — Initial open-source release"
git push origin v1.0.0
```

**Step 3: If using GitHub Actions trusted publisher**

The push of the tag triggers `.github/workflows/publish.yml`. Monitor:
```bash
gh run watch
```

**Step 4: If publishing manually**

```bash
pip install build twine
python -m build
twine upload dist/*
```

**Step 5: Verify installation from PyPI**

```bash
pip install brainlayer
brainlayer --help
```

Expected: Package installs from PyPI, CLI works

---

## Task 17: Update Golems Monorepo

**Files:** Work in the golems monorepo (back to the main worktree)

**Step 1: Update CLAUDE.md — replace Zikaron references with BrainLayer**

In root `CLAUDE.md`:
- Update the packages table: zikaron row → reference BrainLayer as external
- Update MCP servers table: `zikaron-mcp` → `brainlayer-mcp`
- Update Zikaron MCP tools section with new tool names

**Step 2: Update packages/zikaron/CLAUDE.md → replacement note**

Replace the full CLAUDE.md with a short note:

```markdown
# Zikaron → BrainLayer

This package has been extracted to a standalone open-source project:
**[BrainLayer](https://github.com/EtanHey/brainlayer)** — Like git for your AI conversations.

Install: `pip install brainlayer`
Docs: https://github.com/EtanHey/brainlayer
```

**Step 3: Update MCP config references**

In `.claude/settings.json` or wherever MCP servers are configured:
```json
{
  "brainlayer": {
    "command": "brainlayer-mcp",
    "args": []
  }
}
```

**Step 4: Update rules referencing docs.local/**

In `.claude/rules/` and MEMORY.md:
- `docs.local/` → `~/.local/share/brainlayer/storage/{project}/docs.local/`
- Update the "NEVER Save to /tmp/" rule to mention brainlayer storage

**Step 5: Commit golems update**

```bash
git add -A
git commit -m "chore: update golems for BrainLayer extraction

Zikaron extracted to standalone repo: github.com/EtanHey/brainlayer
- Update MCP config: zikaron-mcp → brainlayer-mcp
- Update CLAUDE.md references
- Point docs.local/ rules to brainlayer storage"
```

---

## Task 18: Source-Aware Enrichment Threshold (WhatsApp Fix)

**Files:**
- Modify: `src/brainlayer/vector_store.py:705-745` (`get_unenriched_chunks`)
- Create: `tests/test_enrichment_threshold.py`

**Context:** WhatsApp is only 18.5% enriched because `get_unenriched_chunks()` has a
hardcoded `min_char_count=50`. This skips 4,966 meaningful WhatsApp messages (20-50 chars)
like "see you tonight probably" and "Got an answer from university of maryland?".
Code snippets <50 chars are usually noise, but WhatsApp messages <50 chars are real.

**Step 1: Write failing test**

```python
# tests/test_enrichment_threshold.py
from brainlayer.vector_store import source_aware_min_chars

def test_whatsapp_threshold_lower():
    assert source_aware_min_chars("whatsapp") == 15

def test_claude_code_threshold_default():
    assert source_aware_min_chars("claude_code") == 50

def test_youtube_threshold_default():
    assert source_aware_min_chars("youtube") == 50

def test_unknown_source_default():
    assert source_aware_min_chars("unknown") == 50
```

**Step 2: Run tests to verify they fail**

Run: `pytest tests/test_enrichment_threshold.py -v`
Expected: FAIL — `ImportError: cannot import name 'source_aware_min_chars'`

**Step 3: Implement source-aware threshold**

Add to `src/brainlayer/vector_store.py`:

```python
# Source-aware minimum character thresholds for enrichment
_SOURCE_MIN_CHARS = {
    "whatsapp": 15,    # Short messages are meaningful
    "claude_code": 50, # Code snippets <50 are usually noise
}

def source_aware_min_chars(source: str) -> int:
    """Return the minimum char count for enrichment based on source."""
    return _SOURCE_MIN_CHARS.get(source, 50)
```

Update `get_unenriched_chunks` to use source-aware thresholds when source filter is provided:

```python
def get_unenriched_chunks(
    self,
    batch_size: int = 50,
    content_types: Optional[List[str]] = None,
    min_char_count: int = 50,
    source: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get chunks that haven't been enriched yet."""
    cursor = self.conn.cursor()

    # Use source-aware threshold if source is specified
    effective_min = source_aware_min_chars(source) if source else min_char_count

    where = ["enriched_at IS NULL", "char_count >= ?"]
    params: list = [effective_min]
    # ... rest unchanged
```

**Step 4: Run tests to verify they pass**

Run: `pytest tests/test_enrichment_threshold.py -v`
Expected: All 4 tests PASS

**Step 5: Commit**

```bash
git add src/brainlayer/vector_store.py tests/test_enrichment_threshold.py
git commit -m "feat: source-aware enrichment thresholds

WhatsApp messages ≥15 chars now qualify for enrichment (was 50).
Short WhatsApp messages like 'see you tonight probably' are meaningful
and contain style signal. Code snippets keep the 50-char threshold."
```

---

## Task 19: Regenerate Style Card from ALL DB Messages

**Files:**
- Create: `scripts/generate_style_card.py`
- Output: `~/.local/share/brainlayer/storage/golems/docs.local/style-card-v3.md`

**Context:** The last style card (v2) was generated on Feb 12 with ~11.6K enriched chunks.
Now we have 144K enriched chunks (53.6% coverage). The new card will be dramatically better.
Additionally, the style analyzer pulls ALL raw messages from the DB — including unenriched
short WhatsApp messages — because style analysis works on raw text, not enrichment fields.

**Step 1: Write a script that pulls ALL user messages from the DB**

```python
# scripts/generate_style_card.py
"""Generate style card from BrainLayer data.

Pulls ALL user messages from the DB (not just enriched) and feeds them
through SemanticStyleAnalyzer. Short messages are included because they
carry strong style signals (brevity, language switching, emoji usage).
"""
import apsw
from pathlib import Path
from brainlayer.pipeline.semantic_style import analyze_semantic_style

DB_PATH = Path.home() / ".local" / "share" / "brainlayer" / "brainlayer.db"
OUTPUT_DIR = Path.home() / ".local" / "share" / "brainlayer" / "storage" / "golems" / "docs.local"

def main():
    db = apsw.Connection(str(DB_PATH), flags=apsw.SQLITE_OPEN_READONLY)
    cur = db.cursor()

    # Pull ALL user messages (not just enriched) — style works on raw text
    # Include short messages: they carry style signal (brevity, language mix)
    # Minimum 10 chars to filter pure noise (emojis, "ok", "yes")
    messages = [
        row[0] for row in cur.execute("""
            SELECT content FROM chunks
            WHERE (content_type = 'user_message' OR
                   (source = 'whatsapp' AND content_type IS NULL))
            AND LENGTH(content) >= 10
            ORDER BY RANDOM()
            LIMIT 20000
        """)
    ]

    print(f"Analyzing {len(messages)} user messages (all sources, all lengths)...")
    analysis = analyze_semantic_style(messages, output_dir=OUTPUT_DIR, min_cluster_size=20)
    print(f"Generated style card with {len(analysis.topic_clusters)} topic clusters")

    # Print summary
    for name, cluster in analysis.topic_clusters.items():
        print(f"  {name}: {cluster.message_count} msgs, "
              f"formality={cluster.formality:.2f}, "
              f"langs={cluster.language_mix}")

    print(f"\nSaved to {OUTPUT_DIR}")

if __name__ == "__main__":
    main()
```

**Step 2: Run the script**

```bash
python3 scripts/generate_style_card.py
```

Expected: Style card v3 with ~20K messages including short WhatsApp messages.
Should show richer language-mix data and more topic clusters than v2.

**Step 3: Compare with v2**

```bash
diff ~/.golems-zikaron/style/style-card-v2.md \
     ~/.local/share/brainlayer/storage/golems/docs.local/semantic-style-rules.md
```

Expected: v3 has more clusters, better Hebrew/English detection, richer cross-topic insights.

**Step 4: Commit the script (not the output — personal data)**

```bash
git add scripts/generate_style_card.py
git commit -m "feat: style card generation from full DB

Pulls ALL user messages (not just enriched) for style analysis.
Includes short WhatsApp messages for language-mix and brevity signals.
20K message sample across all sources produces richer style profiles."
```

---

**Step 5: Run enrichment on newly-eligible WhatsApp chunks**

After Task 18's threshold change is in place, run enrichment to process the ~5K
newly-eligible WhatsApp messages (20-50 chars):

```bash
brainlayer enrich --source whatsapp --batch-size 100
```

Expected: ~4,966 new WhatsApp chunks enriched. Total WhatsApp enrichment goes from 18.5% → ~49%.

Then regenerate the style card again for the final v3 with enriched short messages.

**Step 2: Run the script**

```bash
python3 scripts/generate_style_card.py
```

Expected: Style card v3 generated with richer topic clusters and cross-topic insights.

**Step 3: Compare with v2**

```bash
diff ~/.golems-zikaron/style/style-card-v2.md ~/.local/share/brainlayer/storage/golems/docs.local/semantic-style-rules.md
```

Expected: v3 has more clusters, more nuanced insights, better language mix data.

**Step 4: Commit the script (not the output — personal data)**

```bash
git add scripts/generate_style_card.py
git commit -m "feat: add style card generation from enriched data

Pulls enriched user messages from DB, runs semantic style analysis.
Produces much richer style cards than raw WhatsApp/Claude export."
```

---

## Summary

| Task | What | Estimated Effort |
|------|------|-----------------|
| 1 | Install tools, verify access | 5 min |
| 2 | Clone + filter-repo extraction | 15 min |
| 3 | Clone old repo + verify junction | 10 min |
| 4 | Graft histories together | 20 min |
| 5 | Rename zikaron → brainlayer | 30 min |
| 6 | Centralized storage (TDD) | 30 min |
| 7 | Init wizard (TDD) | 30 min |
| 8 | Clean golems-specific files | 20 min |
| 9 | Hero README | 45 min |
| 10 | LICENSE + pyproject.toml | 10 min |
| 11 | GitHub Actions CI/CD | 15 min |
| 12 | Architecture + extension docs | 45 min |
| 13 | CHANGELOG + .gitignore | 10 min |
| 14 | Final verification | 15 min |
| 15 | Create GitHub repo + push | 10 min |
| 16 | Publish to PyPI | 15 min |
| 17 | Update golems monorepo | 20 min |
| 18 | Source-aware enrichment threshold (WhatsApp fix) | 20 min |
| 19 | Regenerate style card from ALL DB messages | 25 min |
| **Total** | | **~6.5 hours** |
