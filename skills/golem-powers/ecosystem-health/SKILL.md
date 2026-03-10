---
name: ecosystem-health
description: "Run ecosystem health checks — MCP connections, BrainLayer stats, skill evals, friction scans. Use this skill when asked about ecosystem health, maintenance checks, skill monitoring, 'is everything working', 'run a health check', 'what's broken', or when proactively auditing the system. Also triggers for 'maintenance Claude', 'ecosystem audit', 'skill eval', 'MCP status', or 'BrainLayer health'. Run this before and after major changes to catch regressions."
---

# Ecosystem Health Check

Audit the golems ecosystem: MCP servers, BrainLayer, skills, friction patterns. Two modes: quick (2-3 min) and deep (10-15 min).

## Why This Exists

The ecosystem has 22 repos, 45+ skills, 2 MCP servers (BrainLayer, VoiceLayer), a 7GB semantic memory store, and multiple long-lived Claude sessions. Things break silently — MCP disconnects, WAL files grow, skills degrade, friction accumulates. This skill catches those problems before the user notices.

## Quick Check (weekly)

Run these in order. Stop and report if anything is red.

### 1. MCP Connectivity

```bash
# BrainLayer
brain_recall(mode="stats")
# Expected: chunk count, entity count, last enrichment time
# RED if: timeout, error, or chunk count dropped

# VoiceLayer
voice_speak(message="Health check ping", mode="think")
# Expected: silent log, no error
# RED if: timeout or MCP unavailable
```

### 2. BrainLayer Vitals

```bash
python3 -c "
import sqlite3, os
db = os.path.expanduser('~/.local/share/zikaron/zikaron.db')
conn = sqlite3.connect(db + '?mode=ro', uri=True)
chunks = conn.execute('SELECT COUNT(*) FROM chunks').fetchone()[0]
wal_size = os.path.getsize(db + '-wal') if os.path.exists(db + '-wal') else 0
db_size = os.path.getsize(db)
print(f'Chunks: {chunks}')
print(f'DB size: {db_size / 1e9:.1f} GB')
print(f'WAL size: {wal_size / 1e6:.0f} MB')
print(f'WAL ratio: {wal_size / db_size * 100:.1f}%')
conn.close()
"
```

**Thresholds:**
- WAL > 100MB = YELLOW (checkpoint needed)
- WAL > 500MB = RED (queries will timeout)
- DB growing > 500MB/week = investigate enrichment
- Chunk count dropped = RED (data loss)

**Fix WAL:** `python3 -c "import sqlite3,os; c=sqlite3.connect(os.path.expanduser('~/.local/share/zikaron/zikaron.db')); c.execute('PRAGMA wal_checkpoint(PASSIVE)'); c.close()"`
If PASSIVE doesn't shrink: kill stale brainlayer-mcp processes first (`pgrep -fl brainlayer`), then retry with RESTART.

### 3. MCP Process Health

```bash
# Count brainlayer-mcp processes (should be 1-3, not 7+)
pgrep -fl brainlayer-mcp | wc -l
# Count voicelayer-mcp processes
pgrep -fl voicelayer-mcp | wc -l
```

**Thresholds:**
- brainlayer-mcp > 4 = YELLOW (stale sessions, kill oldest)
- voicelayer-mcp > 3 = YELLOW
- Any MCP at 100% CPU = RED (check with `top -l 1 -pid PID`)

### 4. Skill Inventory

```bash
ls ~/.claude/commands/ | wc -l
# Expected: ~42-45 skills
# If count dropped: check symlinks
ls -la ~/.claude/commands/ | grep -c "broken"
```

### 5. Active Sessions

```bash
# Check for zombie Claude sessions
pgrep -fl "claude" | grep -v "claude-code" | wc -l
# Check cmux workspace health
cmux list-workspaces
cmux surface-health
```

## Deep Check (monthly)

Everything in Quick Check, plus:

### 6. Friction Scan

```bash
python3 ~/Gits/orchestrator/scripts/friction-scan.py --threshold 5
```

Compare results against previous scan (state file at `~/.local/share/zikaron/friction-scan-state.json`). Look for:
- New friction categories appearing
- Same friction recurring (not getting fixed)
- Friction count trending up or down

### 7. Skill Eval Sampling

Pick 3-5 skills from different domains. For each, check that the eval directory exists and has test cases:

```bash
for skill in coach pr-loop commit research cli-agents; do
  echo "=== $skill ==="
  ls ~/Gits/orchestrator/skill-evals/$skill/ 2>/dev/null || echo "NO EVALS"
done
```

For skills with evals, run one test case and verify it passes. Use the skill-creator eval framework if available.

### 8. Cross-Repo Staleness

Check which repos have recent activity:
```bash
for repo in golems brainlayer voicelayer orchestrator 6pm-mini domica; do
  last=$(git -C ~/Gits/$repo log -1 --format="%ar" 2>/dev/null || echo "not found")
  echo "$repo: $last"
done
```

Repos with no activity > 2 weeks during active development = investigate.

### 9. BrainLayer Search Quality

Run 3 known-good queries and verify they return expected results:

```
brain_search("component reasoning brainlayer-session-start")
# Expected: manual-f9c5a44d5f3a4fef chunk

brain_search("friction patterns coachClaude categories")
# Expected: friction research from March 7

brain_search("orchestrator golem concept architecture")
# Expected: architectural overview
```

If any return empty or irrelevant results, search quality has degraded — check FTS5 index, embedding generation.

### 10. Hook Health

```bash
# Check hooks exist and are executable
ls -la ~/.claude/hooks/brainlayer-*.py
# Check hook settings
cat ~/.claude/settings.json | python3 -m json.tool | grep -A5 "hooks"
```

Verify: SessionStart and UserPromptSubmit hooks are wired. No PostToolUse hooks (those cause hangs).

## Report Format

After running checks, produce a summary:

```markdown
# Ecosystem Health Report — YYYY-MM-DD

## Status: GREEN / YELLOW / RED

### Quick Checks
| Check | Status | Value | Notes |
|-------|--------|-------|-------|
| BrainLayer MCP | GREEN | 268K chunks | responding in <1s |
| VoiceLayer MCP | YELLOW | connected | disconnects reported |
| WAL size | RED | 313MB | needs checkpoint |
| MCP processes | YELLOW | 7 brainlayer | kill stale ones |
| Skills count | GREEN | 45 | all symlinks valid |

### Deep Checks (if run)
| Check | Status | Notes |
|-------|--------|-------|
| Friction scan | ... | N new candidates |
| Skill evals | ... | N/M passing |
| Search quality | ... | 3/3 queries returned expected |

### Actions Needed
1. [specific action]
2. [specific action]
```

Store the report in BrainLayer:
```
brain_store(content: "Ecosystem health report YYYY-MM-DD: [summary]", tags: ["health-check", "ecosystem", "maintenance"], importance: 7)
```

## Automation (future)

This skill is designed to be run by a Scheduled Task or cron job:
- Weekly quick check: Monday 9am
- Monthly deep check: First Sunday of month
- On-demand: whenever user asks

The friction-scan.py script already has state tracking. Future: add state tracking to all checks so we can trend over time.
