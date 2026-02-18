/**
 * TTS module — edge-tts-universal with macOS `say` fallback.
 *
 * Speaks text aloud via edge-tts neural voices.
 * Falls back to macOS `say` command if edge-tts fails.
 * Optionally triggers F5 (Wispr Flow push-to-talk) after speaking.
 */

const VOICE = process.env.QA_VOICE_TTS_VOICE || "en-US-EmmaMultilingualNeural";
const TTS_FILE = "/tmp/golems-tts.mp3";
const F5_ENABLED = process.env.QA_VOICE_F5_ENABLED !== "false";
// Set QA_VOICE_TTS_ENGINE=say to skip edge-tts (useful for testing)
const TTS_ENGINE = process.env.QA_VOICE_TTS_ENGINE || "edge-tts";

/**
 * Speak text aloud. Blocks until audio finishes playing.
 * If triggerF5 is true and F5 is enabled, simulates F5 keypress after speech
 * to open Wispr Flow for the user's voice response.
 */
export async function speak(text: string, triggerF5 = false): Promise<void> {
  if (TTS_ENGINE === "say") {
    await speakMacOS(text);
  } else {
    try {
      await speakEdgeTTS(text);
    } catch (err) {
      console.error("[qa-voice] edge-tts failed, falling back to macOS say:", err);
      await speakMacOS(text);
    }
  }

  if (triggerF5 && F5_ENABLED) {
    await simulateF5();
  }
}

async function speakEdgeTTS(text: string): Promise<void> {
  const { EdgeTTS } = await import("edge-tts-universal");
  const tts = new EdgeTTS(text, VOICE);
  const result = await tts.synthesize();
  const audioBuffer = Buffer.from(await result.audio.arrayBuffer());
  await Bun.write(TTS_FILE, audioBuffer);
  const proc = Bun.spawn(["afplay", TTS_FILE]);
  await proc.exited;
}

async function speakMacOS(text: string): Promise<void> {
  // macOS built-in TTS — robotic but instant and reliable
  const proc = Bun.spawn(["say", text]);
  await proc.exited;
}

/**
 * Simulate F5 keypress to trigger Wispr Flow push-to-talk.
 * Uses osascript with both key codes: 96 (external keyboard) and 176 (Mac built-in).
 * Requires Accessibility permission for the terminal app.
 */
async function simulateF5(): Promise<void> {
  try {
    // key code 96 = F5 on external keyboards
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
