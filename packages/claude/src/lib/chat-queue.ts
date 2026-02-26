/**
 * Chat Queue — Manages queued messages and drafts for ClaudeGolem
 *
 * Provides queue/dequeue/edit operations for Telegram chat responses
 * and content drafts. Persistent storage in JSON file.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QueueItemStatus = "queued" | "seen" | "sent" | "edited" | "removed";
export type QueueItemType = "chat" | "draft" | "notification";

export interface QueueItem {
  id: string;
  type: QueueItemType;
  content: string;
  status: QueueItemStatus;
  createdAt: string;
  updatedAt?: string;
  source: string;
  metadata?: Record<string, string>;
  editHistory?: string[];
}

export interface ChatQueue {
  version: number;
  items: QueueItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_QUEUE_PATH = join(
  process.env.HOME || "~",
  ".golems-zikaron",
  "chat-queue.json"
);

// ---------------------------------------------------------------------------
// Queue persistence
// ---------------------------------------------------------------------------

export function createEmptyQueue(): ChatQueue {
  return { version: 1, items: [] };
}

export function loadQueue(queuePath?: string): ChatQueue {
  const p = queuePath || DEFAULT_QUEUE_PATH;
  if (!existsSync(p)) return createEmptyQueue();
  try {
    const data = JSON.parse(readFileSync(p, "utf-8"));
    return {
      version: data.version || 1,
      items: data.items || [],
    };
  } catch {
    return createEmptyQueue();
  }
}

export function saveQueue(queue: ChatQueue, queuePath?: string): void {
  const p = queuePath || DEFAULT_QUEUE_PATH;
  const dir = dirname(p);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(p, JSON.stringify(queue, null, 2));
}

// ---------------------------------------------------------------------------
// Queue operations
// ---------------------------------------------------------------------------

function generateId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function enqueue(
  queue: ChatQueue,
  content: string,
  type: QueueItemType = "chat",
  source: string = "claude",
  metadata?: Record<string, string>
): QueueItem {
  const item: QueueItem = {
    id: generateId(),
    type,
    content,
    status: "queued",
    createdAt: new Date().toISOString(),
    source,
    metadata,
  };
  queue.items.push(item);
  return item;
}

export function dequeue(queue: ChatQueue, id: string): QueueItem | undefined {
  const item = queue.items.find((i) => i.id === id);
  if (item) {
    item.status = "removed";
    item.updatedAt = new Date().toISOString();
  }
  return item;
}

export function markSeen(queue: ChatQueue, id: string): QueueItem | undefined {
  const item = queue.items.find((i) => i.id === id);
  if (item && item.status === "queued") {
    item.status = "seen";
    item.updatedAt = new Date().toISOString();
  }
  return item;
}

export function markSent(queue: ChatQueue, id: string): QueueItem | undefined {
  const item = queue.items.find((i) => i.id === id);
  if (item) {
    item.status = "sent";
    item.updatedAt = new Date().toISOString();
  }
  return item;
}

export function editItem(
  queue: ChatQueue,
  id: string,
  newContent: string
): QueueItem | undefined {
  const item = queue.items.find((i) => i.id === id);
  if (!item) return undefined;

  // Save old content to history
  if (!item.editHistory) {
    item.editHistory = [];
  }
  item.editHistory.push(item.content);

  item.content = newContent;
  item.status = "edited";
  item.updatedAt = new Date().toISOString();
  return item;
}

// ---------------------------------------------------------------------------
// Query operations
// ---------------------------------------------------------------------------

export function getQueued(queue: ChatQueue): QueueItem[] {
  return queue.items.filter((i) => i.status === "queued");
}

export function getSeen(queue: ChatQueue): QueueItem[] {
  return queue.items.filter((i) => i.status === "seen");
}

export function getByType(queue: ChatQueue, type: QueueItemType): QueueItem[] {
  return queue.items.filter((i) => i.type === type && i.status !== "removed");
}

export function getBySource(queue: ChatQueue, source: string): QueueItem[] {
  return queue.items.filter((i) => i.source === source && i.status !== "removed");
}

export function getActive(queue: ChatQueue): QueueItem[] {
  return queue.items.filter(
    (i) => i.status === "queued" || i.status === "seen" || i.status === "edited"
  );
}

export function getById(queue: ChatQueue, id: string): QueueItem | undefined {
  return queue.items.find((i) => i.id === id);
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

export function cleanOld(queue: ChatQueue, maxAgeDays: number = 7): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  const cutoffISO = cutoff.toISOString();

  const before = queue.items.length;
  queue.items = queue.items.filter((i) => {
    // Keep active items regardless of age
    if (i.status === "queued" || i.status === "seen" || i.status === "edited") {
      return true;
    }
    return i.createdAt >= cutoffISO;
  });
  return before - queue.items.length;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function formatQueueSummary(queue: ChatQueue): string {
  const lines: string[] = [];
  const active = getActive(queue);
  const queued = getQueued(queue);
  const seen = getSeen(queue);

  lines.push(`Chat Queue: ${active.length} active`);
  lines.push(`  Queued: ${queued.length}  |  Seen: ${seen.length}`);

  if (active.length > 0) {
    lines.push("");
    for (const item of active) {
      const preview = item.content.slice(0, 60) + (item.content.length > 60 ? "..." : "");
      const icon =
        item.status === "queued" ? "[ ]" :
        item.status === "seen" ? "[*]" :
        item.status === "edited" ? "[~]" : "   ";
      lines.push(`  ${icon} ${item.id.slice(0, 12)} ${item.type.padEnd(8)} ${preview}`);
    }
  }

  return lines.join("\n");
}

export function formatItem(item: QueueItem): string {
  const lines: string[] = [];
  lines.push(`ID: ${item.id}`);
  lines.push(`Type: ${item.type}  |  Status: ${item.status}`);
  lines.push(`Source: ${item.source}`);
  lines.push(`Created: ${item.createdAt}`);
  if (item.updatedAt) {
    lines.push(`Updated: ${item.updatedAt}`);
  }
  lines.push("");
  lines.push("Content:");
  lines.push(item.content);

  if (item.editHistory && item.editHistory.length > 0) {
    lines.push("");
    lines.push(`Edit history (${item.editHistory.length} revisions)`);
  }

  return lines.join("\n");
}
