/**
 * Tests for soltome-client.ts
 *
 * These tests mock the fetch API since they interact with external services.
 */

import { describe, expect, it, beforeEach, afterEach, mock, spyOn } from "bun:test";

// We need to mock fetch before importing the module
const originalFetch = globalThis.fetch;

describe("Soltome Client", () => {
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    // Mock environment variable for API key
    process.env.SOLTOME_API_KEY = "ntls_test_key_12345";
    mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      )
    );
    globalThis.fetch = mockFetch as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.SOLTOME_API_KEY;
  });

  describe("editPost()", () => {
    it("should reject empty postId", async () => {
      // Import fresh to get mocked fetch
      const { editPost } = await import("../soltome-client");

      const result = await editPost("", { title: "New Title" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Post ID is required");
    });

    it("should reject when neither title nor content provided", async () => {
      const { editPost } = await import("../soltome-client");

      const result = await editPost("post-123", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one of title or content");
    });

    it("should call PATCH endpoint with correct body for title update", async () => {
      mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true }), { status: 200 })
        )
      );
      globalThis.fetch = mockFetch as any;

      const { editPost } = await import("../soltome-client");

      await editPost("post-123", { title: "Updated Title" });

      expect(mockFetch).toHaveBeenCalled();
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/posts/post-123");
      expect(options.method).toBe("PATCH");
      expect(JSON.parse(options.body as string)).toEqual({ title: "Updated Title" });
    });

    it("should call PATCH endpoint with correct body for content update", async () => {
      mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true }), { status: 200 })
        )
      );
      globalThis.fetch = mockFetch as any;

      const { editPost } = await import("../soltome-client");

      await editPost("post-456", { content: "New content here" });

      expect(mockFetch).toHaveBeenCalled();
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/posts/post-456");
      expect(options.method).toBe("PATCH");
      expect(JSON.parse(options.body as string)).toEqual({ content: "New content here" });
    });

    it("should call PATCH with both title and content when provided", async () => {
      mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true }), { status: 200 })
        )
      );
      globalThis.fetch = mockFetch as any;

      const { editPost } = await import("../soltome-client");

      await editPost("post-789", { title: "Title", content: "Content" });

      const [_, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(options.body as string)).toEqual({
        title: "Title",
        content: "Content",
      });
    });

    it("should return error on HTTP failure", async () => {
      mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
        )
      );
      globalThis.fetch = mockFetch as any;

      const { editPost } = await import("../soltome-client");

      const result = await editPost("nonexistent", { title: "Test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Not found");
    });

    it("should trim whitespace from inputs", async () => {
      mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true }), { status: 200 })
        )
      );
      globalThis.fetch = mockFetch as any;

      const { editPost } = await import("../soltome-client");

      await editPost("  post-id  ", { title: "  Title  ", content: "  Content  " });

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/posts/post-id");
      expect(JSON.parse(options.body as string)).toEqual({
        title: "Title",
        content: "Content",
      });
    });
  });

  describe("getPost()", () => {
    it("should fetch a single post by ID", async () => {
      const mockPost = {
        id: "test-123",
        title: "Test Post",
        content: "Test content",
        created_at: "2026-02-02T00:00:00Z",
        author: { username: "testuser" },
      };

      mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ post: mockPost }), { status: 200 })
        )
      );
      globalThis.fetch = mockFetch as any;

      const { getPost } = await import("../soltome-client");

      const result = await getPost("test-123");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("test-123");
      expect(result?.title).toBe("Test Post");
    });

    it("should return null on 404", async () => {
      mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Not found" }), { status: 404 })
        )
      );
      globalThis.fetch = mockFetch as any;

      const { getPost } = await import("../soltome-client");

      const result = await getPost("nonexistent");

      expect(result).toBeNull();
    });

    it("should handle direct post response (no wrapper)", async () => {
      const mockPost = {
        id: "direct-123",
        title: "Direct Post",
        content: "No wrapper",
        created_at: "2026-02-02T00:00:00Z",
      };

      mockFetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockPost), { status: 200 }))
      );
      globalThis.fetch = mockFetch as any;

      const { getPost } = await import("../soltome-client");

      const result = await getPost("direct-123");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("direct-123");
    });
  });

  describe("Authentication", () => {
    it("should include Bearer token in request headers", async () => {
      mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ posts: [] }), { status: 200 })
        )
      );
      globalThis.fetch = mockFetch as any;

      const { fetchPosts } = await import("../soltome-client");

      await fetchPosts(5);

      const [_, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((options.headers as Record<string, string>)["Authorization"]).toBe(
        "Bearer ntls_test_key_12345"
      );
    });
  });
});
