#!/bin/bash
# speak.sh — Standalone TTS command for QA Voice
#
# Usage: ./scripts/speak.sh "Hello, how are you?"
#        echo "text" | ./scripts/speak.sh
#
# Uses edge-tts-universal via Bun first, falls back to macOS `say`.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
VOICE="${QA_VOICE_TTS_VOICE:-en-US-EmmaMultilingualNeural}"
TTS_FILE="/tmp/golems-tts.mp3"

# Get text from args or stdin
if [ $# -gt 0 ]; then
    TEXT="$*"
elif [ ! -t 0 ]; then
    TEXT="$(cat)"
else
    echo "Usage: speak.sh <text>" >&2
    exit 1
fi

if [ -z "$TEXT" ]; then
    echo "No text provided." >&2
    exit 1
fi

# Try edge-tts-universal via Bun
speak_edge_tts() {
    bun -e "
        import { EdgeTTS } from 'edge-tts-universal';
        const tts = new EdgeTTS(process.argv[1], '$VOICE');
        const result = await tts.synthesize();
        const buf = Buffer.from(await result.audio.arrayBuffer());
        await Bun.write('$TTS_FILE', buf);
    " "$TEXT" 2>/dev/null && afplay "$TTS_FILE" 2>/dev/null
}

# Fallback: macOS say
speak_macos() {
    say "$TEXT"
}

if speak_edge_tts; then
    exit 0
else
    echo "[speak.sh] edge-tts failed, using macOS say" >&2
    speak_macos
fi
