---
name: cmux
description: Use when running inside cmux terminal to control panes, splits, browser, sidebar, and coordinate multi-agent workflows. Covers split panes, notifications, browser automation, agent-to-agent messaging via cmux send. NOT for: regular terminal operations (use Bash), non-cmux sessions.
---

# cmux Terminal Control

> Teach agents to drive cmux: split panes, notify, open browser, coordinate with other agents.

## Detect cmux

Always check first — skip gracefully if not in cmux:

```bash
if ! command -v cmux &>/dev/null || ! cmux identify --json &>/dev/null; then
  echo "Not in cmux — skipping cmux operations"
  exit 0
fi
```

## Self-Identification

```bash
# Get your own location
cmux identify --json
# → { "surface_ref": "surface:4", "pane_ref": "pane:5", "workspace_ref": "workspace:2" }
```

## Identify & Navigate

```bash
# Get your current surface/pane/workspace refs
cmux identify

# List all workspaces
cmux list-workspaces

# List panes in current workspace
cmux list-panes

# List surfaces (tabs) in a pane
cmux list-pane-surfaces --pane pane:1
```

## Splits (Most Common)

```bash
# Split current surface left/right/up/down
cmux new-split right    # adds a right split in current workspace
cmux new-split down

# Get the new surface ref after splitting
cmux list-pane-surfaces --pane pane:1

# Close a surface
cmux close-surface --surface surface:5
```

## Workspaces (New Tabs)

```bash
# New workspace (new sidebar tab)
cmux new-workspace

# Focus a workspace
cmux focus-pane --pane pane:2

# Rename the tab label
cmux rename-tab --surface surface:3 "🤖 Agent Name"
```

## Send Commands to Panes

```bash
# Send text (as if typed) to a surface
cmux send --surface surface:3 "cd ~/Gits/golems && claude 'prompt here'\n"

# Send a single key
cmux send-key --surface surface:3 Return

# Note: \n at end of send = auto-press Enter to run
```

## Notifications

```bash
# Notification ring (tab lights up in sidebar)
cmux notify "Title" "Body text"

# Workspace-action for custom sidebar label
cmux workspace-action --action set-title --title "🤖 orcClaude"
```

## In-App Browser

```bash
# Open browser pane (splits alongside terminal)
cmux new-pane --type browser --direction right --url "http://localhost:3000"

# Navigate existing browser surface
cmux browser navigate "http://localhost:3000/new-page"

# Browser tab management
cmux browser tab new "https://docs.example.com"
cmux browser tab list
```

## Agent-to-Agent Messaging

```bash
# Send text to another agent's surface
cmux send --surface surface:6 "STATUS: done with auth module, ready for review"

# Envelope format for deterministic messaging:
# [FROM=surface:A TO=surface:B TYPE=TYPE] key=val
cmux send --surface surface:6 \
  "[FROM=surface:1 TO=surface:6 TYPE=TASK] repo=golems task=fix-tests"
```

## Parallel Agent Fan-out Pattern

```bash
# 1. Identify self
MY_SURFACE=$(cmux identify | jq -r '.caller.surface_ref')
MY_WS=$(cmux identify | jq -r '.caller.workspace_ref')

# 2. Spawn 3 splits, each running claude on different repos
for repo in brainlayer golems voicelayer; do
  NEW_SURFACE=$(cmux new-split right --workspace "$MY_WS" | awk '{print $2}')
  cmux rename-tab --surface "$NEW_SURFACE" "🤖 $repo"
  sleep 0.5
  cmux send --surface "$NEW_SURFACE" "cd ~/Gits/$repo && claude 'your task here'\n"
done
```

## golem-terminal Integration Note

These cmux patterns are the reference implementation for golem-terminal's UDS API. The golem-terminal equivalents:

| cmux | golem-terminal |
|------|---------------|
| `cmux split` | `orchestrate.py split <slot>` |
| `cmux notify` | HTTP POST localhost:3847/notify |
| `cmux sidebar set` | UDS `status` command |
| `cmux send` | UDS `send_input` command |
| `cmux open-browser` | Built into sidebar pane |

## Rules

1. **Always detect cmux first** — don't assume you're in cmux
2. **Use envelope format** for agent messages — prevents cross-pane confusion
3. **Set sidebar status** at task start + end — gives user visibility
4. **Notify on completion** — ring is better than polling
5. **Don't spawn too many panes** — 4-6 max, cmux gets crowded
