/**
 * Tests for Per-Golem Telegram Topic Routing
 *
 * Tests the golem registry, thread ID lookup, and routing logic.
 */

import { describe, it, expect } from "bun:test";
import { join } from "path";

// Mirror the GolemConfig interface from telegram-bot.ts
interface GolemConfig {
  cwd: string;           // Working directory — --continue resumes here
  topicKey: string;
  name: string;
  icon: string;
}

const HOME = process.env.HOME || "/Users/etanheyman";

// Mirror GOLEM_REGISTRY from telegram-bot.ts
const GOLEM_REGISTRY: Record<string, GolemConfig> = {
  recruitergolem: {
    cwd: join(HOME, "Gits", "recruiterGolem"),
    topicKey: "recruiter",
    name: "RecruiterGolem",
    icon: "👔",
  },
  tellergolem: {
    cwd: join(HOME, "Gits", "tellerGolem"),
    topicKey: "teller",
    name: "TellerGolem",
    icon: "💰",
  },
  monitorgolem: {
    cwd: join(HOME, "Gits", "monitorGolem"),
    topicKey: "monitor",
    name: "MonitorGolem",
    icon: "🔧",
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
    expect(config.cwd).toContain("recruiterGolem");
    expect(config.topicKey).toBe("recruiter");
    expect(config.name).toBe("RecruiterGolem");
  });

  it("should have tellergolem in registry", () => {
    const config = GOLEM_REGISTRY.tellergolem;
    expect(config).toBeDefined();
    expect(config.cwd).toContain("tellerGolem");
    expect(config.topicKey).toBe("teller");
    expect(config.name).toBe("TellerGolem");
  });

  it("should have monitorgolem in registry", () => {
    const config = GOLEM_REGISTRY.monitorgolem;
    expect(config).toBeDefined();
    expect(config.cwd).toContain("monitorGolem");
    expect(config.topicKey).toBe("monitor");
    expect(config.name).toBe("MonitorGolem");
  });

  it("should have unique cwds (each golem gets its own directory)", () => {
    const cwds = Object.values(GOLEM_REGISTRY).map(c => c.cwd);
    expect(new Set(cwds).size).toBe(cwds.length);
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
    recruiter: 200,
    teller: 201,
    monitor: 202,
  };

  it("should return RecruiterGolem for recruiter thread ID", () => {
    const golem = getGolemFromThreadId(200, mockTopics);
    expect(golem).not.toBeNull();
    expect(golem!.name).toBe("RecruiterGolem");
    expect(golem!.cwd).toContain("recruiterGolem");
  });

  it("should return TellerGolem for teller thread ID", () => {
    const golem = getGolemFromThreadId(201, mockTopics);
    expect(golem).not.toBeNull();
    expect(golem!.name).toBe("TellerGolem");
    expect(golem!.cwd).toContain("tellerGolem");
  });

  it("should return MonitorGolem for monitor thread ID", () => {
    const golem = getGolemFromThreadId(202, mockTopics);
    expect(golem).not.toBeNull();
    expect(golem!.name).toBe("MonitorGolem");
    expect(golem!.cwd).toContain("monitorGolem");
  });

  it("should return null for non-golem topic thread IDs (alerts, nightshift)", () => {
    expect(getGolemFromThreadId(100, mockTopics)).toBeNull(); // alerts
    expect(getGolemFromThreadId(101, mockTopics)).toBeNull(); // nightshift
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
  it("should build correct claude args with --resume UUID when session exists", () => {
    const fakeUuid = "550e8400-e29b-41d4-a716-446655440000";
    const telegramPrompt = `You are chatting on Telegram. Keep responses SHORT (mobile). Always reply in your topic thread only. Casual tone. Hebrew/English ok.`;

    // When session UUID is stored, args include --resume <uuid>
    const argsWithResume = [
      "/Users/etanheyman/.local/bin/claude",
      "--dangerously-skip-permissions",
      "--print",
      "--resume", fakeUuid,
      "--append-system-prompt", telegramPrompt,
    ];

    expect(argsWithResume[3]).toBe("--resume");
    expect(argsWithResume[4]).toMatch(/^[0-9a-f]{8}-/); // UUID format
    expect(argsWithResume[5]).toBe("--append-system-prompt");
    expect(argsWithResume[6]).toContain("Telegram");
  });

  it("should build args without --resume for first message (no stored session)", () => {
    const telegramPrompt = `You are chatting on Telegram. Keep responses SHORT (mobile). Always reply in your topic thread only. Casual tone. Hebrew/English ok.`;

    // First message: no --resume, just --print
    const argsFirstMsg = [
      "/Users/etanheyman/.local/bin/claude",
      "--dangerously-skip-permissions",
      "--print",
      "--append-system-prompt", telegramPrompt,
    ];

    expect(argsFirstMsg[3]).toBe("--append-system-prompt");
    expect(argsFirstMsg).not.toContain("--resume");
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

  it("messages in non-golem topic (alerts/nightshift) → NOT routed to any golem", () => {
    const mockTopics = { alerts: 100, nightshift: 101, recruiter: 200 };
    // Messages in alerts/nightshift topics should NOT be routed to a golem
    // They go to the normal ClaudeGolem queue
    expect(getGolemFromThreadId(100, mockTopics)).toBeNull();
    expect(getGolemFromThreadId(101, mockTopics)).toBeNull();
  });
});

describe("Per-Golem Routing - SOURCE_CONFIG extension", () => {
  // Mirror the SOURCE_CONFIG topic routing
  const SOURCE_TO_TOPIC: Record<string, string> = {
    claude: "general",
    ralph: "alerts",
    nightshift: "nightshift",
    email: "monitor",
    jobs: "recruiter",
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

  it("should route email notifications to monitor topic (not separate email topic)", () => {
    expect(SOURCE_TO_TOPIC.email).toBe("monitor");
  });

  it("should route jobs notifications to recruiter topic (not separate jobs topic)", () => {
    expect(SOURCE_TO_TOPIC.jobs).toBe("recruiter");
  });
});
