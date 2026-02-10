/**
 * @deprecated Use ./llm.ts instead. This file re-exports for backward compatibility.
 */
export {
  runLLM as runOllama,
  runLLMJSON as runOllamaJSON,
  runLLM,
  runLLMJSON,
  getEmbedding,
  batchEmbed,
  cosineSimilarity,
  findSimilar,
  forJobGolem,
  forNightShift,
  forEmailGolem,
} from "./llm";
