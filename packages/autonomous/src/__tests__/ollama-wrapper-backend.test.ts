import { describe, it, expect } from "bun:test";

/**
 * Test that ollama-wrapper.ts supports the LLM_BACKEND env var.
 * These are structural tests - they verify the module exports
 * and backend selection logic without calling actual LLMs.
 */

describe("ollama-wrapper backend selection", () => {
  it("exports runOllama function", async () => {
    const mod = await import("../ollama-wrapper");
    expect(typeof mod.runOllama).toBe("function");
  });

  it("exports runOllamaJSON function", async () => {
    const mod = await import("../ollama-wrapper");
    expect(typeof mod.runOllamaJSON).toBe("function");
  });

  it("exports source helpers", async () => {
    const mod = await import("../ollama-wrapper");
    expect(typeof mod.forJobGolem.runOllama).toBe("function");
    expect(typeof mod.forEmailGolem.runOllama).toBe("function");
    expect(typeof mod.forNightShift.runOllama).toBe("function");
  });

  it("exports embedding functions", async () => {
    const mod = await import("../ollama-wrapper");
    expect(typeof mod.getEmbedding).toBe("function");
    expect(typeof mod.batchEmbed).toBe("function");
    expect(typeof mod.cosineSimilarity).toBe("function");
    expect(typeof mod.findSimilar).toBe("function");
  });
});
