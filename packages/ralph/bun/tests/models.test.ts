/**
 * Unit tests for core/models.ts
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  extractTaskType,
  getModelForStory,
  getRoutingTable,
  isGeminiModel,
  isKiroModel,
  getCliForModel,
  getModelColor,
} from "../core/models";
import { type RalphConfig } from "../core/config";

const TEST_DIR = join(tmpdir(), "ralph-test-models-" + Date.now());

beforeAll(() => {
  mkdirSync(join(TEST_DIR, "stories"), { recursive: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("extractTaskType", () => {
  test("extracts US from US-001", () => {
    expect(extractTaskType("US-001")).toBe("US");
  });

  test("extracts V from V-001", () => {
    expect(extractTaskType("V-001")).toBe("V");
  });

  test("extracts BUG from BUG-123", () => {
    expect(extractTaskType("BUG-123")).toBe("BUG");
  });

  test("extracts AUDIT from AUDIT-001", () => {
    expect(extractTaskType("AUDIT-001")).toBe("AUDIT");
  });

  test("extracts MP from MP-001", () => {
    expect(extractTaskType("MP-001")).toBe("MP");
  });

  test("defaults to US for unknown formats", () => {
    expect(extractTaskType("unknown")).toBe("US");
  });
});

describe("getModelForStory", () => {
  const smartConfig: RalphConfig = {
    modelStrategy: "smart",
    models: {
      US: "sonnet",
      V: "haiku",
      BUG: "sonnet",
      AUDIT: "opus",
    },
  };

  const singleConfig: RalphConfig = {
    modelStrategy: "single",
    defaultModel: "opus",
  };

  test("uses smart routing based on task type", () => {
    expect(getModelForStory("US-001", smartConfig)).toBe("sonnet");
    expect(getModelForStory("V-001", smartConfig)).toBe("haiku");
    expect(getModelForStory("AUDIT-001", smartConfig)).toBe("opus");
  });

  test("uses single model for all stories when strategy is single", () => {
    expect(getModelForStory("US-001", singleConfig)).toBe("opus");
    expect(getModelForStory("V-001", singleConfig)).toBe("opus");
  });

  test("CLI override takes precedence", () => {
    expect(
      getModelForStory("US-001", smartConfig, { cliPrimaryModel: "haiku" })
    ).toBe("haiku");
  });

  test("CLI verify model is used for V-* stories", () => {
    expect(
      getModelForStory("V-001", smartConfig, { cliVerifyModel: "sonnet" })
    ).toBe("sonnet");
  });

  test("story-level model override takes highest priority", () => {
    // Create a story with model override
    const storyPath = join(TEST_DIR, "stories", "US-CUSTOM.json");
    writeFileSync(storyPath, JSON.stringify({ id: "US-CUSTOM", model: "haiku" }));

    expect(
      getModelForStory("US-CUSTOM", smartConfig, { prdJsonDir: TEST_DIR })
    ).toBe("haiku");
  });
});

describe("getRoutingTable", () => {
  test("returns smart routing table", () => {
    const config: RalphConfig = {
      modelStrategy: "smart",
      models: { US: "sonnet", V: "haiku" },
    };
    const table = getRoutingTable(config);
    expect(table.US).toBe("sonnet");
    expect(table.V).toBe("haiku");
  });

  test("returns single model for all types when single strategy", () => {
    const config: RalphConfig = {
      modelStrategy: "single",
      defaultModel: "haiku",
    };
    const table = getRoutingTable(config);
    expect(table.US).toBe("haiku");
    expect(table.V).toBe("haiku");
    expect(table.BUG).toBe("haiku");
  });
});

describe("model type checks", () => {
  test("isGeminiModel identifies Gemini models", () => {
    expect(isGeminiModel("gemini-flash")).toBe(true);
    expect(isGeminiModel("gemini-pro")).toBe(true);
    expect(isGeminiModel("sonnet")).toBe(false);
  });

  test("isKiroModel identifies Kiro", () => {
    expect(isKiroModel("kiro")).toBe(true);
    expect(isKiroModel("sonnet")).toBe(false);
  });
});

describe("getCliForModel", () => {
  test("returns correct CLI for each model", () => {
    expect(getCliForModel("sonnet")).toBe("claude");
    expect(getCliForModel("opus")).toBe("claude");
    expect(getCliForModel("haiku")).toBe("claude");
    expect(getCliForModel("gemini-flash")).toBe("gemini");
    expect(getCliForModel("gemini-pro")).toBe("gemini");
    expect(getCliForModel("kiro")).toBe("kiro-cli");
  });
});

describe("getModelColor", () => {
  test("returns ANSI color codes", () => {
    expect(getModelColor("opus")).toContain("\x1b[");
    expect(getModelColor("sonnet")).toContain("\x1b[");
    expect(getModelColor("haiku")).toContain("\x1b[");
  });
});
