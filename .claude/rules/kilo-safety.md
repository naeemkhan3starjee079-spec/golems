# Kilo CLI Safety Rules

> Kilo Code sends code to external APIs via the Kilo Gateway. NEVER use with personal or golems data.

## Allowed Directories

- `~/Gits/songscript`
- `~/Gits/domica`
- `~/Gits/union`
- `~/Gits/rudy`

## Blocked Directories

- `~/Gits/golems` (all packages)
- `~/.claude`
- `~/.golems-zikaron`
- `~/.local/share/zikaron`
- Any path containing "golem"

## Usage

```bash
# Research mode (captures text output)
cd ~/Gits/songscript && run.sh kilo "analyze the build system"

# Work mode (modifies files — Kilo has bash/file tools)
cd ~/Gits/domica && run.sh --work kilo "fix the TypeScript errors"
```

## Free Models

Kilo provides free access to these models via Kilo Gateway:
- `kilo/qwen/qwen3-coder:free` (default, good for code)
- `kilo/deepseek/deepseek-r1-0528:free` (reasoning)
- `kilo/meta-llama/llama-3.3-70b-instruct:free` (general)
- `kilo/openai/gpt-oss-120b:free` (large, capable)

Override with: `KILO_MODEL=kilo/deepseek/deepseek-r1-0528:free run.sh kilo "prompt"`

## Authentication

Kilo requires login: `kilo auth login` (opens browser for OAuth).
Without auth, free models won't work.
