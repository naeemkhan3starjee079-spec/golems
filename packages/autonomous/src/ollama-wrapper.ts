/**
 * Ollama Wrapper
 *
 * Unified interface for Ollama - switches between direct and sandboxed modes.
 * Set OLLAMA_SANDBOXED=1 to use validation queue.
 */

import * as directOllama from "./ollama-helper";
import * as sandboxedOllama from "./ollama-sandboxed";

const USE_SANDBOX = process.env.OLLAMA_SANDBOXED === "1";

if (USE_SANDBOX) {
  console.log("[Ollama] Using SANDBOXED mode (validation queue enabled)");
} else {
  console.log("[Ollama] Using DIRECT mode (no validation)");
}

/**
 * Run Ollama with optional validation
 *
 * In sandboxed mode, outputs go through validation queue.
 * In direct mode, outputs return immediately.
 */
export async function runOllama(prompt: string, source = "unknown"): Promise<string> {
  if (USE_SANDBOX) {
    const result = await sandboxedOllama.runOllamaSandboxed(prompt, source);

    if (result.autoApproved) {
      return result.response;
    }

    // Wait for approval (with timeout)
    const approved = await sandboxedOllama.waitForApproval(result.id, 120000);
    return approved || "";
  }

  return directOllama.runOllama(prompt);
}

/**
 * Run Ollama and parse JSON response
 */
export async function runOllamaJSON<T>(prompt: string, source = "unknown"): Promise<T | null> {
  const result = await runOllama(prompt, source);

  if (!result) return null;

  try {
    const match = result.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
  } catch (e) {
    console.error("[Ollama] JSON parse error:", e);
  }

  return null;
}

// Embeddings don't need validation - pass through directly
export const getEmbedding = USE_SANDBOX
  ? sandboxedOllama.getEmbedding
  : directOllama.getEmbedding;

export const batchEmbed = USE_SANDBOX
  ? sandboxedOllama.batchEmbed
  : directOllama.batchEmbed;

// Utility functions (same for both modes)
export const cosineSimilarity = directOllama.cosineSimilarity;
export const findSimilar = directOllama.findSimilar;

/**
 * Quick helpers for common sources
 */
export const forJobGolem = {
  runOllama: (prompt: string) => runOllama(prompt, "job-golem"),
  runOllamaJSON: <T>(prompt: string) => runOllamaJSON<T>(prompt, "job-golem"),
};

export const forMoltbook = {
  runOllama: (prompt: string) => runOllama(prompt, "moltbook-learner"),
  runOllamaJSON: <T>(prompt: string) => runOllamaJSON<T>(prompt, "moltbook-learner"),
};

export const forNightShift = {
  runOllama: (prompt: string) => runOllama(prompt, "night-shift"),
  runOllamaJSON: <T>(prompt: string) => runOllamaJSON<T>(prompt, "night-shift"),
};
