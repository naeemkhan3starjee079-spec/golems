---
name: cmux-agents
description: Spawn AI agents in cmux panes — Claude workers as splits, audits/research as surfaces. Covers Claude, Cursor, Gemini, Codex, Kiro, T3 Code. Includes monitoring, prompt delivery, and collab patterns. Use this skill whenever the user mentions cmux agents, terminal agents, split agents, multi-agent orchestration, or wants to spawn AI workers in visible terminal panes.
---

# cmux-agents

Spawn and manage AI agents in cmux terminal panes.

## First-Time Setup

**Check for `~/.golems/config.yaml`.** This is the golems ecosystem config — it has workspace path, tool paths, and feature flags.

If `~/.golems/config.yaml` does NOT exist, this is a first-time user. Before doing anything else:

1. **Auto-detect available AI CLIs:**
   ```bash
   which claude >/dev/null 2>&1 && echo "claude: $(which claude)" || echo "claude: NOT FOUND"
   which cursor >/dev/null 2>&1 && echo "cursor: $(which cursor)" || echo "cursor: NOT FOUND"
   which gemini >/dev/null 2>&1 && echo "gemini: $(which gemini)" || echo "gemini: NOT FOUND"
   which codex >/dev/null 2>&1 && echo "codex: $(which codex)" || echo "codex: NOT FOUND"
   which kiro-cli >/dev/null 2>&1 && echo "kiro: $(which kiro-cli)" || echo "kiro: NOT FOUND"
   ```

2. **Ask the user:**
   - Where do your repos live? (e.g., `~/Projects`, `~/Code`, `~/dev`)
   - Do you have custom Claude launchers (shell functions wrapping `claude`)? If so, what are they called?

3. **Write `~/.golems/config.yaml`:**
   ```yaml
   # Golems Configuration
   reposPath: "~/Projects"    # User's workspace root
   tools:
     claude: "/path/to/claude"
     cursor: "/path/to/cursor"   # omit if not installed
     gemini: "/path/to/gemini"   # omit if not installed
   ```

4. **Confirm and proceed** with the user's original request.

If `~/.golems/config.yaml` EXISTS, read it and use:
- `reposPath` → replaces `$WORKSPACE` in all commands below
- `tools.*` → determines which agents are available and their exact paths
- Only offer agents whose tools are listed in the config

## CRITICAL: Surface Discovery First

**BEFORE spawning or interacting with any surface, ALWAYS discover your environment:**

```bash
# 1. Where am I?
cmux list-workspaces                                    # Shows all workspaces, * = current
cmux list-panes                                         # Panes in current workspace
cmux list-pane-surfaces --pane pane:N                    # Surfaces in a pane, * = selected

# 2. Which surface is ME?
# YOUR surface is where this Claude session is running.
# NEVER cmux read-screen your own surface — you'll see yourself reading yourself.
# If unsure, check: the surface marked [selected] in YOUR pane is likely you.

# 3. Cross-workspace: ALWAYS pass --workspace
cmux list-panes --workspace workspace:N
cmux read-screen --surface surface:N --workspace workspace:N --lines 15
cmux send --surface surface:N --workspace workspace:N "command"
```

**Common mistake:** Reading `surface:27` thinking it's another agent, but it's YOU. Always verify by listing surfaces first.

## Agent Layout

| Role | Where | Why |
|------|-------|-----|
| **Workers** (Claude, implementation, collab) | `cmux new-split right` in current workspace | Visible side-by-side with you |
| **Audits/research** (Cursor, Gemini, read-only) | `cmux new-split down` or separate workspace | Accessible but not cluttering |

## CLI Syntax (VERIFIED — use exactly as shown)

| Agent | Command | Notes |
|-------|---------|-------|
| **Claude** (with custom launcher) | User's configured launcher (e.g., `myLauncher -s`) | If user has custom launchers in their config, use those. |
| **Claude** (standard) | `claude --dangerously-skip-permissions` | Default — works everywhere. |
| **Cursor** (audit, read-only) | `cursor agent --output-format text --model "gpt-5.3-codex-xhigh" "PROMPT"` | `--output-format text` for audits. |
| **Cursor** (work, edits files) | `cursor agent --model "gpt-5.3-codex-xhigh" "PROMPT"` | Omit `--output-format text` for work mode. |
| **Gemini** | `gemini "PROMPT"` | Global binary. Free tier, 2 RPM. 1M context. |
| **Codex** | `codex "PROMPT"` | Global binary. |
| **Kiro** | `kiro-cli "PROMPT"` | Text-only. |

**WRONG syntax (common mistakes):**
- ~~`claude -s`~~ — `-s` only works on custom launchers, not raw `claude`
- ~~`cursor -p "prompt"`~~ — `-p` is wrong. Use `cursor agent "PROMPT"`
- ~~`cursor agent --trust`~~ — `--trust` doesn't exist
- ~~`npx gemini`~~ — it's just `gemini`

### Claude Model Selection for cmux Agents

Opus is expensive and rate-limited. Use the cheapest model that fits the task.

| Model + Effort | Command Flag | Use When |
|----------------|-------------|----------|
| **Sonnet 4.6** | `--model sonnet` | Synthesis, research summaries, collab writers, design doc updates, BrainLayer queries |
| **Opus medium** | `--model opus --effort medium` | Code review, architecture decisions, multi-file analysis |
| **Opus full** | (default, no flag) | Your interactive session only. Complex reasoning, orchestration. |

```bash
# Sonnet agent (cheap, fast, good for most delegated tasks)
claude --dangerously-skip-permissions --model sonnet 'task prompt'

# Opus medium (when Sonnet isn't enough but full Opus is overkill)
claude --dangerously-skip-permissions --model opus --effort medium 'task prompt'

# With custom launchers — set model via env (if supported)
CLAUDE_MODEL=sonnet myLauncher -s
```

**Default rule:** If the agent is writing to a collab file, doing research, or synthesizing notes — use Sonnet. Save Opus for your own session.

### Cursor Model Tiers

| Model | Use When |
|-------|----------|
| `gpt-5.3-codex-xhigh` | Architecture audits, complex refactors |
| `gpt-5.3-codex-high` | Standard code review |
| `gpt-5.3-codex` | Quick checks |
| `auto` | Let Cursor route (free, subscription) |

## Pre-Flight Checklist

**Before spawning ANY agent:**
1. **Prompt audit** — Read [workflows/prompt-audit.md](workflows/prompt-audit.md) (MANDATORY — re-read if compacted) and run the checklist on every agent prompt. Checks: prior work, skill combos, TDD/PR-loop mandates, merge policy, BrainLayer checkpoints, monitoring instructions. Skip only for trivial one-off tasks.
2. Read collab/handoff file if one exists (may have reserved panes)
3. Map surfaces: `cmux list-panes` → `cmux list-pane-surfaces --pane pane:N`
4. Check for idle/reserved panes — reuse before creating new
5. If sending to an existing pane, clear it first (Ctrl-C + clear)

### Terminal State Validation (before sending to existing pane)

```bash
# Check if something is running in the pane
cmux read-screen --surface "$SURFACE" --lines 3
# If output exists or process is running:
cmux send --surface "$SURFACE" ""  # Ctrl-C
cmux send-key --surface "$SURFACE" C-c
sleep 1
cmux send --surface "$SURFACE" "clear"
cmux send-key --surface "$SURFACE" Return
sleep 1
# NOW it's safe to send your command
```

## Spawning Workers (split screen)

```bash
# 1. Check for idle panes first (DON'T always create new)
cmux list-panes
# If a handoff/collab file allocates panes, USE THOSE.
# If an idle pane exists, reuse it. Only create new if needed:

# 2. Split, label, launch
SURFACE=$(cmux new-split right 2>&1 | grep -oE 'surface:[0-9]+')
cmux rename-tab --surface "$SURFACE" "workerName"

# 3. Send command (short prompt)
cmux send --surface "$SURFACE" "cd $WORKSPACE/TARGET_REPO && claude --dangerously-skip-permissions"
cmux send-key --surface "$SURFACE" Return

# 4. Wait for boot, then send task
sleep 8
cmux send --surface "$SURFACE" "Your task description here"
cmux send-key --surface "$SURFACE" Return

# 5. MANDATORY: Verify it started (within 15s)
sleep 8
cmux read-screen --surface "$SURFACE" --lines 5
# Look for: prompt visible, no errors, thinking indicator
```

### Long Prompts (>200 chars)

**cmux send truncates long strings.** For long prompts, send in parts or use the two-step pattern:

```bash
# Option A: Send the agent command first, then the prompt separately
cmux send --surface "$SURFACE" "cd ~/Gits/repo && claude --dangerously-skip-permissions"
cmux send-key --surface "$SURFACE" Return
sleep 8  # Wait for Claude to boot
# Then send the prompt (can be long — Claude's input handles it)
cmux send --surface "$SURFACE" "Your long prompt text here..."
cmux send-key --surface "$SURFACE" Return

# Option B: For VERY long prompts, write to temp file
cat > /tmp/agent-prompt-$$.md << 'PROMPT_EOF'
Your very long prompt here...
Multiple paragraphs...
PROMPT_EOF
# Then tell the agent to read it
cmux send --surface "$SURFACE" "Read /tmp/agent-prompt-$$.md and execute the task described in it."
cmux send-key --surface "$SURFACE" Return
```

### Multiple Workers (sequential for 1Password biometric)

```bash
for task in "brainlayer:fix search ranking" "golems:add retry wrapper"; do
  repo="${task%%:*}"
  prompt="${task#*:}"
  SURFACE=$(cmux new-split right 2>&1 | grep -oE 'surface:[0-9]+')
  cmux rename-tab --surface "$SURFACE" "$repo"
  cmux send --surface "$SURFACE" "cd $WORKSPACE/$repo && claude --dangerously-skip-permissions"
  cmux send-key --surface "$SURFACE" Return
  sleep 8  # Wait for boot + Touch ID
  cmux send --surface "$SURFACE" "$prompt"
  cmux send-key --surface "$SURFACE" Return
  sleep 3  # Touch ID between spawns
done
```

## Spawning Audits/Research

Audits don't need to be side-by-side. Use a down-split or separate workspace.

```bash
# Down-split in current workspace
SURFACE=$(cmux new-split down 2>&1 | grep -oE 'surface:[0-9]+')
cmux rename-tab --surface "$SURFACE" "Audit: reponame"
cmux send --surface "$SURFACE" "cd $WORKSPACE/TARGET_REPO && cursor agent --output-format text --model \"gpt-5.3-codex-xhigh\" \"Your audit prompt\""
cmux send-key --surface "$SURFACE" Return

# Verify it started
sleep 5
cmux read-screen --surface "$SURFACE" --lines 5
```

### Cursor audit with structured output

```bash
cmux send --surface "$SURFACE" "cd $WORKSPACE/my-project && cursor agent --output-format text --model \"gpt-5.3-codex-xhigh\" \"<output_contract>Return: summary, issues, severity, recommended fixes. Format as markdown.</output_contract> Audit the codebase for security issues.\""
cmux send-key --surface "$SURFACE" Return
```

## Monitoring (MANDATORY — You Are the Parent)

**You spawned these agents. They are YOUR responsibility. Know what they're doing at all times.**

The user should NEVER have to ask "what's happening with the agents?" If they do, you failed. The orchestrator must proactively track every spawned agent — read their screens, check their output files, and be ready to report status before being asked.

### After Spawning: Verify (within 15s)

```bash
cmux read-screen --surface surface:N --lines 8
# Confirm: agent booted, prompt received, working
```

### During Work: Periodic Check-Ins

Check on your agents at natural milestones in YOUR work, or every ~5 minutes if you're idle. Don't wait for them to finish — know their progress.

```bash
# Quick status sweep of all agents
for pane in $(cmux list-panes | grep -oE 'pane:[0-9]+'); do
  echo "--- $pane ---"
  SURF=$(cmux list-pane-surfaces --pane "$pane" | grep -oE 'surface:[0-9]+' | head -1)
  cmux read-screen --surface "$SURF" --lines 5 2>&1
done
```

### On Completion: Capture Results Immediately

When an agent finishes, read its output RIGHT AWAY. Don't wait for the user to ask.

```bash
# Agent done? Read the result
cmux read-screen --surface surface:N --lines 30

# If agent wrote to a file, read it
# Read ~/path/to/output.md
```

### Track Agent Registry

Keep a mental map of what you spawned. If you spawned 5 agents, you should be able to report:

| Surface | Agent | Task | Status | Last checked |
|---------|-------|------|--------|-------------|
| surface:92 | BrainLayer auditor | journey-audit-brainlayer.md | Writing (64% ctx) | 2min ago |
| surface:93 | Git auditor | journey-audit-git.md | Done (idle prompt) | just now |

### Anti-Patterns

- **Fire and forget** — spawning agents and moving on without checking. You WILL miss failures.
- **Checking only when user asks** — by then the agent may have been stuck for 20 minutes.
- **Not reading output files** — the agent finished and wrote results, but you never read them. User asks "what did it find?" and you have no answer.
- **Using Task tool background agents when user says "cmux agents"** — Task tool agents are invisible. cmux agents are VISIBLE in panes. The user wants to SEE them working. Always use Skill('cmux-agents') and spawn real panes.

### Send Follow-Up Instructions

```bash
cmux send --surface surface:N "additional instructions"
cmux send-key --surface surface:N Return
```

### Error Patterns to Watch For

| Screen Output | Problem | Fix |
|---------------|---------|-----|
| `error: unknown option` | Wrong CLI flag | Check syntax table above |
| `SessionStart hook error` | Hook script failed | Use `-s` flag or check hooks |
| `command not found` | Binary not installed | `which gemini`, `which codex` |
| Empty prompt / no response | Prompt was cut off | Use long-prompt pattern |
| `Error: invalid_params: Surface is not a terminal` | Surface is a browser pane | Use `list-pane-surfaces` to find terminal surfaces |
| Agent exits immediately | Agent crashed or wrong dir | Check `cd` path, try again |
| BrainLayer timeout / MCP hang | Multiple agents hitting BrainLayer simultaneously | Run BrainLayer agents sequentially — SQLite locks on concurrent access |

## Collab Pattern (orchestrator + multiple agents)

```bash
# 1. Write collab file FIRST (from template)
# 2. Spawn agents with collab instructions
for entry in "search:Agent1" "performance:Agent2" "security:Agent3"; do
  angle="${entry%%:*}"
  name="${entry#*:}"
  SURFACE=$(cmux new-split right 2>&1 | grep -oE 'surface:[0-9]+')
  cmux rename-tab --surface "$SURFACE" "$name"
  cmux send --surface "$SURFACE" "cd $WORKSPACE/TARGET_REPO && claude --dangerously-skip-permissions"
  cmux send-key --surface "$SURFACE" Return
  sleep 8
  cmux send --surface "$SURFACE" "Read $WORKSPACE/collab/COLLAB_FILE.md — you are $name. Claim the $angle task. Update the collab when done."
  cmux send-key --surface "$SURFACE" Return
  sleep 3
done

# 3. Monitor with cron (every 5 min)
# CronCreate: Read collab file, check surfaces for progress
```

## T3 Code (Browser Agent)

**Prerequisite:** `bun install -g @openai/codex` (T3 requires codex CLI).

```bash
# 1. Start T3 server
SURFACE=$(cmux new-split down 2>&1 | grep -oE 'surface:[0-9]+')
cmux rename-tab --surface "$SURFACE" "T3 Server"
cmux send --surface "$SURFACE" "cd $WORKSPACE/TARGET_REPO && npx t3@alpha --no-browser"
cmux send-key --surface "$SURFACE" Return
sleep 8  # T3 needs 5-8s to initialize

# 2. Open in cmux browser
cmux browser open "http://localhost:3773"
sleep 3

# 3. Type prompt via execCommand (works with Lexical editors)
cmux browser --surface surface:BROWSER click 'div[data-lexical-editor]'
sleep 0.3
cmux browser --surface surface:BROWSER eval "
var editor = document.querySelector('[data-lexical-editor]');
editor.focus();
document.execCommand('insertText', false, 'Your prompt here');
"

# 4. Submit
cmux browser --surface surface:BROWSER eval "
var btn = document.querySelector('button[aria-label=\"Send message\"]');
if (btn) { btn.click(); 'sent'; } else { 'send button not found'; }
"
```

**T3 gotchas:**
- Always start a NEW thread before sending prompts (don't type into old thread)
- `eval` doesn't support Promises — sync JS only, use `var` not `let/const`
- Always request a handoff summary at end of prompt for PR loop context

## Agent Selection Guide

| Need | Agent | Why |
|------|-------|-----|
| Deep reasoning, architecture | Claude Opus (worker split) | Best reasoning |
| Codebase-wide audit | Cursor + `@codebase` | Has codebase indexing |
| Structured output (JSON, tables) | Cursor + `<output_contract>` | GPT follows format contracts |
| Free research, large context | Gemini | Free, 1M context |
| Parallel implementation | Multiple Claude workers | Each in own split |
| Different blind spots | Mix Claude + Cursor on same task | Cross-model verification |
| UI/visual work | T3 in browser pane | Visual editor |

## Native Agent Teams (Fire-and-Forget Only)

Claude Code has native Agent Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). They use tmux, shared task lists, and a mailbox system for inter-agent communication.

**cmux-agents stays PRIMARY.** Agent Teams is for background fire-and-forget work only.

| Scenario | Use | Why |
|----------|-----|-----|
| Need to SEE agents working (side-by-side panes) | **cmux-agents** | Visibility is the point — you watch, steer, catch problems |
| Non-Claude agents (Gemini, Codex, Cursor, Kiro, T3) | **cmux-agents** | Agent Teams is Claude-only |
| Mixed vendor orchestration | **cmux-agents** | Only cmux can run different CLI agents together |
| Fire-and-forget Claude-to-Claude work (no visibility needed) | **Agent Teams** | Shared task list + mailbox, agents coordinate autonomously |
| Parallel research where you don't need to watch | **Agent Teams** | Lower overhead than managing cmux panes |

**Do NOT default to Agent Teams.** The user wants visibility — side-by-side panes where you can read-screen, steer, and catch failures. Agent Teams hides everything behind tmux. Use it only when explicitly told "I don't need to see this" or for background work you'll check later.

## Prompting Tips

**Claude:** Natural language. Long context at top, task at bottom.
**Cursor/GPT:** Use `<output_contract>` tags for structured output.
**Gemini:** Explicit section headers, numbered lists.

## Pane Lifecycle

**NEVER kill reserved panes.** If an agent crashes or you need to restart:

```bash
# WRONG: cmux kill-pane (destroys the pane)
# RIGHT: Exit the agent, respawn in same pane
cmux send --surface "$SURFACE" "/exit"    # Exit Claude gracefully
cmux send-key --surface "$SURFACE" Return
sleep 2
# Respawn new agent in same pane
cmux send --surface "$SURFACE" "cd ~/Gits/repo && claude --dangerously-skip-permissions"
cmux send-key --surface "$SURFACE" Return
```

## Done Signals

When telling agents to signal completion, instruct them to put the signal **as the very last line before CLAUDE_COUNTER** — not buried above a summary block. Otherwise `read-screen --lines 10` won't catch it.

```
# In your prompt to the agent:
"When done, end your response with DONE_SIGNAL_NAME on its own line, right before CLAUDE_COUNTER."
```

## Collab Update Protocol

**Every agent action must be logged in the collab file:**

```bash
# After EVERY spawn:
# Update collab: "Spawned Agent X on surface:N for task Y"

# After EVERY completion:
# Update collab: "Agent X completed. Results: ..."

# Before exit/context death:
# Update collab: "BLOCKED: ..." or "Status: ... Next: ..."
```

**No silent work.** If you spawned 3 agents, the collab should show 3 spawn entries + 3 status entries. The user should NEVER have to ask "what's happening?"

## Cleanup

**When done with agents:**
1. `/exit` agents gracefully — don't kill panes
2. Close splits you created (only if not reserved in collab/handoff)
3. If you killed a T3 server, close its browser surface too
4. Kill stale processes: `ps aux | grep -E 'cursor|gemini|codex' | grep -v grep`

## Rules

1. **Pre-flight checklist FIRST** — read collab, map surfaces, check for reserved panes
2. **Discover surfaces BEFORE acting** — list-workspaces → list-panes → list-pane-surfaces
3. **NEVER read-screen your own surface** — you'll see recursive output
4. **Ctrl-C before sending to existing panes** — clear terminal state first
5. **Verify after launch** — read-screen within 15s, check for errors
6. **Workers = splits, audits = down-splits or separate workspace**
7. **Sequential launch** — 1Password biometric needs ~3s between spawns
8. **Long prompts → temp file or two-step** — cmux send can cut off long strings
9. **Cross-workspace: always pass --workspace** — surfaces are workspace-scoped
10. **Name everything** — cmux rename-tab on every surface
11. **NEVER kill reserved panes** — only `/exit` agent, respawn in same pane
12. **Update collab after every action** — spawns, completions, blockers
13. **Verify cursor findings** — check `git ls-files` before acting on cursor reports
14. **Clean up when done** — close non-reserved splits, kill stale processes
15. **Specialist agents don't self-modify** — an agent using a skill should NOT modify that skill's code. The agent that USES the skill provides feedback; a DIFFERENT agent implements improvements. Keep skill usage and skill development separate.
