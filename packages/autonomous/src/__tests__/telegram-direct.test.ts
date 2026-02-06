import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

// Save original env
const originalEnv = { ...process.env };

// Track fetch calls
const fetchCalls: Array<{ url: string; options: any }> = [];

// Mock global fetch
const originalFetch = globalThis.fetch;
globalThis.fetch = mock(async (url: string | URL | Request, options?: any) => {
  const urlStr = typeof url === "string" ? url : url.toString();
  fetchCalls.push({ url: urlStr, options });

  // Simulate Telegram API success
  if (urlStr.includes("api.telegram.org")) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  // Simulate local notify success
  if (urlStr.includes("localhost:3847")) {
    return new Response("ok", { status: 200 });
  }
  return new Response("not found", { status: 404 });
}) as any;

const { sendNotification } = await import("../lib/telegram-direct");

describe("telegram-direct", () => {
  beforeEach(() => {
    fetchCalls.length = 0;
    (globalThis.fetch as any).mockClear?.();
    // Reset env
    Object.keys(process.env).forEach((key) => {
      if (key.startsWith("TELEGRAM_") || key === "LLM_BACKEND" || key === "STATE_BACKEND") {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    // Restore original env
    Object.assign(process.env, originalEnv);
  });

  describe("local mode (default)", () => {
    it("sends to localhost:3847 when TELEGRAM_MODE is not set", async () => {
      const result = await sendNotification({
        title: "Test",
        body: "Hello",
        source: "email",
      });

      expect(result).toBe(true);
      expect(fetchCalls.length).toBe(1);
      expect(fetchCalls[0].url).toBe("http://localhost:3847/notify");
    });

    it("sends to localhost:3847 when TELEGRAM_MODE=local", async () => {
      process.env.TELEGRAM_MODE = "local";

      const result = await sendNotification({
        title: "Test",
        body: "Hello",
      });

      expect(result).toBe(true);
      expect(fetchCalls[0].url).toBe("http://localhost:3847/notify");
    });

    it("passes full payload to local server", async () => {
      await sendNotification({
        title: "Urgent",
        body: "Interview scheduled",
        source: "email",
        priority: "high",
      });

      const body = JSON.parse(fetchCalls[0].options.body);
      expect(body.title).toBe("Urgent");
      expect(body.body).toBe("Interview scheduled");
      expect(body.source).toBe("email");
      expect(body.priority).toBe("high");
    });
  });

  describe("direct mode", () => {
    beforeEach(() => {
      process.env.TELEGRAM_MODE = "direct";
      process.env.TELEGRAM_BOT_TOKEN = "test-token-123";
      process.env.TELEGRAM_CHAT_ID = "-1003791473584";
      process.env.TELEGRAM_TOPIC_ALERTS = "3";
      process.env.TELEGRAM_TOPIC_NIGHTSHIFT = "4";
      process.env.TELEGRAM_TOPIC_EMAIL = "5";
      process.env.TELEGRAM_TOPIC_JOBS = "7";
      process.env.TELEGRAM_TOPIC_RECRUITER = "126";
    });

    it("sends to Telegram API directly", async () => {
      const result = await sendNotification({
        title: "Job Match",
        body: "Senior Dev at Google",
        source: "jobs",
      });

      expect(result).toBe(true);
      expect(fetchCalls[0].url).toContain("api.telegram.org/bottest-token-123/sendMessage");
    });

    it("routes email source to email topic thread", async () => {
      await sendNotification({
        title: "Urgent Email",
        body: "Interview at 3pm",
        source: "email",
      });

      const body = JSON.parse(fetchCalls[0].options.body);
      expect(body.chat_id).toBe("-1003791473584");
      expect(body.message_thread_id).toBe(5);
    });

    it("routes jobs source to jobs topic thread", async () => {
      await sendNotification({
        title: "New Job",
        body: "Match found",
        source: "jobs",
      });

      const body = JSON.parse(fetchCalls[0].options.body);
      expect(body.message_thread_id).toBe(7);
    });

    it("routes claude source to general (no thread ID)", async () => {
      await sendNotification({
        title: "Task Done",
        body: "Finished review",
        source: "claude",
      });

      const body = JSON.parse(fetchCalls[0].options.body);
      expect(body.message_thread_id).toBeUndefined();
    });

    it("routes nightshift to nightshift topic", async () => {
      await sendNotification({
        title: "PR Created",
        body: "songscript#42",
        source: "nightshift",
      });

      const body = JSON.parse(fetchCalls[0].options.body);
      expect(body.message_thread_id).toBe(4);
    });

    it("routes unknown source to alerts topic", async () => {
      await sendNotification({
        title: "Unknown",
        body: "Something happened",
        source: "mystery",
      });

      const body = JSON.parse(fetchCalls[0].options.body);
      expect(body.message_thread_id).toBe(3); // alerts
    });

    it("formats with Markdown parse mode", async () => {
      await sendNotification({
        title: "Test",
        body: "Hello",
        source: "email",
      });

      const body = JSON.parse(fetchCalls[0].options.body);
      expect(body.parse_mode).toBe("Markdown");
    });

    it("adds priority icon for high priority", async () => {
      await sendNotification({
        title: "Alert",
        body: "Urgent!",
        source: "email",
        priority: "high",
      });

      const body = JSON.parse(fetchCalls[0].options.body);
      expect(body.text).toStartWith("🔔 ");
    });

    it("returns false when missing bot token", async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;

      const result = await sendNotification({
        title: "Test",
        body: "Should fail",
        source: "email",
      });

      expect(result).toBe(false);
      expect(fetchCalls.length).toBe(0);
    });

    it("returns false when missing chat ID", async () => {
      delete process.env.TELEGRAM_CHAT_ID;

      const result = await sendNotification({
        title: "Test",
        body: "Should fail",
        source: "email",
      });

      expect(result).toBe(false);
    });
  });
});

// Restore fetch after all tests
afterEach(() => {
  // Keep mock active during test run
});
