#!/usr/bin/env bash
# CLI Agent Runner - research and work modes
#
# RESEARCH mode (default): capture agent text output to a file
#   run.sh <agent> "<prompt>" [output-file]
#
# WORK mode: agent modifies files in current directory (cursor/codex only)
#   run.sh --work <agent> "<prompt>" [log-file]
#
# PROMPT FROM FILE: use @filepath to read prompt from a file
#   run.sh <agent> @/tmp/my-prompt.txt [output-file]
#   run.sh --work cursor @/tmp/my-prompt.txt [log-file]
#
# Agents: gemini, cursor, codex, kiro

set -euo pipefail

# Parse --work flag
MODE="research"
if [[ "${1:-}" == "--work" ]]; then
  MODE="work"
  shift
fi

AGENT="${1:?Usage: run.sh [--work] <gemini|cursor|codex|kiro> \"prompt\" [output-file]}"
PROMPT_ARG="${2:?Missing prompt}"
OUTPUT="${3:-/tmp/cli-agent-${AGENT}-$(date +%s).md}"

# Handle @filepath prompt syntax
if [[ "$PROMPT_ARG" == @* ]]; then
  PROMPT_PATH="${PROMPT_ARG#@}"
  if [[ ! -f "$PROMPT_PATH" ]]; then
    echo "Prompt file not found: $PROMPT_PATH" >&2
    exit 1
  fi
  PROMPT="$(cat "$PROMPT_PATH")"
else
  PROMPT="$PROMPT_ARG"
fi

echo "=== CLI Agent: ${AGENT} (${MODE} mode) ==="
echo "Output: ${OUTPUT}"
echo "CWD: $(pwd)"
echo "Started: $(date)"
echo "---"

case "$AGENT" in
  gemini)
    if [[ "$MODE" == "work" ]]; then
      echo "Note: Gemini is text-only, can't modify files. Running research mode." >&2
    fi
    echo "$PROMPT" | gemini 2>/dev/null > "$OUTPUT"
    ;;

  cursor)
    CURSOR_MODEL="${CURSOR_MODEL:-gpt-5.2-codex-xhigh}"
    if [[ "$MODE" == "work" ]]; then
      # Work mode: -p enables tools (write/bash), cursor modifies files directly
      cursor agent -p --model "${CURSOR_MODEL}" "$PROMPT" > "$OUTPUT" 2>&1
    else
      # Research mode: -p with text output format
      cursor agent -p --output-format text --model "${CURSOR_MODEL}" "$PROMPT" > "$OUTPUT" 2>&1
    fi
    ;;

  codex)
    CODEX_BIN="${CODEX_BIN:-codex}"
    if [[ "$MODE" == "work" ]]; then
      # Work mode: codex modifies files directly in CWD
      $CODEX_BIN --full-auto "$PROMPT" > "$OUTPUT" 2>&1
    else
      # Research mode: capture output to file
      $CODEX_BIN exec --full-auto -o "$OUTPUT" "$PROMPT" 2>/dev/null
    fi
    ;;

  kiro)
    if [[ "$MODE" == "work" ]]; then
      echo "Note: Kiro is text-only, can't modify files. Running research mode." >&2
    fi
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
