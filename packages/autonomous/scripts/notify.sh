#!/bin/bash
# Robust Telegram notification helper
# Handles special characters (!, ', ", \) that break curl/JSON
#
# Usage: notify.sh "Title" "Body message"
#        notify.sh "Title" "Body" "source"

NOTIFY_PORT=3847
NOTIFY_URL="http://localhost:${NOTIFY_PORT}/notify"

title="${1:-Notification}"
body="${2:-}"
source="${3:-alerts}"  # Default to alerts topic (CLI sessions are one-way updates)

# Function to escape string for JSON (handles \, ", newlines)
json_escape() {
    local str="$1"
    # Escape backslashes first, then quotes, then control chars
    str="${str//\\/\\\\}"
    str="${str//\"/\\\"}"
    str="${str//$'\n'/\\n}"
    str="${str//$'\r'/\\r}"
    str="${str//$'\t'/\\t}"
    printf '%s' "$str"
}

# Escape both title and body
escaped_title=$(json_escape "$title")
escaped_body=$(json_escape "$body")

# Build JSON payload safely
json_payload="{\"title\":\"${escaped_title}\",\"body\":\"${escaped_body}\",\"source\":\"${source}\"}"

# Send notification (macOS compatible - just check HTTP code)
http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$NOTIFY_URL" \
    -H "Content-Type: application/json" \
    -d "$json_payload" 2>/dev/null)

if [ "$http_code" = "200" ]; then
    echo "Sent: $title"
    exit 0
else
    echo "Failed (HTTP $http_code)" >&2
    exit 1
fi
