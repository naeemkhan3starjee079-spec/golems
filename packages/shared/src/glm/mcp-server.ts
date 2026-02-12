/**
 * GLM MCP Server
 *
 * Exposes GLM-4.7-Flash (via Ollama) as MCP tools for Claude Code.
 * Tools: glm_summarize, glm_score
 *
 * Usage in .mcp.json:
 * {
 *   "golems-glm": {
 *     "command": "bun",
 *     "args": ["run", "packages/shared/src/glm/mcp-server.ts"]
 *   }
 * }
 */

import "../lib/load-env";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { runGLM, runGLMJSON } from "../lib/glm-llm";

const server = new Server(
  { name: "golems-glm", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// --- Tool definitions ---

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "glm_summarize",
      description:
        "Summarize text using GLM-4.7-Flash. Returns a concise summary in up to N sentences.",
      inputSchema: {
        type: "object" as const,
        properties: {
          text: {
            type: "string",
            description: "The text to summarize",
          },
          maxSentences: {
            type: "number",
            description: "Maximum number of sentences in the summary (default: 3)",
            default: 3,
          },
        },
        required: ["text"],
      },
    },
    {
      name: "glm_score",
      description:
        "Score or classify text using GLM-4.7-Flash with structured JSON output. Provide a prompt describing the scoring criteria and a JSON schema for the output shape.",
      inputSchema: {
        type: "object" as const,
        properties: {
          text: {
            type: "string",
            description: "The text to score or classify",
          },
          prompt: {
            type: "string",
            description: "Instructions for scoring/classification (what to extract, how to score, etc.)",
          },
          schema: {
            type: "object",
            description: "JSON schema object describing the expected output shape (e.g. { score: number, category: string })",
          },
        },
        required: ["text", "prompt", "schema"],
      },
    },
  ],
}));

// --- Tool handlers ---

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "glm_summarize":
        return await handleSummarize(args);
      case "glm_score":
        return await handleScore(args);
      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
        };
    }
  } catch (err: any) {
    return {
      content: [
        {
          type: "text" as const,
          text: `Error in ${name}: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function handleSummarize(args: any) {
  const text = args?.text;
  const maxSentences = args?.maxSentences ?? 3;

  if (!text) {
    return {
      content: [{ type: "text" as const, text: "Missing required: text" }],
      isError: true,
    };
  }

  const prompt = `Summarize the following text in at most ${maxSentences} sentences. Be concise and capture the main points.

TEXT:
${text}

SUMMARY:`;

  const summary = await runGLM(prompt, "glm-mcp-summarize");

  if (!summary) {
    return {
      content: [
        {
          type: "text" as const,
          text: "GLM failed to generate summary. Ensure Ollama is running with glm-4.7-flash model.",
        },
      ],
      isError: true,
    };
  }

  return {
    content: [{ type: "text" as const, text: summary }],
  };
}

async function handleScore(args: any) {
  const { text, prompt: userPrompt, schema } = args || {};

  if (!text) {
    return {
      content: [{ type: "text" as const, text: "Missing required: text" }],
      isError: true,
    };
  }

  if (!userPrompt) {
    return {
      content: [{ type: "text" as const, text: "Missing required: prompt" }],
      isError: true,
    };
  }

  if (!schema || typeof schema !== "object") {
    return {
      content: [{ type: "text" as const, text: "Missing required: schema (must be a JSON object)" }],
      isError: true,
    };
  }

  const schemaStr = JSON.stringify(schema, null, 2);

  const prompt = `${userPrompt}

TEXT TO SCORE/CLASSIFY:
${text}

Respond with ONLY a JSON object matching this schema. No other text.
SCHEMA:
${schemaStr}

JSON OUTPUT:`;

  const result = await runGLMJSON<Record<string, unknown>>(prompt, "glm-mcp-score");

  if (!result) {
    return {
      content: [
        {
          type: "text" as const,
          text: "GLM failed to produce valid JSON. Ensure Ollama is running with glm-4.7-flash model.",
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

// --- Start server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[golems-glm] MCP server running on stdio");
}

main().catch((err) => {
  console.error("[golems-glm] Fatal:", err);
  process.exit(1);
});
