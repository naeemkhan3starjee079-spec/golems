#!/usr/bin/env bash
# Auto-index + enrich — runs daily at 5 AM via launchd
#
# 1. Index new Claude Code conversations (skip active sessions)
# 2. Enrich unenriched Zikaron chunks via GLM (up to MAX_ENRICH)
# 3. Taba enrichment — enrich Hebrew expert opinion chunks + ingest new PDFs
# 4. Log results to Axiom
#
# Usage:
#   ./scripts/auto-index.sh                  # Default: index + enrich 2000
#   ./scripts/auto-index.sh --max=5000       # Custom enrichment count
#   ./scripts/auto-index.sh --index-only     # Skip enrichment
#   ./scripts/auto-index.sh --enrich-only    # Skip indexing
#   ./scripts/auto-index.sh --taba-only      # Only run Taba enrichment

set -euo pipefail

GOLEMS_DIR="${HOME}/Gits/golems"
ZIKARON_DIR="${GOLEMS_DIR}/packages/zikaron"
VENV="${ZIKARON_DIR}/.venv/bin/activate"
LOG_DIR="${HOME}/.golems-zikaron/logs"
LOG_FILE="${LOG_DIR}/auto-index-$(date +%Y-%m-%d).log"
PROJECTS_DIR="${HOME}/.claude/projects"
FRESHNESS_MIN=30  # Skip sessions modified within this many minutes

MAX_ENRICH=5000
INDEX_ONLY=false
ENRICH_ONLY=false
TABA_ONLY=false
DURATION=0

# Parse args
for arg in "$@"; do
  case $arg in
    --max=*) MAX_ENRICH="${arg#*=}" ;;
    --index-only) INDEX_ONLY=true ;;
    --enrich-only) ENRICH_ONLY=true ;;
    --taba-only) TABA_ONLY=true ;;
  esac
done

mkdir -p "$LOG_DIR"

# Log rotation — keep last 14 days
find "$LOG_DIR" -name "auto-index-*.log" -mtime +14 -delete 2>/dev/null || true

log() {
  echo "[$(date '+%H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Auto-Index Start ==="
log "Max enrich: ${MAX_ENRICH}, Index-only: ${INDEX_ONLY}, Enrich-only: ${ENRICH_ONLY}, Taba-only: ${TABA_ONLY}"

# Check Ollama is running
if ! curl -sf http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
  log "ERROR: Ollama not running. Attempting to start..."
  open -a OllamaHelper 2>/dev/null || ollama serve &
  sleep 5
  if ! curl -sf http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
    log "ERROR: Could not start Ollama. Skipping enrichment."
    INDEX_ONLY=true
  fi
fi

# ─── Step 1: Index new conversations ────────────────────────────

INDEXED=0
SKIPPED_ACTIVE=0

if [ "$ENRICH_ONLY" = false ] && [ "$TABA_ONLY" = false ]; then
  log "Step 1: Indexing new conversations..."

  # Find recently modified .jsonl files (changed in last 48 hours)
  # but skip ones modified in last FRESHNESS_MIN minutes (active sessions)
  TEMP_LIST=$(mktemp)
  find "$PROJECTS_DIR" -name "*.jsonl" -mtime -2 2>/dev/null | while read -r f; do
    # Check freshness — skip if modified too recently
    AGE_MIN=$(( ($(date +%s) - $(stat -f %m "$f")) / 60 ))
    if [ "$AGE_MIN" -lt "$FRESHNESS_MIN" ]; then
      log "  SKIP (active, ${AGE_MIN}m old): $(basename "$f")"
      echo "skip" >> "$TEMP_LIST"
    else
      echo "$f" >> "$TEMP_LIST"
    fi
  done

  SKIPPED_ACTIVE=$(grep -c "^skip$" "$TEMP_LIST" 2>/dev/null || echo "0")
  FILE_COUNT=$(grep -v "^skip$" "$TEMP_LIST" 2>/dev/null | grep -c . || echo "0")
  rm -f "$TEMP_LIST"

  if [ "$FILE_COUNT" -gt 0 ]; then
    log "  Found ${FILE_COUNT} files to index (${SKIPPED_ACTIVE} skipped as active)"

    # Activate venv and run indexing
    source "$VENV"
    BEFORE=$(python3 -c "
from zikaron.vector_store import VectorStore
from pathlib import Path
s = VectorStore(Path.home() / '.local/share/zikaron/zikaron.db')
print(s.get_stats().get('total_chunks', 0))
s.close()
" 2>/dev/null || echo "0")

    zikaron index 2>&1 | tail -5 | tee -a "$LOG_FILE" || {
      log "  WARNING: zikaron index failed (exit $?), continuing..."
    }

    AFTER=$(python3 -c "
from zikaron.vector_store import VectorStore
from pathlib import Path
s = VectorStore(Path.home() / '.local/share/zikaron/zikaron.db')
print(s.get_stats().get('total_chunks', 0))
s.close()
" 2>/dev/null || echo "0")

    INDEXED=$((AFTER - BEFORE))
    log "  Indexed ${INDEXED} new chunks (${BEFORE} → ${AFTER})"
  else
    log "  No new files to index (${SKIPPED_ACTIVE} skipped as active)"
  fi
fi

# ─── Step 2: Enrich unenriched chunks ───────────────────────────

ENRICHED=0

if [ "$INDEX_ONLY" = false ] && [ "$TABA_ONLY" = false ] && [ "$MAX_ENRICH" -gt 0 ]; then
  log "Step 2: Enriching up to ${MAX_ENRICH} chunks via GLM..."
  source "$VENV" 2>/dev/null || true

  START_TIME=$(date +%s)

  # Run enrichment, capture output
  ENRICH_OUTPUT=$(python3 -m zikaron.pipeline.enrichment \
    --batch-size=50 \
    --max="$MAX_ENRICH" \
    2>&1) || true

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))

  # Extract counts from output (macOS-compatible — no grep -P)
  ENRICHED=$(echo "$ENRICH_OUTPUT" | sed -n 's/.*Processed: \([0-9][0-9]*\).*/\1/p' | tail -1)
  # Also try alternate format: "N ok" — use awk to avoid greedy sed issues
  if [ -z "$ENRICHED" ] || [ "$ENRICHED" = "0" ]; then
    ENRICHED=$(echo "$ENRICH_OUTPUT" | awk '/[0-9]+ ok/{for(i=1;i<=NF;i++) if($i ~ /^[0-9]+$/ && $(i+1)=="ok") print $i}' | tail -1)
  fi
  ENRICHED="${ENRICHED:-0}"

  log "  Enriched: ${ENRICHED} chunks in ${DURATION}s ($((DURATION / 60))min)"
  echo "$ENRICH_OUTPUT" | tail -5 >> "$LOG_FILE"
fi

# ─── Step 3: Taba Enrichment ───────────────────────────────────

TABA_ENRICHED=0
TABA_INGESTED=0
TABA_STATS=""

if [ "$INDEX_ONLY" = false ]; then
  TABA_DIR="${HOME}/Gits/taba"
  TABA_VENV="${TABA_DIR}/.venv/bin/activate"

  if [ -d "$TABA_DIR" ] && [ -f "$TABA_VENV" ]; then
    log "Step 3: Taba enrichment (up to 200 chunks)..."

    if curl -sf http://127.0.0.1:11434/api/tags > /dev/null 2>&1; then
      source "$TABA_VENV"
      cd "$TABA_DIR"

      # 3a: Enrich existing chunks
      TABA_OUTPUT=$(python3 -m src.enrichment --batch-size=50 --max=200 2>&1) || true
      # Output format: "Processed: N (M ok, K fail)"
      TABA_ENRICHED=$(echo "$TABA_OUTPUT" | sed -n 's/.*Processed: \([0-9][0-9]*\).*/\1/p' | tail -1)
      TABA_ENRICHED="${TABA_ENRICHED:-0}"

      # 3b: Get progress stats — format: "enriched/total (percent)"
      TABA_STATS=$(echo "$TABA_OUTPUT" | sed -n 's/.*Progress: \(.*\)/\1/p' | tail -1)
      TABA_STATS="${TABA_STATS:-unknown}"

      log "  Taba enriched: ${TABA_ENRICHED} chunks"
      log "  Taba progress: ${TABA_STATS}"
      echo "$TABA_OUTPUT" | tail -5 >> "$LOG_FILE"

      # 3c: Ingest any new PDFs
      INGEST_OUTPUT=$(python3 -m src.ingest --quiet 2>&1) || true
      # Check if anything was ingested (non-empty output with chunk count)
      TABA_INGESTED=$(echo "$INGEST_OUTPUT" | sed -n 's/.*[^0-9]\([0-9][0-9]*\) chunks.*/\1/p' | tail -1)
      TABA_INGESTED="${TABA_INGESTED:-0}"
      if [ "${TABA_INGESTED}" != "0" ]; then
        log "  Taba ingested: ${TABA_INGESTED} new chunks from PDFs"
      fi

      cd "$GOLEMS_DIR"
    else
      log "  Ollama not running — skipping Taba enrichment"
    fi
  else
    log "  Taba dir not found — skipping"
  fi
fi

# ─── Step 4: Report ─────────────────────────────────────────────

log "=== Summary ==="
log "  New chunks indexed: ${INDEXED}"
log "  Skipped (active):   ${SKIPPED_ACTIVE}"
log "  Chunks enriched:    ${ENRICHED}"
log "  Taba enriched:      ${TABA_ENRICHED}"
log "  Taba ingested:      ${TABA_INGESTED}"
log "  Taba progress:      ${TABA_STATS:-n/a}"
log "=== Auto-Index Done ==="

# Send Axiom event (if configured)
if command -v bun &> /dev/null; then
  cd "$GOLEMS_DIR"
  bun -e "
    import { logServiceEvent, flushAxiom } from './packages/shared/src/lib/axiom';
    logServiceEvent({
      service: 'auto-indexing',
      event: 'run',
      status: 'success',
      duration_ms: ${DURATION:-0} * 1000,
      metadata: {
        indexed: ${INDEXED},
        enriched: ${ENRICHED:-0},
        skipped_active: ${SKIPPED_ACTIVE},
        taba_enriched: ${TABA_ENRICHED:-0},
        taba_ingested: ${TABA_INGESTED:-0},
      },
    });
    await flushAxiom();
  " 2>/dev/null || true
fi

# Send Telegram notification (use full path — launchd may not have golems in PATH)
NOTIFY="${HOME}/.local/bin/notify"
if [ -x "$NOTIFY" ]; then
  "$NOTIFY" "Auto-Index Done" "Zikaron: ${INDEXED} indexed, ${ENRICHED:-0} enriched. Taba: ${TABA_ENRICHED:-0} enriched (${TABA_STATS:-n/a})" 2>/dev/null || true
fi
