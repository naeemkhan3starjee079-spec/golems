#!/usr/bin/env bun
/**
 * Aggregate mistakes using Zikaron embeddings for similarity clustering
 *
 * Reads: ~/.golems-zikaron/mistakes/raw/*.json
 * Writes: ~/.golems-zikaron/mistakes/clusters.json
 *
 * Uses Zikaron's embedding model (bge-large-en-v1.5) for semantic similarity
 */

import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";

const MISTAKES_DIR = join(process.env.HOME!, ".golems-zikaron", "mistakes");
const RAW_DIR = join(MISTAKES_DIR, "raw");
const CLUSTERS_FILE = join(MISTAKES_DIR, "clusters.json");
const EMBEDDINGS_FILE = join(MISTAKES_DIR, "embeddings.json");

// Similarity threshold for clustering (0.85 = quite similar)
const SIMILARITY_THRESHOLD = 0.85;

interface Mistake {
  id: string;
  timestamp: string;
  description: string;
  context: {
    project: string;
    cwd?: string;
    session?: string;
  };
}

interface EmbeddingCache {
  [id: string]: number[];
}

interface Cluster {
  representative: string; // Description of the cluster
  count: number;
  mistakes: Mistake[];
  avgEmbedding?: number[];
}

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Get embedding from Zikaron (calls the Python module)
async function getEmbedding(text: string): Promise<number[]> {
  try {
    // Use Zikaron's embedding functionality via Python
    const result = execSync(
      `cd ~/Gits/golems/packages/zikaron && source .venv/bin/activate && python3 -c "
from sentence_transformers import SentenceTransformer
import json
model = SentenceTransformer('BAAI/bge-large-en-v1.5')
embedding = model.encode('${text.replace(/'/g, "\\'")}').tolist()
print(json.dumps(embedding))
"`,
      { encoding: "utf-8", timeout: 30000 }
    );
    return JSON.parse(result.trim());
  } catch (error) {
    console.error(`Failed to get embedding for: ${text}`);
    throw error;
  }
}

// Load cached embeddings
async function loadEmbeddingCache(): Promise<EmbeddingCache> {
  try {
    const data = await readFile(EMBEDDINGS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save embedding cache
async function saveEmbeddingCache(cache: EmbeddingCache): Promise<void> {
  await writeFile(EMBEDDINGS_FILE, JSON.stringify(cache, null, 2));
}

// Load all mistakes from raw directory
async function loadMistakes(): Promise<Mistake[]> {
  try {
    const files = await readdir(RAW_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const mistakes: Mistake[] = [];
    for (const file of jsonFiles) {
      const content = await readFile(join(RAW_DIR, file), "utf-8");
      mistakes.push(JSON.parse(content));
    }

    return mistakes.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch {
    return [];
  }
}

// Cluster mistakes by embedding similarity
async function clusterMistakes(mistakes: Mistake[]): Promise<Cluster[]> {
  if (mistakes.length === 0) return [];

  console.log(`Clustering ${mistakes.length} mistakes...`);

  // Load cached embeddings
  const cache = await loadEmbeddingCache();
  let cacheUpdated = false;

  // Get embeddings for all mistakes
  const embeddings: Map<string, number[]> = new Map();
  for (const mistake of mistakes) {
    if (cache[mistake.id]) {
      embeddings.set(mistake.id, cache[mistake.id]);
    } else {
      console.log(`Embedding: ${mistake.description.slice(0, 50)}...`);
      const embedding = await getEmbedding(mistake.description);
      embeddings.set(mistake.id, embedding);
      cache[mistake.id] = embedding;
      cacheUpdated = true;
    }
  }

  // Save updated cache
  if (cacheUpdated) {
    await saveEmbeddingCache(cache);
  }

  // Cluster using greedy approach
  const clusters: Cluster[] = [];
  const assigned = new Set<string>();

  for (const mistake of mistakes) {
    if (assigned.has(mistake.id)) continue;

    const embedding = embeddings.get(mistake.id)!;
    const cluster: Cluster = {
      representative: mistake.description,
      count: 1,
      mistakes: [mistake],
    };

    // Find similar mistakes
    for (const other of mistakes) {
      if (other.id === mistake.id || assigned.has(other.id)) continue;

      const otherEmbedding = embeddings.get(other.id)!;
      const similarity = cosineSimilarity(embedding, otherEmbedding);

      if (similarity >= SIMILARITY_THRESHOLD) {
        cluster.mistakes.push(other);
        cluster.count++;
        assigned.add(other.id);
      }
    }

    assigned.add(mistake.id);
    clusters.push(cluster);
  }

  // Sort by count (most frequent first)
  clusters.sort((a, b) => b.count - a.count);

  return clusters;
}

// Main
async function main() {
  console.log("Aggregating mistakes...\n");

  // Ensure directories exist
  await mkdir(RAW_DIR, { recursive: true });

  // Load mistakes
  const mistakes = await loadMistakes();
  console.log(`Found ${mistakes.length} recorded mistakes\n`);

  if (mistakes.length === 0) {
    console.log("No mistakes to aggregate.");
    return;
  }

  // Cluster
  const clusters = await clusterMistakes(mistakes);

  // Save results
  const result = {
    generatedAt: new Date().toISOString(),
    totalMistakes: mistakes.length,
    totalClusters: clusters.length,
    clusters: clusters.map((c) => ({
      representative: c.representative,
      count: c.count,
      examples: c.mistakes.slice(0, 3).map((m) => ({
        description: m.description,
        project: m.context.project,
        timestamp: m.timestamp,
      })),
    })),
  };

  await writeFile(CLUSTERS_FILE, JSON.stringify(result, null, 2));

  // Summary
  console.log("\n=== Top Mistake Patterns ===\n");
  for (const cluster of clusters.slice(0, 5)) {
    console.log(`[${cluster.count}x] ${cluster.representative}`);
    if (cluster.count > 1) {
      console.log(`     Projects: ${[...new Set(cluster.mistakes.map((m) => m.context.project))].join(", ")}`);
    }
    console.log();
  }

  console.log(`\nResults saved to: ${CLUSTERS_FILE}`);
}

main().catch(console.error);
