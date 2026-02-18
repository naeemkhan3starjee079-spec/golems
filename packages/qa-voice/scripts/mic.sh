#!/bin/bash
# mic.sh — Companion terminal for QA Voice MCP server
#
# Run this in a second terminal tab alongside Claude Code.
# Wispr Flow types transcriptions here. Press Enter to send to Claude.
#
# Usage: ./packages/qa-voice/scripts/mic.sh

INPUT_FILE="${QA_VOICE_INPUT_FILE:-/tmp/golems-qa-input.txt}"

# Clear any stale input on start
> "$INPUT_FILE"

echo "==================================="
echo "  QA Voice — Mic Terminal"
echo "==================================="
echo ""
echo "Waiting for Claude to ask questions..."
echo "Type or dictate your response, then press Enter."
echo "Ctrl+C to quit."
echo ""

while true; do
    read -r response

    if [ -z "$response" ]; then
        continue
    fi

    # Write to the input file for the MCP server
    echo "$response" > "$INPUT_FILE"
    echo "[sent] $response"
    echo ""
done
