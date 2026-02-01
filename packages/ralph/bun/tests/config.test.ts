/**
 * Unit tests for core/config.ts
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  loadConfig,
  getConfigValue,
  configExists,
  DEFAULT_CONFIG,
  type RalphConfig,
} from "../core/config";

const TEST_DIR = join(tmpdir(), "ralph-test-config-" + Date.now());

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("loadConfig", () => {
  test("returns defaults when config file does not exist", () => {
    const config = loadConfig(join(TEST_DIR, "nonexistent.json"));
    expect(config.modelStrategy).toBe("smart");
    expect(config.defaultModel).toBe("opus");
  });

  test("loads and merges user config with defaults", () => {
    const configPath = join(TEST_DIR, "custom-config.json");
    const userConfig = {
      modelStrategy: "single",
      defaultModel: "sonnet",
      models: { US: "opus" },
    };
    writeFileSync(configPath, JSON.stringify(userConfig));

    const config = loadConfig(configPath);
    expect(config.modelStrategy).toBe("single");
    expect(config.defaultModel).toBe("sonnet");
    expect(config.models?.US).toBe("opus");
    // Defaults should be preserved
    expect(config.models?.V).toBe("haiku");
  });

  test("handles malformed JSON gracefully", () => {
    const configPath = join(TEST_DIR, "malformed.json");
    writeFileSync(configPath, "{ invalid json }");

    const config = loadConfig(configPath);
    // Should return defaults on parse error
    expect(config.modelStrategy).toBe("smart");
  });
});

describe("getConfigValue", () => {
  test("returns config value when present", () => {
    const config: RalphConfig = {
      modelStrategy: "single",
      defaultModel: "haiku",
    };
    expect(getConfigValue(config, "defaultModel")).toBe("haiku");
  });

  test("returns default when config value is undefined", () => {
    const config: RalphConfig = {
      modelStrategy: "smart",
    };
    // defaultModel is not set, should get default
    const defaultModel = getConfigValue(config, "defaultModel");
    expect(defaultModel).toBe(DEFAULT_CONFIG.defaultModel!);
  });
});

describe("configExists", () => {
  test("returns true when config file exists", () => {
    const configPath = join(TEST_DIR, "exists.json");
    writeFileSync(configPath, "{}");
    expect(configExists(configPath)).toBe(true);
  });

  test("returns false when config file does not exist", () => {
    expect(configExists(join(TEST_DIR, "nope.json"))).toBe(false);
  });
});

describe("DEFAULT_CONFIG", () => {
  test("has expected structure", () => {
    expect(DEFAULT_CONFIG.modelStrategy).toBe("smart");
    expect(DEFAULT_CONFIG.models?.US).toBe("sonnet");
    expect(DEFAULT_CONFIG.models?.V).toBe("haiku");
    expect(DEFAULT_CONFIG.defaults?.maxIterations).toBe(50);
    expect(DEFAULT_CONFIG.pricing?.haiku?.input).toBe(1);
  });
});
