#!/usr/bin/env bash
# On-demand Zikaron enrichment — start/stop manually
#
# Usage:
#   ./scripts/enrich.sh start          # Start enriching (default 5000 chunks)
#   ./scripts/enrich.sh start 20000    # Weekend blitz mode
#   ./scripts/enrich.sh stop           # Stop enrichment gracefully
#   ./scripts/enrich.sh status         # Check if running + progress
#
# The enrichment runs in the background. Use 'stop' to halt it cleanly.
# Progress is logged to ~/.golems-zikaron/logs/enrich-on-demand.log

set -euo pipefail

GOLEMS_DIR="${HOME}/Gits/golems"
ZIKARON_DIR="${GOLEMS_DIR}/packages/zikaron"
VENV="${ZIKARON_DIR}/.venv/bin/activate"
LOG_DIR="${HOME}/.golems-zikaron/logs"
PID_FILE="${HOME}/.golems-zikaron/enrich.pid"
LOG_FILE="${LOG_DIR}/enrich-on-demand.log"

mkdir -p "$LOG_DIR"

case "${1:-status}" in
  start)
    MAX="${2:-5000}"

    # Check if already running
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Enrichment already running (PID: $(cat "$PID_FILE"))"
      echo "Use './scripts/enrich.sh stop' first."
      exit 1
    fi

    # Check Ollama
    if ! curl -sf http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
      echo "Ollama not running. Starting..."
      open -a OllamaHelper 2>/dev/null || ollama serve &
      sleep 5
      if ! curl -sf http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
        echo "ERROR: Could not start Ollama."
        exit 1
      fi
    fi

    echo "Starting enrichment: ${MAX} chunks (background)"
    echo "Log: ${LOG_FILE}"
    echo "Stop: ./scripts/enrich.sh stop"

    # Run enrichment in background (trap ensures PID cleanup on failure)
    (
      cleanup() { rm -f "$PID_FILE"; }
      trap cleanup EXIT

      source "$VENV"
      echo "[$(date '+%H:%M:%S')] Starting enrichment: max=${MAX}" >> "$LOG_FILE"

      python3 -m zikaron.pipeline.enrichment \
        --batch-size=50 \
        --max="$MAX" \
        2>&1 | tee -a "$LOG_FILE" || {
          echo "[$(date '+%H:%M:%S')] Enrichment failed (exit $?)" >> "$LOG_FILE"
        }

      echo "[$(date '+%H:%M:%S')] Enrichment finished" >> "$LOG_FILE"

      # Notify
      NOTIFY="${HOME}/.local/bin/notify"
      if [ -x "$NOTIFY" ]; then
        "$NOTIFY" "Enrichment Done" "Processed up to ${MAX} chunks" 2>/dev/null || true
      fi
    ) &

    echo $! > "$PID_FILE"
    echo "Started (PID: $!)"
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        # Kill the whole process group
        kill -- -"$PID" 2>/dev/null || kill "$PID" 2>/dev/null || true
        # Also kill any python enrichment processes spawned by it
        pkill -f "zikaron.pipeline.enrichment" 2>/dev/null || true
        rm -f "$PID_FILE"
        echo "Enrichment stopped (was PID: $PID)"
        echo "[$(date '+%H:%M:%S')] Enrichment STOPPED by user" >> "$LOG_FILE"
      else
        rm -f "$PID_FILE"
        echo "Process $PID not running (stale PID file cleaned)"
      fi
    else
      # Check if enrichment process is running anyway
      if pgrep -f "zikaron.pipeline.enrichment" > /dev/null 2>&1; then
        pkill -f "zikaron.pipeline.enrichment" 2>/dev/null || true
        echo "Enrichment process killed (no PID file found)"
      else
        echo "No enrichment running."
      fi
    fi
    ;;

  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      PID=$(cat "$PID_FILE")
      echo "Enrichment RUNNING (PID: $PID)"
      echo ""
      echo "Latest log:"
      tail -5 "$LOG_FILE" 2>/dev/null || echo "(no log yet)"
    else
      echo "Enrichment NOT running."
      if [ -f "$LOG_FILE" ]; then
        echo ""
        echo "Last run:"
        tail -3 "$LOG_FILE" 2>/dev/null
      fi
    fi

    # Show overall progress (query enriched_at directly)
    if [ -f "$VENV" ]; then
      source "$VENV" 2>/dev/null
      STATS=$(python3 -c "
import apsw
from pathlib import Path
db = apsw.Connection(str(Path.home() / '.local/share/zikaron/zikaron.db'), flags=apsw.SQLITE_OPEN_READONLY)
cursor = db.cursor()
total = list(cursor.execute('SELECT COUNT(*) FROM chunks'))[0][0]
enriched = list(cursor.execute('SELECT COUNT(*) FROM chunks WHERE enriched_at IS NOT NULL'))[0][0]
pct = (enriched / total * 100) if total > 0 else 0
print(f'Progress: {enriched:,}/{total:,} enriched ({pct:.1f}%)')
remaining = total - enriched
nights = remaining / 5000
print(f'Remaining: {remaining:,} chunks (~{nights:.0f} nights at 5K/night)')
db.close()
" 2>/dev/null) || true
      if [ -n "$STATS" ]; then
        echo ""
        echo "$STATS"
      fi
    fi
    ;;

  *)
    echo "Usage: $0 {start [max_chunks]|stop|status}"
    echo ""
    echo "  start [N]   Start enriching N chunks (default: 5000)"
    echo "  stop        Stop enrichment"
    echo "  status      Check progress"
    exit 1
    ;;
esac
