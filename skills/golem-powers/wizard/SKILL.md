---
name: wizard
description: First-time onboarding wizard for the golems ecosystem. Detects installed AI CLIs, configures workspace, sets up skills. Use when setting up golems for the first time, reconfiguring, or onboarding a new machine.
---

# Golems Setup Wizard

> Claude-powered first-time setup. Detects your environment, writes config, installs skills.

## CARDINAL RULE

**ALL opt-in features are OFF by default.** The user must explicitly enable each one. No surprises, no unsolicited notifications, no background tasks unless the user says yes.

## Step 1: Check Existing Config

Before anything else, check if `~/.golems/config.json` already exists:

```bash
cat ~/.golems/config.json 2>/dev/null
```

**If config exists:**
1. Display the current configuration to the user (reposPath, tools, features)
2. Ask: "You're already configured. Would you like to **reconfigure** (start fresh) or **skip** (keep current settings)?"
3. If skip → exit wizard. If reconfigure → continue to Step 2.

**If config does NOT exist:** Continue to Step 2.

## Step 2: Detect Installed AI CLIs

Run `which` for each supported CLI:

```bash
for cmd in claude cursor gemini codex kiro-cli; do
  path=$(which $cmd 2>/dev/null)
  if [ -n "$path" ]; then
    echo "  $cmd : $path"
  else
    echo "  $cmd : not found"
  fi
done
```

Report what was found. Example:
```
Detected AI CLIs:
  claude  : /usr/local/bin/claude
  cursor  : not found
  gemini  : /opt/homebrew/bin/gemini
  codex   : not found
  kiro-cli: not found

Found 2 of 5 supported CLIs.
```

Store the detected tools and paths for config writing.

## Step 3: Ask for Workspace Root

Ask the user:
> "Where is your workspace root? This is the parent directory containing your project repos (e.g., ~/Gits, ~/Projects, ~/Code)."

**Validate the path:**
```bash
ls -d <user_provided_path> 2>/dev/null
```

- If the path exists → accept it
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

After writing, confirm:
> "Config written to ~/.golems/config.json"

Show the written config to the user for verification.

## Step 6: Install Skills

After config is written, offer to install skills:

> "Would you like to install golem skills? Options:
> - **Install all** — installs all 55 skills (~30 seconds)
> - **Install recommended** — installs the most popular skills (commit, coach, github, catchup, research)
> - **Skip** — install skills later with `npx golems-cli skills install <name>`"

**Before installing any skill, check if it already exists:**

```bash
ls ~/.claude/commands/<skill_name>/ 2>/dev/null
```

- If already installed → inform the user and offer to **update** (re-download latest) or **skip**
- If not installed → install via `npx golems-cli skills install <skill_name>`
- Do NOT install a duplicate copy

## Step 7: Per-Skill First-Time Setup

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
- **NEVER** skip CLI detection — always run `which` for all 5 CLIs
- **NEVER** assume a workspace path — always ask the user

## Composability

This skill is invoked by:
- `INSTALL_PROMPT.md` files (when config doesn't exist)
- `golems-cli wizard` command
- Direct `/wizard` slash command in Claude

It works with:
- `golems-cli` for skill installation
- Per-skill `SKILL.md` for first-time setup steps
