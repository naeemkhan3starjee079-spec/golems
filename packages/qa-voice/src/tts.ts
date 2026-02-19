/**
 * TTS module — Python edge-tts CLI → afplay.
 *
 * Synthesizes speech via edge-tts (Python CLI), plays via afplay.
 */

const VOICE = process.env.QA_VOICE_TTS_VOICE || "en-US-JennyNeural";
const RATE = process.env.QA_VOICE_TTS_RATE || "+15%";

let ttsCounter = 0;

/**
 * Speak text aloud via edge-tts (Python) → afplay.
 */
export async function speak(text: string): Promise<void> {
  if (!text?.trim()) return;

  // Unique file per call to avoid collisions from concurrent speak() calls
  const ttsFile = `/tmp/golems-tts-${process.pid}-${ttsCounter++}.mp3`;

  try {
    // Generate speech via Python edge-tts CLI
    const synth = Bun.spawn([
      "python3", "-m", "edge_tts",
      "--text", text,
      "--voice", VOICE,
      "--rate", RATE,
      "--write-media", ttsFile,
    ]);
    const synthExit = await synth.exited;
    if (synthExit !== 0) {
      throw new Error(`edge-tts failed with exit code ${synthExit}. Is edge-tts installed? Run: pip3 install edge-tts`);
    }

    // Play audio
    const play = Bun.spawn(["afplay", ttsFile]);
    const playExit = await play.exited;
    if (playExit !== 0) {
      throw new Error(`afplay failed with exit code ${playExit}`);
    }
  } finally {
    // Clean up temp file
    try {
      const { unlinkSync } = await import("fs");
      unlinkSync(ttsFile);
    } catch {}
  }
}
