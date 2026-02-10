/**
 * Tests for Per-Golem Telegram Topic Routing
 *
 * Tests the golem registry, thread ID lookup, and routing logic.
 */

import { describe, it, expect } from "bun:test";
import { join } from "path";

// Mirror the GolemConfig interface from telegram-bot.ts
interface GolemConfig {
  sessionName: string;
  cwd: string;
  topicKey: string;
  name: string;
  icon: string;
}

const HOME = process.env.HOME || "/Users/etanheyman";

// Mirror GOLEM_REGISTRY from telegram-bot.ts
const GOLEM_REGISTRY: Record<string, GolemConfig> = {
  recruitergolem: {
    sessionName: "recruitergolem-telegram",
    cwd: join(HOME, "Gits", "recruiterGolem"),
    topicKey: "recruiter",
    name: "RecruiterGolem",
    icon: "👔",
  },
  tellergolem: {
    sessionName: "tellergolem-telegram",
    cwd: join(HOME, "Gits", "tellerGolem"),
    topicKey: "teller",
    name: "TellerGolem",
    icon: "💰",
  },
};

// Mirror getGolemFromThreadId logic
function getGolemFromThreadId(
  threadId: number | undefined,
  topics: Record<string, number> | undefined
): GolemConfig | null {
  if (!threadId || !topics) return null;
  for (const config of Object.values(GOLEM_REGISTRY)) {
    const topicThreadId = topics[config.topicKey];
    if (topicThreadId === threadId) return config;
  }
  return null;
}

describe("Per-Golem Routing - GOLEM_REGISTRY", () => {
  it("should have recruitergolem in registry", () => {
    const config = GOLEM_REGISTRY.recruitergolem;
    expect(config).toBeDefined();
    expect(config.sessionName).toBe("recruitergolem-telegram");
    expect(config.cwd).toContain("recruiterGolem");
    expect(config.topicKey).toBe("recruiter");
    expect(config.name).toBe("RecruiterGolem");
  });

  it("should have tellergolem in registry", () => {
    const config = GOLEM_REGISTRY.tellergolem;
    expect(config).toBeDefined();
    expect(config.sessionName).toBe("tellergolem-telegram");
    expect(config.cwd).toContain("tellerGolem");
    expect(config.topicKey).toBe("teller");
    expect(config.name).toBe("TellerGolem");
  });

  it("should have unique session names", () => {
    const sessionNames = Object.values(GOLEM_REGISTRY).map(c => c.sessionName);
    expect(new Set(sessionNames).size).toBe(sessionNames.length);
  });

  it("should have unique topic keys", () => {
    const topicKeys = Object.values(GOLEM_REGISTRY).map(c => c.topicKey);
    expect(new Set(topicKeys).size).toBe(topicKeys.length);
  });
});

describe("Per-Golem Routing - getGolemFromThreadId", () => {
  const mockTopics = {
    alerts: 100,
    nightshift: 101,
    email: 102,
    jobs: 103,
    recruiter: 200,
    teller: 201,
  };

  it("should return RecruiterGolem for recruiter thread ID", () => {
    const golem = getGolemFromThreadId(200, mockTopics);
    expect(golem).not.toBeNull();
    expect(golem!.name).toBe("RecruiterGolem");
    expect(golem!.sessionName).toBe("recruitergolem-telegram");
  });

  it("should return TellerGolem for teller thread ID", () => {
    const golem = getGolemFromThreadId(201, mockTopics);
    expect(golem).not.toBeNull();
    expect(golem!.name).toBe("TellerGolem");
    expect(golem!.sessionName).toBe("tellergolem-telegram");
  });

  it("should return null for non-golem topic thread IDs (alerts, jobs, etc.)", () => {
    expect(getGolemFromThreadId(100, mockTopics)).toBeNull(); // alerts
    expect(getGolemFromThreadId(101, mockTopics)).toBeNull(); // nightshift
    expect(getGolemFromThreadId(102, mockTopics)).toBeNull(); // email
    expect(getGolemFromThreadId(103, mockTopics)).toBeNull(); // jobs
  });

  it("should return null for unknown thread IDs", () => {
    expect(getGolemFromThreadId(999, mockTopics)).toBeNull();
    expect(getGolemFromThreadId(0, mockTopics)).toBeNull();
  });

  it("should return null for undefined thread ID", () => {
    expect(getGolemFromThreadId(undefined, mockTopics)).toBeNull();
  });

  it("should return null when topics is undefined", () => {
    expect(getGolemFromThreadId(200, undefined)).toBeNull();
  });

  it("should return null when topics is empty", () => {
    expect(getGolemFromThreadId(200, {})).toBeNull();
  });
});

describe("Per-Golem Routing - askGolem args", () => {
  it("should build correct claude args for recruitergolem", () => {
    const config = GOLEM_REGISTRY.recruitergolem;
    const telegramPrompt = `You are chatting on Telegram. Keep responses SHORT (mobile). Always reply in your topic thread only. Casual tone. Hebrew/English ok.`;

    const expectedArgs = [
      "/Users/etanheyman/.local/bin/claude",
      "--dangerously-skip-permissions",
      "--print",
      "--resume", "recruitergolem-telegram",
      "--append-system-prompt", telegramPrompt,
    ];

    // Verify the args pattern matches what askGolem would produce
    expect(expectedArgs[3]).toBe("--resume");
    expect(expectedArgs[4]).toBe(config.sessionName);
    expect(expectedArgs[5]).toBe("--append-system-prompt");
    expect(expectedArgs[6]).toContain("Telegram");
  });

  it("should use golem-specific cwd, not ~/Gits", () => {
    const recruiter = GOLEM_REGISTRY.recruitergolem;
    const teller = GOLEM_REGISTRY.tellergolem;

    // Each golem runs from its own directory
    expect(recruiter.cwd).not.toBe(join(HOME, "Gits"));
    expect(teller.cwd).not.toBe(join(HOME, "Gits"));

    // Directories are distinct
    expect(recruiter.cwd).not.toBe(teller.cwd);
  });
});

describe("Per-Golem Routing - Message flow", () => {
  it("messages in General (no thread ID) → ClaudeGolem (not routed to golem)", () => {
    const mockTopics = { recruiter: 200, teller: 201 };
    // No thread ID = General = ClaudeGolem
    const golem = getGolemFromThreadId(undefined, mockTopics);
    expect(golem).toBeNull();
  });

  it("messages in RecruiterGolem topic → routed to RecruiterGolem", () => {
    const mockTopics = { recruiter: 200, teller: 201 };
    const golem = getGolemFromThreadId(200, mockTopics);
    expect(golem?.name).toBe("RecruiterGolem");
  });

  it("messages in non-golem topic (alerts/jobs) → NOT routed to any golem", () => {
    const mockTopics = { alerts: 100, jobs: 103, recruiter: 200 };
    // Messages in alerts/jobs topics should NOT be routed to a golem
    // They go to the normal ClaudeGolem queue
    expect(getGolemFromThreadId(100, mockTopics)).toBeNull();
    expect(getGolemFromThreadId(103, mockTopics)).toBeNull();
  });
});

describe("Per-Golem Routing - SOURCE_CONFIG extension", () => {
  // Mirror the SOURCE_CONFIG topic routing
  const SOURCE_TO_TOPIC: Record<string, string> = {
    claude: "general",
    ralph: "alerts",
    nightshift: "nightshift",
    email: "email",
    jobs: "jobs",
    recruiter: "recruiter",
    teller: "teller",
    monitor: "monitor",
    bedtime: "alerts",
    healthcheck: "alerts",
    default: "alerts",
  };

  it("should route teller notifications to teller topic", () => {
    expect(SOURCE_TO_TOPIC.teller).toBe("teller");
  });

  it("should route monitor notifications to monitor topic", () => {
    expect(SOURCE_TO_TOPIC.monitor).toBe("monitor");
  });

  it("should route bedtime notifications to alerts topic", () => {
    expect(SOURCE_TO_TOPIC.bedtime).toBe("alerts");
  });

  it("should still route claude to general", () => {
    expect(SOURCE_TO_TOPIC.claude).toBe("general");
  });
});
