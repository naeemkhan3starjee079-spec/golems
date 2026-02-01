/**
 * Event Emitter Tests - TDD for MP-007
 * Tests for PTY event emission (ralph-ui/src/runner/pty/)
 *
 * Events are structured JSON objects for UI communication.
 * They enable decoupled PTY-to-UI updates with batching support.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { EventEmitter } from "events";

// ============================================================
// Types for PTY events
// ============================================================

type PTYEventType = "data" | "exit" | "error";

interface PTYEvent {
  type: PTYEventType;
  timestamp: string;  // ISO-8601
  data?: string;      // Output or error message
  ansi?: boolean;     // Whether data contains ANSI codes
  exitCode?: number;  // For exit events
}

interface DataEvent extends PTYEvent {
  type: "data";
  data: string;
  ansi: boolean;
}

interface ExitEvent extends PTYEvent {
  type: "exit";
  exitCode: number;
  data?: string;  // Final output if any
}

interface ErrorEvent extends PTYEvent {
  type: "error";
  data: string;  // Error message
}

// ============================================================
// Event Emitter Implementation (to be tested)
// ============================================================

// ANSI detection regex
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/;

function hasAnsiCodes(text: string): boolean {
  return ANSI_REGEX.test(text);
}

class PTYEventEmitter extends EventEmitter {
  emit(event: "pty-event", payload: PTYEvent): boolean;
  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  on(event: "pty-event", listener: (payload: PTYEvent) => void): this;
  on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  emitData(data: string): void {
    const event: DataEvent = {
      type: "data",
      timestamp: new Date().toISOString(),
      data,
      ansi: hasAnsiCodes(data),
    };
    this.emit("pty-event", event);
  }

  emitExit(exitCode: number, finalOutput?: string): void {
    const event: ExitEvent = {
      type: "exit",
      timestamp: new Date().toISOString(),
      exitCode,
      data: finalOutput,
    };
    this.emit("pty-event", event);
  }

  emitError(message: string): void {
    const event: ErrorEvent = {
      type: "error",
      timestamp: new Date().toISOString(),
      data: message,
    };
    this.emit("pty-event", event);
  }
}

// ============================================================
// TESTS: Event Format
// ============================================================

describe("PTY Event Format", () => {
  describe("Data Events", () => {
    it("should have correct format with type, timestamp, data", () => {
      const emitter = new PTYEventEmitter();
      const events: PTYEvent[] = [];

      emitter.on("pty-event", (event) => events.push(event));
      emitter.emitData("test output");

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("data");
      expect(events[0].timestamp).toBeDefined();
      expect(events[0].data).toBe("test output");
    });

    it("should have ISO-8601 timestamp format", () => {
      const emitter = new PTYEventEmitter();
      let event: PTYEvent | null = null;

      emitter.on("pty-event", (e) => {
        event = e;
      });
      emitter.emitData("test");

      expect(event).not.toBeNull();
      // ISO-8601 format: 2026-01-25T12:00:00.000Z
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
      expect(event!.timestamp).toMatch(isoRegex);
    });

    it("should include ansi flag when data contains ANSI codes", () => {
      const emitter = new PTYEventEmitter();
      const events: PTYEvent[] = [];

      emitter.on("pty-event", (event) => events.push(event));
      emitter.emitData("\x1b[32mgreen\x1b[0m");

      expect(events[0].ansi).toBe(true);
    });

    it("should set ansi flag to false for plain text", () => {
      const emitter = new PTYEventEmitter();
      const events: PTYEvent[] = [];

      emitter.on("pty-event", (event) => events.push(event));
      emitter.emitData("plain text");

      expect(events[0].ansi).toBe(false);
    });

    it("should preserve exact data content", () => {
      const emitter = new PTYEventEmitter();
      const events: PTYEvent[] = [];

      emitter.on("pty-event", (event) => events.push(event));

      const testData = "line1\nline2\ttabbed\r\nwindows-newline";
      emitter.emitData(testData);

      expect(events[0].data).toBe(testData);
    });
  });

  describe("Exit Events", () => {
    it("should include exitCode in exit events", () => {
      const emitter = new PTYEventEmitter();
      const events: PTYEvent[] = [];

      emitter.on("pty-event", (event) => events.push(event));
      emitter.emitExit(0);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("exit");
      expect(events[0].exitCode).toBe(0);
    });

    it("should handle non-zero exit codes", () => {
      const emitter = new PTYEventEmitter();
      const events: PTYEvent[] = [];

      emitter.on("pty-event", (event) => events.push(event));
      emitter.emitExit(127);

      expect(events[0].exitCode).toBe(127);
    });

    it("should include final output in exit event if provided", () => {
      const emitter = new PTYEventEmitter();
      const events: PTYEvent[] = [];

      emitter.on("pty-event", (event) => events.push(event));
      emitter.emitExit(0, "Process completed successfully");

      expect(events[0].type).toBe("exit");
      expect(events[0].exitCode).toBe(0);
      expect(events[0].data).toBe("Process completed successfully");
    });

    it("should handle exit without final output", () => {
      const emitter = new PTYEventEmitter();
      const events: PTYEvent[] = [];

      emitter.on("pty-event", (event) => events.push(event));
      emitter.emitExit(1);

      expect(events[0].data).toBeUndefined();
    });

    it("should have valid timestamp on exit events", () => {
      const emitter = new PTYEventEmitter();
      let event: PTYEvent | null = null;

      emitter.on("pty-event", (e) => {
        event = e;
      });
      emitter.emitExit(0);

      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
      expect(event!.timestamp).toMatch(isoRegex);
    });
  });

  describe("Error Events", () => {
    it("should emit error events with message", () => {
      const emitter = new PTYEventEmitter();
      const events: PTYEvent[] = [];

      emitter.on("pty-event", (event) => events.push(event));
      emitter.emitError("ENOENT: command not found");

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("error");
      expect(events[0].data).toBe("ENOENT: command not found");
    });

    it("should have valid timestamp on error events", () => {
      const emitter = new PTYEventEmitter();
      let event: PTYEvent | null = null;

      emitter.on("pty-event", (e) => {
        event = e;
      });
      emitter.emitError("test error");

      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;
      expect(event!.timestamp).toMatch(isoRegex);
    });

    it("should preserve error message exactly", () => {
      const emitter = new PTYEventEmitter();
      const events: PTYEvent[] = [];

      emitter.on("pty-event", (event) => events.push(event));

      const errorMsg = "Error: Permission denied\n  at spawn (/path/to/file.ts:10:5)";
      emitter.emitError(errorMsg);

      expect(events[0].data).toBe(errorMsg);
    });
  });
});

// ============================================================
// TESTS: ANSI Detection
// ============================================================

describe("ANSI Detection", () => {
  it("should detect basic color codes", () => {
    expect(hasAnsiCodes("\x1b[31mred\x1b[0m")).toBe(true);
    expect(hasAnsiCodes("\x1b[32mgreen\x1b[0m")).toBe(true);
    expect(hasAnsiCodes("\x1b[34mblue\x1b[0m")).toBe(true);
  });

  it("should detect style codes", () => {
    expect(hasAnsiCodes("\x1b[1mbold\x1b[0m")).toBe(true);
    expect(hasAnsiCodes("\x1b[4munderline\x1b[0m")).toBe(true);
    expect(hasAnsiCodes("\x1b[7mreverse\x1b[0m")).toBe(true);
  });

  it("should detect cursor movement codes", () => {
    expect(hasAnsiCodes("\x1b[2J")).toBe(true);  // Clear screen
    expect(hasAnsiCodes("\x1b[K")).toBe(true);   // Clear line
    expect(hasAnsiCodes("\x1b[10;20H")).toBe(true);  // Position
  });

  it("should return false for plain text", () => {
    expect(hasAnsiCodes("plain text")).toBe(false);
    expect(hasAnsiCodes("no escape sequences here")).toBe(false);
    expect(hasAnsiCodes("12345")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(hasAnsiCodes("")).toBe(false);
  });

  it("should handle mixed content", () => {
    expect(hasAnsiCodes("prefix \x1b[32mcolored\x1b[0m suffix")).toBe(true);
  });
});

// ============================================================
// TESTS: Event Ordering and Multiple Events
// ============================================================

describe("Event Ordering", () => {
  it("should emit events in order", () => {
    const emitter = new PTYEventEmitter();
    const events: PTYEvent[] = [];

    emitter.on("pty-event", (event) => events.push(event));

    emitter.emitData("first");
    emitter.emitData("second");
    emitter.emitData("third");

    expect(events).toHaveLength(3);
    expect(events[0].data).toBe("first");
    expect(events[1].data).toBe("second");
    expect(events[2].data).toBe("third");
  });

  it("should handle interleaved event types", () => {
    const emitter = new PTYEventEmitter();
    const events: PTYEvent[] = [];

    emitter.on("pty-event", (event) => events.push(event));

    emitter.emitData("output 1");
    emitter.emitError("warning message");
    emitter.emitData("output 2");
    emitter.emitExit(0);

    expect(events).toHaveLength(4);
    expect(events[0].type).toBe("data");
    expect(events[1].type).toBe("error");
    expect(events[2].type).toBe("data");
    expect(events[3].type).toBe("exit");
  });

  it("should have monotonically increasing timestamps", async () => {
    const emitter = new PTYEventEmitter();
    const events: PTYEvent[] = [];

    emitter.on("pty-event", (event) => events.push(event));

    emitter.emitData("first");
    // Small delay to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 5));
    emitter.emitData("second");

    expect(events).toHaveLength(2);
    const ts1 = new Date(events[0].timestamp).getTime();
    const ts2 = new Date(events[1].timestamp).getTime();
    expect(ts2).toBeGreaterThanOrEqual(ts1);
  });
});

// ============================================================
// TESTS: Multiple Listeners
// ============================================================

describe("Multiple Listeners", () => {
  it("should notify all registered listeners", () => {
    const emitter = new PTYEventEmitter();
    const listener1Events: PTYEvent[] = [];
    const listener2Events: PTYEvent[] = [];

    emitter.on("pty-event", (event) => listener1Events.push(event));
    emitter.on("pty-event", (event) => listener2Events.push(event));

    emitter.emitData("test");

    expect(listener1Events).toHaveLength(1);
    expect(listener2Events).toHaveLength(1);
    expect(listener1Events[0].data).toBe("test");
    expect(listener2Events[0].data).toBe("test");
  });

  it("should allow listener removal", () => {
    const emitter = new PTYEventEmitter();
    const events: PTYEvent[] = [];

    const listener = (event: PTYEvent) => events.push(event);
    emitter.on("pty-event", listener);

    emitter.emitData("before");
    emitter.removeListener("pty-event", listener);
    emitter.emitData("after");

    expect(events).toHaveLength(1);
    expect(events[0].data).toBe("before");
  });
});

// ============================================================
// TESTS: JSON Serialization
// ============================================================

describe("JSON Serialization", () => {
  it("should produce valid JSON for data events", () => {
    const emitter = new PTYEventEmitter();
    let event: PTYEvent | null = null;

    emitter.on("pty-event", (e) => {
      event = e;
    });
    emitter.emitData("test output");

    const json = JSON.stringify(event);
    const parsed = JSON.parse(json);

    expect(parsed.type).toBe("data");
    expect(parsed.data).toBe("test output");
    expect(parsed.timestamp).toBeDefined();
  });

  it("should produce valid JSON for exit events", () => {
    const emitter = new PTYEventEmitter();
    let event: PTYEvent | null = null;

    emitter.on("pty-event", (e) => {
      event = e;
    });
    emitter.emitExit(42, "final output");

    const json = JSON.stringify(event);
    const parsed = JSON.parse(json);

    expect(parsed.type).toBe("exit");
    expect(parsed.exitCode).toBe(42);
    expect(parsed.data).toBe("final output");
  });

  it("should handle special characters in JSON", () => {
    const emitter = new PTYEventEmitter();
    let event: PTYEvent | null = null;

    emitter.on("pty-event", (e) => {
      event = e;
    });

    const specialChars = 'quote: " backslash: \\ newline: \n tab: \t';
    emitter.emitData(specialChars);

    const json = JSON.stringify(event);
    const parsed = JSON.parse(json);

    expect(parsed.data).toBe(specialChars);
  });
});
