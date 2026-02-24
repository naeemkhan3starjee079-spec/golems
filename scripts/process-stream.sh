#!/bin/bash
# Process a recorded Twitch stream — multi-signal gem detection pipeline.
# Usage: process-stream.sh <video-file> [chat-log] [--json-output] [--chat-json]
#
# Pipeline:
#   Pass 1: Audio → transcript + silence boundaries + volume spikes
#   Pass 2: Video → frames at candidate timestamps + 10s clips at gems
#   Pass 3: Score via Gemini CLI or local LLM (combines all signals)
#   Pass 4: Clip extraction (if gems.md exists)
#   Pass 5: Generate gems-manifest.json (if --json-output)
#
# All output goes next to the video file (data stays together).

set -euo pipefail

# Parse positional + flag arguments
VIDEO=""
CHAT_LOG=""
JSON_OUTPUT=false
CHAT_IS_JSON=false

for arg in "$@"; do
    case "$arg" in
        --json-output) JSON_OUTPUT=true ;;
        --chat-json)   CHAT_IS_JSON=true ;;
        *)
            if [ -z "$VIDEO" ]; then
                VIDEO="$arg"
            elif [ -z "$CHAT_LOG" ]; then
                CHAT_LOG="$arg"
            fi
            ;;
    esac
done

[ -z "$VIDEO" ] && { echo "Usage: process-stream.sh <video-file> [chat-log] [--json-output] [--chat-json]"; exit 1; }
STREAMER=$(basename "$VIDEO" | sed 's/twitch-//;s/-[0-9]*\..*//')
DATE=$(date +%Y-%m-%d)
OUT_DIR="$(dirname "$VIDEO")"
WHISPER_MODEL="$HOME/.cache/whisper/ggml-small.bin"
SEGMENT_MIN_DURATION=20
SILENCE_THRESHOLD="-30"
SILENCE_DURATION="2"
VOLUME_SPIKE_RATIO="1.3"  # flag timestamps where volume > 1.3x average

mkdir -p "$OUT_DIR/frames" "$OUT_DIR/clips"

log() { echo "[$(date '+%H:%M:%S')] $1"; }

# --- Convert JSON chat to text format if needed ---
if [ -n "$CHAT_LOG" ] && [ "$CHAT_IS_JSON" = true ] && [ -f "$CHAT_LOG" ]; then
    CHAT_TEXT="$OUT_DIR/chat-converted.txt"
    if [ ! -f "$CHAT_TEXT" ]; then
        log "Converting JSON chat to text format..."
        python3 -c "
import json
with open('$CHAT_LOG') as f:
    messages = json.load(f)
with open('$CHAT_TEXT', 'w') as f:
    for m in messages:
        secs = int(m.get('time_s', 0))
        h, rem = divmod(secs, 3600)
        mins, s = divmod(rem, 60)
        f.write(f'[{h:02d}:{mins:02d}:{s:02d}] {m[\"user\"]}: {m[\"message\"]}\n')
print(f'  Converted {len(messages)} messages')
" 2>/dev/null
    fi
    CHAT_LOG="$CHAT_TEXT"
fi

# ============================================================
# PASS 1: AUDIO ANALYSIS (transcript + volume + silence)
# ============================================================

# --- 1a: Extract audio ---
AUDIO="$OUT_DIR/full-audio.wav"
if [ ! -f "$AUDIO" ]; then
    log "Pass 1a: Extracting audio..."
    ffmpeg -i "$VIDEO" -vn -acodec pcm_s16le -ar 16000 -ac 1 "$AUDIO" -y 2>/dev/null
    log "  Audio extracted: $(du -sh "$AUDIO" | cut -f1)"
else
    log "Pass 1a: Audio exists, skipping extraction"
fi

# --- 1b: Detect silence boundaries ---
SILENCES="$OUT_DIR/silences.txt"
if [ ! -f "$SILENCES" ]; then
    log "Pass 1b: Detecting silence boundaries..."
    ffmpeg -i "$AUDIO" -af "silencedetect=noise=${SILENCE_THRESHOLD}dB:d=${SILENCE_DURATION}" -f null - 2>&1 \
      | { grep "silence_end" || true; } \
      | awk '{print $5}' \
      > "$SILENCES"
    log "  Found $(wc -l < "$SILENCES") silence boundaries"
else
    log "Pass 1b: Silences file exists, skipping"
fi

# --- 1c: Volume per 10-second window ---
VOLUME_FILE="$OUT_DIR/volume-per-10s.txt"
if [ ! -f "$VOLUME_FILE" ]; then
    log "Pass 1c: Measuring volume per 10s window..."
    DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$AUDIO" 2>/dev/null | cut -d. -f1)
    : > "$VOLUME_FILE"
    for ((t=0; t<DURATION; t+=10)); do
        RMS=$(sox "$AUDIO" -n trim "$t" 10 stat 2>&1 | grep "RMS.*amplitude" | head -1 | awk '{print $NF}' 2>/dev/null || echo "0")
        echo "$t $RMS" >> "$VOLUME_FILE"
    done
    log "  Volume measured: $(wc -l < "$VOLUME_FILE") windows"
else
    log "Pass 1c: Volume file exists, skipping"
fi

# --- 1d: Find volume spikes ---
SPIKES_FILE="$OUT_DIR/volume-spikes.txt"
log "Pass 1d: Finding volume spikes (>${VOLUME_SPIKE_RATIO}x average)..."
/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 -c "
import sys
lines = [l.strip().split() for l in open('$VOLUME_FILE') if l.strip()]
vals = [(int(l[0]), float(l[1])) for l in lines if len(l) == 2 and float(l[1]) > 0.0001]
if not vals:
    sys.exit(0)
avg = sum(v for _,v in vals) / len(vals)
threshold = avg * $VOLUME_SPIKE_RATIO
spikes = [(t, v, v/avg) for t,v in vals if v > threshold]
spikes.sort(key=lambda x: -x[2])
with open('$SPIKES_FILE', 'w') as f:
    f.write(f'# Average RMS: {avg:.6f}  Threshold: {threshold:.6f}\n')
    for t, v, ratio in spikes[:20]:
        mins, secs = divmod(t, 60)
        f.write(f'{t} {v:.6f} {ratio:.1f}x [{mins:02d}:{secs:02d}]\n')
print(f'  Found {len(spikes)} spikes (top 20 saved)')
"
touch "$SPIKES_FILE"  # ensure file exists even if no spikes found
head -5 "$SPIKES_FILE"

# --- 1e: Segment and transcribe ---
TRANSCRIPT="$OUT_DIR/transcript.md"
if [ ! -f "$TRANSCRIPT" ]; then
    log "Pass 1e: Segmenting and transcribing..."
    echo "# Stream Transcript: ${STREAMER} (${DATE})" > "$TRANSCRIPT"
    echo "" >> "$TRANSCRIPT"

    PREV_END=0
    SEG_NUM=0
    DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$AUDIO" 2>/dev/null | cut -d. -f1)

    # Work with a copy of silences + end marker
    SILENCES_WORK=$(mktemp)
    cp "$SILENCES" "$SILENCES_WORK"
    echo "$DURATION" >> "$SILENCES_WORK"

    while IFS= read -r SILENCE_END; do
        END=$(echo "$SILENCE_END" | cut -d. -f1)
        SEGMENT_DURATION=$((END - PREV_END))

        [ "$SEGMENT_DURATION" -lt "$SEGMENT_MIN_DURATION" ] && continue

        SEG_NUM=$((SEG_NUM + 1))
        SEG_FILE="$OUT_DIR/segment-$(printf '%03d' $SEG_NUM).wav"

        ffmpeg -nostdin -i "$AUDIO" -ss "$PREV_END" -to "$END" -y "$SEG_FILE" 2>/dev/null

        TRANSCRIPTION=$(whisper-cli -m "$WHISPER_MODEL" -f "$SEG_FILE" --no-timestamps 2>/dev/null || echo "[transcription failed]")

        MINS=$((PREV_END / 60))
        SECS=$((PREV_END % 60))
        TIMESTAMP=$(printf "%02d:%02d" $MINS $SECS)

        echo "## [$TIMESTAMP] Segment $SEG_NUM (${SEGMENT_DURATION}s)" >> "$TRANSCRIPT"
        echo "" >> "$TRANSCRIPT"
        echo "$TRANSCRIPTION" >> "$TRANSCRIPT"
        echo "" >> "$TRANSCRIPT"

        log "  Segment $SEG_NUM [$TIMESTAMP] (${SEGMENT_DURATION}s): $(echo "$TRANSCRIPTION" | head -1 | cut -c1-60)..."

        PREV_END=$END
    done < "$SILENCES_WORK"
    rm -f "$SILENCES_WORK"

    log "  Transcription complete: $SEG_NUM segments"
else
    log "Pass 1e: Transcript exists, skipping"
    SEG_NUM=$(grep -c "^## \[" "$TRANSCRIPT" || echo 0)
fi

# ============================================================
# PASS 2: VISUAL ANALYSIS (frames + clips)
# ============================================================

# --- 2a: Extract frames at volume spike timestamps ---
log "Pass 2a: Extracting frames at spike timestamps..."
SPIKE_TIMESTAMPS=()
while IFS= read -r line; do
    [[ "$line" == "#"* ]] && continue
    TS=$(echo "$line" | awk '{print $1}')
    [ -n "$TS" ] && SPIKE_TIMESTAMPS+=("$TS")
done < "$SPIKES_FILE"

# Also extract periodic frames during silent stretches (every 60s when volume < avg)
# This catches visual-only gems (e.g., browsing Twitter silently)
/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 -c "
lines = [l.strip().split() for l in open('$VOLUME_FILE') if l.strip()]
vals = [(int(l[0]), float(l[1])) for l in lines if len(l) == 2]
avg = sum(v for _,v in vals) / len(vals) if vals else 0.01
# Find runs of 3+ consecutive low-volume windows (30s+ of quiet)
quiet_starts = []
run_start = None
run_count = 0
for t, v in vals:
    if v < avg * 0.5:
        if run_start is None: run_start = t
        run_count += 1
    else:
        if run_count >= 3:
            # Sample one frame per 60s in the quiet stretch
            for qt in range(run_start, t, 60):
                quiet_starts.append(qt)
        run_start = None
        run_count = 0
for t in quiet_starts:
    print(t)
" > "$OUT_DIR/quiet-frames.txt" 2>/dev/null

FRAME_COUNT=0
for TS in ${SPIKE_TIMESTAMPS[@]+"${SPIKE_TIMESTAMPS[@]}"}; do
    MINS=$((TS / 60))
    SECS=$((TS % 60))
    FNAME="frame-${MINS}m${SECS}s.jpg"
    if [ ! -f "$OUT_DIR/frames/$FNAME" ]; then
        ffmpeg -ss "$TS" -i "$VIDEO" -vframes 1 -q:v 3 "$OUT_DIR/frames/$FNAME" -y 2>/dev/null
        FRAME_COUNT=$((FRAME_COUNT + 1))
    fi
done

# Quiet-period frames
while IFS= read -r TS; do
    [ -z "$TS" ] && continue
    MINS=$((TS / 60))
    SECS=$((TS % 60))
    FNAME="frame-quiet-${MINS}m${SECS}s.jpg"
    if [ ! -f "$OUT_DIR/frames/$FNAME" ]; then
        ffmpeg -ss "$TS" -i "$VIDEO" -vframes 1 -q:v 3 "$OUT_DIR/frames/$FNAME" -y 2>/dev/null
        FRAME_COUNT=$((FRAME_COUNT + 1))
    fi
done < "$OUT_DIR/quiet-frames.txt"

log "  Extracted $FRAME_COUNT new frames ($(ls "$OUT_DIR/frames/" | wc -l | tr -d ' ') total)"

# --- 2b: Clips extracted AFTER scoring (Pass 3 identifies gem timestamps) ---

# ============================================================
# PASS 3: SCORING (combine all signals)
# ============================================================

# Build a combined signal file for scoring
SIGNALS_FILE="$OUT_DIR/signals-combined.md"
log "Pass 3: Building combined signal file..."

echo "# Combined Signals: ${STREAMER} (${DATE})" > "$SIGNALS_FILE"
echo "" >> "$SIGNALS_FILE"

echo "## Volume Spikes" >> "$SIGNALS_FILE"
cat "$SPIKES_FILE" >> "$SIGNALS_FILE"
echo "" >> "$SIGNALS_FILE"

echo "## Chat Analysis" >> "$SIGNALS_FILE"
if [ -n "$CHAT_LOG" ] && [ -f "$CHAT_LOG" ]; then
    CHAT_TOTAL=$(wc -l < "$CHAT_LOG")
    echo "Total messages: $CHAT_TOTAL" >> "$SIGNALS_FILE"
    echo "" >> "$SIGNALS_FILE"

    # Chat velocity: messages per 10-second window
    VELOCITY_FILE="$OUT_DIR/chat-velocity.txt"
    log "  Measuring chat velocity..."
    /Library/Frameworks/Python.framework/Versions/3.13/bin/python3 -c "
import re
from collections import Counter

lines = open('$CHAT_LOG').readlines()
# Parse timestamps [HH:MM:SS]
times = []
for line in lines:
    m = re.match(r'\[(\d{2}):(\d{2}):(\d{2})\]', line)
    if m:
        h, mi, s = int(m.group(1)), int(m.group(2)), int(m.group(3))
        times.append(h * 3600 + mi * 60 + s)

if not times:
    print('No parseable timestamps')
    exit(0)

# Bucket into 10s windows (relative to first message)
base = times[0]
buckets = Counter()
for t in times:
    bucket = ((t - base) // 10) * 10
    buckets[bucket] += 1

# Write velocity file
avg = len(times) / max(len(buckets), 1)
with open('$VELOCITY_FILE', 'w') as f:
    f.write(f'# Chat velocity (msgs per 10s) | avg: {avg:.1f}\n')
    for bucket in sorted(buckets):
        count = buckets[bucket]
        marker = ' <<<' if count > avg * 2 else ''
        mins, secs = divmod(bucket, 60)
        f.write(f'{bucket} {count} [{mins:02d}:{secs:02d}]{marker}\n')

spikes = [(b, c) for b, c in buckets.items() if c > avg * 2]
print(f'  {len(times)} messages, {len(buckets)} windows, {len(spikes)} velocity spikes')
" 2>/dev/null

    echo "### Chat Velocity Spikes (>2x average):" >> "$SIGNALS_FILE"
    grep "<<<" "$VELOCITY_FILE" >> "$SIGNALS_FILE" 2>/dev/null || echo "  None" >> "$SIGNALS_FILE"
    echo "" >> "$SIGNALS_FILE"

    echo "### First 30 messages:" >> "$SIGNALS_FILE"
    head -30 "$CHAT_LOG" >> "$SIGNALS_FILE"
else
    echo "No chat log available" >> "$SIGNALS_FILE"
fi
echo "" >> "$SIGNALS_FILE"

echo "## Transcript" >> "$SIGNALS_FILE"
cat "$TRANSCRIPT" >> "$SIGNALS_FILE"
echo "" >> "$SIGNALS_FILE"

echo "## Frames Extracted" >> "$SIGNALS_FILE"
ls "$OUT_DIR/frames/" >> "$SIGNALS_FILE" 2>/dev/null || echo "None" >> "$SIGNALS_FILE"

log "  Combined signals written to $SIGNALS_FILE"

# --- 3b: Auto-score with Gemini ---
source "$HOME/Gits/golems/.env" 2>/dev/null || true
GEMINI_KEY="${GOOGLE_GENERATIVE_AI_API_KEY:-}"

GEMS_FILE="$OUT_DIR/gems.md"
if [ -n "$GEMINI_KEY" ] && [ ! -f "$GEMS_FILE" ]; then
    log "Pass 3b: Auto-scoring transcript segments with Gemini..."

    # Build volume spike lookup and chat spike lookup
    SPIKE_TIMES=""
    if [ -f "$SPIKES_FILE" ]; then
        SPIKE_TIMES=$(grep -v "^#" "$SPIKES_FILE" | awk '{print $1}' | tr '\n' ',' || echo "")
    fi
    CHAT_SPIKE_TIMES=""
    if [ -f "$OUT_DIR/chat-velocity.txt" ]; then
        CHAT_SPIKE_TIMES=$(grep "<<<" "$OUT_DIR/chat-velocity.txt" | awk '{print $1}' | tr '\n' ',' || echo "")
    fi

    SCORING_PROMPT="You are scoring Twitch/YouTube stream moments for a highlight reel.

Score for ENTERTAINMENT VALUE — moments viewers would want to see in a highlights compilation:
- Funny reactions, rage moments, hype moments
- Hot takes, controversial opinions, rants
- Impressive gameplay, clutch plays, fails
- Unexpected events, surprise reveals, pranks
- Wholesome interactions, viewer call-outs
- Tech drama, industry gossip, juicy takes
- Memes born, catchphrases created, inside jokes

Signals boosting the score:
- VOLUME_SPIKE=true means the streamer got loud here (excitement/rage)
- CHAT_SPIKE=true means chat went wild here (hype/reaction)
- Both together = almost certainly a gem

Score 1-10 for entertainment value. 7+ = gem worthy. Reply ONLY with JSON:
{\"score\": N, \"type\": \"reaction/take/gameplay/fail/hype/wholesome/drama/meme/rant/other\", \"title\": \"short catchy title (5-8 words)\"}"

    echo "# Gems: ${STREAMER} (${DATE})" > "$GEMS_FILE"
    echo "" >> "$GEMS_FILE"

    CURRENT_HEADER=""
    CURRENT_TEXT=""
    CURRENT_TS_SECS=0
    GEM_COUNT=0

    score_segment() {
        local header="$1"
        local text="$2"
        local ts_secs="$3"
        [ -z "$text" ] && return

        # Check if this timestamp has volume/chat spikes (within 10s window)
        local vol_spike=false
        local chat_spike=false
        for spike_t in ${SPIKE_TIMES//,/ }; do
            [ -z "$spike_t" ] && continue
            local diff=$((ts_secs - spike_t))
            [ $diff -lt 0 ] && diff=$((-diff))
            [ $diff -le 10 ] && vol_spike=true && break
        done
        for spike_t in ${CHAT_SPIKE_TIMES//,/ }; do
            [ -z "$spike_t" ] && continue
            local diff=$((ts_secs - spike_t))
            [ $diff -lt 0 ] && diff=$((-diff))
            [ $diff -le 10 ] && chat_spike=true && break
        done

        local signal_text="VOLUME_SPIKE=${vol_spike}, CHAT_SPIKE=${chat_spike}"

        # Build JSON payload safely via Python json.dumps (avoids injection from transcript text)
        local clean_text
        clean_text=$(echo "$text" | tr '\n' ' ' | LC_ALL=C tr -cd '[:print:] ' | cut -c1-2000)

        RESULT=$(/Library/Frameworks/Python.framework/Versions/3.13/bin/python3 -c "
import sys, json, urllib.request
prompt = sys.argv[1]
signals = sys.argv[2]
segment = sys.argv[3]
api_key = sys.argv[4]

full_text = f'{prompt}\n\nSignals: {signals}\n\nSegment:\n{segment}'
payload = json.dumps({
    'contents': [{'parts': [{'text': full_text}]}],
    'generationConfig': {'maxOutputTokens': 100}
}).encode()

req = urllib.request.Request(
    f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
    data=payload,
    headers={'Content-Type': 'application/json', 'x-goog-api-key': api_key}
)
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        r = json.load(resp)
    text = r['candidates'][0]['content']['parts'][0]['text'].strip()
    if '{' in text:
        text = text[text.index('{'):text.rindex('}')+1]
    d = json.loads(text)
    print(f\"{d.get('score',0)}|{d.get('type','other')}|{d.get('title','untitled')}\")
except:
    print('5|other|api error')
" "$SCORING_PROMPT" "$signal_text" "$clean_text" "$GEMINI_KEY" 2>/dev/null || echo "5|other|api error")

        SCORE=$(echo "$RESULT" | cut -d'|' -f1)
        TYPE=$(echo "$RESULT" | cut -d'|' -f2)
        TITLE=$(echo "$RESULT" | cut -d'|' -f3-)

        local signals=""
        [ "$vol_spike" = true ] && signals="${signals}VOL "
        [ "$chat_spike" = true ] && signals="${signals}CHAT "
        log "  [$SCORE/10 $TYPE ${signals}] $(echo "$header" | sed 's/## //' | cut -c1-40)"

        if [ "${SCORE:-0}" -ge 7 ] 2>/dev/null; then
            GEM_COUNT=$((GEM_COUNT + 1))
            # header is "## [MM:SS]" — strip "## " prefix to match downstream ### [MM:SS] format
            local ts_tag="${header#\#\# }"
            echo "### ${ts_tag} ${TITLE}" >> "$GEMS_FILE"
            echo "**Score:** $SCORE/10 | **Type:** $TYPE" >> "$GEMS_FILE"
            [ "$vol_spike" = true ] && echo "**Volume spike:** yes" >> "$GEMS_FILE"
            [ "$chat_spike" = true ] && echo "**Chat spike:** yes" >> "$GEMS_FILE"
            echo "" >> "$GEMS_FILE"
            echo "**Transcript:** $(echo "$text" | head -3 | tr '\n' ' ' | cut -c1-300)" >> "$GEMS_FILE"
            echo "" >> "$GEMS_FILE"
            log "  ^ GEM!"
        fi

        # Rate limit: 15 req/min free tier
        sleep 5
    }

    while IFS= read -r line; do
        if [[ "$line" == "## ["* ]]; then
            [ -n "$CURRENT_TEXT" ] && score_segment "$CURRENT_HEADER" "$CURRENT_TEXT" "$CURRENT_TS_SECS"
            CURRENT_HEADER="$line"
            CURRENT_TEXT=""
            # Extract timestamp seconds from "## [MM:SS]"
            TS_RAW=$(echo "$line" | sed 's/## \[\([0-9:]*\)\].*/\1/')
            CURRENT_TS_SECS=0
            for P in $(echo "$TS_RAW" | tr ':' ' '); do
                CURRENT_TS_SECS=$(( CURRENT_TS_SECS * 60 + ${P#0} ))
            done
        elif [[ "$line" != "# Stream"* ]] && [[ -n "$line" ]]; then
            CURRENT_TEXT="$CURRENT_TEXT $line"
        fi
    done < "$TRANSCRIPT"
    [ -n "$CURRENT_TEXT" ] && score_segment "$CURRENT_HEADER" "$CURRENT_TEXT" "$CURRENT_TS_SECS"

    echo "" >> "$GEMS_FILE"
    echo "---" >> "$GEMS_FILE"
    echo "Source: $VIDEO" >> "$GEMS_FILE"
    echo "Gems found: $GEM_COUNT" >> "$GEMS_FILE"
    echo "Scored: $(date)" >> "$GEMS_FILE"

    log "  Auto-scoring complete: $GEM_COUNT gems found"

elif [ -f "$GEMS_FILE" ]; then
    log "Pass 3b: Gems file exists, skipping scoring"
elif [ -z "$GEMINI_KEY" ]; then
    log "Pass 3b: No GOOGLE_GENERATIVE_AI_API_KEY — skipping auto-scoring"
    log "  Set the key in ~/Gits/golems/.env or score manually using signals-combined.md"
fi

# ============================================================
# PASS 4: CLIP EXTRACTION (runs if gems.md already has timestamps)
# ============================================================

# GEMS_FILE already set above
if [ -f "$GEMS_FILE" ]; then
    log "Pass 4: Extracting clips for existing gems..."
    # Parse gem timestamps from gems.md (format: ### [MM:SS] or ### [HH:MM:SS])
    CLIP_COUNT=0
    # Extract timestamps from gems.md (macOS-compatible, no grep -P)
    while IFS= read -r TS; do
        [ -z "$TS" ] && continue
        # Parse MM:SS or HH:MM:SS to seconds
        PARTS=$(echo "$TS" | tr ':' ' ')
        SECS=0
        for P in $PARTS; do
            SECS=$(( SECS * 60 + ${P#0} ))
        done

        CLIP_NAME="clip-$(echo "$TS" | tr ':' 'm')s"
        CLIP_FILE="$OUT_DIR/clips/${CLIP_NAME}.mp4"

        if [ ! -f "$CLIP_FILE" ]; then
            START=$((SECS - 5))
            [ $START -lt 0 ] && START=0
            ffmpeg -nostdin -y -ss "$START" -i "$VIDEO" -t 10 \
                -c:v libx264 -preset fast -crf 28 \
                -c:a aac -b:a 64k \
                -movflags +faststart \
                "$CLIP_FILE" 2>/dev/null
            log "  Clip: $CLIP_NAME ($(du -h "$CLIP_FILE" | cut -f1))"
            CLIP_COUNT=$((CLIP_COUNT + 1))
        fi
    done < <(sed -n 's/^### \[\([0-9:]*\)\].*/\1/p' "$GEMS_FILE" 2>/dev/null)
    log "  Extracted $CLIP_COUNT new clips"

    # --- 4b: Auto-annotate clips if annotate-clip.sh exists ---
    ANNOTATE_SCRIPT="$(dirname "$0")/annotate-clip.sh"
    if [ -x "$ANNOTATE_SCRIPT" ]; then
        log "Pass 4b: Annotating clips..."
        # Parse gem titles and context from gems.md for annotation
        # Format: ### [MM:SS] Title\n**Score:** X/10 | **Type:** Y
        /Library/Frameworks/Python.framework/Versions/3.13/bin/python3 -c "
import re, subprocess, os, glob

gems_path = '$GEMS_FILE'
clips_dir = '$OUT_DIR/clips'
script = '$ANNOTATE_SCRIPT'

with open(gems_path) as f:
    text = f.read()

# Find gems: ### [timestamp] title
gems = re.findall(r'### \[([^\]]+)\]\s+(.+?)$\n\*\*Score:\*\*\s+(\d+/10)\s+\|\s+\*\*Type:\*\*\s+(\w+[/\w]*)', text, re.MULTILINE)

for ts, title, score, gtype in gems:
    # Find matching clip
    ts_clean = ts.replace(':', 'm') + 's'
    matches = glob.glob(f'{clips_dir}/clip-{ts_clean}*.mp4')
    matches = [m for m in matches if 'annotated' not in m]
    if not matches:
        continue
    clip = matches[0]
    out = clip.replace('.mp4', '-annotated.mp4')
    if os.path.exists(out):
        continue

    header = f'{title}  |  {score}  |  {gtype}'
    # Get first context line after the gem header (skip score line)
    idx = text.find(f'### [{ts}]')
    context = ''
    if idx >= 0:
        lines_after = text[idx:idx+500].split('\n')
        for line in lines_after[2:]:
            if line.startswith('**') and 'Transcript' in line:
                continue
            if line.startswith('**') and 'Screen' in line:
                continue
            if line.startswith('**') and 'Context' in line:
                context = line.split(':', 1)[1].strip() if ':' in line else ''
                break
            if line.startswith('**') and 'Relevance' in line:
                context = line.split(':', 1)[1].strip() if ':' in line else ''
                break
    if not context:
        context = title

    subprocess.run([script, clip, header, context, out], capture_output=True)
    if os.path.exists(out):
        print(f'  Annotated: {os.path.basename(out)}')
" 2>/dev/null
    fi
else
    log "Pass 4: No gems.md yet — skipping clip extraction"
fi

# ============================================================
# PASS 5: GENERATE GEMS-MANIFEST.JSON (if --json-output)
# ============================================================

MANIFEST_FILE="$OUT_DIR/gems-manifest.json"
if [ "$JSON_OUTPUT" = true ] && [ -f "$GEMS_FILE" ] && [ ! -f "$MANIFEST_FILE" ]; then
    log "Pass 5: Generating gems-manifest.json..."
    DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO" 2>/dev/null | cut -d. -f1 || echo "0")

    python3 -c "
import json, re, os

gems_path = '$GEMS_FILE'
manifest_path = '$MANIFEST_FILE'
spikes_path = '$SPIKES_FILE'
volume_path = '$VOLUME_FILE'

with open(gems_path) as f:
    text = f.read()

# Parse gems from markdown
pattern = r'### \[([^\]]+)\]\s+(.+?)$\n\*\*Score:\*\*\s+(\d+)/10\s+\|\s+\*\*Type:\*\*\s+(\S+)'
gems = []
for match in re.finditer(pattern, text, re.MULTILINE):
    ts, title, score, gtype = match.groups()

    # Parse timestamp to seconds
    parts = ts.split(':')
    secs = 0
    for p in parts:
        secs = secs * 60 + int(p)

    gem_id = f'gem-{len(gems)+1:03d}'

    # Check for volume spike at this timestamp
    volume_spike = False
    if os.path.exists(spikes_path):
        with open(spikes_path) as f:
            for line in f:
                if line.startswith('#'): continue
                parts_v = line.strip().split()
                if parts_v and abs(int(parts_v[0]) - secs) <= 10:
                    volume_spike = True
                    break

    # Check for clip and frame
    mins, s = divmod(secs, 60)
    clip_name = f'clip-{ts.replace(\":\", \"m\")}s.mp4'
    clip_path = f'clips/{clip_name}' if os.path.exists(os.path.join('$OUT_DIR', 'clips', clip_name)) else None
    frame_name = f'frame-{mins}m{s}s.jpg'
    frame_path = f'frames/{frame_name}' if os.path.exists(os.path.join('$OUT_DIR', 'frames', frame_name)) else None

    # Extract transcript snippet from gems.md
    idx = text.find(f'### [{ts}]')
    transcript = ''
    if idx >= 0:
        block = text[idx:idx+1000]
        lines = block.split('\n')
        for line in lines[3:]:
            if line.startswith('### [') or line.startswith('---'):
                break
            if line.strip() and not line.startswith('**'):
                transcript += line.strip() + ' '
        transcript = transcript.strip()[:300]

    gems.append({
        'id': gem_id,
        'timestamp': ts,
        'start_s': max(0, secs - 5),
        'end_s': secs + 5,
        'score': int(score),
        'type': gtype,
        'title': title.strip(),
        'signals': {
            'volume_spike': volume_spike,
        },
        'transcript': transcript,
        'clip_path': clip_path,
        'frame_path': frame_path
    })

manifest = {
    'version': 1,
    'vod_url': '',
    'streamer': '$STREAMER',
    'date': '$DATE',
    'duration_s': int('$DURATION' or 0),
    'gem_count': len(gems),
    'gems': sorted(gems, key=lambda g: -g['score'])
}

with open(manifest_path, 'w') as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

print(f'  Manifest: {len(gems)} gems written to gems-manifest.json')
" 2>/dev/null

elif [ "$JSON_OUTPUT" = true ] && [ -f "$MANIFEST_FILE" ]; then
    log "Pass 5: Manifest already exists, skipping"
elif [ "$JSON_OUTPUT" = true ]; then
    log "Pass 5: No gems.md yet — manifest generation deferred"
fi

# ============================================================
# CLEANUP: Remove segment WAVs (regeneratable from full-audio.wav)
# ============================================================

SEGMENT_SIZE=$(du -sh "$OUT_DIR"/segment-*.wav 2>/dev/null | tail -1 | cut -f1 || echo "0")
SEGMENT_COUNT_FILES=$(find "$OUT_DIR" -maxdepth 1 -name "segment-*.wav" 2>/dev/null | wc -l | tr -d ' ')
if [ "$SEGMENT_COUNT_FILES" -gt 0 ]; then
    log "Cleanup: Removing $SEGMENT_COUNT_FILES segment WAVs ($SEGMENT_SIZE total)"
    rm -f "$OUT_DIR"/segment-*.wav
fi

log ""
log "=== PROCESSING COMPLETE ==="
log "Directory: $OUT_DIR"
log "Transcript: $TRANSCRIPT ($SEG_NUM segments)"
log "Volume spikes: $SPIKES_FILE"
log "Frames: $OUT_DIR/frames/ ($(ls "$OUT_DIR/frames/" 2>/dev/null | wc -l | tr -d ' ') files)"
log "Clips: $OUT_DIR/clips/ ($(ls "$OUT_DIR/clips/" 2>/dev/null | wc -l | tr -d ' ') files)"
log "Combined signals: $SIGNALS_FILE"
[ -f "$GEMS_FILE" ] && log "Gems: $GEMS_FILE"
log ""
log "Total disk: $(du -sh "$OUT_DIR" | cut -f1)"
log ""
log "Cleanup options:"
log "  rm $OUT_DIR/segment-*.wav     # Segment audio (~50MB)"
log "  rm $OUT_DIR/full-audio.wav    # Full audio (~50MB)"
log "  rm $VIDEO                      # Full video (biggest)"
