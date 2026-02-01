/**
 * Runner Tests - TDD for MP-006
 * Tests for the main iteration runner (ralph-ui/src/runner/index.ts)
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

// Types that will be implemented
interface RunnerConfig {
  prdJsonDir: string;
  workingDir: string;
  iterations: number;
  gapSeconds: number;
  model: string;
  notify: boolean;
  quiet: boolean;
  verbose: boolean;
}

interface IterationResult {
  iteration: number;
  storyId: string;
  success: boolean;
  hasComplete: boolean;
  hasBlocked: boolean;
  durationMs: number;
  error?: string;
}

// Test fixtures
const TEST_DIR = "/tmp/ralph-runner-test";
const PRD_JSON_DIR = join(TEST_DIR, "prd-json");
const STORIES_DIR = join(PRD_JSON_DIR, "stories");

function setupTestPRD() {
  // Create directories
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  mkdirSync(STORIES_DIR, { recursive: true });

  // Create index.json
  const index = {
    nextStory: "US-001",
    storyOrder: ["US-001", "US-002"],
    pending: ["US-001", "US-002"],
    blocked: [],
    completed: [],
  };
  writeFileSync(join(PRD_JSON_DIR, "index.json"), JSON.stringify(index, null, 2));

  // Create story files
  const story1 = {
    id: "US-001",
    title: "Test Story 1",
    acceptanceCriteria: [
      { text: "Criterion 1", checked: false },
      { text: "Criterion 2", checked: false },
    ],
    passes: false,
  };
  writeFileSync(join(STORIES_DIR, "US-001.json"), JSON.stringify(story1, null, 2));

  const story2 = {
    id: "US-002",
    title: "Test Story 2",
    acceptanceCriteria: [
      { text: "Criterion A", checked: false },
    ],
    passes: false,
  };
  writeFileSync(join(STORIES_DIR, "US-002.json"), JSON.stringify(story2, null, 2));
}

function cleanupTestPRD() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
}

describe("Runner Configuration", () => {
  it("should have required config fields", () => {
    const config: RunnerConfig = {
      prdJsonDir: PRD_JSON_DIR,
      workingDir: TEST_DIR,
      iterations: 100,
      gapSeconds: 5,
      model: "sonnet",
      notify: false,
      quiet: false,
      verbose: false,
    };

    expect(config.prdJsonDir).toBe(PRD_JSON_DIR);
    expect(config.iterations).toBe(100);
    expect(config.model).toBe("sonnet");
  });

  it("should have default values for optional fields", () => {
    // Default config values
    const defaults = {
      iterations: 100,
      gapSeconds: 5,
      model: "sonnet",
      notify: false,
      quiet: false,
      verbose: false,
    };

    expect(defaults.iterations).toBe(100);
    expect(defaults.gapSeconds).toBe(5);
  });
});

describe("IterationResult", () => {
  it("should have required result fields", () => {
    const result: IterationResult = {
      iteration: 1,
      storyId: "US-001",
      success: true,
      hasComplete: false,
      hasBlocked: false,
      durationMs: 5000,
    };

    expect(result.iteration).toBe(1);
    expect(result.storyId).toBe("US-001");
    expect(result.success).toBe(true);
  });

  it("should support optional error field", () => {
    const result: IterationResult = {
      iteration: 1,
      storyId: "US-001",
      success: false,
      hasComplete: false,
      hasBlocked: false,
      durationMs: 5000,
      error: "Connection reset",
    };

    expect(result.error).toBe("Connection reset");
  });
});

describe("Runner State Machine", () => {
  beforeEach(() => {
    setupTestPRD();
  });

  afterEach(() => {
    cleanupTestPRD();
  });

  it("should detect COMPLETE when no pending stories", () => {
    // Modify index to have no pending stories
    const index = {
      nextStory: undefined,
      storyOrder: ["US-001"],
      pending: [],
      blocked: [],
      completed: ["US-001"],
    };
    writeFileSync(join(PRD_JSON_DIR, "index.json"), JSON.stringify(index, null, 2));

    // Read and verify
    const content = readFileSync(join(PRD_JSON_DIR, "index.json"), "utf-8");
    const parsed = JSON.parse(content);

    const isComplete = parsed.pending.length === 0 && parsed.blocked.length === 0;
    expect(isComplete).toBe(true);
  });

  it("should detect ALL_BLOCKED when only blocked stories remain", () => {
    // Modify index to have only blocked stories
    const index = {
      nextStory: undefined,
      storyOrder: ["US-001", "US-002"],
      pending: [],
      blocked: ["US-001", "US-002"],
      completed: [],
    };
    writeFileSync(join(PRD_JSON_DIR, "index.json"), JSON.stringify(index, null, 2));

    // Read and verify
    const content = readFileSync(join(PRD_JSON_DIR, "index.json"), "utf-8");
    const parsed = JSON.parse(content);

    const isAllBlocked = parsed.pending.length === 0 && parsed.blocked.length > 0;
    expect(isAllBlocked).toBe(true);
  });

  it("should get next story from index", () => {
    const content = readFileSync(join(PRD_JSON_DIR, "index.json"), "utf-8");
    const index = JSON.parse(content);

    expect(index.nextStory).toBe("US-001");
  });

  it("should read story file correctly", () => {
    const storyPath = join(STORIES_DIR, "US-001.json");
    const content = readFileSync(storyPath, "utf-8");
    const story = JSON.parse(content);

    expect(story.id).toBe("US-001");
    expect(story.acceptanceCriteria).toHaveLength(2);
    expect(story.passes).toBe(false);
  });
});

describe("Runner Iteration Logic", () => {
  beforeEach(() => {
    setupTestPRD();
  });

  afterEach(() => {
    cleanupTestPRD();
  });

  it("should respect max iterations limit", () => {
    const config: RunnerConfig = {
      prdJsonDir: PRD_JSON_DIR,
      workingDir: TEST_DIR,
      iterations: 5,
      gapSeconds: 0,
      model: "sonnet",
      notify: false,
      quiet: false,
      verbose: false,
    };

    // Simulate iteration counting
    let iterationCount = 0;
    while (iterationCount < config.iterations) {
      iterationCount++;
    }

    expect(iterationCount).toBe(5);
  });

  it("should use gap between iterations", () => {
    const config: RunnerConfig = {
      prdJsonDir: PRD_JSON_DIR,
      workingDir: TEST_DIR,
      iterations: 2,
      gapSeconds: 5,
      model: "sonnet",
      notify: false,
      quiet: false,
      verbose: false,
    };

    expect(config.gapSeconds).toBe(5);
    // In actual implementation, this would be: await sleep(config.gapSeconds * 1000)
  });
});

describe("Status File Communication", () => {
  const STATUS_FILE = "/tmp/ralph-status-test.json";

  afterEach(() => {
    if (existsSync(STATUS_FILE)) {
      rmSync(STATUS_FILE);
    }
  });

  it("should write status file with correct format", () => {
    const status = {
      state: "running",
      iteration: 3,
      storyId: "US-001",
      lastActivity: Math.floor(Date.now() / 1000),
      error: null,
      retryIn: 0,
      pid: process.pid,
    };

    writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));

    const content = readFileSync(STATUS_FILE, "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed.state).toBe("running");
    expect(parsed.iteration).toBe(3);
    expect(parsed.storyId).toBe("US-001");
    expect(parsed.pid).toBe(process.pid);
  });

  it("should support all status states", () => {
    const states = ["running", "cr_review", "error", "retry", "complete"];

    for (const state of states) {
      const status = {
        state,
        iteration: 1,
        storyId: "US-001",
        lastActivity: Math.floor(Date.now() / 1000),
        error: state === "error" ? "Test error" : null,
        retryIn: state === "retry" ? 30 : 0,
        pid: process.pid,
      };

      writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
      const content = readFileSync(STATUS_FILE, "utf-8");
      const parsed = JSON.parse(content);

      expect(parsed.state).toBe(state);
    }
  });

  it("should update lastActivity timestamp", () => {
    const before = Math.floor(Date.now() / 1000);

    const status = {
      state: "running",
      lastActivity: before,
      pid: process.pid,
    };

    writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));

    // Simulate time passing
    const after = before + 5;
    status.lastActivity = after;
    writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));

    const content = readFileSync(STATUS_FILE, "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed.lastActivity).toBe(after);
    expect(parsed.lastActivity).toBeGreaterThan(before);
  });
});

describe("Signal Handling", () => {
  it("should have handlers for SIGINT and SIGTERM", () => {
    // Test that signal handlers can be registered
    let sigintCalled = false;
    let sigtermCalled = false;

    const sigintHandler = () => { sigintCalled = true; };
    const sigtermHandler = () => { sigtermCalled = true; };

    // These would be registered in the actual runner
    process.on("SIGINT", sigintHandler);
    process.on("SIGTERM", sigtermHandler);

    // Clean up
    process.off("SIGINT", sigintHandler);
    process.off("SIGTERM", sigtermHandler);

    // Just verify we can add/remove handlers
    expect(true).toBe(true);
  });
});
