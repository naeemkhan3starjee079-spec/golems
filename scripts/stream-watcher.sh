#!/bin/bash
# Stream Watcher — record a Twitch stream, auto-process when it ends.
# Usage: stream-watcher.sh <channel> [quality]
# Example: stream-watcher.sh theo best
#
# Records video+audio via yt-dlp, chat via tmi.js lurker.
# When stream ends (yt-dlp exits), auto-runs process-stream.sh.
# All files go to docs.local/stalker-golem/recordings/ (persistent).

set -euo pipefail

CHANNEL="${1:?Usage: stream-watcher.sh <channel> [quality]}"
# Validate channel name — alphanumeric + underscores only (Twitch rules)
if [[ ! "$CHANNEL" =~ ^[a-zA-Z0-9_]+$ ]]; then
    echo "ERROR: Invalid channel name '$CHANNEL'. Must be alphanumeric + underscores only." >&2
    exit 1
fi
QUALITY="${2:-best}"
DATE=$(date +%Y-%m-%d)
STREAM_DIR="$HOME/Gits/golems/docs.local/stalker-golem/${CHANNEL}-${DATE}"
SCRIPTS_DIR="$HOME/Gits/golems/scripts"
VIDEO_FILE="$STREAM_DIR/video.mp4"
CHAT_FILE="$STREAM_DIR/chat.log"
LURKER_SCRIPT="/tmp/twitch-lurk-${CHANNEL}.ts"

mkdir -p "$STREAM_DIR"

log() { echo "[stream-watcher $(date '+%H:%M:%S')] $1"; }

# --- Write lurker script ---
cat > "$LURKER_SCRIPT" << 'LURKER_EOF'
import tmi from "tmi.js";
import { appendFileSync } from "fs";

const CHANNEL = process.env.TWITCH_CHANNEL ?? "theo";
const OUTPUT = process.env.CHAT_OUTPUT ?? `/tmp/twitch-${CHANNEL}-chat.log`;

const client = new tmi.Client({
  options: { debug: false },
  connection: { reconnect: true, secure: true },
  channels: [CHANNEL],
});

const seen = new Set<string>();

client.on("message", (_channel, tags, message, self) => {
  if (self) return;
  const ts = new Date().toISOString().slice(11, 19);
  const user = tags["display-name"] ?? tags.username ?? "?";
  const key = `${ts}-${user}-${message}`;
  if (seen.has(key)) return; // dedup
  seen.add(key);
  // Keep seen set from growing forever
  if (seen.size > 10000) {
    const arr = [...seen];
    arr.splice(0, 5000);
    seen.clear();
    arr.forEach(k => seen.add(k));
  }
  const line = `[${ts}] ${user}: ${message}`;
  console.log(line);
  appendFileSync(OUTPUT, line + "\n");
});

client.connect().then(() => {
  console.log(`[lurk] Connected to ${CHANNEL}`);
  console.log(`[lurk] Logging to ${OUTPUT}`);
}).catch(err => {
  console.error(`[lurk] Connection failed: ${err}`);
  process.exit(1);
});

// Keep alive
setInterval(() => {}, 60_000);
LURKER_EOF

log "=== Stream Watcher: ${CHANNEL} ==="
log "Video: $VIDEO_FILE"
log "Chat: $CHAT_FILE"

# --- Start chat lurker ---
log "Starting chat lurker..."
TWITCH_CHANNEL="$CHANNEL" CHAT_OUTPUT="$CHAT_FILE" \
  nohup bun run "$LURKER_SCRIPT" > /dev/null 2>&1 &
LURKER_PID=$!
disown
log "Chat lurker PID: $LURKER_PID"

# --- Cleanup on exit ---
cleanup() {
    log "Cleaning up..."
    kill "$LURKER_PID" 2>/dev/null || true
    log "Chat lurker stopped."
}
trap cleanup EXIT SIGTERM SIGINT

# --- Wait for stream to go live (poll every 2 min) ---
log "Checking if ${CHANNEL} is live..."
while true; do
    if yt-dlp --simulate --no-download "https://www.twitch.tv/${CHANNEL}" 2>/dev/null; then
        log "${CHANNEL} is LIVE! Starting recording..."
        break
    fi
    log "${CHANNEL} is offline. Checking again in 2 minutes..."
    sleep 120
done

# --- Start recording (blocks until stream ends) ---
log "Recording to $VIDEO_FILE..."
# Disable errexit for yt-dlp — non-zero exit is normal when stream ends
set +e
yt-dlp --no-part -f "$QUALITY" -o "$VIDEO_FILE" "https://www.twitch.tv/${CHANNEL}" 2>&1 | while IFS= read -r line; do
    if [[ "$line" == *"Downloading"* ]] || [[ "$line" == *"ERROR"* ]] || [[ "$line" == *"Finished"* ]]; then
        log "$line"
    fi
done

YTDLP_EXIT=$?
set -e
log "Recording ended (exit code: $YTDLP_EXIT)"

# --- Kill lurker ---
kill "$LURKER_PID" 2>/dev/null || true
log "Chat lurker stopped."

# --- Check if we got anything ---
if [ ! -f "$VIDEO_FILE" ] || [ "$(stat -f%z "$VIDEO_FILE" 2>/dev/null || echo 0)" -lt 1000000 ]; then
    log "Recording too small or missing — stream might not have been live. Exiting."
    exit 0
fi

VIDEO_SIZE=$(du -sh "$VIDEO_FILE" | cut -f1)
CHAT_LINES=$(wc -l < "$CHAT_FILE" 2>/dev/null || echo 0)
log "Captured: ${VIDEO_SIZE} video, ${CHAT_LINES} chat messages"

# --- Auto-process ---
log "Starting post-stream processing..."
"$SCRIPTS_DIR/process-stream.sh" "$VIDEO_FILE" "$CHAT_FILE"

log "=== Done! Check gems at: $STREAM_DIR/ ==="

# --- Notify ---
if command -v notify &> /dev/null; then
    notify "Stream Processed" "${CHANNEL} stream: ${VIDEO_SIZE} video, ${CHAT_LINES} chat msgs. Gems extracted."
fi
