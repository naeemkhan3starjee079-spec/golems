#!/usr/bin/env bash
# CLI Agent Runner - one-shot execution wrapper
# Usage: run.sh <agent> "<prompt>" [output-file]
# Agents: gemini, cursor, codex, kiro

set -euo pipefail

AGENT="${1:?Usage: run.sh <gemini|cursor|codex|kiro> \"prompt\" [output-file]}"
PROMPT="${2:?Missing prompt}"
OUTPUT="${3:-/tmp/cli-agent-${AGENT}-$(date +%s).md}"

RAW_OUTPUT="/tmp/cli-agent-raw-${AGENT}-$$.txt"

echo "=== CLI Agent: ${AGENT} ==="
echo "Output: ${OUTPUT}"
echo "Started: $(date)"
echo "---"

case "$AGENT" in
  gemini)
    # Gemini CLI: pipe prompt to stdin, redirect output
    echo "$PROMPT" | gemini 2>/dev/null > "$OUTPUT"
    ;;

  cursor)
    # Cursor requires TTY via script(1) - direct redirect produces 0 bytes
    # Override model with CURSOR_MODEL env var (default: gpt-5.2-codex-xhigh)
    CURSOR_MODEL="${CURSOR_MODEL:-gpt-5.2-codex-xhigh}"
    script -q "$RAW_OUTPUT" bash -c "cursor agent -p --output-format text --model ${CURSOR_MODEL} \"$PROMPT\" 2>/dev/null; exit"
    # Strip ANSI escape codes, cursor control, literal ^D, and all control chars
    sed 's/\x1b\[[?0-9;]*[a-zA-Z]//g; s/\x1b\[[0-9;]*m//g; s/\^D//g' "$RAW_OUTPUT" \
      | tr -d '\001-\011\013-\037' \
      | grep -v '^$' > "$OUTPUT"
    rm -f "$RAW_OUTPUT"
    ;;

  codex)
    # Codex CLI: full-auto mode with output file
    npx codex exec --full-auto -o "$OUTPUT" "$PROMPT" 2>/dev/null
    ;;

  kiro)
    # Kiro CLI: non-interactive chat mode, strip ANSI codes from output
    kiro-cli chat --no-interactive "$PROMPT" 2>/dev/null | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/\x1b\[[0-9;]*m//g; s/^> //' > "$OUTPUT"
    ;;

  *)
    echo "Unknown agent: ${AGENT}" >&2
    echo "Available: gemini, cursor, codex, kiro" >&2
    exit 1
    ;;
esac

LINES=$(wc -l < "$OUTPUT" 2>/dev/null || echo "0")
echo "---"
echo "Done: $(date)"
echo "Output: ${OUTPUT} (${LINES} lines)"
