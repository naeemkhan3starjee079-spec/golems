/**
 * Session Fork Tests (TDD)
 *
 * Tests session forking functionality for Telegram bot.
 * Complex tasks should get their own session fork instead of polluting main chat session.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  generateForkSessionId,
  shouldSuggestForking,
  extractTaskName,
  type ForkSessionMetadata,
} from "@golems/claude/lib/session-fork";

describe("Session Fork", () => {
  describe("generateForkSessionId", () => {
    it("generates session ID with telegram-fork prefix", () => {
      const sessionId = generateForkSessionId("research");
      expect(sessionId).toMatch(/^telegram-fork-research-\d+$/);
    });

    it("sanitizes task name in session ID", () => {
      const sessionId = generateForkSessionId("Complex Task With Spaces!");
      expect(sessionId).toMatch(/^telegram-fork-complex-task-with-spaces-\d+$/);
    });

    it("generates unique IDs for same task name", async () => {
      const id1 = generateForkSessionId("research");
      await new Promise(resolve => setTimeout(resolve, 2)); // Small delay
      const id2 = generateForkSessionId("research");
      expect(id1).not.toBe(id2);
    });

    it("truncates long task names", () => {
      const longName = "a".repeat(100);
      const sessionId = generateForkSessionId(longName);
      expect(sessionId.length).toBeLessThan(150); // Reasonable limit
    });
  });

  describe("shouldSuggestForking", () => {
    it("suggests forking for research tasks", () => {
      expect(shouldSuggestForking("Can you research this topic?")).toBe(true);
      expect(shouldSuggestForking("I need to research React patterns")).toBe(true);
    });

    it("suggests forking for analysis tasks", () => {
      expect(shouldSuggestForking("Analyze the codebase")).toBe(true);
      expect(shouldSuggestForking("Can you analyze performance?")).toBe(true);
    });

    it("suggests forking for build tasks", () => {
      expect(shouldSuggestForking("Build a new feature")).toBe(true);
      expect(shouldSuggestForking("I want to build an API")).toBe(true);
    });

    it("suggests forking for create tasks", () => {
      expect(shouldSuggestForking("Create a dashboard")).toBe(true);
      expect(shouldSuggestForking("Can you create tests?")).toBe(true);
    });

    it("suggests forking for investigate tasks", () => {
      expect(shouldSuggestForking("Investigate this bug")).toBe(true);
      expect(shouldSuggestForking("Please investigate the error")).toBe(true);
    });

    it("suggests forking for debug tasks", () => {
      expect(shouldSuggestForking("Debug the authentication flow")).toBe(true);
      expect(shouldSuggestForking("Help me debug this")).toBe(true);
    });

    it("does not suggest forking for simple queries", () => {
      expect(shouldSuggestForking("What's the status?")).toBe(false);
      expect(shouldSuggestForking("Show me the logs")).toBe(false);
      expect(shouldSuggestForking("How are you?")).toBe(false);
    });

    it("does not suggest forking for short messages", () => {
      expect(shouldSuggestForking("Hi")).toBe(false);
      expect(shouldSuggestForking("Thanks")).toBe(false);
    });

    it("is case insensitive", () => {
      expect(shouldSuggestForking("RESEARCH this topic")).toBe(true);
      expect(shouldSuggestForking("Research This Topic")).toBe(true);
    });
  });

  describe("extractTaskName", () => {
    it("extracts task from research prompt", () => {
      expect(extractTaskName("Research React patterns")).toBe("react-patterns");
      expect(extractTaskName("Can you research authentication?")).toBe("authentication");
    });

    it("extracts task from analysis prompt", () => {
      expect(extractTaskName("Analyze the database schema")).toBe("database-schema");
      expect(extractTaskName("Please analyze performance")).toBe("performance");
    });

    it("extracts task from build prompt", () => {
      expect(extractTaskName("Build a new API endpoint")).toBe("new-api-endpoint");
      expect(extractTaskName("I want to build user dashboard")).toBe("user-dashboard");
    });

    it("extracts task from create prompt", () => {
      expect(extractTaskName("Create tests for auth")).toBe("tests-for-auth");
      expect(extractTaskName("Can you create documentation?")).toBe("documentation");
    });

    it("removes common stop words", () => {
      expect(extractTaskName("Research the new React patterns")).toBe("new-react-patterns");
      expect(extractTaskName("Analyze this database schema")).toBe("database-schema");
    });

    it("truncates long task names", () => {
      const longPrompt = "Research " + "word ".repeat(50);
      const taskName = extractTaskName(longPrompt);
      expect(taskName.length).toBeLessThanOrEqual(50);
    });

    it("returns 'task' for unparseable prompts", () => {
      expect(extractTaskName("")).toBe("task");
      expect(extractTaskName("!!!")).toBe("task");
      expect(extractTaskName("research")).toBe("task"); // Too short after extraction
    });

    it("handles special characters", () => {
      expect(extractTaskName("Research Node.js & TypeScript!")).toBe("node-typescript");
      expect(extractTaskName("Build API endpoint (v2)")).toBe("api-endpoint");
    });
  });

  describe("ForkSessionMetadata", () => {
    it("has correct structure", () => {
      const metadata: ForkSessionMetadata = {
        sessionId: "telegram-fork-research-123",
        taskName: "research",
        prompt: "Research React patterns",
        createdAt: new Date().toISOString(),
        chatId: 12345,
      };

      expect(metadata.sessionId).toMatch(/^telegram-fork/);
      expect(metadata.taskName).toBe("research");
      expect(metadata.prompt).toBeTruthy();
      expect(metadata.createdAt).toBeTruthy();
      expect(metadata.chatId).toBe(12345);
    });

    it("can include optional completedAt", () => {
      const metadata: ForkSessionMetadata = {
        sessionId: "telegram-fork-research-123",
        taskName: "research",
        prompt: "Research React patterns",
        createdAt: new Date().toISOString(),
        chatId: 12345,
        completedAt: new Date().toISOString(),
      };

      expect(metadata.completedAt).toBeTruthy();
    });

    it("can include optional result", () => {
      const metadata: ForkSessionMetadata = {
        sessionId: "telegram-fork-research-123",
        taskName: "research",
        prompt: "Research React patterns",
        createdAt: new Date().toISOString(),
        chatId: 12345,
        result: "Success",
      };

      expect(metadata.result).toBe("Success");
    });
  });
});
