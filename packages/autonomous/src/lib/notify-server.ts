/**
 * Notification Server
 *
 * HTTP server on port 3847 that receives POST /notify from Claude hooks,
 * launchd services, and other processes. Routes notifications to Telegram
 * group topics based on source.
 *
 * Extracted from telegram-bot.ts for componentization.
 */

import type { Bot } from "grammy";
import { runJobSearch } from "../job-golem/index";
import { loadState, type State } from "./bot-shared";

const NOTIFY_PORT = 3847;

// Per-source notification styles and topic routing
const SOURCE_CONFIG: Record<string, {
  icon: string;
  topic: keyof NonNullable<State["topics"]> | "general";
  format: (t: string, b: string) => string;
}> = {
  claude: {
    icon: "🤖",
    topic: "general",
    format: (t, b) => `🤖 *${t}*\n${b}`,
  },
  ralph: {
    icon: "🔄",
    topic: "alerts",
    format: (t, b) => `🔄 *Ralph*: ${t}\n\n${b}`,
  },
  nightshift: {
    icon: "🌙",
    topic: "nightshift",
    format: (t, b) => `🌙 *Night Shift*\n${t}\n${b}`,
  },
  email: {
    icon: "📧",
    topic: "monitor",
    format: (t, b) => `📧 *${t}*\n\n${b}`,
  },
  jobs: {
    icon: "🎯",
    topic: "recruiter",
    format: (t, b) => `🎯 *${t}*\n\n${b}`,
  },
  recruiter: {
    icon: "👔",
    topic: "recruiter",
    format: (t, b) => `👔 *${t}*\n\n${b}`,
  },
  teller: {
    icon: "💰",
    topic: "teller",
    format: (t, b) => `💰 *${t}*\n\n${b}`,
  },
  monitor: {
    icon: "🔧",
    topic: "monitor",
    format: (t, b) => `🔧 *${t}*\n\n${b}`,
  },
  bedtime: {
    icon: "🌙",
    topic: "alerts",
    format: (t, b) => `🌙 *${t}*\n\n${b}`,
  },
  healthcheck: {
    icon: "🏥",
    topic: "alerts",
    format: (t, b) => `🏥 *${t}*\n\n${b}`,
  },
  default: {
    icon: "📨",
    topic: "alerts",
    format: (t, b) => `📨 *${t}*\n\n${b}`,
  },
};

async function sendNotificationToTelegram(bot: Bot, data: {
  title: string;
  body: string;
  priority?: string;
  source?: string;
}) {
  const state = loadState();
  const config = SOURCE_CONFIG[data.source || "default"] || SOURCE_CONFIG.default;
  const priorityIcon = data.priority === "high" ? "🔔 " : "";
  const message = priorityIcon + config.format(data.title, data.body);

  let chatId: number | null = null;
  let threadId: number | undefined = undefined;

  if (state.groupChatId && state.topics) {
    chatId = state.groupChatId;
    threadId = config.topic === "general" ? undefined : state.topics[config.topic as keyof typeof state.topics];
    console.log(`[Notify] Routing to group ${chatId}, topic ${config.topic} (thread ${threadId ?? "General"})`);
  } else if (state.telegramChatId) {
    chatId = state.telegramChatId;
    console.log(`[Notify] Fallback to DM ${chatId}`);
  }

  if (!chatId) {
    console.log("[Notify] No chat ID saved, skipping");
    return;
  }

  try {
    const sendOptions: any = { parse_mode: "Markdown" };
    if (threadId) {
      sendOptions.message_thread_id = threadId;
    }

    try {
      await bot.api.sendMessage(chatId, message, sendOptions);
    } catch (mdErr) {
      console.warn("[Notify] Markdown failed, falling back to plain text:", (mdErr as Error).message);
      const plainMessage = message.replace(/[*_`\[\]]/g, "");
      const plainOptions: any = {};
      if (threadId) plainOptions.message_thread_id = threadId;
      await bot.api.sendMessage(chatId, plainMessage, plainOptions);
    }
    console.log(`[Notify] Sent: ${data.title} → ${config.topic}`);
  } catch (err) {
    console.error("[Notify] Failed:", err);
  }
}

/**
 * Start the notification HTTP server.
 * Returns the Bun.Server instance for graceful shutdown.
 */
export function startNotifyServer(bot: Bot) {
  const server = Bun.serve({
    port: NOTIFY_PORT,
    hostname: "127.0.0.1",
    fetch: async (req) => {
      const url = new URL(req.url);

      if (req.method === "POST" && url.pathname === "/notify") {
        try {
          const data = await req.json();
          await sendNotificationToTelegram(bot, data);
          return new Response("ok");
        } catch (err) {
          console.error("[Notify] Error:", err);
          return new Response("error", { status: 500 });
        }
      }

      if (url.pathname === "/scrape-jobs") {
        console.log("[Job Golem] Manual scrape triggered via HTTP");
        runJobSearch().then(result => {
          if (result) {
            console.log(`[Job Golem] Scrape complete: ${result.scraped} scraped, ${result.filtered} filtered, ${result.matched} matched`);
          }
        }).catch(err => {
          console.error("[Job Golem] Scrape failed:", err);
        });
        return new Response(JSON.stringify({ status: "started" }), {
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response("not found", { status: 404 });
    },
  });

  console.log(`📡 Notification server on port ${NOTIFY_PORT}`);
  return server;
}
