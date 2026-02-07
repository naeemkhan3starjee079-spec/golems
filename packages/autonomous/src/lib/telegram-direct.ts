/**
 * Telegram Direct Sender
 *
 * Cloud services can't reach localhost:3847 (the local notification server).
 * This module sends Telegram messages directly via Bot API when TELEGRAM_MODE=direct,
 * or falls back to the local notification server when TELEGRAM_MODE=local (default).
 *
 * ENV:
 *   TELEGRAM_MODE      - "local" (default) | "direct"
 *   TELEGRAM_BOT_TOKEN - Required for direct mode
 *   TELEGRAM_CHAT_ID   - Required for direct mode (group chat ID)
 *   TELEGRAM_TOPIC_*   - Thread IDs for topic routing (direct mode)
 */

const TELEGRAM_API = "https://api.telegram.org";
const LOCAL_NOTIFY_URL = "http://localhost:3847/notify";

/** Source → topic mapping (matches telegram-bot.ts SOURCE_CONFIG) */
const SOURCE_TO_TOPIC: Record<string, string> = {
  claude: "general",
  ralph: "alerts",
  nightshift: "nightshift",
  email: "email",
  jobs: "jobs",
  recruiter: "recruiter",
  healthcheck: "alerts",
  uptime: "uptime",
  monitoring: "uptime",
  default: "alerts",
};

/** Source → icon + formatter (matches telegram-bot.ts) */
const SOURCE_FORMAT: Record<string, { icon: string; format: (t: string, b: string) => string }> = {
  claude: { icon: "🤖", format: (t, b) => `🤖 *${t}*\n${b}` },
  ralph: { icon: "🔄", format: (t, b) => `🔄 *Ralph*: ${t}\n\n${b}` },
  nightshift: { icon: "🌙", format: (t, b) => `🌙 *Night Shift*\n${t}\n${b}` },
  email: { icon: "📧", format: (t, b) => `📧 *${t}*\n\n${b}` },
  jobs: { icon: "🎯", format: (t, b) => `🎯 *${t}*\n\n${b}` },
  recruiter: { icon: "👔", format: (t, b) => `👔 *${t}*\n\n${b}` },
  healthcheck: { icon: "🏥", format: (t, b) => `🏥 *${t}*\n\n${b}` },
  uptime: { icon: "📡", format: (t, b) => `📡 *${t}*\n\n${b}` },
  monitoring: { icon: "📡", format: (t, b) => `📡 *${t}*\n\n${b}` },
  default: { icon: "📨", format: (t, b) => `📨 *${t}*\n\n${b}` },
};

/** Payload for sending a Telegram notification */
export interface NotificationPayload {
  title: string;
  body: string;
  source?: string;
  priority?: string;
}

/**
 * Resolve the thread ID for a given topic name from environment variables.
 * Returns undefined for "general" (no thread = main chat).
 */
function getTopicThreadId(topicName: string): number | undefined {
  if (topicName === "general") return undefined;

  const envKey = `TELEGRAM_TOPIC_${topicName.toUpperCase()}`;
  const value = process.env[envKey];
  return value ? parseInt(value, 10) : undefined;
}

/**
 * Send notification - routes to local server or direct Telegram API
 * based on TELEGRAM_MODE environment variable.
 */
export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
  const mode = process.env.TELEGRAM_MODE || "local";

  if (mode === "direct") {
    return sendDirect(payload);
  }
  return sendLocal(payload);
}

/**
 * Send via local notification server (localhost:3847)
 */
async function sendLocal(payload: NotificationPayload): Promise<boolean> {
  try {
    const response = await fetch(LOCAL_NOTIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (err) {
    console.error("[TelegramDirect] Local notify failed:", err);
    return false;
  }
}

/**
 * Send directly via Telegram Bot API (for cloud deployment)
 */
async function sendDirect(payload: NotificationPayload): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error(
      "[TelegramDirect] TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID required for direct mode"
    );
    return false;
  }

  const source = payload.source || "default";
  const topicName = SOURCE_TO_TOPIC[source] || SOURCE_TO_TOPIC.default;
  const threadId = getTopicThreadId(topicName);
  const formatter = SOURCE_FORMAT[source] || SOURCE_FORMAT.default;

  const priorityIcon = payload.priority === "high" ? "🔔 " : "";
  const message = priorityIcon + formatter.format(payload.title, payload.body);

  const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;

  try {
    // Try Markdown first
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    };
    if (threadId) {
      body.message_thread_id = threadId;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      // Markdown failed - retry with plain text
      const plainMessage = message.replace(/[*_`\[\]]/g, "");
      const plainBody: Record<string, unknown> = {
        chat_id: chatId,
        text: plainMessage,
      };
      if (threadId) {
        plainBody.message_thread_id = threadId;
      }

      const retryResponse = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plainBody),
        signal: AbortSignal.timeout(10000),
      });

      if (!retryResponse.ok) {
        const err = await retryResponse.text();
        console.error(`[TelegramDirect] Send failed: ${err}`);
        return false;
      }
    }

    console.log(`[TelegramDirect] Sent: ${payload.title} → ${topicName}`);
    return true;
  } catch (err) {
    console.error("[TelegramDirect] Error:", err);
    return false;
  }
}
