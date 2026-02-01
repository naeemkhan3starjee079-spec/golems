/**
 * Unit tests for core/costs.ts
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  initCosts,
  calculateCost,
  logCost,
  readCosts,
  getCostsSummary,
  formatCost,
  estimateStoryCost,
  type CostEntry,
} from "../core/costs";

const TEST_DIR = join(tmpdir(), "ralph-test-costs-" + Date.now());
const COSTS_FILE = join(TEST_DIR, "costs.jsonl");

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

beforeEach(() => {
  // Clear costs file before each test
  if (existsSync(COSTS_FILE)) {
    rmSync(COSTS_FILE);
  }
});

describe("initCosts", () => {
  test("creates empty costs file if it doesn't exist", () => {
    const path = join(TEST_DIR, "init-test.jsonl");
    initCosts(path);
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf-8")).toBe("");
  });

  test("does not overwrite existing costs file", () => {
    const path = join(TEST_DIR, "existing.jsonl");
    writeFileSync(path, '{"test": true}\n');
    initCosts(path);
    expect(readFileSync(path, "utf-8")).toBe('{"test": true}\n');
  });
});

describe("calculateCost", () => {
  test("calculates cost for sonnet", () => {
    const cost = calculateCost("sonnet", {
      input: 1_000_000,
      output: 1_000_000,
    });
    // Sonnet: $3/M input + $15/M output = $18
    expect(cost).toBe(18);
  });

  test("calculates cost for haiku", () => {
    const cost = calculateCost("haiku", {
      input: 1_000_000,
      output: 1_000_000,
    });
    // Haiku: $1/M input + $5/M output = $6
    expect(cost).toBe(6);
  });

  test("calculates cost for opus", () => {
    const cost = calculateCost("opus", {
      input: 1_000_000,
      output: 1_000_000,
    });
    // Opus: $15/M input + $75/M output = $90
    expect(cost).toBe(90);
  });

  test("includes cache costs", () => {
    const cost = calculateCost("sonnet", {
      input: 0,
      output: 0,
      cacheCreate: 1_000_000,
      cacheRead: 1_000_000,
    });
    // Sonnet cache: $3.75/M create + $0.30/M read = $4.05
    expect(cost).toBeCloseTo(4.05, 2);
  });

  test("returns 0 for Kiro (credit-based)", () => {
    const cost = calculateCost("kiro", {
      input: 1_000_000,
      output: 1_000_000,
    });
    expect(cost).toBe(0);
  });
});

describe("logCost", () => {
  test("appends cost entry to file", () => {
    const entry: CostEntry = {
      timestamp: new Date().toISOString(),
      storyId: "US-001",
      model: "sonnet",
      taskType: "US",
      durationSeconds: 120,
      status: "success",
      estimatedCost: 0.50,
    };

    logCost(entry, COSTS_FILE);

    const content = readFileSync(COSTS_FILE, "utf-8");
    expect(content).toContain("US-001");
    expect(content).toContain("sonnet");
  });

  test("appends multiple entries", () => {
    logCost({
      timestamp: new Date().toISOString(),
      storyId: "US-001",
      model: "sonnet",
      taskType: "US",
      durationSeconds: 60,
      status: "success",
    }, COSTS_FILE);

    logCost({
      timestamp: new Date().toISOString(),
      storyId: "US-002",
      model: "haiku",
      taskType: "US",
      durationSeconds: 30,
      status: "success",
    }, COSTS_FILE);

    const entries = readCosts(COSTS_FILE);
    expect(entries.length).toBe(2);
  });
});

describe("readCosts", () => {
  test("returns empty array when file doesn't exist", () => {
    const entries = readCosts(join(TEST_DIR, "nonexistent.jsonl"));
    expect(entries).toEqual([]);
  });

  test("parses JSONL entries", () => {
    const entry1 = { storyId: "US-001", model: "sonnet", status: "success" };
    const entry2 = { storyId: "US-002", model: "haiku", status: "blocked" };
    writeFileSync(COSTS_FILE, JSON.stringify(entry1) + "\n" + JSON.stringify(entry2) + "\n");

    const entries = readCosts(COSTS_FILE);
    expect(entries.length).toBe(2);
    expect(entries[0].storyId).toBe("US-001");
    expect(entries[1].storyId).toBe("US-002");
  });

  test("skips malformed lines", () => {
    writeFileSync(COSTS_FILE, '{"valid": true}\n{invalid json}\n{"also": "valid"}\n');
    const entries = readCosts(COSTS_FILE);
    expect(entries.length).toBe(2);
  });
});

describe("getCostsSummary", () => {
  test("calculates totals from entries", () => {
    const entries: CostEntry[] = [
      { timestamp: "", storyId: "US-001", model: "sonnet", taskType: "US", durationSeconds: 60, status: "success", estimatedCost: 1.00 },
      { timestamp: "", storyId: "US-002", model: "sonnet", taskType: "US", durationSeconds: 60, status: "success", estimatedCost: 2.00 },
      { timestamp: "", storyId: "V-001", model: "haiku", taskType: "V", durationSeconds: 30, status: "blocked", estimatedCost: 0.50 },
    ];

    const summary = getCostsSummary(entries);
    expect(summary.stories).toBe(2); // Only successful stories
    expect(summary.estimatedCost).toBe(3.50);
    expect(summary.byModel.sonnet).toBe(3.00);
    expect(summary.byModel.haiku).toBe(0.50);
  });
});

describe("formatCost", () => {
  test("formats cost as currency string", () => {
    expect(formatCost(1.5)).toBe("$1.50");
    expect(formatCost(0.05)).toBe("$0.05");
    expect(formatCost(100)).toBe("$100.00");
  });
});

describe("estimateStoryCost", () => {
  test("estimates cost based on average tokens", () => {
    const cost = estimateStoryCost("US-001", "sonnet");
    // Default: 50K input @ $3/M + 10K output @ $15/M
    // = 0.15 + 0.15 = 0.30
    expect(cost).toBeCloseTo(0.30, 2);
  });
});
