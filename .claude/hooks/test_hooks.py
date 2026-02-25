#!/usr/bin/env python3
"""
Test suite for block-dangerous-commands.py hook.
Simulates hook input and verifies block/allow behavior.
"""

import json
import subprocess
import sys
import os

HOOK_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "block-dangerous-commands.py")

# Force CWD to a golems path for deterministic Kilo tests
GOLEMS_CWD = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

passed = 0
failed = 0


def run_hook(tool_name, tool_input, env_override=None, cwd=None):
    """Run the hook with given input, return (exit_code, stdout)."""
    hook_input = json.dumps({
        "tool_name": tool_name,
        "tool_input": tool_input,
        "session_id": "test-session",
    })
    env = os.environ.copy()
    env.pop("AUTONOMOUS", None)
    if env_override:
        env.update(env_override)

    result = subprocess.run(
        ["python3", HOOK_PATH],
        input=hook_input,
        capture_output=True,
        text=True,
        env=env,
        cwd=cwd,
        timeout=10,
    )
    return result.returncode, result.stdout


def expect_block(test_name, tool_name, tool_input, expected_substr=None, env_override=None, cwd=None):
    global passed, failed
    code, stdout = run_hook(tool_name, tool_input, env_override, cwd=cwd)
    if code == 2:
        if expected_substr and expected_substr not in stdout:
            print(f"  FAIL: {test_name} -- blocked but reason missing '{expected_substr}'")
            print(f"        Got: {stdout[:120]}")
            failed += 1
        else:
            print(f"  PASS: {test_name}")
            passed += 1
    else:
        print(f"  FAIL: {test_name} -- expected block (exit 2), got exit {code}")
        failed += 1


def expect_allow(test_name, tool_name, tool_input, env_override=None, cwd=None):
    global passed, failed
    code, _ = run_hook(tool_name, tool_input, env_override, cwd=cwd)
    if code == 0:
        print(f"  PASS: {test_name}")
        passed += 1
    else:
        print(f"  FAIL: {test_name} -- expected allow (exit 0), got exit {code}")
        failed += 1


print("=== Testing block-dangerous-commands.py ===\n")

# 1. git push
print("1. git push blocking:")
expect_block("git push blocked", "Bash", {"command": "git push origin main"}, "git push blocked")
expect_block("git push -u blocked", "Bash", {"command": "git push -u origin feat/test"}, "git push blocked")
expect_allow("git push with AUTONOMOUS=1", "Bash", {"command": "git push origin main"}, {"AUTONOMOUS": "1"})
expect_allow("grep git push (not a push)", "Bash", {"command": "grep 'git push' README.md"})

# 2. git commit
print("\n2. git commit blocking:")
expect_block("git commit blocked", "Bash", {"command": "git commit -m 'test'"}, "git commit blocked")
expect_allow("git commit with AUTONOMOUS=1", "Bash", {"command": "git commit -m 'test'"}, {"AUTONOMOUS": "1"})
expect_allow("git log --oneline (not a commit)", "Bash", {"command": "git log --oneline"})

# 3. npm -> bun
print("\n3. npm -> bun redirect:")
expect_block("npm install blocked", "Bash", {"command": "npm install react"}, "bun")
expect_block("npm run blocked", "Bash", {"command": "npm run build"}, "bun")
expect_block("npm test blocked", "Bash", {"command": "npm test"}, "bun")
expect_allow("npx allowed", "Bash", {"command": "npx convex dev"})

# 4. python -> python3
print("\n4. python -> python3:")
expect_block("python blocked", "Bash", {"command": "python script.py"}, "python3")
expect_block("bare python blocked", "Bash", {"command": "python"}, "python3")
expect_allow("python3 allowed", "Bash", {"command": "python3 script.py"})
expect_allow("grep python (not command)", "Bash", {"command": "grep python requirements.txt"})

# 5. Chrome/Safari
print("\n5. Chrome/Safari -> Brave:")
expect_block("Chrome blocked", "Bash", {"command": 'open -a "Google Chrome" http://example.com'}, "Brave")
expect_block("Safari blocked", "Bash", {"command": "open -a Safari http://example.com"}, "Brave")
expect_allow("Brave allowed", "Bash", {"command": "open -a 'Brave Browser' http://example.com"})

# 6. git status -uall
print("\n6. git status -uall:")
expect_block("-uall blocked", "Bash", {"command": "git status -uall"}, "-uall")
expect_allow("git status allowed", "Bash", {"command": "git status"})
expect_allow("git status -u allowed", "Bash", {"command": "git status -u"})
expect_allow("commit msg mentions -uall (false positive)", "Bash", {"command": "git commit -m 'block git status -uall'"}, {"AUTONOMOUS": "1"})

# 7. Supabase DDL
print("\n7. Supabase DDL via execute_sql:")
expect_block("CREATE TABLE blocked", "mcp__supabase__execute_sql", {"sql": "CREATE TABLE users (id int)"}, "apply_migration")
expect_block("ALTER TABLE blocked", "mcp__supabase__execute_sql", {"sql": "ALTER TABLE users ADD COLUMN name text"}, "apply_migration")
expect_block("DROP TABLE blocked", "mcp__supabase__execute_sql", {"sql": "DROP TABLE users"}, "apply_migration")
expect_block("DDL with newline", "mcp__supabase__execute_sql", {"sql": "CREATE\nTABLE users (id int)"}, "apply_migration")
expect_block("DDL lowercase", "mcp__supabase__execute_sql", {"sql": "create table users (id int)"}, "apply_migration")
expect_allow("SELECT allowed", "mcp__supabase__execute_sql", {"sql": "SELECT * FROM users"})
expect_allow("INSERT allowed", "mcp__supabase__execute_sql", {"sql": "INSERT INTO users VALUES (1, 'test')"})

# 8. Kilo in blocked dirs (deterministic — always use golems CWD)
print("\n8. Kilo in blocked directories:")
expect_block("kilo in golems dir", "Bash", {"command": "kilo 'analyze code'"}, "Kilo blocked", cwd=GOLEMS_CWD)
expect_block("run.sh kilo in golems dir", "Bash", {"command": "run.sh kilo 'analyze'"}, "Kilo blocked", cwd=GOLEMS_CWD)
expect_allow("kilo in safe dir", "Bash", {"command": "kilo 'analyze'"}, cwd="/tmp")

# 9. SVG creation
print("\n9. SVG file creation:")
expect_block("Write SVG blocked", "Write", {"file_path": "/tmp/icon.svg", "content": "<svg>...</svg>"}, "SVG")
expect_block("Edit SVG blocked", "Edit", {"file_path": "/tmp/icon.svg", "old_string": "a", "new_string": "b"}, "SVG")
expect_allow("Write TS allowed", "Write", {"file_path": "/tmp/icon.ts", "content": "export default 1"})

# 10. Edge cases
print("\n10. Edge cases:")
expect_allow("Read tool passthrough", "Read", {"file_path": "/tmp/test.txt"})
expect_allow("Grep tool passthrough", "Grep", {"pattern": "test"})
expect_allow("Empty bash allowed", "Bash", {"command": ""})

# Summary
print(f"\n{'='*40}")
print(f"Results: {passed} passed, {failed} failed, {passed + failed} total")
if failed > 0:
    sys.exit(1)
else:
    print("All tests passed!")
    sys.exit(0)
