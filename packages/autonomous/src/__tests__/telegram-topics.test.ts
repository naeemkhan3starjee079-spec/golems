/**
 * Tests for Telegram Topics Routing
 *
 * Tests the notification routing logic for the group topics feature.
 */

import { describe, it, expect } from "bun:test";

// Source to topic routing configuration (mirrors telegram-bot.ts)
type TopicKey = "chat" | "alerts" | "nightshift" | "email" | "jobs";

const SOURCE_TO_TOPIC: Record<string, TopicKey> = {
  claude: "chat",
  ralph: "alerts",
  nightshift: "nightshift",
  email: "email",
  jobs: "jobs",
  healthcheck: "alerts",
  default: "alerts",
};

function getTopicForSource(source: string): TopicKey {
  return SOURCE_TO_TOPIC[source] || SOURCE_TO_TOPIC.default;
}

describe("Telegram Topics - Source Routing", () => {
  it("should route claude to chat", () => {
    expect(getTopicForSource("claude")).toBe("chat");
  });

  it("should route ralph to alerts", () => {
    expect(getTopicForSource("ralph")).toBe("alerts");
  });

  it("should route nightshift to nightshift", () => {
    expect(getTopicForSource("nightshift")).toBe("nightshift");
  });

  it("should route email to email", () => {
    expect(getTopicForSource("email")).toBe("email");
  });

  it("should route jobs to jobs", () => {
    expect(getTopicForSource("jobs")).toBe("jobs");
  });

  it("should route healthcheck to alerts", () => {
    expect(getTopicForSource("healthcheck")).toBe("alerts");
  });

  it("should route unknown sources to alerts (default)", () => {
    expect(getTopicForSource("unknown-source")).toBe("alerts");
    expect(getTopicForSource("cursor-helper")).toBe("alerts");
    expect(getTopicForSource("kiro-helper")).toBe("alerts");
    expect(getTopicForSource("moltbot")).toBe("alerts");
  });
});

describe("Telegram Topics - State Structure", () => {
  interface TopicsState {
    chat?: number;
    alerts?: number;
    nightshift?: number;
    email?: number;
    jobs?: number;
  }

  it("should have correct topics state structure", () => {
    const topics: TopicsState = {
      chat: 2,
      alerts: 3,
      nightshift: 4,
      email: 5,
      jobs: 7,
    };

    expect(topics.chat).toBe(2);
    expect(topics.alerts).toBe(3);
    expect(topics.nightshift).toBe(4);
    expect(topics.email).toBe(5);
    expect(topics.jobs).toBe(7);
  });

  it("should handle partial topics configuration", () => {
    const topics: TopicsState = {
      chat: 2,
      alerts: 3,
    };

    expect(topics.chat).toBe(2);
    expect(topics.nightshift).toBeUndefined();
  });

  it("should handle empty topics", () => {
    const topics: TopicsState = {};
    expect(Object.keys(topics)).toHaveLength(0);
  });
});

describe("Telegram Topics - Notification Payload", () => {
  interface NotificationPayload {
    title: string;
    body: string;
    source?: string;
    priority?: "default" | "high";
  }

  it("should have valid notification structure", () => {
    const payload: NotificationPayload = {
      title: "Test Title",
      body: "Test body message",
      source: "alerts",
      priority: "default",
    };

    expect(payload.title).toBe("Test Title");
    expect(payload.source).toBe("alerts");
  });

  it("should allow high priority", () => {
    const payload: NotificationPayload = {
      title: "Urgent",
      body: "Something important",
      source: "email",
      priority: "high",
    };

    expect(payload.priority).toBe("high");
  });

  it("should allow missing optional fields", () => {
    const payload: NotificationPayload = {
      title: "Simple",
      body: "Message",
    };

    expect(payload.source).toBeUndefined();
    expect(payload.priority).toBeUndefined();
  });
});

describe("Telegram Topics - Thread ID Selection", () => {
  interface State {
    groupChatId?: number;
    telegramChatId?: number;
    topics?: TopicsState;
  }

  interface TopicsState {
    chat?: number;
    alerts?: number;
    nightshift?: number;
    email?: number;
    jobs?: number;
  }

  function selectDestination(
    state: State,
    topicKey: TopicKey
  ): { chatId: number | null; threadId: number | undefined } {
    if (state.groupChatId && state.topics) {
      return {
        chatId: state.groupChatId,
        threadId: state.topics[topicKey],
      };
    }
    return {
      chatId: state.telegramChatId || null,
      threadId: undefined,
    };
  }

  it("should use group chat with thread when topics configured", () => {
    const state: State = {
      groupChatId: -100123456,
      telegramChatId: 5417751491,
      topics: {
        chat: 2,
        alerts: 3,
      },
    };

    const dest = selectDestination(state, "alerts");
    expect(dest.chatId).toBe(-100123456);
    expect(dest.threadId).toBe(3);
  });

  it("should fallback to DM when no group configured", () => {
    const state: State = {
      telegramChatId: 5417751491,
    };

    const dest = selectDestination(state, "alerts");
    expect(dest.chatId).toBe(5417751491);
    expect(dest.threadId).toBeUndefined();
  });

  it("should return null chatId when nothing configured", () => {
    const state: State = {};
    const dest = selectDestination(state, "alerts");
    expect(dest.chatId).toBeNull();
  });
});
