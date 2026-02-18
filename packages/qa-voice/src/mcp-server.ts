/**
 * QA Voice MCP Server
 *
 * Exposes voice I/O tools for Claude Code: ask (speak + wait), say (speak only), think (write to file).
 * TTS via edge-tts-universal, input via file watcher (mic.sh writes to /tmp/golems-qa-input.txt).
 *
 * Usage in .mcp.json:
 * {
 *   "qa-voice": {
 *     "command": "bun",
 *     "args": ["run", "packages/qa-voice/src/mcp-server.ts"]
 *   }
 * }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { appendFileSync, existsSync, writeFileSync } from "fs";
import { speak } from "./tts";
import { waitForInput, clearInput } from "./input";

const INPUT_FILE = process.env.QA_VOICE_INPUT_FILE || "/tmp/golems-qa-input.txt";
const THINK_FILE = process.env.QA_VOICE_THINK_FILE || "/tmp/golems-qa-thinking.md";
const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes

const server = new Server(
  { name: "qa-voice", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// --- Tool definitions ---

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "qa_voice_ask",
      description:
        "Speak a question aloud via TTS and wait for the user's voice response. " +
        "The user responds via Wispr Flow (speech-to-text) in a companion terminal. " +
        "Returns the transcribed text. Use for QA questions, discovery interview questions, " +
        "or any time you need verbal input from the user.",
      inputSchema: {
        type: "object" as const,
        properties: {
          message: {
            type: "string",
            description: "The question or message to speak aloud",
          },
          timeout_seconds: {
            type: "number",
            description: "How long to wait for a response (default: 300 seconds)",
            default: 300,
          },
        },
        required: ["message"],
      },
    },
    {
      name: "qa_voice_say",
      description:
        "Speak a message aloud via TTS without waiting for a response. " +
        "Use for status updates, acknowledgments, or transitions between topics.",
      inputSchema: {
        type: "object" as const,
        properties: {
          message: {
            type: "string",
            description: "The message to speak aloud",
          },
        },
        required: ["message"],
      },
    },
    {
      name: "qa_voice_think",
      description:
        "Append a thought or insight to the live thinking log (markdown file). " +
        "Use during discovery calls to silently take notes the user can glance at. " +
        "Does NOT speak — writes to a file that can be open in a split screen.",
      inputSchema: {
        type: "object" as const,
        properties: {
          thought: {
            type: "string",
            description: "The insight, suggestion, or note to append",
          },
          category: {
            type: "string",
            description: "Category: insight, question, red-flag, checklist-update",
            enum: ["insight", "question", "red-flag", "checklist-update"],
          },
        },
        required: ["thought"],
      },
    },
  ],
}));

// --- Tool handlers ---

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "qa_voice_ask":
        return await handleAsk(args);
      case "qa_voice_say":
        return await handleSay(args);
      case "qa_voice_think":
        return await handleThink(args);
      default:
        return {
          content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
          isError: true,
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

async function handleAsk(args: any) {
  const message = args?.message;
  const timeoutSeconds = args?.timeout_seconds ?? 300;

  if (!message) {
    return {
      content: [{ type: "text" as const, text: "Missing required: message" }],
      isError: true,
    };
  }

  // Clear any stale input
  clearInput(INPUT_FILE);

  // Speak the question, then trigger F5 for Wispr Flow
  await speak(message, true);

  // Wait for user response via file watcher
  const response = await waitForInput(INPUT_FILE, timeoutSeconds * 1000);

  if (response === null) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No response received within ${timeoutSeconds} seconds. The user may have stepped away.`,
        },
      ],
    };
  }

  return {
    content: [{ type: "text" as const, text: response }],
  };
}

async function handleSay(args: any) {
  const message = args?.message;

  if (!message) {
    return {
      content: [{ type: "text" as const, text: "Missing required: message" }],
      isError: true,
    };
  }

  await speak(message);

  return {
    content: [{ type: "text" as const, text: `Spoke: "${message}"` }],
  };
}

async function handleThink(args: any) {
  const thought = args?.thought;
  const category = args?.category || "insight";

  if (!thought) {
    return {
      content: [{ type: "text" as const, text: "Missing required: thought" }],
      isError: true,
    };
  }

  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const icons: Record<string, string> = {
    insight: "💡",
    question: "❓",
    "red-flag": "🚩",
    "checklist-update": "✅",
  };

  const icon = icons[category] || "📝";
  const line = `- [${timestamp}] ${icon} ${thought}\n`;

  // Append to thinking file
  if (!existsSync(THINK_FILE)) {
    writeFileSync(THINK_FILE, `# Live Thinking Log\n\n`);
  }
  appendFileSync(THINK_FILE, line);

  return {
    content: [{ type: "text" as const, text: `Noted (${category}): ${thought}` }],
  };
}

// --- Start server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[qa-voice] MCP server running on stdio");
}

main().catch((err) => {
  console.error("[qa-voice] Fatal:", err);
  process.exit(1);
});
