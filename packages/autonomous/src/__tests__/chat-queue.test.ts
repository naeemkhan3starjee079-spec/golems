import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  createEmptyQueue,
  loadQueue,
  saveQueue,
  enqueue,
  dequeue,
  markSeen,
  markSent,
  editItem,
  getQueued,
  getSeen,
  getByType,
  getBySource,
  getActive,
  getById,
  cleanOld,
  formatQueueSummary,
  formatItem,
  type ChatQueue,
  type QueueItem,
} from "../lib/chat-queue";

let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `chat-queue-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Queue persistence
// ---------------------------------------------------------------------------

describe("queue persistence", () => {
  test("createEmptyQueue returns valid default", () => {
    const q = createEmptyQueue();
    expect(q.version).toBe(1);
    expect(q.items).toEqual([]);
  });

  test("loadQueue returns empty when file missing", () => {
    const q = loadQueue(join(testDir, "nonexistent.json"));
    expect(q.items).toEqual([]);
  });

  test("saveQueue and loadQueue roundtrip", () => {
    const p = join(testDir, "queue.json");
    const q = createEmptyQueue();
    enqueue(q, "Hello world", "chat", "claude");
    saveQueue(q, p);

    const loaded = loadQueue(p);
    expect(loaded.items.length).toBe(1);
    expect(loaded.items[0].content).toBe("Hello world");
  });

  test("saveQueue creates directory if needed", () => {
    const p = join(testDir, "sub", "queue.json");
    saveQueue(createEmptyQueue(), p);
    expect(existsSync(p)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Enqueue/Dequeue
// ---------------------------------------------------------------------------

describe("enqueue", () => {
  test("adds item with queued status", () => {
    const q = createEmptyQueue();
    const item = enqueue(q, "Test message", "chat", "claude");
    expect(item.status).toBe("queued");
    expect(item.content).toBe("Test message");
    expect(item.type).toBe("chat");
    expect(item.source).toBe("claude");
    expect(item.id).toBeTruthy();
    expect(item.createdAt).toBeTruthy();
    expect(q.items.length).toBe(1);
  });

  test("supports metadata", () => {
    const q = createEmptyQueue();
    const item = enqueue(q, "Draft post", "draft", "soltome", { topic: "AI" });
    expect(item.metadata?.topic).toBe("AI");
  });

  test("generates unique IDs", () => {
    const q = createEmptyQueue();
    const a = enqueue(q, "A");
    const b = enqueue(q, "B");
    expect(a.id).not.toBe(b.id);
  });
});

describe("dequeue", () => {
  test("marks item as removed", () => {
    const q = createEmptyQueue();
    const item = enqueue(q, "Test");
    const result = dequeue(q, item.id);
    expect(result?.status).toBe("removed");
    expect(result?.updatedAt).toBeTruthy();
  });

  test("returns undefined for missing id", () => {
    const q = createEmptyQueue();
    expect(dequeue(q, "nonexistent")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

describe("status transitions", () => {
  test("markSeen changes queued to seen", () => {
    const q = createEmptyQueue();
    const item = enqueue(q, "Test");
    markSeen(q, item.id);
    expect(q.items[0].status).toBe("seen");
  });

  test("markSeen only affects queued items", () => {
    const q = createEmptyQueue();
    const item = enqueue(q, "Test");
    markSent(q, item.id); // now "sent"
    markSeen(q, item.id); // should not change from "sent" to "seen"
    expect(q.items[0].status).toBe("sent");
  });

  test("markSent changes to sent", () => {
    const q = createEmptyQueue();
    const item = enqueue(q, "Test");
    markSent(q, item.id);
    expect(q.items[0].status).toBe("sent");
  });
});

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

describe("editItem", () => {
  test("updates content and status", () => {
    const q = createEmptyQueue();
    const item = enqueue(q, "Original");
    editItem(q, item.id, "Modified");
    expect(q.items[0].content).toBe("Modified");
    expect(q.items[0].status).toBe("edited");
  });

  test("preserves edit history", () => {
    const q = createEmptyQueue();
    const item = enqueue(q, "Version 1");
    editItem(q, item.id, "Version 2");
    editItem(q, item.id, "Version 3");
    expect(q.items[0].editHistory?.length).toBe(2);
    expect(q.items[0].editHistory?.[0]).toBe("Version 1");
    expect(q.items[0].editHistory?.[1]).toBe("Version 2");
    expect(q.items[0].content).toBe("Version 3");
  });

  test("returns undefined for missing id", () => {
    const q = createEmptyQueue();
    expect(editItem(q, "nonexistent", "test")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

describe("queries", () => {
  test("getQueued returns only queued items", () => {
    const q = createEmptyQueue();
    enqueue(q, "A");
    const b = enqueue(q, "B");
    markSeen(q, b.id);
    expect(getQueued(q).length).toBe(1);
    expect(getQueued(q)[0].content).toBe("A");
  });

  test("getSeen returns only seen items", () => {
    const q = createEmptyQueue();
    const a = enqueue(q, "A");
    enqueue(q, "B");
    markSeen(q, a.id);
    expect(getSeen(q).length).toBe(1);
  });

  test("getByType filters by type", () => {
    const q = createEmptyQueue();
    enqueue(q, "Chat", "chat");
    enqueue(q, "Draft", "draft");
    enqueue(q, "Notif", "notification");
    expect(getByType(q, "chat").length).toBe(1);
    expect(getByType(q, "draft").length).toBe(1);
  });

  test("getByType excludes removed items", () => {
    const q = createEmptyQueue();
    const item = enqueue(q, "Chat", "chat");
    dequeue(q, item.id);
    expect(getByType(q, "chat").length).toBe(0);
  });

  test("getBySource filters by source", () => {
    const q = createEmptyQueue();
    enqueue(q, "A", "chat", "claude");
    enqueue(q, "B", "chat", "nightshift");
    expect(getBySource(q, "claude").length).toBe(1);
  });

  test("getActive returns queued, seen, and edited", () => {
    const q = createEmptyQueue();
    enqueue(q, "Queued");
    const b = enqueue(q, "Seen");
    markSeen(q, b.id);
    const c = enqueue(q, "Edited");
    editItem(q, c.id, "Edited v2");
    const d = enqueue(q, "Removed");
    dequeue(q, d.id);

    expect(getActive(q).length).toBe(3);
  });

  test("getById finds item by id", () => {
    const q = createEmptyQueue();
    const item = enqueue(q, "Find me");
    expect(getById(q, item.id)?.content).toBe("Find me");
    expect(getById(q, "nonexistent")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

describe("cleanOld", () => {
  test("removes old sent/removed items", () => {
    const q = createEmptyQueue();
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 10);

    // Add old item manually
    q.items.push({
      id: "old-1",
      type: "chat",
      content: "old",
      status: "sent",
      createdAt: oldDate.toISOString(),
      source: "claude",
    });

    // Add recent item
    enqueue(q, "new");

    const removed = cleanOld(q, 7);
    expect(removed).toBe(1);
    expect(q.items.length).toBe(1);
  });

  test("keeps active items regardless of age", () => {
    const q = createEmptyQueue();
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 30);

    q.items.push({
      id: "old-active",
      type: "chat",
      content: "old but queued",
      status: "queued",
      createdAt: oldDate.toISOString(),
      source: "claude",
    });

    const removed = cleanOld(q, 7);
    expect(removed).toBe(0);
    expect(q.items.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe("formatters", () => {
  test("formatQueueSummary shows counts", () => {
    const q = createEmptyQueue();
    enqueue(q, "A");
    enqueue(q, "B");
    const c = enqueue(q, "C");
    markSeen(q, c.id);

    const output = formatQueueSummary(q);
    expect(output).toContain("3 active");
    expect(output).toContain("Queued: 2");
    expect(output).toContain("Seen: 1");
  });

  test("formatQueueSummary shows item previews", () => {
    const q = createEmptyQueue();
    enqueue(q, "Short message", "chat");
    const output = formatQueueSummary(q);
    expect(output).toContain("Short message");
    expect(output).toContain("chat");
  });

  test("formatQueueSummary truncates long content", () => {
    const q = createEmptyQueue();
    enqueue(q, "A".repeat(100), "chat");
    const output = formatQueueSummary(q);
    expect(output).toContain("...");
  });

  test("formatItem shows full item details", () => {
    const q = createEmptyQueue();
    const item = enqueue(q, "Full content here", "draft", "soltome");
    editItem(q, item.id, "Updated content");
    const output = formatItem(q.items[0]);
    expect(output).toContain("Updated content");
    expect(output).toContain("draft");
    expect(output).toContain("soltome");
    expect(output).toContain("edited");
    expect(output).toContain("1 revisions");
  });
});
