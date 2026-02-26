#!/bin/bash
# Post-stream handler — moves recording to per-stream dir, triggers processing.
# Run this AFTER the stream ends (stream-watcher.sh calls process-stream.sh directly,
# but if the watcher used old paths, use this to fix up and reprocess).
#
# Usage: post-stream.sh <channel> <date>
# Example: post-stream.sh theo 2026-02-23

set -euo pipefail

CHANNEL="${1:?Usage: post-stream.sh <channel> <date>}"
DATE="${2:?Usage: post-stream.sh <channel> <date>}"
BASE="$HOME/Gits/golems/docs.local/stalker-golem"
STREAM_DIR="$BASE/${CHANNEL}-${DATE}"
RECORDINGS="$BASE/recordings"

log() { echo "[post-stream $(date '+%H:%M:%S')] $1"; }

mkdir -p "$STREAM_DIR"

# --- Move video from legacy recordings/ dir if needed ---
LEGACY_VIDEO="$RECORDINGS/twitch-${CHANNEL}-${DATE}.mp4"
TARGET_VIDEO="$STREAM_DIR/video.mp4"

if [ -f "$LEGACY_VIDEO" ] && [ ! -f "$TARGET_VIDEO" ]; then
    log "Moving video: $LEGACY_VIDEO → $TARGET_VIDEO"
    mv "$LEGACY_VIDEO" "$TARGET_VIDEO"
elif [ -f "$TARGET_VIDEO" ]; then
    log "Video already in place: $TARGET_VIDEO"
else
    log "ERROR: No video found at $LEGACY_VIDEO or $TARGET_VIDEO"
    exit 1
fi

# --- Move legacy chat log if exists ---
LEGACY_CHAT="$RECORDINGS/twitch-${CHANNEL}-${DATE}.log"
TARGET_CHAT="$STREAM_DIR/chat.log"

if [ -f "$LEGACY_CHAT" ] && [ ! -f "$TARGET_CHAT" ]; then
    log "Moving chat: $LEGACY_CHAT → $TARGET_CHAT"
    mv "$LEGACY_CHAT" "$TARGET_CHAT"
fi

# --- Check chat log exists ---
if [ ! -f "$TARGET_CHAT" ]; then
    log "WARNING: No chat log found"
    TARGET_CHAT=""
fi

CHAT_LINES=$(wc -l < "$TARGET_CHAT" 2>/dev/null || echo 0)
VIDEO_SIZE=$(du -sh "$TARGET_VIDEO" | cut -f1)
log "Ready: ${VIDEO_SIZE} video, ${CHAT_LINES} chat messages"

# --- Run full pipeline ---
log "Starting pipeline..."
"$HOME/Gits/golems/scripts/process-stream.sh" "$TARGET_VIDEO" "$TARGET_CHAT"

# --- Notify ---
if command -v notify &> /dev/null; then
    GEMS_COUNT=$(grep -c "^### \[" "$STREAM_DIR/gems.md" 2>/dev/null || echo "?")
    notify "Stream Processed" "${CHANNEL} ${DATE}: ${VIDEO_SIZE}, ${CHAT_LINES} chat msgs, ${GEMS_COUNT} gems"
fi

log "=== Done! Check: $STREAM_DIR/ ==="
