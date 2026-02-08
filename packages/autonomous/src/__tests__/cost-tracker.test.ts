import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  readCostLog,
  logCost,
  filterByPeriod,
  summarize,
  groupBySource,
  groupByModel,
  groupByDay,
  formatSummary,
  formatBySource,
  formatDaily,
  type CostEntry,
} from "../lib/cost-tracker";

const TEST_DIR = join(tmpdir(), `golems-cost-test-${Date.now()}`);
const COST_LOG = join(TEST_DIR, "api_costs.jsonl");

const sampleEntries: CostEntry[] = [
  {
    timestamp: "2026-02-07T10:00:00.000Z",
    model: "claude-haiku-4-5-20251001",
    source: "email-scorer",
    input_tokens: 500,
    output_tokens: 100,
    cost_usd: 0.0008,
  },
  {
    timestamp: "2026-02-07T11:00:00.000Z",
    model: "claude-haiku-4-5-20251001",
    source: "job-scorer",
    input_tokens: 800,
    output_tokens: 200,
    cost_usd: 0.001440,
  },
  {
    timestamp: "2026-02-07T12:00:00.000Z",
    model: "claude-haiku-4-5-20251001",
    source: "email-scorer",
    input_tokens: 600,
    output_tokens: 150,
    cost_usd: 0.001080,
  },
  {
    timestamp: "2026-02-06T08:00:00.000Z",
    model: "claude-sonnet-4-5-20250929",
    source: "briefing",
    input_tokens: 2000,
    output_tokens: 500,
    cost_usd: 0.0076,
  },
  {
    timestamp: "2026-02-01T09:00:00.000Z",
    model: "claude-haiku-4-5-20251001",
    source: "soltome-learner",
    input_tokens: 1000,
    output_tokens: 300,
    cost_usd: 0.002,
  },
];

describe("cost-tracker", () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  test("readCostLog returns empty array for missing file", () => {
    const result = readCostLog(join(TEST_DIR, "nonexistent.jsonl"));
    expect(result).toEqual([]);
  });

  test("readCostLog returns empty array for empty file", () => {
    writeFileSync(COST_LOG, "");
    const result = readCostLog(COST_LOG);
    expect(result).toEqual([]);
  });

  test("readCostLog parses JSONL correctly", () => {
    const content = sampleEntries.map((e) => JSON.stringify(e)).join("\n");
    writeFileSync(COST_LOG, content);

    const result = readCostLog(COST_LOG);
    expect(result).toHaveLength(5);
    expect(result[0].source).toBe("email-scorer");
    expect(result[0].cost_usd).toBe(0.0008);
  });

  test("readCostLog skips malformed lines", () => {
    writeFileSync(COST_LOG, '{"valid": true}\nbroken json\n{"also": "valid"}\n');
    const result = readCostLog(COST_LOG);
    expect(result).toHaveLength(2);
  });

  test("logCost appends to JSONL file", () => {
    const entry: CostEntry = {
      timestamp: "2026-02-08T10:00:00.000Z",
      model: "claude-haiku-4-5-20251001",
      source: "test",
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.00028,
    };

    logCost(COST_LOG, entry);
    logCost(COST_LOG, entry);

    const result = readCostLog(COST_LOG);
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe("test");
  });

  test("logCost creates directory if needed", () => {
    const nestedPath = join(TEST_DIR, "sub", "dir", "costs.jsonl");
    logCost(nestedPath, sampleEntries[0]);
    expect(existsSync(nestedPath)).toBe(true);
  });

  test("filterByPeriod — today", () => {
    const now = new Date("2026-02-07T15:00:00.000Z");
    const filtered = filterByPeriod(sampleEntries, "today", now);
    expect(filtered).toHaveLength(3); // 3 entries on 2026-02-07
  });

  test("filterByPeriod — week (Sun start)", () => {
    // 2026-02-07 is a Saturday. Week starts Sun Feb 1.
    const now = new Date("2026-02-07T15:00:00.000Z");
    const filtered = filterByPeriod(sampleEntries, "week", now);
    // All 5 entries are in the same week (Feb 1 is Sunday, Feb 7 is Saturday)
    expect(filtered).toHaveLength(5);
  });

  test("filterByPeriod — month", () => {
    const now = new Date("2026-02-07T15:00:00.000Z");
    const filtered = filterByPeriod(sampleEntries, "month", now);
    expect(filtered).toHaveLength(5); // All in February
  });

  test("filterByPeriod — all returns everything", () => {
    const filtered = filterByPeriod(sampleEntries, "all");
    expect(filtered).toHaveLength(5);
  });

  test("summarize totals correctly", () => {
    const summary = summarize(sampleEntries, "test");
    expect(summary.totalCalls).toBe(5);
    expect(summary.totalInputTokens).toBe(4900);
    expect(summary.totalOutputTokens).toBe(1250);
    expect(summary.totalCost).toBeGreaterThan(0);
    expect(summary.period).toBe("test");
  });

  test("groupBySource aggregates per source", () => {
    const bySource = groupBySource(sampleEntries);
    expect(Object.keys(bySource)).toHaveLength(4);
    expect(bySource["email-scorer"].totalCalls).toBe(2);
    expect(bySource["job-scorer"].totalCalls).toBe(1);
    expect(bySource["briefing"].totalCalls).toBe(1);
    expect(bySource["soltome-learner"].totalCalls).toBe(1);
  });

  test("groupByModel aggregates per model", () => {
    const byModel = groupByModel(sampleEntries);
    expect(Object.keys(byModel)).toHaveLength(2);
    expect(byModel["claude-haiku-4-5-20251001"].totalCalls).toBe(4);
    expect(byModel["claude-sonnet-4-5-20250929"].totalCalls).toBe(1);
  });

  test("groupByDay aggregates per day, sorted", () => {
    const daily = groupByDay(sampleEntries);
    expect(daily).toHaveLength(3);
    expect(daily[0].date).toBe("2026-02-01");
    expect(daily[1].date).toBe("2026-02-06");
    expect(daily[2].date).toBe("2026-02-07");
    expect(daily[2].calls).toBe(3);
  });

  test("formatSummary produces readable output", () => {
    const summary = summarize(sampleEntries, "all-time");
    const formatted = formatSummary(summary);
    expect(formatted).toContain("Period: all-time");
    expect(formatted).toContain("Calls:  5");
    expect(formatted).toContain("$");
  });

  test("formatBySource shows table with sources", () => {
    const bySource = groupBySource(sampleEntries);
    const formatted = formatBySource(bySource);
    expect(formatted).toContain("email-scorer");
    expect(formatted).toContain("job-scorer");
    expect(formatted).toContain("Source");
  });

  test("formatBySource handles empty data", () => {
    const formatted = formatBySource({});
    expect(formatted).toBe("No data.");
  });

  test("formatDaily shows day-by-day breakdown", () => {
    const daily = groupByDay(sampleEntries);
    const formatted = formatDaily(daily);
    expect(formatted).toContain("2026-02-07");
    expect(formatted).toContain("TOTAL");
  });
});
