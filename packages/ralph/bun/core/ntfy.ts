/**
 * Ntfy Notification Functions
 * TypeScript implementation matching the zsh _ralph_ntfy function
 */

export interface NotificationOptions {
  topic: string;
  title: string;
  body: string;
  priority?: "min" | "low" | "default" | "high" | "urgent";
  tags?: string[];
}

/**
 * Build curl arguments for ntfy notification
 * Returns array of arguments that can be passed to curl
 */
export function buildCurlArgs(options: NotificationOptions): string[] {
  const args: string[] = [
    "curl",
    "-s",
    "-H", `Title: ${options.title}`,
    "-H", `Priority: ${options.priority || "default"}`,
    "-H", "Markdown: true"
  ];

  if (options.tags && options.tags.length > 0) {
    args.push("-H", `Tags: ${options.tags.join(",")}`);
  }

  args.push("-d", options.body);
  args.push(`https://ntfy.sh/${options.topic}`);

  return args;
}

/**
 * Send notification via local Telegram bot (replaces ntfy.sh)
 */
export async function sendNotification(options: NotificationOptions): Promise<boolean> {
  console.log(`[Notify] Sending: ${options.title}`);

  try {
    const response = await fetch("http://localhost:3847/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: options.title,
        body: options.body,
        priority: options.priority || "default",
      }),
    });

    return response.ok;
  } catch {
    // Silently fail - notifications are non-critical
    return false;
  }
}
