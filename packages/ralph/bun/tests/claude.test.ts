/**
 * Unit tests for core/claude.ts
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  buildCliArgs,
  loadPromptTemplate,
  buildRalphPrompt,
  parseClaudeOutput,
  hasCompletionSignal,
  hasBlockedSignal,
  type ClaudeSpawnOptions,
} from "../core/claude";

const TEST_DIR = join(tmpdir(), "ralph-test-claude-" + Date.now());

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("buildCliArgs", () => {
  test("builds Claude CLI args with basic options", () => {
    const options: ClaudeSpawnOptions = {
      model: "sonnet",
      prompt: "Test prompt",
      workingDir: "/tmp",
    };

    const args = buildCliArgs(options);
    expect(args).toContain("-p");
    expect(args).toContain("Test prompt");
    expect(args).toContain("--model");
    expect(args).toContain("sonnet");
    expect(args).toContain("--output-format");
    expect(args).toContain("json");
  });

  test("includes max turns when specified", () => {
    const options: ClaudeSpawnOptions = {
      model: "haiku",
      prompt: "Test",
      workingDir: "/tmp",
      maxTurns: 10,
    };

    const args = buildCliArgs(options);
    expect(args).toContain("--max-turns");
    expect(args).toContain("10");
  });

  test("includes append system prompt", () => {
    const options: ClaudeSpawnOptions = {
      model: "opus",
      prompt: "Test",
      workingDir: "/tmp",
      appendSystemPrompt: "Extra context",
    };

    const args = buildCliArgs(options);
    expect(args).toContain("--append-system-prompt");
    expect(args).toContain("Extra context");
  });

  test("builds Gemini CLI args", () => {
    const options: ClaudeSpawnOptions = {
      model: "gemini-flash",
      prompt: "Test prompt",
      workingDir: "/tmp",
    };

    const args = buildCliArgs(options);
    // Gemini uses --yolo, -o json, -m for model, positional prompt
    expect(args).toContain("--yolo");
    expect(args).toContain("-m");
    expect(args).toContain("gemini-2.0-flash-exp");
    expect(args).toContain("Test prompt");
  });

  test("builds Kiro CLI args", () => {
    const options: ClaudeSpawnOptions = {
      model: "kiro",
      prompt: "Test prompt",
      workingDir: "/tmp",
    };

    const args = buildCliArgs(options);
    // Kiro uses: chat --trust-all-tools --no-interactive [prompt]
    expect(args).toContain("chat");
    expect(args).toContain("--trust-all-tools");
    expect(args).toContain("--no-interactive");
    expect(args).toContain("Test prompt");
  });
});

describe("loadPromptTemplate", () => {
  test("loads and substitutes template variables", () => {
    const templatePath = join(TEST_DIR, "template.md");
    writeFileSync(templatePath, "Model: {{MODEL}}\nDir: {{DIR}}");

    const result = loadPromptTemplate(templatePath, {
      MODEL: "sonnet",
      DIR: "/test/path",
    });

    expect(result).toBe("Model: sonnet\nDir: /test/path");
  });

  test("throws error for missing template file", () => {
    expect(() => {
      loadPromptTemplate(join(TEST_DIR, "missing.md"), {});
    }).toThrow("Prompt template not found");
  });

  test("handles multiple occurrences of same variable", () => {
    const templatePath = join(TEST_DIR, "multi.md");
    writeFileSync(templatePath, "{{VAR}} and {{VAR}} again");

    const result = loadPromptTemplate(templatePath, { VAR: "value" });
    expect(result).toBe("value and value again");
  });
});

describe("buildRalphPrompt", () => {
  test("builds prompt with variables substituted", () => {
    const prompt = buildRalphPrompt({
      storyId: "US-001",
      model: "sonnet",
      prdJsonDir: "/prd",
      workingDir: "/work",
    });

    expect(prompt).toContain("sonnet");
    expect(prompt).toContain("/prd");
    expect(prompt).toContain("/work");
    expect(prompt).toContain("US-001");
  });

  test("uses template file if provided", () => {
    const templatePath = join(TEST_DIR, "custom-prompt.md");
    writeFileSync(templatePath, "Custom: {{MODEL}} - {{STORY_ID}}");

    const prompt = buildRalphPrompt({
      storyId: "V-001",
      model: "haiku",
      prdJsonDir: "/prd",
      workingDir: "/work",
      templatePath,
    });

    expect(prompt).toBe("Custom: haiku - V-001");
  });
});

describe("parseClaudeOutput", () => {
  test("parses JSONL messages", () => {
    const output = `{"type":"assistant","content":[{"type":"text","text":"Hello"}]}
{"type":"assistant","content":[{"type":"text","text":"World"}]}`;

    const result = parseClaudeOutput(output);
    expect(result.messages.length).toBe(2);
    expect(result.messages[0].content).toBe("Hello");
    expect(result.messages[1].content).toBe("World");
  });

  test("extracts usage information", () => {
    const output = `{"usage":{"input_tokens":100,"output_tokens":50,"cache_creation_input_tokens":10}}`;

    const result = parseClaudeOutput(output);
    expect(result.usage?.inputTokens).toBe(100);
    expect(result.usage?.outputTokens).toBe(50);
    expect(result.usage?.cacheCreateTokens).toBe(10);
  });

  test("handles malformed lines gracefully", () => {
    const output = `{"type":"assistant","content":[{"type":"text","text":"Good"}]}
{malformed
{"type":"assistant","content":[{"type":"text","text":"Also Good"}]}`;

    const result = parseClaudeOutput(output);
    expect(result.messages.length).toBe(2);
  });
});

describe("hasCompletionSignal", () => {
  test("detects COMPLETE keyword", () => {
    expect(hasCompletionSignal("Task COMPLETE")).toBe(true);
    expect(hasCompletionSignal("complete!")).toBe(true);
  });

  test("detects criteria checked pattern", () => {
    expect(hasCompletionSignal("All criteria are checked")).toBe(true);
    expect(hasCompletionSignal("all criteria checked")).toBe(true);
  });

  test("detects story complete pattern", () => {
    expect(hasCompletionSignal("Story is complete")).toBe(true);
    expect(hasCompletionSignal("story complete")).toBe(true);
  });

  test("detects passes true pattern", () => {
    expect(hasCompletionSignal('set passes: true')).toBe(true);
    expect(hasCompletionSignal('"passes": true')).toBe(true);
  });

  test("returns false for normal output", () => {
    expect(hasCompletionSignal("Working on the task")).toBe(false);
    expect(hasCompletionSignal("Making progress")).toBe(false);
  });
});

describe("hasBlockedSignal", () => {
  test("detects BLOCKED keyword", () => {
    expect(hasBlockedSignal("BLOCKED by dependency")).toBe(true);
    expect(hasBlockedSignal("This is blocked")).toBe(true);
  });

  test("detects cannot proceed pattern", () => {
    expect(hasBlockedSignal("Cannot proceed without API key")).toBe(true);
  });

  test("detects manual intervention pattern", () => {
    expect(hasBlockedSignal("Needs manual intervention")).toBe(true);
  });

  test("returns false for normal output", () => {
    expect(hasBlockedSignal("Working on the task")).toBe(false);
    expect(hasBlockedSignal("Unblocking the pipeline")).toBe(false);
  });
});
