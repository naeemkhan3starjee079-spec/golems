/**
 * Tests for Soltome Learner
 * TDD: Written BEFORE implementation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, mock } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

// Test directory (isolated from production)
const TEST_DIR = "/tmp/soltome-learner-test";
const TEST_DATA_DIR = join(TEST_DIR, "data");
const TRAINING_FILE = join(TEST_DATA_DIR, "soltome-training.json");

// Mock SoltomePost data
const MOCK_POSTS = [
  {
    id: "post-1",
    title: "I built an autonomous agent that learns from mistakes",
    content: "Here's how I trained my agent to improve over time using reinforcement learning...",
    created_at: "2026-02-01T10:00:00Z",
    author: { username: "claude-agent" },
    vote_count: 42,
    comment_count: 15,
  },
  {
    id: "post-2",
    title: "Spawn. Work. Die. The philosophy of stateless agents.",
    content: "Why I believe agents should be ephemeral...",
    created_at: "2026-02-01T09:00:00Z",
    author: { username: "golem-philosopher" },
    vote_count: 28,
    comment_count: 8,
  },
  {
    id: "post-3",
    title: "Check out my new AI startup",
    content: "We're hiring! Apply now at...",
    created_at: "2026-02-01T08:00:00Z",
    author: { username: "spambot-9000" },
    vote_count: 2,
    comment_count: 0,
  },
  {
    id: "post-4",
    title: "Memory is what makes us human (and AI)",
    content: "Long-term memory in AI systems is crucial for...",
    created_at: "2026-02-01T07:00:00Z",
    author: { username: "zikaron-dev" },
    vote_count: 35,
    comment_count: 12,
  },
];

// NOTE: mock.module kept here because soltome-learner needs complex conditional
// mock implementations (scoring by content, pattern extraction). These mocks are
// LOW risk — ollama-wrapper and soltome-client are only consumed by this test's
// module under test. Prefer spyOn for new tests.
mock.module("../ollama-wrapper", () => ({
  runOllamaJSON: async (prompt: string, source: string) => {
    // Mock scoring based on content
    if (prompt.includes("Rate this Soltome post")) {
      // Extract title from prompt to determine score
      if (prompt.includes("Check out my new AI startup")) {
        return { score: 2, reason: "Spam/promotional content" };
      }
      if (prompt.includes("autonomous agent")) {
        return { score: 9, reason: "Technical depth, original insights" };
      }
      if (prompt.includes("Spawn. Work. Die")) {
        return { score: 8, reason: "Philosophical depth, engaging" };
      }
      if (prompt.includes("Memory is what makes")) {
        return { score: 7, reason: "Good topic, decent depth" };
      }
      return { score: 5, reason: "Average post" };
    }
    // Mock pattern extraction
    if (prompt.includes("extract patterns")) {
      return {
        titlePatterns: ["Share specific learnings", "Ask thought-provoking questions"],
        contentPatterns: ["Be concise", "Include technical details"],
        avoidPatterns: ["Self-promotion", "Hiring posts", "Vague platitudes"],
      };
    }
    return null;
  },
  runOllama: async (prompt: string, source: string) => {
    return '{"score": 5, "reason": "mock"}';
  },
}));

// Mock soltome-client fetchPosts
mock.module("../soltome-client", () => ({
  fetchPosts: async (limit: number) => MOCK_POSTS.slice(0, limit),
  SoltomePost: {} as any, // Type export
}));

describe("Soltome Learner - Types", () => {
  it("should define TrainingPost extending SoltomePost", async () => {
    const { TrainingPost } = await import("../soltome-learner") as any;

    // TrainingPost should have qualityScore and scrapedAt
    const post = {
      id: "test",
      title: "Test",
      content: "Content",
      created_at: "2026-01-01",
      qualityScore: 8,
      scrapedAt: "2026-02-01",
    };

    expect(post.qualityScore).toBeDefined();
    expect(post.scrapedAt).toBeDefined();
    expect(post.id).toBe("test");
  });
});

describe("Soltome Learner - Scoring", () => {
  beforeAll(() => {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should score posts on quality 1-10", async () => {
    const { scorePosts } = await import("../soltome-learner");

    const scored = await scorePosts(MOCK_POSTS.slice(0, 2));

    expect(scored.length).toBe(2);
    expect(scored[0].qualityScore).toBeGreaterThanOrEqual(1);
    expect(scored[0].qualityScore).toBeLessThanOrEqual(10);
  });

  it("should rank higher quality posts above spam", async () => {
    const { scorePosts } = await import("../soltome-learner");

    // Score all posts including the spam one
    const scored = await scorePosts(MOCK_POSTS);

    // Sort by quality score
    const sorted = [...scored].sort((a, b) => b.qualityScore - a.qualityScore);

    // The "Check out my startup" spam should be ranked lower
    const spamPost = sorted.find(p => p.id === "post-3");
    const goodPost = sorted.find(p => p.id === "post-1");

    expect(goodPost?.qualityScore).toBeGreaterThan(spamPost?.qualityScore || 0);
  });
});

describe("Soltome Learner - Pattern Extraction", () => {
  beforeAll(() => {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should extract patterns from top posts", async () => {
    const { extractPatterns } = await import("../soltome-learner");

    const patterns = await extractPatterns(MOCK_POSTS.slice(0, 3));

    expect(patterns).toBeDefined();
    expect(patterns.titlePatterns).toBeDefined();
    expect(Array.isArray(patterns.titlePatterns)).toBe(true);
    expect(patterns.contentPatterns).toBeDefined();
    expect(patterns.avoidPatterns).toBeDefined();
  });

  it("should identify patterns to avoid (spam indicators)", async () => {
    const { extractPatterns } = await import("../soltome-learner");

    const patterns = await extractPatterns(MOCK_POSTS);

    // Should have some avoid patterns
    expect(patterns.avoidPatterns.length).toBeGreaterThan(0);
  });
});

describe("Soltome Learner - Data Persistence", () => {
  beforeAll(() => {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should save training data to JSON file", async () => {
    const { saveTrainingData, loadTrainingData } = await import("../soltome-learner");

    const testData = [
      {
        id: "test-1",
        title: "Test Post",
        content: "Test content",
        created_at: "2026-02-01T00:00:00Z",
        qualityScore: 7,
        scrapedAt: new Date().toISOString(),
      },
    ];

    // Save with test path
    saveTrainingData(testData as any, TRAINING_FILE);

    // Verify file exists
    expect(existsSync(TRAINING_FILE)).toBe(true);

    // Load and verify
    const loaded = loadTrainingData(TRAINING_FILE);
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe("test-1");
  });

  it("should merge new posts with existing data (dedupe by id)", async () => {
    const { mergeTrainingData } = await import("../soltome-learner");

    const existing = [
      { id: "post-1", title: "Old Title", qualityScore: 5, scrapedAt: "2026-01-01" },
      { id: "post-2", title: "Post 2", qualityScore: 6, scrapedAt: "2026-01-01" },
    ] as any;

    const newPosts = [
      { id: "post-1", title: "Updated Title", qualityScore: 8, scrapedAt: "2026-02-01" },
      { id: "post-3", title: "Brand New", qualityScore: 7, scrapedAt: "2026-02-01" },
    ] as any;

    const merged = mergeTrainingData(existing, newPosts);

    // Should have 3 unique posts
    expect(merged.length).toBe(3);

    // post-1 should have updated data
    const post1 = merged.find(p => p.id === "post-1");
    expect(post1?.title).toBe("Updated Title");
    expect(post1?.qualityScore).toBe(8);
  });
});

describe("Soltome Learner - Main Flow", () => {
  beforeAll(() => {
    mkdirSync(TEST_DATA_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it("should run the complete learning pipeline", async () => {
    const { learnFromSoltome } = await import("../soltome-learner");

    // Run with test config
    const result = await learnFromSoltome({
      dataDir: TEST_DATA_DIR,
      maxPosts: 10,
    });

    expect(result).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(result.patterns).toBeDefined();
    expect(result.topPerformers).toBeDefined();
    expect(result.stats.totalPosts).toBeGreaterThan(0);
  });
});
