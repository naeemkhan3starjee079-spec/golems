import { describe, it, expect, beforeEach, afterEach } from "bun:test";

// Force macOS say engine to avoid edge-tts network calls in tests
process.env.QA_VOICE_TTS_ENGINE = "say";

// Mock Bun.spawn to avoid actually playing audio or running osascript
const originalSpawn = Bun.spawn;
let spawnCalls: { cmd: string[] }[] = [];

describe("tts module", () => {
  beforeEach(() => {
    spawnCalls = [];
    // @ts-ignore — mock Bun.spawn
    Bun.spawn = (cmd: string[]) => {
      spawnCalls.push({ cmd: [...cmd] });
      return { exited: Promise.resolve(0) };
    };
  });

  afterEach(() => {
    Bun.spawn = originalSpawn;
  });

  it("speak() calls macOS say command", async () => {
    const { speak } = await import("../tts");

    await speak("Hello test");

    expect(spawnCalls.length).toBe(1);
    expect(spawnCalls[0].cmd[0]).toBe("say");
    expect(spawnCalls[0].cmd[1]).toBe("Hello test");
  });

  it("speak() with triggerF5 calls osascript after speech", async () => {
    const { speak } = await import("../tts");

    await speak("F5 test", true);

    // Should have say call + osascript call
    expect(spawnCalls.length).toBe(2);
    expect(spawnCalls[0].cmd[0]).toBe("say");
    expect(spawnCalls[1].cmd[0]).toBe("osascript");
  });

  it("speak() without triggerF5 does NOT call osascript", async () => {
    const { speak } = await import("../tts");

    await speak("No F5 test", false);

    expect(spawnCalls.length).toBe(1);
    expect(spawnCalls[0].cmd[0]).toBe("say");
    // No osascript call
    const osascriptCall = spawnCalls.find((c) => c.cmd[0] === "osascript");
    expect(osascriptCall).toBeUndefined();
  });
});
