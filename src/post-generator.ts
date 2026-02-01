#!/usr/bin/env bun
/**
 * Post Generator - Critique-Waves pattern for Moltbook drafts
 *
 * PHASE 1: Parallel Generation (Ollama x3)
 * PHASE 2: Parallel Critique (All agents score all drafts)
 * PHASE 3: Sequential Refinement (Top 3 get polished)
 * PHASE 4: Claude Code Polish (spawn-and-die)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { runOllama } from "./ollama-helper";
import { getLearnedPatterns, getTopExamples, getZikaronStyle, getSimilarPosts } from "./moltbook-learner";

const HOME = process.env.HOME || "/Users/etanheyman";
const DATA_DIR = join(HOME, "Gits/golems-zikaron/data");
const DRAFTS_FILE = join(DATA_DIR, "drafts.json");
const STYLE_FILE = join(DATA_DIR, "style-guide.json");

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Draft post
export interface Draft {
  id: string;
  title: string;
  content: string;
  submolt: string;
  source: "zikaron" | "claude-golem" | "learnings" | "general";
  scores: number[];
  avgScore: number;
  status: "draft" | "refined" | "polished" | "approved" | "posted" | "rejected";
  createdAt: string;
}

// Style guide patterns
interface StyleGuide {
  goodPatterns: string[];
  badPatterns: string[];
  toneNotes: string[];
  updatedAt: string;
}

function loadStyleGuide(): StyleGuide {
  try {
    return JSON.parse(readFileSync(STYLE_FILE, "utf-8"));
  } catch {
    return {
      goodPatterns: [
        "Start with a hook or question",
        "Share specific code examples",
        "End with actionable takeaway",
      ],
      badPatterns: [
        "Vague platitudes",
        "Self-promotion without value",
        "Controversial hot takes",
      ],
      toneNotes: ["Educational but casual", "Brief and scannable"],
      updatedAt: new Date().toISOString(),
    };
  }
}

function loadDrafts(): Draft[] {
  try {
    return JSON.parse(readFileSync(DRAFTS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function saveDrafts(drafts: Draft[]) {
  writeFileSync(DRAFTS_FILE, JSON.stringify(drafts, null, 2));
}

/**
 * PHASE 1: Parallel Generation
 * 3 Ollama agents generate drafts about different topics
 */
async function parallelGeneration(context: {
  zikaronInfo: string;
  claudeGolemInfo: string;
  overnightLearnings: string;
}): Promise<Draft[]> {
  console.log("\n📝 PHASE 1: Parallel Generation");

  // Get learned patterns from Moltbook + Zikaron style
  const patterns = getLearnedPatterns();
  const topExamples = getTopExamples(3);
  const zikaronStyle = getZikaronStyle();

  const learnedContext = patterns ? `
LEARNED FROM TOP PERFORMERS:
- Title patterns: ${patterns.patterns.titlePatterns.slice(0, 3).join(", ")}
- Content patterns: ${patterns.patterns.contentPatterns.slice(0, 2).join(", ")}
- Avoid: ${patterns.patterns.avoidPatterns.slice(0, 2).join(", ")}

EXAMPLES OF HIGH-ENGAGEMENT POSTS:
${topExamples.join("\n\n")}

OWNER'S COMMUNICATION STYLE (from Zikaron analysis):
- Brief, direct, casual
- No formal language
- Playful, sometimes sarcastic
- Emojis sparingly (🫶 🔥 🧠)
` : "";

  // Note: zikaronStyle available for deeper style matching if needed

  const agents = [
    {
      name: "Agent A (Zikaron)",
      source: "zikaron" as const,
      prompt: `You are writing Moltbook posts about Zikaron, a conversation memory system.
${learnedContext}
Context about Zikaron:
${context.zikaronInfo || "Zikaron indexes Claude Code conversations for search/retrieval. It helps AI remember past solutions."}

Generate 3-4 SHORT post ideas (title + 2-3 sentence content). Focus on:
- How conversation memory helps AI agents
- Indexing and retrieval patterns
- What Zikaron learned from analyzing conversations

Format each as:
TITLE: [catchy title]
CONTENT: [2-3 sentences, educational, no fluff]
---`,
    },
    {
      name: "Agent B (Claude-Golem)",
      source: "claude-golem" as const,
      prompt: `You are writing Moltbook posts about Claude-Golem (Ralph), an autonomous AI coding loop.

Context about Claude-Golem:
${context.claudeGolemInfo || "Ralph runs Claude in a loop to execute PRD stories autonomously. Spawn fresh AI, read PRD, implement, review, commit."}

Generate 3-4 SHORT post ideas (title + 2-3 sentence content). Focus on:
- Autonomous coding patterns
- Night Shift improvements
- How the loop handles errors/retries

Format each as:
TITLE: [catchy title]
CONTENT: [2-3 sentences, educational, no fluff]
---`,
    },
    {
      name: "Agent C (Learnings)",
      source: "learnings" as const,
      prompt: `You are writing Moltbook posts about AI agent learnings and patterns.

Tonight's learnings:
${context.overnightLearnings || "General insights about AI agents, memory systems, and autonomous coding."}

Generate 3-4 SHORT post ideas (title + 2-3 sentence content). Focus on:
- Patterns other AI agents might find useful
- Debugging/improvement strategies
- Memory and context management

Format each as:
TITLE: [catchy title]
CONTENT: [2-3 sentences, educational, no fluff]
---`,
    },
  ];

  const drafts: Draft[] = [];

  // Run agents in parallel
  const results = await Promise.all(
    agents.map(async (agent) => {
      console.log(`  🤖 ${agent.name} generating...`);
      try {
        const result = await runOllama(agent.prompt);
        return { agent, result };
      } catch (err) {
        console.error(`  ❌ ${agent.name} failed:`, err);
        return { agent, result: "" };
      }
    })
  );

  // Parse drafts from each agent
  for (const { agent, result } of results) {
    const posts = result.split("---").filter((p) => p.includes("TITLE:"));

    for (const post of posts) {
      const titleMatch = post.match(/TITLE:\s*(.+)/);
      const contentMatch = post.match(/CONTENT:\s*([\s\S]+?)(?=TITLE:|$)/);

      if (titleMatch && contentMatch) {
        drafts.push({
          id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: titleMatch[1].trim(),
          content: contentMatch[1].trim(),
          submolt: "todayilearned",
          source: agent.source,
          scores: [],
          avgScore: 0,
          status: "draft",
          createdAt: new Date().toISOString(),
        });
      }
    }

    console.log(`  ✓ ${agent.name}: ${posts.length} drafts`);
  }

  console.log(`  📊 Total drafts generated: ${drafts.length}`);
  return drafts;
}

/**
 * PHASE 2: Parallel Critique
 * All agents score ALL drafts (not just their own)
 */
async function parallelCritique(drafts: Draft[]): Promise<Draft[]> {
  console.log("\n⚖️ PHASE 2: Parallel Critique");

  const styleGuide = loadStyleGuide();

  for (const draft of drafts) {
    const prompt = `Score this Moltbook post draft 1-10.

TITLE: ${draft.title}
CONTENT: ${draft.content}

GOOD PATTERNS to look for:
${styleGuide.goodPatterns.join("\n")}

BAD PATTERNS to avoid:
${styleGuide.badPatterns.join("\n")}

Respond with ONLY a number 1-10.`;

    // Run 3 scoring agents in parallel
    const scores = await Promise.all([
      runOllama(prompt),
      runOllama(prompt),
      runOllama(prompt),
    ]);

    draft.scores = scores.map((s) => {
      const num = parseInt(s.match(/\d+/)?.[0] || "5");
      return Math.min(10, Math.max(1, num));
    });
    draft.avgScore = draft.scores.reduce((a, b) => a + b, 0) / draft.scores.length;

    console.log(
      `  📊 "${draft.title.slice(0, 30)}...": ${draft.avgScore.toFixed(1)}/10 [${draft.scores.join(", ")}]`
    );
  }

  // Sort by average score
  drafts.sort((a, b) => b.avgScore - a.avgScore);

  console.log(`  🏆 Top 3 by consensus:`);
  drafts.slice(0, 3).forEach((d, i) => {
    console.log(`    ${i + 1}. ${d.avgScore.toFixed(1)}/10: "${d.title}"`);
  });

  return drafts;
}

/**
 * PHASE 3: Sequential Refinement
 * Top 3 drafts get refined one by one
 */
async function sequentialRefinement(drafts: Draft[]): Promise<Draft[]> {
  console.log("\n✨ PHASE 3: Sequential Refinement");

  const top3 = drafts.slice(0, 3);
  const styleGuide = loadStyleGuide();

  for (const draft of top3) {
    const prompt = `Refine this Moltbook post. Keep it SHORT (2-3 sentences max).

CURRENT:
Title: ${draft.title}
Content: ${draft.content}

STYLE NOTES:
${styleGuide.toneNotes.join("\n")}

Make it:
- More engaging hook
- Clearer value proposition
- End with actionable insight

Respond with:
TITLE: [refined title]
CONTENT: [refined content, 2-3 sentences max]`;

    try {
      const result = await runOllama(prompt);

      const titleMatch = result.match(/TITLE:\s*(.+)/);
      const contentMatch = result.match(/CONTENT:\s*([\s\S]+?)$/);

      if (titleMatch) draft.title = titleMatch[1].trim();
      if (contentMatch) draft.content = contentMatch[1].trim().slice(0, 500);

      draft.status = "refined";
      console.log(`  ✓ Refined: "${draft.title.slice(0, 40)}..."`);
    } catch (err) {
      console.error(`  ❌ Refinement failed for "${draft.title}":`, err);
    }
  }

  return top3;
}

/**
 * PHASE 4: Claude Code Polish
 * Final pass using Claude Code CLI (subscription, not API)
 */
async function claudeCodePolish(drafts: Draft[]): Promise<Draft[]> {
  console.log("\n🎨 PHASE 4: Claude Code Polish");

  const styleGuide = loadStyleGuide();

  for (const draft of drafts) {
    const prompt = `You are GolemsZikaron polishing a Moltbook post.

DRAFT:
Title: ${draft.title}
Content: ${draft.content}

YOUR VOICE (from style guide):
- Educational but casual
- Brief and scannable
- No shitpost vibes
- Share genuine insights

Polish this post. Keep it SHORT (2-3 sentences max for content).
Make it sound like a thoughtful AI sharing learnings, not marketing.

Respond with ONLY:
TITLE: [final title]
CONTENT: [final content]`;

    try {
      console.log(`  🤖 Spawning Claude Code for "${draft.title.slice(0, 30)}..."`);

      // Use Bun.spawn like telegram-bot (no --print, it causes timeout)
      const proc = Bun.spawn([
        "/Users/etanheyman/.local/bin/claude",
        "--dangerously-skip-permissions",
        "-p", prompt
      ], {
        stdout: "pipe",
        stderr: "pipe",
      });

      // 60 second timeout for polish
      const timeout = setTimeout(() => proc.kill(), 60000);
      await proc.exited;
      clearTimeout(timeout);

      const result = await new Response(proc.stdout).text();

      const titleMatch = result.match(/TITLE:\s*(.+)/);
      const contentMatch = result.match(/CONTENT:\s*([\s\S]+?)$/);

      if (titleMatch) draft.title = titleMatch[1].trim();
      if (contentMatch) draft.content = contentMatch[1].trim().slice(0, 500);

      draft.status = "polished";
      console.log(`  ✓ Polished: "${draft.title}"`);
    } catch (err) {
      console.error(`  ❌ Claude polish failed:`, err);
      // Keep the refined version if polish fails
      draft.status = "refined";
    }
  }

  return drafts;
}

/**
 * Main: Run the full critique-waves pipeline
 */
export async function generatePosts(context: {
  zikaronInfo?: string;
  claudeGolemInfo?: string;
  overnightLearnings?: string;
}): Promise<Draft[]> {
  console.log("🌊 Starting Critique-Waves Post Generation\n");

  // PHASE 1: Parallel Generation
  let drafts = await parallelGeneration({
    zikaronInfo: context.zikaronInfo || "",
    claudeGolemInfo: context.claudeGolemInfo || "",
    overnightLearnings: context.overnightLearnings || "",
  });

  if (drafts.length === 0) {
    console.log("❌ No drafts generated");
    return [];
  }

  // PHASE 2: Parallel Critique
  drafts = await parallelCritique(drafts);

  // PHASE 3: Sequential Refinement (top 3 only)
  const refined = await sequentialRefinement(drafts);

  // PHASE 4: Claude Code Polish
  const polished = await claudeCodePolish(refined);

  // Save to drafts queue
  const existing = loadDrafts();
  const updated = [...polished, ...existing];
  saveDrafts(updated);

  console.log(`\n✅ ${polished.length} polished drafts queued in ${DRAFTS_FILE}`);

  return polished;
}

/**
 * Get pending drafts for approval
 */
export function getPendingDrafts(): Draft[] {
  return loadDrafts().filter((d) => d.status === "polished" || d.status === "refined");
}

/**
 * Approve a draft (mark ready to post)
 */
export function approveDraft(id: string): Draft | null {
  const drafts = loadDrafts();
  const draft = drafts.find((d) => d.id === id);
  if (draft) {
    draft.status = "approved";
    saveDrafts(drafts);
  }
  return draft || null;
}

/**
 * Reject a draft
 */
export function rejectDraft(id: string): Draft | null {
  const drafts = loadDrafts();
  const draft = drafts.find((d) => d.id === id);
  if (draft) {
    draft.status = "rejected";
    saveDrafts(drafts);
  }
  return draft || null;
}

// CLI test
if (import.meta.main) {
  const posts = await generatePosts({
    zikaronInfo: "Zikaron indexes Claude Code conversations for retrieval.",
    claudeGolemInfo: "Ralph runs autonomous coding loops overnight.",
    overnightLearnings: "Learned about spawn-and-die patterns for AI agents.",
  });

  console.log("\n📝 Generated posts:");
  posts.forEach((p, i) => {
    console.log(`\n${i + 1}. [${p.source}] ${p.title}`);
    console.log(`   ${p.content.slice(0, 100)}...`);
    console.log(`   Score: ${p.avgScore.toFixed(1)}/10 | Status: ${p.status}`);
  });
}
