import { describe, it, expect } from "bun:test";

/**
 * Test that llm.ts exports the correct LLM facade interface.
 * Also verifies ollama-wrapper.ts backward-compat re-exports.
 */

describe("LLM facade (llm.ts)", () => {
  it("exports runLLM function", async () => {
    const mod = await import("../llm");
    expect(typeof mod.runLLM).toBe("function");
  });

  it("exports runLLMJSON function", async () => {
    const mod = await import("../llm");
    expect(typeof mod.runLLMJSON).toBe("function");
  });

  it("exports source helpers with runLLM/runLLMJSON", async () => {
    const mod = await import("../llm");
    expect(typeof mod.forJobGolem.runLLM).toBe("function");
    expect(typeof mod.forJobGolem.runLLMJSON).toBe("function");
    expect(typeof mod.forEmailGolem.runLLM).toBe("function");
    expect(typeof mod.forNightShift.runLLM).toBe("function");
  });

  it("exports embedding functions", async () => {
    const mod = await import("../llm");
    expect(typeof mod.getEmbedding).toBe("function");
    expect(typeof mod.batchEmbed).toBe("function");
    expect(typeof mod.cosineSimilarity).toBe("function");
    expect(typeof mod.findSimilar).toBe("function");
  });

  it("exports backward-compat aliases", async () => {
    const mod = await import("../llm");
    expect(typeof mod.runOllama).toBe("function");
    expect(typeof mod.runOllamaJSON).toBe("function");
    expect(mod.runOllama).toBe(mod.runLLM);
    expect(mod.runOllamaJSON).toBe(mod.runLLMJSON);
  });
});

describe("ollama-wrapper backward compatibility", () => {
  it("re-exports runOllama and runOllamaJSON", async () => {
    const mod = await import("../ollama-wrapper");
    expect(typeof mod.runOllama).toBe("function");
    expect(typeof mod.runOllamaJSON).toBe("function");
  });

  it("re-exports source helpers", async () => {
    const mod = await import("../ollama-wrapper");
    expect(typeof mod.forJobGolem).toBe("object");
    expect(typeof mod.forEmailGolem).toBe("object");
    expect(typeof mod.forNightShift).toBe("object");
  });

  it("re-exports embedding functions", async () => {
    const mod = await import("../ollama-wrapper");
    expect(typeof mod.getEmbedding).toBe("function");
    expect(typeof mod.batchEmbed).toBe("function");
  });
});
