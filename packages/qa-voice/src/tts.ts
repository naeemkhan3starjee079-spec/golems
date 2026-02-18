/**
 * TTS module — edge-tts-universal with macOS `say` fallback.
 *
 * Speaks text aloud via edge-tts neural voices.
 * Falls back to macOS `say` command if edge-tts fails.
 */

const VOICE = process.env.QA_VOICE_TTS_VOICE || "en-US-EmmaMultilingualNeural";
const TTS_FILE = "/tmp/golems-tts.mp3";

/**
 * Speak text aloud. Blocks until audio finishes playing.
 */
export async function speak(text: string): Promise<void> {
  try {
    await speakEdgeTTS(text);
  } catch (err) {
    console.error("[qa-voice] edge-tts failed, falling back to macOS say:", err);
    await speakMacOS(text);
  }
}

async function speakEdgeTTS(text: string): Promise<void> {
  const { Communicate } = await import("edge-tts-universal");
  const tts = new Communicate(text, { voice: VOICE });
  await tts.save(TTS_FILE);
  const proc = Bun.spawn(["afplay", TTS_FILE]);
  await proc.exited;
}

async function speakMacOS(text: string): Promise<void> {
  // macOS built-in TTS — robotic but instant and reliable
  const proc = Bun.spawn(["say", text]);
  await proc.exited;
}
