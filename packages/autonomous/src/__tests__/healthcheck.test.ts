import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

// We test checkRailwayCloud by mocking global fetch
// and importing the function after module setup

const originalFetch = globalThis.fetch;

describe("healthcheck", () => {
  describe("checkRailwayCloud", () => {
    afterEach(() => {
      globalThis.fetch = originalFetch;
      delete process.env.RAILWAY_URL;
    });

    it("returns ok when Railway /health responds with status ok", async () => {
      process.env.RAILWAY_URL = "https://test-railway.up.railway.app";
      globalThis.fetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: "ok",
              uptime: 3600,
              backend: "haiku",
              stateBackend: "supabase",
              telegramMode: "direct",
            }),
            { status: 200 }
          )
        )
      ) as any;

      const { checkRailwayCloud } = await import("@golems/services/healthcheck");
      const result = await checkRailwayCloud();

      expect(result.name).toBe("Railway Cloud");
      expect(result.ok).toBe(true);
      expect(result.detail).toContain("uptime: 3600s");
    });

    it("returns not ok when Railway /health responds with error", async () => {
      process.env.RAILWAY_URL = "https://test-railway.up.railway.app";
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response("Internal Server Error", { status: 500 }))
      ) as any;

      const { checkRailwayCloud } = await import("@golems/services/healthcheck");
      const result = await checkRailwayCloud();

      expect(result.name).toBe("Railway Cloud");
      expect(result.ok).toBe(false);
      expect(result.detail).toContain("Status 500");
    });

    it("returns not ok when Railway is unreachable", async () => {
      process.env.RAILWAY_URL = "https://test-railway.up.railway.app";
      globalThis.fetch = mock(() =>
        Promise.reject(new Error("Connection refused"))
      ) as any;

      const { checkRailwayCloud } = await import("@golems/services/healthcheck");
      const result = await checkRailwayCloud();

      expect(result.name).toBe("Railway Cloud");
      expect(result.ok).toBe(false);
      expect(result.detail).toContain("Not responding");
    });

    it("uses RAILWAY_URL env var for the endpoint", async () => {
      const customUrl = "https://custom-app.railway.app";
      process.env.RAILWAY_URL = customUrl;
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ status: "ok", uptime: 100 }), {
            status: 200,
          })
        )
      );
      globalThis.fetch = mockFetch as any;

      const { checkRailwayCloud } = await import("@golems/services/healthcheck");
      await checkRailwayCloud();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const calledUrl = (mockFetch.mock.calls[0] as any)[0];
      expect(calledUrl).toBe(`${customUrl}/health`);
    });

    it("uses fallback URL when RAILWAY_URL not set", async () => {
      delete process.env.RAILWAY_URL;
      const mockFetch = mock(() =>
        Promise.resolve(
          new Response(JSON.stringify({ status: "ok", uptime: 100 }), {
            status: 200,
          })
        )
      );
      globalThis.fetch = mockFetch as any;

      const { checkRailwayCloud } = await import("@golems/services/healthcheck");
      await checkRailwayCloud();

      const calledUrl = (mockFetch.mock.calls[0] as any)[0];
      expect(calledUrl).toContain("/health");
    });
  });
});
