#!/usr/bin/env bash
# summarize-file.sh - Summarize large files using external models
# Prevents Claude Code Opus from bloating its context window
#
# Usage:
#   ./scripts/summarize-file.sh <file> "<prompt>" [model]
#
# Models:
#   gemini  (default) - Free, fast, good for summaries
#   cursor  - GPT-5.2 Codex (paid $20/mo), deep analysis
#   codex   - OpenAI Codex CLI (ChatGPT Plus), non-interactive agent
#   kiro    - Free, AWS-backed, good for code analysis
#
# Examples:
#   ./scripts/summarize-file.sh docs/plan.md "What parts are DONE vs NOT DONE?"
#   ./scripts/summarize-file.sh src/big-file.ts "Summarize the key functions and their purposes" cursor
#   ./scripts/summarize-file.sh package.json "List all dependencies" gemini
#
# Output: Writes summary to stdout (pipe or capture as needed)
# The summary is concise (max ~100 lines) to fit in Opus context.

set -euo pipefail

FILE="${1:?Usage: summarize-file.sh <file> \"<prompt>\" [model]}"
PROMPT="${2:?Usage: summarize-file.sh <file> \"<prompt>\" [model]}"
MODEL="${3:-gemini}"

if [ ! -f "$FILE" ]; then
  echo "Error: File not found: $FILE" >&2
  exit 1
fi

# Scratchpad for temp output
SCRATCHPAD="${TMPDIR:-/tmp}/summarize-file-$$"
mkdir -p "$SCRATCHPAD"
OUTFILE="$SCRATCHPAD/summary-$(date +%s).md"

# Build the full prompt with file context
FULL_PROMPT="Read the following file and respond CONCISELY (max 100 lines).

PROMPT: $PROMPT

FILE: $FILE
$(cat "$FILE")

Remember: Be concise. Max 100 lines of output. Focus on what was asked."

case "$MODEL" in
  gemini)
    # Gemini CLI - free, 1K requests/day
    if command -v gemini &>/dev/null; then
      echo "$FULL_PROMPT" | gemini > "$OUTFILE" 2>/dev/null
    else
      echo "Error: gemini CLI not installed. Install Gemini CLI from https://github.com/google-gemini/gemini-cli" >&2
      exit 1
    fi
    ;;
  cursor)
    # Cursor CLI - GPT-5.2 Codex ($20/mo Pro plan)
    # Models: codex (fast) → codex-high (balanced) → codex-xhigh (deep)
    if command -v cursor &>/dev/null; then
      cursor agent -p "$FULL_PROMPT" --model gpt-5.2-codex-high --output-format text > "$OUTFILE" 2>/dev/null
    else
      echo "Error: cursor CLI not installed" >&2
      exit 1
    fi
    ;;
  codex)
    # OpenAI Codex CLI - ChatGPT Plus, non-interactive agent
    CODEX_BIN="${CODEX_BIN:-$(command -v codex || echo "$HOME/.nvm/versions/node/v22.22.0/bin/codex")}"
    if [ -x "$CODEX_BIN" ]; then
      $CODEX_BIN exec --full-auto -o "$OUTFILE" "$FULL_PROMPT" 2>/dev/null
    else
      echo "Error: codex CLI not installed. Run: npm i -g @openai/codex" >&2
      exit 1
    fi
    ;;
  kiro)
    # Kiro CLI - Free tier, AWS-backed
    if command -v kiro-cli &>/dev/null; then
      kiro-cli chat --no-interactive -w never "$FULL_PROMPT" > "$OUTFILE" 2>/dev/null
    else
      echo "Error: kiro-cli not installed" >&2
      exit 1
    fi
    ;;
  haiku)
    # Claude Haiku via Anthropic API - cheap, fast
    if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
      echo "Error: ANTHROPIC_API_KEY not set" >&2
      exit 1
    fi
    # Write prompt to temp file to avoid shell injection via backticks
    PROMPTFILE="$SCRATCHPAD/prompt-$(date +%s).txt"
    printf '%s' "$FULL_PROMPT" > "$PROMPTFILE"
    bun -e "
      const Anthropic = require('@anthropic-ai/sdk');
      const fs = require('fs');
      const prompt = fs.readFileSync('$PROMPTFILE', 'utf8');
      const client = new Anthropic.default();
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      });
      console.log(msg.content[0].text);
    " > "$OUTFILE" 2>/dev/null
    rm -f "$PROMPTFILE"
    ;;
  *)
    echo "Error: Unknown model '$MODEL'. Use: gemini, cursor, codex, kiro, haiku" >&2
    exit 1
    ;;
esac

# Output the summary
cat "$OUTFILE"

# Cleanup
rm -f "$OUTFILE"
