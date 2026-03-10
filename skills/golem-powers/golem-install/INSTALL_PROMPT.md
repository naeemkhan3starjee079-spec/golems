# Install: golem-install

> Set up the golems ecosystem for the first time on a new machine. Checks CLI dependencies, wires MCP servers, creates skill symlinks. Use when: "set up golems", "install golems", "new machine setup", "wire skills". NOT for daily usage.

## One-Paste Install

Copy this into a Claude Code session:

```
/slash-load https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/golem-install/SKILL.md
```

## Manual Install

1. Create the skill directory:
```bash
mkdir -p ~/.claude/commands/golem-install
```

2. Download the skill:
```bash
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/golem-install/SKILL.md \
  -o ~/.claude/commands/golem-install/SKILL.md
```

3. Download workflows:
```bash
mkdir -p ~/.claude/commands/golem-install/workflows
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/golem-install/workflows/check-deps.md \
  -o ~/.claude/commands/golem-install/workflows/check-deps.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/golem-install/workflows/install-deps.md \
  -o ~/.claude/commands/golem-install/workflows/install-deps.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/golem-install/workflows/setup-symlinks.md \
  -o ~/.claude/commands/golem-install/workflows/setup-symlinks.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/golem-install/workflows/setup-tokens.md \
  -o ~/.claude/commands/golem-install/workflows/setup-tokens.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/golem-install/workflows/validate.md \
  -o ~/.claude/commands/golem-install/workflows/validate.md
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/golem-install/workflows/wire-project.md \
  -o ~/.claude/commands/golem-install/workflows/wire-project.md
```

4. Download scripts:
```bash
mkdir -p ~/.claude/commands/golem-install/scripts
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/golem-install/scripts/check-deps.sh \
  -o ~/.claude/commands/golem-install/scripts/check-deps.sh
chmod +x ~/.claude/commands/golem-install/scripts/check-deps.sh
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/golem-install/scripts/install-deps.sh \
  -o ~/.claude/commands/golem-install/scripts/install-deps.sh
chmod +x ~/.claude/commands/golem-install/scripts/install-deps.sh
curl -sL https://raw.githubusercontent.com/{GITHUB_USER}/golems/master/skills/golem-powers/golem-install/scripts/validate.sh \
  -o ~/.claude/commands/golem-install/scripts/validate.sh
chmod +x ~/.claude/commands/golem-install/scripts/validate.sh
```

5. Verify:
```bash
ls ~/.claude/commands/golem-install/
```

## Usage

```
/golem-install
```
