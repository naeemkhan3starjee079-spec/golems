/**
 * Tests for /forage command - Platform Post Collection
 *
 * TDD approach: RED → GREEN → REFACTOR
 *
 * Note: Tests use Soltome now. Moltbook is identity-only (no posts API).
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync } from "fs";
import { saveToCacheFile, type ForagedPost, type CacheMetadata } from "../forage";

// Test cache file (isolated from production)
const TEST_CACHE_FILE = "/tmp/forage-cache-test.json";

describe("Forage - saveToCacheFile()", () => {
  beforeEach(() => {
    if (existsSync(TEST_CACHE_FILE)) {
      rmSync(TEST_CACHE_FILE, { force: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_CACHE_FILE)) {
      rmSync(TEST_CACHE_FILE, { force: true });
    }
  });

  it("should save posts with metadata to cache file", async () => {
    const mockPosts: ForagedPost[] = [
      {
        id: "post-1",
        title: "Test Post",
        author: "testuser",
        platform: "soltome",
        content: "Test content",
        url: "https://soltome.com/posts/post-1",
      },
    ];

    await saveToCacheFile(mockPosts, TEST_CACHE_FILE);

    expect(existsSync(TEST_CACHE_FILE)).toBe(true);
  });

  it("should include timestamp, count, and platforms in metadata", async () => {
    const mockPosts: ForagedPost[] = [
      {
        id: "post-1",
        title: "Test Post",
        author: "testuser",
        platform: "soltome",
        content: "Test content",
        url: "https://soltome.com/posts/post-1",
      },
    ];

    const metadata = await saveToCacheFile(mockPosts, TEST_CACHE_FILE);

    expect(metadata).toHaveProperty("timestamp");
    expect(metadata).toHaveProperty("count");
    expect(metadata).toHaveProperty("platforms");
    expect(metadata.count).toBe(1);
    expect(metadata.platforms).toContain("soltome");
  });
});

describe("Forage - handleForageCommand()", () => {
  beforeEach(() => {
    if (existsSync(TEST_CACHE_FILE)) {
      rmSync(TEST_CACHE_FILE, { force: true });
    }
  });

  afterEach(() => {
    if (existsSync(TEST_CACHE_FILE)) {
      rmSync(TEST_CACHE_FILE, { force: true });
    }
  });

  it("should return a result object with success and message", async () => {
    const { handleForageCommand } = await import("../forage");

    const result = await handleForageCommand(TEST_CACHE_FILE);

    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("message");
    expect(typeof result.success).toBe("boolean");
    expect(typeof result.message).toBe("string");
  });

  // Note: Full integration test requires Soltome credentials
  // Skip if credentials not available
  it.skip("should harvest posts when credentials available", async () => {
    const { handleForageCommand } = await import("../forage");

    const result = await handleForageCommand(TEST_CACHE_FILE);

    if (result.success) {
      expect(result.message).toContain("harvested");
    } else {
      // Without credentials, expect helpful error message
      expect(result.message).toContain("credentials");
    }
  });
});

describe("ForagedPost interface", () => {
  it("should accept both soltome and moltbook as platform values", () => {
    const soltomePost: ForagedPost = {
      id: "1",
      title: "Test",
      author: "user",
      platform: "soltome",
      content: "content",
      url: "https://soltome.com/posts/1",
    };

    const moltbookPost: ForagedPost = {
      id: "2",
      title: "Test",
      author: "user",
      platform: "moltbook",
      content: "content",
      url: "https://moltbook.com/m/general/2",
    };

    expect(soltomePost.platform).toBe("soltome");
    expect(moltbookPost.platform).toBe("moltbook");
  });
});
