/**
 * Unit tests for core/stories.ts
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  readIndex,
  writeIndex,
  readStory,
  writeStory,
  listStoryIds,
  getNextStory,
  checkCriterion,
  completeStory,
  blockStory,
  getCriteriaProgress,
  hasPartialProgress,
  getUncheckedCriteria,
  getCheckedCriteria,
  areDependenciesSatisfied,
  getUnsatisfiedDependencies,
  type Story,
  type PRDIndex,
} from "../core/stories";

const TEST_DIR = join(tmpdir(), "ralph-test-stories-" + Date.now());
const STORIES_DIR = join(TEST_DIR, "stories");

beforeAll(() => {
  mkdirSync(STORIES_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

function createTestIndex(data: Partial<PRDIndex>): void {
  const index: PRDIndex = {
    stats: { total: 3, completed: 0, pending: 3, blocked: 0 },
    storyOrder: ["US-001", "US-002", "US-003"],
    pending: ["US-001", "US-002", "US-003"],
    blocked: [],
    nextStory: "US-001",
    ...data,
  };
  writeFileSync(join(TEST_DIR, "index.json"), JSON.stringify(index, null, 2));
}

function createTestStory(story: Partial<Story>): void {
  const fullStory: Story = {
    id: story.id ?? "US-001",
    title: story.title ?? "Test Story",
    acceptanceCriteria: story.acceptanceCriteria ?? [
      { text: "Criterion 1", checked: false },
      { text: "Criterion 2", checked: false },
    ],
    ...story,
  };
  writeFileSync(join(STORIES_DIR, `${fullStory.id}.json`), JSON.stringify(fullStory, null, 2));
}

describe("readIndex", () => {
  test("returns null when index doesn't exist", () => {
    const result = readIndex(join(TEST_DIR, "nonexistent"));
    expect(result).toBeNull();
  });

  test("reads and parses index.json", () => {
    createTestIndex({ nextStory: "US-002" });
    const index = readIndex(TEST_DIR);
    expect(index).not.toBeNull();
    expect(index!.nextStory).toBe("US-002");
  });
});

describe("writeIndex", () => {
  test("writes index to file", () => {
    const index: PRDIndex = {
      stats: { total: 1, completed: 0, pending: 1, blocked: 0 },
      storyOrder: ["TEST-001"],
      pending: ["TEST-001"],
      blocked: [],
      nextStory: "TEST-001",
    };
    writeIndex(TEST_DIR, index);

    const read = readIndex(TEST_DIR);
    expect(read!.nextStory).toBe("TEST-001");
  });
});

describe("readStory / writeStory", () => {
  test("reads story from file", () => {
    createTestStory({ id: "US-READ", title: "Read Test" });
    const story = readStory(TEST_DIR, "US-READ");
    expect(story!.title).toBe("Read Test");
  });

  test("returns null for nonexistent story", () => {
    const story = readStory(TEST_DIR, "NOPE-001");
    expect(story).toBeNull();
  });

  test("writes story to file", () => {
    const story: Story = {
      id: "US-WRITE",
      title: "Write Test",
      acceptanceCriteria: [{ text: "Test", checked: true }],
    };
    writeStory(TEST_DIR, story);

    const read = readStory(TEST_DIR, "US-WRITE");
    expect(read!.acceptanceCriteria[0].checked).toBe(true);
  });
});

describe("listStoryIds", () => {
  test("lists all story IDs", () => {
    createTestStory({ id: "LIST-001" });
    createTestStory({ id: "LIST-002" });

    const ids = listStoryIds(TEST_DIR);
    expect(ids).toContain("LIST-001");
    expect(ids).toContain("LIST-002");
  });
});

describe("getNextStory", () => {
  test("returns the next story from index", () => {
    createTestIndex({ nextStory: "US-NEXT" });
    createTestStory({ id: "US-NEXT", title: "Next Story" });

    const story = getNextStory(TEST_DIR);
    expect(story!.id).toBe("US-NEXT");
  });
});

describe("checkCriterion", () => {
  test("marks criterion as checked", () => {
    createTestStory({
      id: "US-CHECK",
      acceptanceCriteria: [
        { text: "First", checked: false },
        { text: "Second", checked: false },
      ],
    });

    const result = checkCriterion(TEST_DIR, "US-CHECK", 0);
    expect(result).toBe(true);

    const story = readStory(TEST_DIR, "US-CHECK");
    expect(story!.acceptanceCriteria[0].checked).toBe(true);
    expect(story!.acceptanceCriteria[1].checked).toBe(false);
  });

  test("returns false for invalid index", () => {
    createTestStory({ id: "US-INVALID" });
    const result = checkCriterion(TEST_DIR, "US-INVALID", 99);
    expect(result).toBe(false);
  });
});

describe("completeStory", () => {
  test("marks story as complete and updates index", () => {
    createTestIndex({ pending: ["US-COMPLETE", "US-002"], nextStory: "US-COMPLETE" });
    createTestStory({ id: "US-COMPLETE" });

    const result = completeStory(TEST_DIR, "US-COMPLETE");
    expect(result).toBe(true);

    const story = readStory(TEST_DIR, "US-COMPLETE");
    expect(story!.passes).toBe(true);
    expect(story!.completedAt).toBeDefined();

    const index = readIndex(TEST_DIR);
    expect(index!.pending).not.toContain("US-COMPLETE");
    expect(index!.nextStory).toBe("US-002");
  });

  test("auto-unblocks stories when their blocker completes", () => {
    // Setup: US-BLOCKER is pending, US-BLOCKED is blocked by US-BLOCKER
    createTestIndex({ 
      pending: ["US-BLOCKER"], 
      blocked: ["US-BLOCKED"],
      nextStory: "US-BLOCKER",
      stats: { total: 2, completed: 0, pending: 1, blocked: 1 }
    });
    createTestStory({ id: "US-BLOCKER", title: "Blocker Story" });
    createTestStory({ id: "US-BLOCKED", title: "Blocked Story", blockedBy: "US-BLOCKER" });

    // Complete the blocker story
    const result = completeStory(TEST_DIR, "US-BLOCKER");
    expect(result).toBe(true);

    // Verify blocker is complete
    const blockerStory = readStory(TEST_DIR, "US-BLOCKER");
    expect(blockerStory!.passes).toBe(true);

    // Verify blocked story is now unblocked and moved to pending
    const blockedStory = readStory(TEST_DIR, "US-BLOCKED");
    expect(blockedStory!.blockedBy).toBeUndefined();

    // Verify index is updated correctly
    const index = readIndex(TEST_DIR);
    expect(index!.pending).toContain("US-BLOCKED");
    expect(index!.blocked).not.toContain("US-BLOCKED");
    expect(index!.nextStory).toBe("US-BLOCKED");
    expect(index!.stats.pending).toBe(1);
    expect(index!.stats.blocked).toBe(0);
    expect(index!.stats.completed).toBe(1);
  });

  test("handles chain reaction unblocking (A blocks B blocks C)", () => {
    // Setup: A is pending, B is blocked by A, C is blocked by B
    createTestIndex({ 
      pending: ["US-A"], 
      blocked: ["US-B", "US-C"],
      nextStory: "US-A",
      stats: { total: 3, completed: 0, pending: 1, blocked: 2 }
    });
    createTestStory({ id: "US-A", title: "Story A" });
    createTestStory({ id: "US-B", title: "Story B", blockedBy: "US-A" });
    createTestStory({ id: "US-C", title: "Story C", blockedBy: "US-B" });

    // Complete A - should unblock B
    completeStory(TEST_DIR, "US-A");
    
    let index = readIndex(TEST_DIR);
    expect(index!.pending).toContain("US-B");
    expect(index!.blocked).toContain("US-C"); // C still blocked by B
    expect(index!.nextStory).toBe("US-B");

    // Complete B - should unblock C
    completeStory(TEST_DIR, "US-B");
    
    index = readIndex(TEST_DIR);
    expect(index!.pending).toContain("US-C");
    expect(index!.blocked).not.toContain("US-C");
    expect(index!.nextStory).toBe("US-C");
    expect(index!.stats.pending).toBe(1);
    expect(index!.stats.blocked).toBe(0);
    expect(index!.stats.completed).toBe(2);
  });

  test("updates nextStory when pending was empty before unblock", () => {
    // Setup: no pending stories, one blocked story
    createTestIndex({ 
      pending: [], 
      blocked: ["US-BLOCKED"],
      nextStory: undefined,
      stats: { total: 2, completed: 1, pending: 0, blocked: 1 }
    });
    createTestStory({ id: "US-BLOCKER", title: "Blocker Story" });
    createTestStory({ id: "US-BLOCKED", title: "Blocked Story", blockedBy: "US-BLOCKER" });

    // Complete the blocker (it's not in pending, simulating completion from blocked state)
    completeStory(TEST_DIR, "US-BLOCKER");

    // Verify nextStory is set to the newly unblocked story
    const index = readIndex(TEST_DIR);
    expect(index!.nextStory).toBe("US-BLOCKED");
    expect(index!.pending).toContain("US-BLOCKED");
  });
});

describe("blockStory", () => {
  test("marks story as blocked and updates index", () => {
    createTestIndex({ pending: ["US-BLOCK", "US-002"], nextStory: "US-BLOCK" });
    createTestStory({ id: "US-BLOCK" });

    const result = blockStory(TEST_DIR, "US-BLOCK", "External dependency");
    expect(result).toBe(true);

    const story = readStory(TEST_DIR, "US-BLOCK");
    expect(story!.blockedBy).toBe("External dependency");

    const index = readIndex(TEST_DIR);
    expect(index!.blocked).toContain("US-BLOCK");
    expect(index!.pending).not.toContain("US-BLOCK");
  });
});

describe("getCriteriaProgress", () => {
  test("calculates progress correctly", () => {
    const story: Story = {
      id: "US-PROG",
      title: "Progress Test",
      acceptanceCriteria: [
        { text: "A", checked: true },
        { text: "B", checked: true },
        { text: "C", checked: false },
        { text: "D", checked: false },
      ],
    };

    const progress = getCriteriaProgress(story);
    expect(progress.checked).toBe(2);
    expect(progress.total).toBe(4);
    expect(progress.percentage).toBe(50);
  });
});

describe("hasPartialProgress", () => {
  test("returns true for partial progress", () => {
    const story: Story = {
      id: "US-PARTIAL",
      title: "Partial",
      acceptanceCriteria: [
        { text: "A", checked: true },
        { text: "B", checked: false },
      ],
      passes: false,
    };
    expect(hasPartialProgress(story)).toBe(true);
  });

  test("returns false for fresh story", () => {
    const story: Story = {
      id: "US-FRESH",
      title: "Fresh",
      acceptanceCriteria: [
        { text: "A", checked: false },
        { text: "B", checked: false },
      ],
    };
    expect(hasPartialProgress(story)).toBe(false);
  });

  test("returns false for completed story", () => {
    const story: Story = {
      id: "US-DONE",
      title: "Done",
      acceptanceCriteria: [
        { text: "A", checked: true },
        { text: "B", checked: true },
      ],
      passes: true,
    };
    expect(hasPartialProgress(story)).toBe(false);
  });
});

describe("getUncheckedCriteria / getCheckedCriteria", () => {
  test("filters criteria correctly", () => {
    const story: Story = {
      id: "US-FILTER",
      title: "Filter",
      acceptanceCriteria: [
        { text: "Done", checked: true },
        { text: "Todo", checked: false },
      ],
    };

    const unchecked = getUncheckedCriteria(story);
    expect(unchecked.length).toBe(1);
    expect(unchecked[0].text).toBe("Todo");

    const checked = getCheckedCriteria(story);
    expect(checked.length).toBe(1);
    expect(checked[0].text).toBe("Done");
  });
});

describe("areDependenciesSatisfied", () => {
  test("returns true when no dependencies", () => {
    const story: Story = {
      id: "US-NODEP",
      title: "No Deps",
      acceptanceCriteria: [],
    };
    expect(areDependenciesSatisfied(TEST_DIR, story)).toBe(true);
  });

  test("returns true when all dependencies are satisfied", () => {
    createTestStory({ id: "DEP-001", passes: true });
    const story: Story = {
      id: "US-DEP",
      title: "With Deps",
      acceptanceCriteria: [],
      dependencies: ["DEP-001"],
    };
    expect(areDependenciesSatisfied(TEST_DIR, story)).toBe(true);
  });

  test("returns false when dependency is not satisfied", () => {
    createTestStory({ id: "DEP-002", passes: false });
    const story: Story = {
      id: "US-UNSAT",
      title: "Unsatisfied",
      acceptanceCriteria: [],
      dependencies: ["DEP-002"],
    };
    expect(areDependenciesSatisfied(TEST_DIR, story)).toBe(false);
  });
});

describe("getUnsatisfiedDependencies", () => {
  test("returns list of unsatisfied dependencies", () => {
    createTestStory({ id: "SAT-001", passes: true });
    createTestStory({ id: "UNSAT-001", passes: false });

    const story: Story = {
      id: "US-MIXED",
      title: "Mixed Deps",
      acceptanceCriteria: [],
      dependencies: ["SAT-001", "UNSAT-001"],
    };

    const unsatisfied = getUnsatisfiedDependencies(TEST_DIR, story);
    expect(unsatisfied).toEqual(["UNSAT-001"]);
  });
});
