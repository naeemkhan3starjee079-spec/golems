---
name: wizard
description: First-time onboarding wizard for the golems ecosystem. Detects installed AI CLIs, configures workspace, sets up skills. Use when setting up golems for the first time, reconfiguring, or onboarding a new machine.
---

# Golems Setup Wizard

> Claude-powered first-time setup. Detects your environment, writes config, installs skills.

## CARDINAL RULE

**ALL opt-in features are OFF by default.** The user must explicitly enable each one. No surprises, no unsolicited notifications, no background tasks unless the user says yes.

## Pre-Step: Detect Execution Mode

Before starting, determine HOW the wizard is running:

1. **CLI mode** — user ran `npx golems-cli wizard` from a terminal. Use interactive prompts (readline).
2. **Skill mode** — user invoked `/wizard` or pasted an INSTALL_PROMPT.md into a Claude Code session. Use Claude's native tools (Bash for detection, Write for config, conversation for questions).

In skill mode, use the Bash tool for `which` checks and the Write tool for config — do NOT attempt readline prompts.

## Pre-Step: Explain on Request

If the user asks "what are skills?" or seems unfamiliar with the golems ecosystem, pause and explain before proceeding:

> **Skills** are reusable prompt templates that give Claude Code specialized capabilities. For example:
> - `/commit` — smart git commit workflow with code review
> - `/coach` — life planning, calendar management, habit tracking
> - `/research` — deep web research with structured reports
>
> Skills are SKILL.md files installed to `~/.claude/commands/`. When you type `/commit` in Claude Code, it reads the skill file and follows the instructions.
>
> **This wizard** detects your environment, writes a config file, and installs skills so they're ready to use.

Then ask if they want to proceed.

## Step 1: Check Existing Config

Before anything else, check if `~/.golems/config.json` already exists:

```bash
cat ~/.golems/config.json 2>/dev/null
```

**If config exists:**
1. Display the current configuration to the user (reposPath, tools, features)
2. Ask: "You're already configured. Would you like to **reconfigure** (start fresh), **add skills** (install more), or **skip** (keep current settings)?"
3. If add skills → jump to Step 6 (skill management). If skip → exit wizard. If reconfigure → continue to Step 2.

**If config does NOT exist:** Continue to Step 2.

## Step 2: Detect Environment & CLIs

### Platform Detection

Detect the platform first — it affects CLI detection commands and path formats:

```bash
uname -s  # Darwin (macOS), Linux, or check for Windows
echo $TERM_PROGRAM  # vscode, iTerm.app, Apple_Terminal, etc.
```

- **macOS/Linux:** Use `which` for CLI detection, forward-slash paths
- **Windows:** Use `where` for CLI detection, accept backslash paths. Config at `%USERPROFILE%\.golems\config.json`

### CLI Detection

Run detection for all 9 supported CLIs:

```bash
for cmd in claude cursor gemini codex kiro-cli windsurf aider copilot cline; do
  path=$(which $cmd 2>/dev/null)
  if [ -n "$path" ]; then
    echo "  $cmd : $path"
  else
    echo "  $cmd : not found"
  fi
done
```

Report what was found. Store detected tools and paths for config writing.

### Claude Code Gate

**If Claude Code is NOT detected (`which claude` returns nothing):**

Stop the wizard flow and provide guidance:

> Claude Code CLI is required for golem skills. Skills are SKILL.md files in `~/.claude/commands/` — they only work with Claude Code.
>
> **To install Claude Code:**
> ```bash
> # macOS (recommended)
> brew install claude
>
> # Any platform (requires Node.js)
> npm install -g @anthropic-ai/claude-code
> ```
> Then run this wizard again.

Do NOT proceed with config/features/skills without Claude Code. The entire skill system depends on it.

### Platform Awareness

The wizard MUST understand the AI coding tool landscape and guide users accurately:

| Platform | Skills work? | What wizard does |
|----------|-------------|-----------------|
| **Claude Code (CLI)** | Full support | Install normally |
| **Claude Desktop** | MCP only | Guide to install Claude Code, explain skills need CLI |
| **Claude Web (claude.ai)** | No skills | Explain this, guide to Claude Code install |
| **Cursor IDE** | Partial | Some skills work via Cursor rules. Explain limitations — skills are SKILL.md files, Cursor uses `.cursorrules`. |
| **Windsurf/Cline** | Varies | Check compatibility, guide accordingly. Windsurf has its own rules system. Cline uses `.clinerules`. |
| **Copilot/Codex** | Different ecosystem | Explain, suggest alternatives |
| **VS Code + Claude extension** | Depends | Check which extension, guide |

### Other AI Tool Guidance

If the user mentions or has non-Claude-Code tools:

- **Acknowledge them** — don't dismiss the user's existing tools
- **Explain compatibility accurately:**
  - Cursor = IDE with `.cursorrules` — some skill prompts can be adapted as Cursor rules, but no native skill support
  - Cline = VS Code extension with `.clinerules` — similar concept, different format
  - Windsurf = standalone IDE with its own cascade rules system
  - Aider = CLI tool with `.aider.conf.yml` config — not compatible
  - Copilot = VS Code/IDE extension — different paradigm entirely
  - Claude Desktop = has MCP support (can use brainlayer, voicelayer MCPs) but NO skill support
- **Clarify coexistence** — Claude Code can run alongside all of these tools. Installing Claude Code doesn't remove or conflict with existing tools.
- **Do NOT claim full compatibility** with non-Claude-Code tools, but DO mention partial compatibility where it exists (Cursor rules)

## Step 3: Ask for Workspace Root

Ask the user:
> "Where is your workspace root? This is the parent directory containing your project repos (e.g., ~/Gits, ~/Projects, ~/Code)."

**Path handling:**
- Expand `~` to the user's home directory before validation
- Accept paths with spaces — quote them properly in config
- On Windows, accept both `C:\Users\...` and `C:/Users/...` formats

**Validate the path:**
```bash
ls -d "<expanded_path>" 2>/dev/null
```

- If the path exists → accept it
- If the user provides `~` alone (home directory) → warn it's unusually broad and ask if they meant a subdirectory, but accept if they confirm
- If the path does NOT exist → tell the user the path is invalid and ask again
- Do NOT proceed with a nonexistent path
- Do NOT write config with an invalid reposPath

## Step 4: Ask About Opt-In Features

Present the following features. **All default to OFF.** Ask the user which (if any) they want to enable:

| Feature | Default | Description |
|---------|---------|-------------|
| `proactiveNudges` | **OFF** | Coach sends periodic check-ins and reminders |
| `nightShift` | **OFF** | Autonomous improvement loop runs at 3am |
| `telegram` | **OFF** | Receive notifications via Telegram bot |

Example prompt:
> "These features are all **disabled by default**. Would you like to enable any?
> 1. Proactive nudges (coach check-ins) — OFF
> 2. Night Shift (3am autonomous work) — OFF
> 3. Telegram notifications — OFF
>
> Enter numbers to enable (e.g., '1,3') or press Enter to keep all OFF."

## Step 5: Write Config

Write `~/.golems/config.json` with the collected information:

```bash
mkdir -p ~/.golems
```

Config structure:
```json
{
  "reposPath": "<user_workspace_path>",
  "tools": {
    "claude": "/path/from/which"
  },
  "features": {
    "proactiveNudges": false,
    "nightShift": false,
    "telegram": false
  }
}
```

- Only include tools that were detected (skip tools with "not found")
- Set feature flags based on user's opt-in choices
- Use 2-space JSON indentation
- On Windows, store paths with forward slashes in JSON for consistency

After writing, confirm:
> "Config written to ~/.golems/config.json"

Show the written config to the user for verification.

## Step 6: Install Skills

After config is written, offer to install skills:

> "Would you like to install golem skills? Options:
> - **Install all** — installs all 55 skills (~30 seconds)
> - **Install recommended** — installs the most popular skills (commit, coach, github, catchup, research)
> - **Browse** — list available skills by category and pick specific ones
> - **Skip** — install skills later with `npx golems-cli skills install <name>`"

**If user chooses Browse:**

List skills grouped by category:
- **Development:** commit, github, pr-loop, test-plan, code-review, simplify
- **Research:** research, youtube-pipeline, call-debrief
- **Operations:** coach, catchup, ecosystem-health, orchestrator-status
- **Infrastructure:** 1password, railway, convex, vercel
- **Voice:** voice-sessions
- **Content:** video-showcase, presentation-builder

Mark already-installed skills with `[installed]`. Let the user pick by name or number.

**Before installing any skill, check if it already exists:**

```bash
ls ~/.claude/commands/<skill_name>/ 2>/dev/null
```

- If already installed → inform the user and offer to **update** (re-download latest) or **skip**
- If not installed → install via `npx golems-cli skills install <skill_name>`
- Do NOT install a duplicate copy

## Step 7: Recommend Complementary MCPs

After skills are installed, check if any have MCP dependencies or complementary MCP servers. Present recommendations grouped by what's needed:

**Skill → MCP mapping:**

| Skill | Required MCP | Complement MCP | What it adds |
|-------|-------------|----------------|--------------|
| `research` | `exa` | `brainlayer` | Web search + persistent findings storage |
| `coach` | — | `brainlayer`, `supabase` | Persistent memory + calendar/habits |
| `catchup` | `brainlayer` | — | Retrieves past work and decisions |
| `cmux-agents` | — | `voicelayer` | Voice I/O for agent interaction |
| `convex` | `supabase` | — | Database access |
| `voice-sessions` | `voicelayer` | — | TTS/STT for voice workflows |
| `ecosystem-health` | `supabase` | `brainlayer` | Health checks + stats |

**Before recommending:**
1. Check `.mcp.json` in the workspace root to see which MCPs are already configured
2. Skip MCPs that are already set up
3. Group recommendations: "These 3 skills all benefit from brainlayer MCP"

**Present recommendations:**
> "Some of your installed skills work better with MCP servers:
> - **brainlayer** — persistent memory for coach, catchup, research (not yet configured)
> - **exa** — web search for research (not yet configured)
> - **supabase** — already configured
>
> Set up brainlayer and exa? (y/n)"

**If user declines:** Install skills anyway, note reduced functionality. Explain how to set up MCPs later with `npx golems-cli mcp install <name>`.

**If user accepts:** Configure MCPs in `.mcp.json` using `npx golems-cli mcp install <name>`.

## Step 8: Per-Skill First-Time Setup

After skills are installed, check if any have a First-Time Setup section in their SKILL.md. For each skill that does:

1. Read the SKILL.md
2. If it has a "First-Time Setup" heading → run those setup steps
3. Report what was configured

## Completion

After all steps, display a summary:

```
=== Golems Setup Complete ===

Config:     ~/.golems/config.json
Workspace:  ~/Gits
Tools:      claude, gemini (2 detected)
Features:   proactiveNudges: OFF, nightShift: OFF, telegram: OFF
Skills:     12 installed

Next steps:
  - Run /wizard again to reconfigure
  - Install more skills: npx golems-cli skills install <name>
  - List available skills: npx golems-cli skills list
```

## Anti-Patterns

- **NEVER** enable features without explicit user consent
- **NEVER** write config with an invalid or nonexistent workspace path
- **NEVER** overwrite existing config without asking first
- **NEVER** install skills that are already installed without offering update/skip
- **NEVER** skip CLI detection — always detect platform and check CLIs
- **NEVER** assume a workspace path — always ask the user
- **NEVER** claim golem skills work with Cline, Windsurf, Aider, or other non-Claude-Code tools
- **NEVER** proceed with full setup if Claude Code is not installed
- **NEVER** use Unix-only commands (`which`, `ls -d`) on Windows without adaptation
- **NEVER** confuse Claude Code CLI with the Cline VS Code extension — they are completely different tools

## Composability

This skill is invoked by:
- `INSTALL_PROMPT.md` files (when config doesn't exist)
- `golems-cli wizard` command
- Direct `/wizard` slash command in Claude

It works with:
- `golems-cli` for skill installation
- Per-skill `SKILL.md` for first-time setup steps
