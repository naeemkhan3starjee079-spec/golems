#!/usr/bin/env python3
"""
Golems project hook: block dangerous and incorrect commands.

Deterministic enforcement of rules that were previously in CLAUDE.md / .claude/rules/*.md.
Hooks can't be bypassed by the LLM — they run before the tool executes.

Exit codes:
  0 = allow
  2 = block (with JSON reason on stdout)

Environment:
  AUTONOMOUS=1  — bypasses git push/commit blocks (set by ralph, night-shift, PR loops)

Rules enforced:
  1. git push without AUTONOMOUS=1 → BLOCK
  2. git commit without AUTONOMOUS=1 → BLOCK
  3. npm commands → BLOCK (use bun)
  4. python (not python3) → BLOCK
  5. Chrome/Safari → BLOCK (use Brave)
  6. git status -uall → BLOCK
  7. Supabase DDL via execute_sql → BLOCK (use apply_migration)
  8. Kilo in blocked directories → BLOCK
  9. SVG file creation → BLOCK (use lucide-react)

Source rules (now enforced by hook, removed from rule files):
  - ~/.claude/CLAUDE.md: commit rules, tool preferences
  - .claude/rules/golems-base.md: SVG rule
  - .claude/rules/tech-supabase.md: DDL rule
  - .claude/rules/kilo-safety.md: directory blocks
"""

import json
import sys
import os
import re


AUTONOMOUS = os.environ.get("AUTONOMOUS") == "1"

# Directories where Kilo is blocked (matches any path component)
KILO_BLOCKED_PATTERNS = [
    "golems", "brainlayer", ".claude", ".golems-zikaron",
    "zikaron", ".local/share/brainlayer",
]


def block(reason):
    """Output block JSON and exit with code 2."""
    json.dump({
        "decision": "block",
        "reason": reason,
    }, sys.stdout)
    sys.exit(2)


def check_bash(command):
    """Check Bash commands for blocked patterns."""
    stripped = command.strip()

    # 1. git push (unless AUTONOMOUS)
    if re.match(r"git\s+push\b", stripped) and not AUTONOMOUS:
        block(
            "git push blocked — need explicit permission or AUTONOMOUS=1. "
            "Ask the user before pushing."
        )

    # 2. git commit (unless AUTONOMOUS)
    if re.match(r"git\s+commit\b", stripped) and not AUTONOMOUS:
        block(
            "git commit blocked — need explicit permission or AUTONOMOUS=1. "
            "Ask the user before committing."
        )

    # 3. npm commands → use bun
    if re.match(r"npm\s+(install|run|test|ci|init|start|build|exec)\b", stripped):
        bun_cmd = re.sub(r"^npm\b", "bun", stripped, count=1)
        block(f"Use bun instead of npm. Try: {bun_cmd}")

    # 4. python (not python3) — catch both "python script.py" and bare "python"
    if re.match(r"python(\s|$)", stripped) and not stripped.startswith("python3"):
        block("Use python3, not python.")

    # 5. Chrome/Safari → Brave
    if re.search(r'open\s+-a\s+["\']?(Google Chrome|Safari)', stripped):
        block("Use Brave, not Chrome/Safari. Try: open -a 'Brave Browser'")

    # 6. git status -uall (match actual command, not substrings in commit messages)
    if re.match(r"git\s+status\b", stripped) and "-uall" in stripped:
        block("Don't use -uall — can cause memory issues on large repos. Use: git status -u")

    # 8. Kilo in blocked directories
    if re.match(r"kilo\b", stripped) or "run.sh kilo" in stripped:
        cwd = os.getcwd()
        for pattern in KILO_BLOCKED_PATTERNS:
            if pattern in cwd:
                block(
                    f"Kilo blocked in {cwd}. "
                    "Only use Kilo in: songscript, domica, union, rudy"
                )


def check_supabase_ddl(tool_input):
    """7. Block DDL statements via execute_sql — must use apply_migration."""
    sql = tool_input.get("sql", "")
    if re.search(r"\b(CREATE|ALTER|DROP|TRUNCATE)\b", sql, re.IGNORECASE):
        block(
            "DDL must use mcp__supabase__apply_migration, not execute_sql. "
            "Migrations are tracked and reversible."
        )


def check_svg_creation(file_path):
    """9. Block SVG file creation — use lucide-react instead."""
    if file_path.endswith(".svg"):
        block("Don't create SVG files. Use lucide-react icons instead.")


def main():
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = hook_input.get("tool_name", "")
    tool_input = hook_input.get("tool_input", {})

    # Bash commands
    if tool_name == "Bash":
        check_bash(tool_input.get("command", ""))

    # Supabase execute_sql DDL check
    if tool_name == "mcp__supabase__execute_sql":
        check_supabase_ddl(tool_input)

    # SVG creation via Write or Edit
    if tool_name in ("Write", "Edit"):
        check_svg_creation(tool_input.get("file_path", ""))

    # Allow by default
    sys.exit(0)


if __name__ == "__main__":
    main()
