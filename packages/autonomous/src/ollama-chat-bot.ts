/**
 * OllamaChat Telegram Bot
 *
 * Direct Ollama interaction via Telegram - ask questions, get answers.
 * Ollama can also ping you with notifications.
 *
 * SETUP:
 * 1. Create bot via BotFather: https://t.me/BotFather
 *    - /newbot
 *    - Name: OllamaChat (or whatever you prefer)
 *    - Username: your_ollama_chat_bot
 * 2. Copy the bot token
 * 3. Set OLLAMA_CHAT_BOT_TOKEN in .env or environment
 * 4. Run: bun run src/ollama-chat-bot.ts
 */

import { Bot, Context } from "grammy";
import { Ollama } from "ollama";

// Configuration
const BOT_TOKEN = process.env.OLLAMA_CHAT_BOT_TOKEN;
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "qwen3-coder-64k";
const ALLOWED_USERS = (process.env.ALLOWED_TELEGRAM_USERS || "").split(",").filter(Boolean);

if (!BOT_TOKEN) {
  console.error(`
╔═══════════════════════════════════════════════════════════════════╗
║                    OllamaChat Bot Setup                           ║
╠═══════════════════════════════════════════════════════════════════╣
║ Bot token not found! Follow these steps:                          ║
║                                                                   ║
║ 1. Open Telegram and message @BotFather                           ║
║ 2. Send /newbot                                                   ║
║ 3. Name: "OllamaChat" (or your preference)                        ║
║ 4. Username: something unique like "your_ollama_chat_bot"         ║
║ 5. Copy the token BotFather gives you                             ║
║ 6. Set it: export OLLAMA_CHAT_BOT_TOKEN="your_token_here"         ║
║    Or add to ~/.golems-zikaron/.env                               ║
║ 7. Run again: bun run src/ollama-chat-bot.ts                      ║
╚═══════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

// Initialize
const bot = new Bot(BOT_TOKEN);
const ollama = new Ollama({ host: OLLAMA_HOST });

// Message queue for when Ollama is busy
interface QueuedMessage {
  chatId: number;
  text: string;
  timestamp: Date;
}
const messageQueue: QueuedMessage[] = [];
let isProcessing = false;

// User authorization check
function isAuthorized(ctx: Context): boolean {
  if (ALLOWED_USERS.length === 0) return true; // No restriction if not configured
  const userId = ctx.from?.id?.toString() || "";
  const username = ctx.from?.username || "";
  return ALLOWED_USERS.includes(userId) || ALLOWED_USERS.includes(username);
}

// Process message with Ollama
async function processWithOllama(prompt: string): Promise<string> {
  try {
    const response = await ollama.chat({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: false,
    });
    return response.message.content;
  } catch (error) {
    console.error("Ollama error:", error);
    return `Error communicating with Ollama: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

// Process queued messages
async function processQueue() {
  if (isProcessing || messageQueue.length === 0) return;

  isProcessing = true;

  while (messageQueue.length > 0) {
    const msg = messageQueue.shift()!;
    const response = await processWithOllama(msg.text);

    try {
      await bot.api.sendMessage(msg.chatId, response, { parse_mode: "Markdown" });
    } catch (error) {
      console.warn("[Bot] Markdown failed, falling back to plain:", (error as Error).message);
      await bot.api.sendMessage(msg.chatId, response);
    }
  }

  isProcessing = false;
}

// Command handlers
bot.command("start", async (ctx) => {
  if (!isAuthorized(ctx)) {
    await ctx.reply("Unauthorized. Contact admin to get access.");
    return;
  }

  await ctx.reply(`
🤖 *OllamaChat Bot*

I'm connected to Ollama (${DEFAULT_MODEL}).

*Commands:*
/ask <question> - Ask Ollama directly
/model - Show current model
/models - List available models
/status - Check Ollama status

Or just send me any message and I'll respond!
  `, { parse_mode: "Markdown" });
});

bot.command("status", async (ctx) => {
  if (!isAuthorized(ctx)) return;

  try {
    const tags = await ollama.list();
    const models = tags.models.map(m => m.name).join(", ");
    await ctx.reply(`✅ Ollama is running\nModels: ${models}\nCurrent: ${DEFAULT_MODEL}`);
  } catch (error) {
    await ctx.reply(`❌ Ollama not responding: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});

bot.command("models", async (ctx) => {
  if (!isAuthorized(ctx)) return;

  try {
    const tags = await ollama.list();
    const modelList = tags.models.map(m => `• ${m.name}`).join("\n");
    await ctx.reply(`*Available models:*\n${modelList}`, { parse_mode: "Markdown" });
  } catch (error) {
    await ctx.reply("Error fetching models");
  }
});

bot.command("model", async (ctx) => {
  if (!isAuthorized(ctx)) return;
  await ctx.reply(`Current model: ${DEFAULT_MODEL}`);
});

bot.command("ask", async (ctx) => {
  if (!isAuthorized(ctx)) return;

  const question = ctx.match;
  if (!question) {
    await ctx.reply("Usage: /ask <your question>");
    return;
  }

  await ctx.reply("🤔 Thinking...");
  const response = await processWithOllama(question);
  await ctx.reply(response);
});

// Handle regular messages
bot.on("message:text", async (ctx) => {
  if (!isAuthorized(ctx)) return;

  const text = ctx.message.text;
  if (text.startsWith("/")) return; // Skip commands

  if (isProcessing) {
    messageQueue.push({
      chatId: ctx.chat.id,
      text,
      timestamp: new Date(),
    });
    await ctx.reply(`📥 Queued (${messageQueue.length} in queue). I'll respond when ready.`);
    return;
  }

  await ctx.reply("🤔 Thinking...");
  const response = await processWithOllama(text);

  try {
    await ctx.reply(response, { parse_mode: "Markdown" });
  } catch {
    await ctx.reply(response);
  }

  // Process any queued messages
  processQueue();
});

// Utility function to send proactive notifications
export async function notifyUser(chatId: number, message: string) {
  try {
    await bot.api.sendMessage(chatId, message);
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

// Start the bot with retry on 409 conflict
async function startBot(retries = 3) {
  console.log("🤖 OllamaChat bot starting...");
  console.log(`   Model: ${DEFAULT_MODEL}`);
  console.log(`   Ollama: ${OLLAMA_HOST}`);

  for (let i = 0; i < retries; i++) {
    try {
      await bot.start();
      console.log("✅ OllamaChat bot running");
      return;
    } catch (err: any) {
      if (err?.error_code === 409 && i < retries - 1) {
        console.log(`[Bot] 409 conflict, waiting 10s before retry ${i + 2}/${retries}...`);
        await new Promise(r => setTimeout(r, 10000));
      } else {
        throw err;
      }
    }
  }
}

startBot().catch(err => {
  console.error("[Bot] Failed to start:", err);
  process.exit(1);
});
