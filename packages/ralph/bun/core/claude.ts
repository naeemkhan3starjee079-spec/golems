/**
 * Claude CLI module for Ralph
 * Spawn and manage Claude CLI processes with prompts
 */

import { spawn, type Subprocess } from "bun";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { type Model, type RalphConfig } from "./config";
import { getCliForModel, isGeminiModel, isKiroModel } from "./models";

// CLI spawn options
export interface ClaudeSpawnOptions {
  model: Model;
  prompt: string;
  workingDir: string;
  appendSystemPrompt?: string;
  maxTurns?: number;
  timeout?: number; // in milliseconds
  verbose?: boolean;
}

// CLI process result
export interface ClaudeResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  sessionId?: string;
  durationMs: number;
}

/**
 * Build the CLI command array for a Claude/Gemini/Kiro invocation
 */
export function buildCliArgs(options: ClaudeSpawnOptions): string[] {
  const cli = getCliForModel(options.model);
  const args: string[] = [];

  if (cli === "claude") {
    // Claude CLI arguments
    args.push("-p", options.prompt);

    // Model selection
    if (options.model === "haiku") {
      args.push("--model", "haiku");
    } else if (options.model === "sonnet") {
      args.push("--model", "sonnet");
    } else if (options.model === "opus") {
      args.push("--model", "opus");
    }

    // Max turns
    if (options.maxTurns) {
      args.push("--max-turns", options.maxTurns.toString());
    }

    // Append system prompt
    if (options.appendSystemPrompt) {
      args.push("--append-system-prompt", options.appendSystemPrompt);
    }

    // Output format
    args.push("--output-format", "json");
  } else if (cli === "gemini") {
    // Gemini CLI arguments: gemini [query..] [options]
    args.push("--yolo");  // Auto-approve all tools
    args.push("-o", "json");  // JSON output format

    // Model selection for gemini
    if (options.model === "gemini-pro") {
      args.push("-m", "gemini-2.0-pro-exp");
    } else {
      args.push("-m", "gemini-2.0-flash-exp");
    }

    // Prompt as positional argument (at end)
    args.push(options.prompt);
  } else if (cli === "kiro-cli") {
    // Kiro CLI arguments: kiro-cli chat [OPTIONS] [INPUT]
    args.push("chat");
    args.push("--trust-all-tools");  // Like --dangerously-skip-permissions
    args.push("--no-interactive");   // Non-interactive mode
    args.push(options.prompt);       // Prompt as positional argument
  }

  return args;
}

/**
 * Spawn a Claude CLI process and return when it completes
 */
export async function spawnClaude(options: ClaudeSpawnOptions): Promise<ClaudeResult> {
  const cli = getCliForModel(options.model);
  const args = buildCliArgs(options);

  const startTime = Date.now();

  if (options.verbose) {
    console.log(`[claude] Spawning: ${cli} ${args.join(" ")}`);
  }

  const proc = spawn([cli, ...args], {
    cwd: options.workingDir,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      // Ensure Claude doesn't prompt for input
      ANTHROPIC_NO_TERMINAL: "1",
    },
  });

  // Set up timeout if specified
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  if (options.timeout) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, options.timeout);
  }

  // Wait for process to complete
  const exitCode = await proc.exited;

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  const durationMs = Date.now() - startTime;

  // Read stdout and stderr
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();

  // Extract session ID from Claude output if available
  let sessionId: string | undefined;
  if (cli === "claude") {
    const sessionMatch = stdout.match(/"session_id":\s*"([^"]+)"/);
    if (sessionMatch) {
      sessionId = sessionMatch[1];
    }
  }

  return {
    success: !timedOut && exitCode === 0,
    exitCode: timedOut ? -1 : exitCode,
    stdout,
    stderr,
    sessionId,
    durationMs,
  };
}

/**
 * Load the Ralph prompt template and substitute variables
 */
export function loadPromptTemplate(
  templatePath: string,
  variables: Record<string, string>
): string {
  if (!existsSync(templatePath)) {
    throw new Error(`Prompt template not found: ${templatePath}`);
  }

  let content = readFileSync(templatePath, "utf-8");

  // Substitute template variables: {{VAR_NAME}}
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    content = content.replace(pattern, value);
  }

  return content;
}

/**
 * Build the full prompt for a Ralph iteration
 */
export function buildRalphPrompt(
  options: {
    storyId: string;
    model: Model;
    prdJsonDir: string;
    workingDir: string;
    templatePath?: string;
  }
): string {
  const timestamp = new Date().toISOString();

  const variables: Record<string, string> = {
    MODEL: options.model,
    PRD_JSON_DIR: options.prdJsonDir,
    WORKING_DIR: options.workingDir,
    ISO_TIMESTAMP: timestamp,
    STORY_ID: options.storyId,
  };

  // If a template path is provided, use it
  if (options.templatePath && existsSync(options.templatePath)) {
    return loadPromptTemplate(options.templatePath, variables);
  }

  // Default fallback prompt
  return `You are Ralph, an autonomous coding agent. Do exactly ONE task per iteration.

## Model Information
You are running on model: **${options.model}**

## Paths
- PRD Index: ${options.prdJsonDir}/index.json
- Stories: ${options.prdJsonDir}/stories/*.json
- Working Dir: ${options.workingDir}

## Steps
1. Read prd-json/index.json - find nextStory field for the story to work on
2. Read prd-json/stories/{nextStory}.json - get acceptanceCriteria
3. Work through acceptance criteria ONE BY ONE
4. Mark each criterion as checked=true immediately after completing it
5. When ALL criteria are checked, set passes=true
6. Update prd-json/index.json - remove story from pending, update stats
7. Commit changes

Current story: ${options.storyId}
Timestamp: ${timestamp}
`;
}

/**
 * Parse Claude's JSON output to extract meaningful information
 */
export function parseClaudeOutput(stdout: string): {
  messages: Array<{ role: string; content: string }>;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cacheCreateTokens?: number;
    cacheReadTokens?: number;
  };
  error?: string;
} {
  try {
    // Claude outputs JSONL, parse line by line
    const lines = stdout.split("\n").filter(line => line.trim());
    const messages: Array<{ role: string; content: string }> = [];
    let usage: { inputTokens: number; outputTokens: number; cacheCreateTokens?: number; cacheReadTokens?: number } | undefined;

    for (const line of lines) {
      try {
        const data = JSON.parse(line);

        // Extract messages
        if (data.type === "assistant" && data.content) {
          const textContent = Array.isArray(data.content)
            ? data.content.filter((c: { type: string }) => c.type === "text").map((c: { text: string }) => c.text).join("")
            : data.content;
          messages.push({ role: "assistant", content: textContent });
        }

        // Extract usage
        if (data.usage) {
          usage = {
            inputTokens: data.usage.input_tokens ?? 0,
            outputTokens: data.usage.output_tokens ?? 0,
            cacheCreateTokens: data.usage.cache_creation_input_tokens,
            cacheReadTokens: data.usage.cache_read_input_tokens,
          };
        }
      } catch {
        // Skip malformed lines
      }
    }

    return { messages, usage };
  } catch (error) {
    return {
      messages: [],
      error: `Failed to parse Claude output: ${error}`,
    };
  }
}

/**
 * Check if Claude output indicates a completion signal
 */
export function hasCompletionSignal(output: string): boolean {
  // Check for common completion patterns
  const completionPatterns = [
    /COMPLETE/i,
    /all\s+criteria\s+(are\s+)?checked/i,
    /story\s+(is\s+)?complete/i,
    /passes.*true/i,
  ];

  return completionPatterns.some(pattern => pattern.test(output));
}

/**
 * Check if Claude output indicates a blocked signal
 */
export function hasBlockedSignal(output: string): boolean {
  const blockedPatterns = [
    /BLOCKED/i,
    /cannot\s+proceed/i,
    /blocked\s+by/i,
    /manual\s+intervention/i,
  ];

  return blockedPatterns.some(pattern => pattern.test(output));
}
