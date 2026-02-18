#!/bin/bash
# mic.sh — Companion terminal for QA Voice MCP server
#
# Run this in a second terminal tab alongside Claude Code.
# Wispr Flow types transcriptions here. Press Enter to send to Claude.
#
# Usage: ./scripts/mic.sh
#
# How it works:
# 1. Waits for you to type/dictate a response
# 2. When you press Enter, writes the text to /tmp/golems-qa-input.txt
# 3. The MCP server's file watcher picks it up and returns it to Claude
#
# With Wispr Flow:
# - F5 starts dictation → Wispr types into this terminal
# - You verify the text, press Enter → sent to Claude

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
    # Read a line from stdin (Wispr Flow types here)
    read -r response

    if [ -z "$response" ]; then
        continue
    fi

    # Write to the input file for the MCP server
    echo "$response" > "$INPUT_FILE"
    echo "[sent] $response"
    echo ""
done
