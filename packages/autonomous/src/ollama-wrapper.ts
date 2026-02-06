/**
 * Ollama Wrapper
 *
 * Unified LLM interface - switches between backends:
 *   - direct: Ollama CLI (default)
 *   - sandboxed: Ollama with validation queue (OLLAMA_SANDBOXED=1)
 *   - haiku: Claude Haiku 4.5 via Anthropic SDK (LLM_BACKEND=haiku)
 *
 * Consumers call runOllama/runOllamaJSON regardless of backend.
 */

import * as directOllama from "./ollama-helper";
import * as sandboxedOllama from "./ollama-sandboxed";
import { runHaiku, runHaikuJSON } from "./lib/cloud-llm";

const LLM_BACKEND = process.env.LLM_BACKEND || "ollama";
const USE_SANDBOX = process.env.OLLAMA_SANDBOXED === "1";

if (LLM_BACKEND === "haiku") {
  console.log("[LLM] Using HAIKU mode (Anthropic API)");
} else if (USE_SANDBOX) {
  console.log("[LLM] Using SANDBOXED Ollama mode (validation queue)");
} else {
  console.log("[LLM] Using DIRECT Ollama mode");
}

/**
 * Run an LLM prompt. Backend determined by LLM_BACKEND env var.
 *
 * - "haiku": Claude Haiku 4.5 via Anthropic SDK
 * - "ollama" (default): Local Ollama, optionally sandboxed
 */
export async function runOllama(prompt: string, source = "unknown"): Promise<string> {
  if (LLM_BACKEND === "haiku") {
    return runHaiku(prompt, source);
  }

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
 * Run an LLM prompt and parse JSON from the response.
 */
export async function runOllamaJSON<T>(prompt: string, source = "unknown"): Promise<T | null> {
  if (LLM_BACKEND === "haiku") {
    return runHaikuJSON<T>(prompt, source);
  }

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

export const forNightShift = {
  runOllama: (prompt: string) => runOllama(prompt, "night-shift"),
  runOllamaJSON: <T>(prompt: string) => runOllamaJSON<T>(prompt, "night-shift"),
};

export const forEmailGolem = {
  runOllama: (prompt: string) => runOllama(prompt, "email-golem"),
  runOllamaJSON: <T>(prompt: string) => runOllamaJSON<T>(prompt, "email-golem"),
};

export const forSoltome = {
  runOllama: (prompt: string) => runOllama(prompt, "soltome-learner"),
  runOllamaJSON: <T>(prompt: string) => runOllamaJSON<T>(prompt, "soltome-learner"),
};
