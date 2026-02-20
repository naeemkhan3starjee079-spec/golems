/**
 * Input module — Wispr Flow WebSocket + mic recording.
 *
 * Records audio via sox `rec` command (16kHz 16-bit mono PCM),
 * streams to Wispr Flow WebSocket API for transcription.
 * Detects speech end via RMS energy silence detection.
 * Supports stop signal file for user-controlled stop.
 *
 * Prerequisites:
 *   brew install sox
 *   QA_VOICE_WISPR_KEY env var set
 */

import { hasStopSignal, clearStopSignal } from "./session-booking";

const SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2;
const CHUNK_DURATION_S = 1;
const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHUNK_DURATION_S; // 32000 bytes

const SILENCE_THRESHOLD = Number(process.env.QA_VOICE_SILENCE_THRESHOLD) || 500;
const DEFAULT_SILENCE_SECONDS = Number(process.env.QA_VOICE_SILENCE_SECONDS) || 2;

/**
 * Calculate RMS energy of a 16-bit signed PCM audio buffer.
 * Used for voice activity / silence detection.
 */
export function calculateRMS(buffer: Uint8Array): number {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const numSamples = Math.floor(buffer.byteLength / BYTES_PER_SAMPLE);
  if (numSamples === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < numSamples; i++) {
    const sample = view.getInt16(i * BYTES_PER_SAMPLE, true); // little-endian
    sumSquares += sample * sample;
  }

  return Math.sqrt(sumSquares / numSamples);
}

/**
 * Wait for user voice input via mic recording + Wispr Flow WebSocket.
 * Returns the transcribed text, or null on timeout / no speech.
 *
 * @param timeoutMs - Max wait time in milliseconds
 * @param silenceSeconds - Seconds of silence before auto-stop (default from env or 2)
 */
export async function waitForInput(
  timeoutMs: number,
  silenceSeconds?: number,
): Promise<string | null> {
  const effectiveSilence = silenceSeconds ?? DEFAULT_SILENCE_SECONDS;
  const apiKey = process.env.QA_VOICE_WISPR_KEY;
  if (!apiKey) {
    throw new Error(
      "QA_VOICE_WISPR_KEY not set. Get your API key from Wispr Flow settings."
    );
  }

  // Check that rec (sox) is available
  const which = Bun.spawnSync(["which", "rec"]);
  if (which.exitCode !== 0) {
    throw new Error(
      "sox not installed. Run: brew install sox\n" +
        "Also grant microphone access to your terminal app in System Settings > Privacy > Microphone."
    );
  }

  const wsUrl = `wss://platform-api.wisprflow.ai/api/v1/dash/ws?api_key=Bearer%20${apiKey}`;

  // Clear any leftover stop signal from previous recording
  clearStopSignal();

  return new Promise<string | null>((resolve, reject) => {
    let packetIndex = 0;
    let silentChunks = 0;
    let hasSpeech = false;
    let audioBuffer = new Uint8Array(0);
    let resolved = false;
    let recorder: ReturnType<typeof Bun.spawn> | null = null;
    let ws: WebSocket | null = null;

    const finish = (result: string | null, error?: Error) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);

      // Kill recorder
      if (recorder) {
        try {
          recorder.kill();
        } catch {}
        recorder = null;
      }

      // Close WebSocket
      if (ws && ws.readyState <= WebSocket.OPEN) {
        try {
          ws.close();
        } catch {}
        ws = null;
      }

      if (error) reject(error);
      else resolve(result);
    };

    // Timeout handler
    const timer = setTimeout(() => finish(null), timeoutMs);

    try {
      // Connect to Wispr Flow WebSocket first — only start recording after auth
      ws = new WebSocket(wsUrl);
      let wsReady = false;

      const startRecording = () => {
        // Start mic recording via sox — outputs raw 16kHz 16-bit mono PCM to stdout
        recorder = Bun.spawn(
          [
            "rec",
            "-r", String(SAMPLE_RATE),
            "-c", "1",
            "-b", "16",
            "-e", "signed",
            "-t", "raw",
            "-q", // quiet (no progress)
            "-", // output to stdout
          ],
          { stdout: "pipe", stderr: "ignore" },
        );

        if (!recorder.stdout) {
          finish(null, new Error("rec: stdout not available"));
          return;
        }
        const reader = (recorder.stdout as ReadableStream<Uint8Array>).getReader();

        const processAudio = async () => {
          while (!resolved) {
            const { value, done } = await reader.read();
            if (done || resolved) break;
            if (!value || value.length === 0) continue;

            // Append incoming bytes to buffer
            const combined = new Uint8Array(audioBuffer.length + value.length);
            combined.set(audioBuffer);
            combined.set(value, audioBuffer.length);
            audioBuffer = combined;

            // Process complete 1-second chunks
            while (audioBuffer.length >= CHUNK_SIZE && !resolved) {
              const chunk = audioBuffer.slice(0, CHUNK_SIZE);
              audioBuffer = audioBuffer.slice(CHUNK_SIZE);

              const rms = calculateRMS(chunk);

              if (rms >= SILENCE_THRESHOLD) {
                hasSpeech = true;
                silentChunks = 0;
              } else {
                silentChunks++;
              }

              // Check for user-initiated stop signal
              if (hasSpeech && hasStopSignal()) {
                clearStopSignal();
                console.error("[qa-voice] Stop signal received — ending recording");
                if (ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: "commit",
                      total_packets: packetIndex,
                    }),
                  );
                }
                try {
                  recorder?.kill();
                } catch {}
                return;
              }

              // Only commit after speech was detected AND silence follows
              if (hasSpeech && silentChunks >= effectiveSilence) {
                if (ws && ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: "commit",
                      total_packets: packetIndex,
                    }),
                  );
                }
                try {
                  recorder?.kill();
                } catch {}
                return;
              }

              // Send audio chunk to Wispr (only when WS is ready)
              if (wsReady && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: "append",
                    position: packetIndex++,
                    audio_packets: {
                      packets: [Buffer.from(chunk).toString("base64")],
                      volumes: [rms],
                      packet_duration: CHUNK_DURATION_S,
                      audio_encoding: "wav",
                      byte_encoding: "base64",
                    },
                  }),
                );
              }
            }
          }
        };

        processAudio().catch((err) => {
          finish(null, err instanceof Error ? err : new Error(String(err)));
        });
      };

      ws.addEventListener("open", () => {
        ws!.send(JSON.stringify({
          type: "auth",
          language: ["en"],
          context: { app: { name: "QA Voice", type: "ai" } },
        }));

        // Auth timeout — if Wispr doesn't confirm within 10s, fail
        setTimeout(() => {
          if (!resolved && !wsReady) {
            finish(null, new Error("Wispr Flow auth timeout. Check QA_VOICE_WISPR_KEY."));
          }
        }, 10_000);
      });

      ws.addEventListener("message", (event) => {
        if (resolved) return;
        try {
          const msg = JSON.parse(String(event.data));

          // Auth confirmed — start recording
          if (msg.status === "auth") {
            wsReady = true;
            console.error("[qa-voice] Listening... speak now");
            startRecording();
            return;
          }

          // Final transcription result
          if (msg.status === "text" && msg.body?.text) {
            const text = msg.body.text.trim();
            if (text) {
              console.error("[qa-voice] Transcription:", text);
              finish(text);
            }
          } else if (msg.status === "error") {
            console.error("[qa-voice] Wispr error:", msg.error);
            finish(
              null,
              new Error(`Wispr API error: ${msg.error || JSON.stringify(msg)}`),
            );
          }
        } catch {
          // Ignore non-JSON messages
        }
      });

      ws.addEventListener("error", () => {
        finish(
          null,
          new Error(
            "Wispr WebSocket connection failed. Check QA_VOICE_WISPR_KEY.",
          ),
        );
      });

      ws.addEventListener("close", () => {
        if (!resolved) finish(null);
      });
    } catch (err) {
      finish(null, err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Clear input state — no-op in WebSocket mode.
 * Kept for API compatibility with mcp-server.ts.
 */
export function clearInput(): void {
  // No file to clear — WebSocket connections are ephemeral
}
