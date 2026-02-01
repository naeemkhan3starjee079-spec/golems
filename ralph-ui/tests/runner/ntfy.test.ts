/**
 * Ntfy Notification Tests
 * Tests for ralph-ui/src/runner/ntfy.ts
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import {
  sendNtfy,
  notifyIterationComplete,
  notifyStoryComplete,
  notifyPRDComplete,
  notifyError,
  notifyRetry,
} from "../../src/runner/ntfy";

describe("ntfy notifications", () => {
  let originalFetch: typeof fetch;
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = mock(() => Promise.resolve({ ok: true } as Response));
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("sendNtfy", () => {
    it("should return false if no topic provided", async () => {
      const result = await sendNtfy({
        topic: "",
        title: "Test",
        message: "Test message",
      });
      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should send notification to ntfy.sh", async () => {
      const result = await sendNtfy({
        topic: "test-topic",
        title: "Test Title",
        message: "Test message",
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://ntfy.sh/test-topic");
      expect(options.method).toBe("POST");
      expect(options.headers.Title).toBe("Test Title");
      expect(options.headers.Priority).toBe("default");
      expect(options.body).toBe("Test message");
    });

    it("should include priority header", async () => {
      await sendNtfy({
        topic: "test-topic",
        title: "Urgent",
        message: "Critical error",
        priority: "urgent",
      });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Priority).toBe("urgent");
    });

    it("should include tags header", async () => {
      await sendNtfy({
        topic: "test-topic",
        title: "Tagged",
        message: "Message with tags",
        tags: ["warning", "red_circle"],
      });

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Tags).toBe("warning,red_circle");
    });

    it("should return false on fetch error", async () => {
      mockFetch = mock(() => Promise.reject(new Error("Network error")));
      globalThis.fetch = mockFetch;

      const result = await sendNtfy({
        topic: "test-topic",
        title: "Test",
        message: "Test",
      });

      expect(result).toBe(false);
    });

    it("should return false on non-ok response", async () => {
      mockFetch = mock(() => Promise.resolve({ ok: false } as Response));
      globalThis.fetch = mockFetch;

      const result = await sendNtfy({
        topic: "test-topic",
        title: "Test",
        message: "Test",
      });

      expect(result).toBe(false);
    });
  });

  describe("notifyIterationComplete", () => {
    it("should send iteration complete notification", async () => {
      await notifyIterationComplete("my-topic", 5, "BUG-030");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://ntfy.sh/my-topic");
      expect(options.headers.Title).toBe("Iteration 5 Complete");
      expect(options.headers.Priority).toBe("low");
      expect(options.body).toBe("Story: BUG-030");
    });
  });

  describe("notifyStoryComplete", () => {
    it("should send story complete notification", async () => {
      await notifyStoryComplete("my-topic", "MP-007");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://ntfy.sh/my-topic");
      expect(options.headers.Title).toBe("Story Complete: MP-007");
      expect(options.headers.Priority).toBe("default");
    });
  });

  describe("notifyPRDComplete", () => {
    it("should send PRD complete notification with high priority", async () => {
      await notifyPRDComplete("my-topic");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://ntfy.sh/my-topic");
      expect(options.headers.Title).toBe("PRD Complete!");
      expect(options.headers.Priority).toBe("high");
      expect(options.headers.Tags).toBe("tada");
    });
  });

  describe("notifyError", () => {
    it("should send error notification with urgent priority", async () => {
      await notifyError("my-topic", "Connection reset");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://ntfy.sh/my-topic");
      expect(options.headers.Title).toBe("Ralph Error");
      expect(options.headers.Priority).toBe("urgent");
      expect(options.body).toBe("Connection reset");
    });

    it("should include story ID in title if provided", async () => {
      await notifyError("my-topic", "Test failed", "TEST-001");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Title).toBe("Error on TEST-001");
    });
  });

  describe("notifyRetry", () => {
    it("should send retry notification", async () => {
      await notifyRetry("my-topic", 3, 30);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://ntfy.sh/my-topic");
      expect(options.headers.Title).toBe("Retry 3");
      expect(options.headers.Priority).toBe("low");
      expect(options.body).toBe("Waiting 30s before retry");
    });
  });
});
