import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

// Mock the Anthropic SDK before importing cloud-llm
const mockCreate = mock(() =>
  Promise.resolve({
    content: [{ type: "text", text: '{"score": 8, "category": "job"}' }],
  })
);

mock.module("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
    constructor() {}
  },
}));

// Set API key before importing
process.env.ANTHROPIC_API_KEY = "test-key";

const { runHaiku, runHaikuJSON } = await import("../lib/cloud-llm");

describe("cloud-llm", () => {
  beforeEach(() => {
    mockCreate.mockClear();
  });

  describe("runHaiku", () => {
    it("returns text from Haiku response", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: "Hello from Haiku" }],
      });

      const result = await runHaiku("Say hello", "test");
      expect(result).toBe("Hello from Haiku");
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it("passes correct model and prompt", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: "ok" }],
      });

      await runHaiku("Test prompt", "email-golem");

      expect(mockCreate).toHaveBeenCalledWith({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: "Test prompt" }],
      });
    });

    it("returns empty string on error", async () => {
      mockCreate.mockRejectedValueOnce(new Error("API error"));

      const result = await runHaiku("fail", "test");
      expect(result).toBe("");
    });

    it("returns empty string when no text block", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [],
      });

      const result = await runHaiku("empty", "test");
      expect(result).toBe("");
    });
  });

  describe("runHaikuJSON", () => {
    it("parses JSON from response", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: 'Here is the result: {"score": 8, "category": "job"}' }],
      });

      const result = await runHaikuJSON<{ score: number; category: string }>("Score this", "test");
      expect(result).toEqual({ score: 8, category: "job" });
    });

    it("returns null on empty response", async () => {
      mockCreate.mockRejectedValueOnce(new Error("API error"));

      const result = await runHaikuJSON("fail", "test");
      expect(result).toBeNull();
    });

    it("returns null when response has no JSON", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: "No JSON here, just text." }],
      });

      const result = await runHaikuJSON("no json", "test");
      expect(result).toBeNull();
    });

    it("handles nested JSON objects", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: "text",
          text: '{"name": "Test", "nested": {"key": "value"}, "arr": [1, 2]}',
        }],
      });

      const result = await runHaikuJSON<{ name: string; nested: { key: string } }>("nested", "test");
      expect(result?.name).toBe("Test");
      expect(result?.nested.key).toBe("value");
    });
  });
});
