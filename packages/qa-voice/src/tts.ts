/**
 * TTS module — Python edge-tts CLI → afplay.
 *
 * Synthesizes speech via edge-tts (Python), plays via afplay.
 * The npm edge-tts-universal package hangs with Bun 1.3.9,
 * so we shell out to the Python CLI instead.
 */

const VOICE = process.env.QA_VOICE_TTS_VOICE || "en-US-JennyNeural";
const RATE = process.env.QA_VOICE_TTS_RATE || "+15%";
const TTS_FILE = "/tmp/golems-tts.mp3";
const F5_ENABLED = process.env.QA_VOICE_F5_ENABLED !== "false";

/**
 * Speak text aloud via edge-tts (Python) → afplay.
 * If triggerF5 is true and F5 is enabled, simulates F5 keypress after speech.
 */
export async function speak(text: string, triggerF5 = false): Promise<void> {
  // Generate speech via Python edge-tts CLI
  const synth = Bun.spawn([
    "python3", "-m", "edge_tts",
    "--text", text,
    "--voice", VOICE,
    "--rate", RATE,
    "--write-media", TTS_FILE,
  ]);
  await synth.exited;

  // Play audio
  const play = Bun.spawn(["afplay", TTS_FILE]);
  await play.exited;

  if (triggerF5 && F5_ENABLED) {
    await simulateF5();
  }
}

/**
 * Simulate F5 keypress to trigger Wispr Flow push-to-talk.
 * Key code 96 = F5 on external keyboards.
 * Requires Accessibility permission for the terminal app.
 */
async function simulateF5(): Promise<void> {
  try {
    const proc = Bun.spawn([
      "osascript",
      "-e",
      'tell application "System Events" to key code 96',
    ]);
    await proc.exited;
  } catch (err) {
    console.error("[qa-voice] F5 simulation failed (need Accessibility permission?):", err);
  }
}
