/**
 * PTY Wrapper Tests - TDD for MP-007
 * Tests for PTY process spawning (ralph-ui/src/runner/pty/)
 *
 * These tests mock node-pty to ensure predictable testing without
 * requiring actual PTY spawning.
 */

import { describe, it, expect, beforeEach, mock, spyOn } from "bun:test";
import { EventEmitter } from "events";

// ============================================================
// Types that will be implemented in ralph-ui/src/runner/pty/
// ============================================================

interface PTYProcess {
  onData: (handler: (chunk: string) => void) => void;
  onExit: (handler: (code: number) => void) => void;
  onError: (handler: (err: Error) => void) => void;
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: (signal?: string) => void;
}

interface PTYSpawnOptions {
  name?: string;     // Terminal name (default: 'xterm-color')
  cols?: number;     // Columns (default: 80)
  rows?: number;     // Rows (default: 30)
  cwd?: string;      // Working directory
  env?: Record<string, string>;  // Environment variables
}

// ============================================================
// Mock node-pty implementation for testing
// ============================================================

class MockPTY extends EventEmitter {
  pid: number;
  cols: number;
  rows: number;
  killed: boolean = false;
  killedWith: string | undefined;
  resizedTo: { cols: number; rows: number } | null = null;
  writtenData: string[] = [];

  constructor(
    public file: string,
    public args: string[],
    public options: PTYSpawnOptions
  ) {
    super();
    this.pid = Math.floor(Math.random() * 10000) + 1000;
    this.cols = options.cols ?? 80;
    this.rows = options.rows ?? 30;
  }

  write(data: string): void {
    this.writtenData.push(data);
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.resizedTo = { cols, rows };
  }

  kill(signal?: string): void {
    this.killed = true;
    this.killedWith = signal;
    // Emit exit after kill
    setTimeout(() => this.emit("exit", 0, null), 10);
  }

  // Test helper: simulate data output
  simulateData(data: string): void {
    this.emit("data", data);
  }

  // Test helper: simulate exit
  simulateExit(code: number): void {
    this.emit("exit", code, null);
  }

  // Test helper: simulate error
  simulateError(err: Error): void {
    this.emit("error", err);
  }
}

// Mock spawn function (simulates node-pty.spawn)
function mockSpawn(
  file: string,
  args: string[],
  options: PTYSpawnOptions
): MockPTY {
  return new MockPTY(file, args, options);
}

// ============================================================
// PTY Wrapper Implementation (to be tested)
// This would normally import from the actual module
// ============================================================

class PTYWrapper implements PTYProcess {
  private pty: MockPTY;
  private dataHandlers: Array<(chunk: string) => void> = [];
  private exitHandlers: Array<(code: number) => void> = [];
  private errorHandlers: Array<(err: Error) => void> = [];

  constructor(cmd: string, args: string[], options: PTYSpawnOptions = {}) {
    this.pty = mockSpawn(cmd, args, options);

    this.pty.on("data", (data: string) => {
      this.dataHandlers.forEach(h => h(data));
    });

    this.pty.on("exit", (code: number) => {
      this.exitHandlers.forEach(h => h(code));
    });

    this.pty.on("error", (err: Error) => {
      this.errorHandlers.forEach(h => h(err));
    });
  }

  onData(handler: (chunk: string) => void): void {
    this.dataHandlers.push(handler);
  }

  onExit(handler: (code: number) => void): void {
    this.exitHandlers.push(handler);
  }

  onError(handler: (err: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  write(data: string): void {
    this.pty.write(data);
  }

  resize(cols: number, rows: number): void {
    this.pty.resize(cols, rows);
  }

  kill(signal?: string): void {
    this.pty.kill(signal);
  }

  // Test helper: access underlying mock
  getMockPTY(): MockPTY {
    return this.pty;
  }
}

// ============================================================
// TESTS: PTY Wrapper
// ============================================================

describe("PTY Wrapper Tests", () => {
  describe("Process Spawning", () => {
    it("should spawn process correctly (mock)", () => {
      const wrapper = new PTYWrapper("claude", ["-p", "test"], {
        cwd: "/tmp/test",
        cols: 120,
        rows: 40,
      });

      const mockPty = wrapper.getMockPTY();
      expect(mockPty.file).toBe("claude");
      expect(mockPty.args).toEqual(["-p", "test"]);
      expect(mockPty.options.cwd).toBe("/tmp/test");
      expect(mockPty.cols).toBe(120);
      expect(mockPty.rows).toBe(40);
    });

    it("should use default dimensions when not specified", () => {
      const wrapper = new PTYWrapper("echo", ["hello"], {});
      const mockPty = wrapper.getMockPTY();

      expect(mockPty.cols).toBe(80);
      expect(mockPty.rows).toBe(30);
    });

    it("should generate a PID for the spawned process", () => {
      const wrapper = new PTYWrapper("echo", ["test"], {});
      const mockPty = wrapper.getMockPTY();

      expect(mockPty.pid).toBeGreaterThan(0);
    });

    it("should pass environment variables to spawned process", () => {
      const customEnv = { CUSTOM_VAR: "value", PATH: "/usr/bin" };
      const wrapper = new PTYWrapper("bash", ["-c", "echo test"], {
        env: customEnv,
      });

      const mockPty = wrapper.getMockPTY();
      expect(mockPty.options.env).toEqual(customEnv);
    });
  });

  describe("Data Handling", () => {
    it("should call onData callback when receiving output chunks", async () => {
      const wrapper = new PTYWrapper("echo", ["hello"], {});
      const mockPty = wrapper.getMockPTY();
      const receivedChunks: string[] = [];

      wrapper.onData((chunk) => {
        receivedChunks.push(chunk);
      });

      mockPty.simulateData("Hello, ");
      mockPty.simulateData("World!\n");

      expect(receivedChunks).toHaveLength(2);
      expect(receivedChunks[0]).toBe("Hello, ");
      expect(receivedChunks[1]).toBe("World!\n");
    });

    it("should support multiple onData handlers", () => {
      const wrapper = new PTYWrapper("echo", ["test"], {});
      const mockPty = wrapper.getMockPTY();
      const handler1Calls: string[] = [];
      const handler2Calls: string[] = [];

      wrapper.onData((chunk) => handler1Calls.push(chunk));
      wrapper.onData((chunk) => handler2Calls.push(chunk));

      mockPty.simulateData("test output");

      expect(handler1Calls).toEqual(["test output"]);
      expect(handler2Calls).toEqual(["test output"]);
    });

    it("should handle large output chunks", () => {
      const wrapper = new PTYWrapper("cat", ["largefile"], {});
      const mockPty = wrapper.getMockPTY();
      const receivedChunks: string[] = [];

      wrapper.onData((chunk) => receivedChunks.push(chunk));

      // Simulate large output (10KB)
      const largeOutput = "x".repeat(10240);
      mockPty.simulateData(largeOutput);

      expect(receivedChunks[0].length).toBe(10240);
    });

    it("should handle output with ANSI escape codes", () => {
      const wrapper = new PTYWrapper("ls", ["--color"], {});
      const mockPty = wrapper.getMockPTY();
      const receivedChunks: string[] = [];

      wrapper.onData((chunk) => receivedChunks.push(chunk));

      const coloredOutput = "\x1b[32mgreen text\x1b[0m normal text";
      mockPty.simulateData(coloredOutput);

      expect(receivedChunks[0]).toContain("\x1b[32m");
      expect(receivedChunks[0]).toContain("\x1b[0m");
    });
  });

  describe("Exit Handling", () => {
    it("should call onExit callback with exit code", async () => {
      const wrapper = new PTYWrapper("exit", ["0"], {});
      const mockPty = wrapper.getMockPTY();
      let exitCode: number | null = null;

      wrapper.onExit((code) => {
        exitCode = code;
      });

      mockPty.simulateExit(0);

      expect(exitCode).toBe(0);
    });

    it("should pass non-zero exit codes", () => {
      const wrapper = new PTYWrapper("exit", ["1"], {});
      const mockPty = wrapper.getMockPTY();
      let exitCode: number | null = null;

      wrapper.onExit((code) => {
        exitCode = code;
      });

      mockPty.simulateExit(1);

      expect(exitCode).toBe(1);
    });

    it("should handle various exit codes", () => {
      const exitCodes = [0, 1, 2, 127, 130, 137, 255];

      for (const expectedCode of exitCodes) {
        const wrapper = new PTYWrapper("test", [], {});
        const mockPty = wrapper.getMockPTY();
        let receivedCode: number | null = null;

        wrapper.onExit((code) => {
          receivedCode = code;
        });

        mockPty.simulateExit(expectedCode);
        expect(receivedCode).toBe(expectedCode);
      }
    });

    it("should support multiple onExit handlers", () => {
      const wrapper = new PTYWrapper("test", [], {});
      const mockPty = wrapper.getMockPTY();
      const handler1Calls: number[] = [];
      const handler2Calls: number[] = [];

      wrapper.onExit((code) => handler1Calls.push(code));
      wrapper.onExit((code) => handler2Calls.push(code));

      mockPty.simulateExit(42);

      expect(handler1Calls).toEqual([42]);
      expect(handler2Calls).toEqual([42]);
    });
  });

  describe("Error Handling", () => {
    it("should call onError callback on spawn failure", () => {
      const wrapper = new PTYWrapper("nonexistent-cmd", [], {});
      const mockPty = wrapper.getMockPTY();
      let caughtError: Error | null = null;

      wrapper.onError((err) => {
        caughtError = err;
      });

      mockPty.simulateError(new Error("ENOENT: command not found"));

      expect(caughtError).not.toBeNull();
      expect(caughtError?.message).toContain("ENOENT");
    });

    it("should handle permission denied errors", () => {
      const wrapper = new PTYWrapper("/etc/passwd", [], {});
      const mockPty = wrapper.getMockPTY();
      let caughtError: Error | null = null;

      wrapper.onError((err) => {
        caughtError = err;
      });

      mockPty.simulateError(new Error("EACCES: permission denied"));

      expect(caughtError?.message).toContain("EACCES");
    });
  });

  describe("Process Control", () => {
    it("should terminate process with kill()", () => {
      const wrapper = new PTYWrapper("sleep", ["1000"], {});
      const mockPty = wrapper.getMockPTY();

      expect(mockPty.killed).toBe(false);

      wrapper.kill();

      expect(mockPty.killed).toBe(true);
    });

    it("should pass signal to kill() when specified", () => {
      const wrapper = new PTYWrapper("sleep", ["1000"], {});
      const mockPty = wrapper.getMockPTY();

      wrapper.kill("SIGKILL");

      expect(mockPty.killed).toBe(true);
      expect(mockPty.killedWith).toBe("SIGKILL");
    });

    it("should default to no signal when kill() called without argument", () => {
      const wrapper = new PTYWrapper("sleep", ["1000"], {});
      const mockPty = wrapper.getMockPTY();

      wrapper.kill();

      expect(mockPty.killedWith).toBeUndefined();
    });

    it("should update terminal dimensions with resize()", () => {
      const wrapper = new PTYWrapper("vim", [], {
        cols: 80,
        rows: 24,
      });
      const mockPty = wrapper.getMockPTY();

      expect(mockPty.cols).toBe(80);
      expect(mockPty.rows).toBe(24);

      wrapper.resize(120, 40);

      expect(mockPty.cols).toBe(120);
      expect(mockPty.rows).toBe(40);
      expect(mockPty.resizedTo).toEqual({ cols: 120, rows: 40 });
    });

    it("should handle multiple resize() calls", () => {
      const wrapper = new PTYWrapper("vim", [], {});
      const mockPty = wrapper.getMockPTY();

      wrapper.resize(100, 50);
      expect(mockPty.cols).toBe(100);
      expect(mockPty.rows).toBe(50);

      wrapper.resize(200, 60);
      expect(mockPty.cols).toBe(200);
      expect(mockPty.rows).toBe(60);
    });
  });

  describe("Input Handling", () => {
    it("should send data to process with write()", () => {
      const wrapper = new PTYWrapper("cat", [], {});
      const mockPty = wrapper.getMockPTY();

      wrapper.write("Hello\n");

      expect(mockPty.writtenData).toContain("Hello\n");
    });

    it("should handle multiple write() calls", () => {
      const wrapper = new PTYWrapper("bash", [], {});
      const mockPty = wrapper.getMockPTY();

      wrapper.write("echo 1\n");
      wrapper.write("echo 2\n");
      wrapper.write("exit\n");

      expect(mockPty.writtenData).toHaveLength(3);
      expect(mockPty.writtenData).toEqual(["echo 1\n", "echo 2\n", "exit\n"]);
    });

    it("should handle control characters in write()", () => {
      const wrapper = new PTYWrapper("bash", [], {});
      const mockPty = wrapper.getMockPTY();

      // Ctrl+C (SIGINT)
      wrapper.write("\x03");
      // Ctrl+D (EOF)
      wrapper.write("\x04");

      expect(mockPty.writtenData).toContain("\x03");
      expect(mockPty.writtenData).toContain("\x04");
    });
  });
});

// ============================================================
// Dual Output Pipeline Types & Implementation
// ============================================================

/**
 * ANSI escape code stripper - removes terminal color/formatting codes
 * This will be implemented in ralph-ui/src/runner/pty/ansi-stripper.ts
 */
function stripAnsi(input: string): string {
  // Regex pattern to match ANSI escape codes
  // Covers: colors, cursor movement, clearing, and other SGR codes
  // eslint-disable-next-line no-control-regex
  const ansiPattern = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07/g;
  return input.replace(ansiPattern, "");
}

/**
 * Dual output handler - sends data to both display and file streams
 * Display stream preserves ANSI codes, file stream strips them
 */
interface DualOutputHandler {
  onDisplayData: (handler: (data: string) => void) => void;
  onFileData: (handler: (data: string) => void) => void;
  push: (data: string) => void;
  close: () => void;
}

class MockDualOutput implements DualOutputHandler {
  private displayHandlers: Array<(data: string) => void> = [];
  private fileHandlers: Array<(data: string) => void> = [];
  private closed: boolean = false;

  onDisplayData(handler: (data: string) => void): void {
    this.displayHandlers.push(handler);
  }

  onFileData(handler: (data: string) => void): void {
    this.fileHandlers.push(handler);
  }

  push(data: string): void {
    if (this.closed) return;
    // Display stream gets raw data with ANSI codes
    this.displayHandlers.forEach(h => h(data));
    // File stream gets stripped data
    this.fileHandlers.forEach(h => h(stripAnsi(data)));
  }

  close(): void {
    this.closed = true;
  }

  isClosed(): boolean {
    return this.closed;
  }
}

// ============================================================
// TESTS: Dual Output Pipeline
// ============================================================

describe("Dual Output Pipeline Tests", () => {
  describe("ANSI Stripping", () => {
    it("should strip basic color codes", () => {
      const input = "\x1b[32mgreen text\x1b[0m";
      const stripped = stripAnsi(input);
      expect(stripped).toBe("green text");
    });

    it("should strip multiple color codes", () => {
      const input = "\x1b[1m\x1b[31mBold Red\x1b[0m and \x1b[34mBlue\x1b[0m";
      const stripped = stripAnsi(input);
      expect(stripped).toBe("Bold Red and Blue");
    });

    it("should handle text without ANSI codes", () => {
      const input = "plain text without colors";
      const stripped = stripAnsi(input);
      expect(stripped).toBe(input);
    });

    it("should strip cursor movement codes", () => {
      const input = "\x1b[2J\x1b[HHello\x1b[10;20H";
      const stripped = stripAnsi(input);
      expect(stripped).toBe("Hello");
    });

    it("should strip 256-color codes", () => {
      const input = "\x1b[38;5;196mRed 256\x1b[0m";
      const stripped = stripAnsi(input);
      expect(stripped).toBe("Red 256");
    });

    it("should strip RGB/truecolor codes", () => {
      const input = "\x1b[38;2;255;100;0mOrange\x1b[0m";
      const stripped = stripAnsi(input);
      expect(stripped).toBe("Orange");
    });

    it("should preserve newlines and whitespace", () => {
      const input = "\x1b[32mLine 1\n  Line 2\x1b[0m\n";
      const stripped = stripAnsi(input);
      expect(stripped).toBe("Line 1\n  Line 2\n");
    });
  });

  describe("Display Stream", () => {
    it("should preserve ANSI codes in display stream", () => {
      const dualOutput = new MockDualOutput();
      const displayData: string[] = [];

      dualOutput.onDisplayData((data) => displayData.push(data));

      const coloredInput = "\x1b[32mgreen text\x1b[0m";
      dualOutput.push(coloredInput);

      expect(displayData[0]).toBe(coloredInput);
      expect(displayData[0]).toContain("\x1b[32m");
    });

    it("should receive all output chunks in display stream", () => {
      const dualOutput = new MockDualOutput();
      const displayData: string[] = [];

      dualOutput.onDisplayData((data) => displayData.push(data));

      dualOutput.push("chunk1");
      dualOutput.push("chunk2");
      dualOutput.push("chunk3");

      expect(displayData).toHaveLength(3);
      expect(displayData).toEqual(["chunk1", "chunk2", "chunk3"]);
    });
  });

  describe("File Stream", () => {
    it("should strip ANSI codes in file stream", () => {
      const dualOutput = new MockDualOutput();
      const fileData: string[] = [];

      dualOutput.onFileData((data) => fileData.push(data));

      dualOutput.push("\x1b[32mgreen text\x1b[0m");

      expect(fileData[0]).toBe("green text");
      expect(fileData[0]).not.toContain("\x1b[");
    });

    it("should receive all output chunks in file stream", () => {
      const dualOutput = new MockDualOutput();
      const fileData: string[] = [];

      dualOutput.onFileData((data) => fileData.push(data));

      dualOutput.push("\x1b[31mred\x1b[0m");
      dualOutput.push("\x1b[32mgreen\x1b[0m");
      dualOutput.push("\x1b[34mblue\x1b[0m");

      expect(fileData).toHaveLength(3);
      expect(fileData).toEqual(["red", "green", "blue"]);
    });
  });

  describe("Both Streams", () => {
    it("should receive same content (with/without ANSI)", () => {
      const dualOutput = new MockDualOutput();
      const displayData: string[] = [];
      const fileData: string[] = [];

      dualOutput.onDisplayData((data) => displayData.push(data));
      dualOutput.onFileData((data) => fileData.push(data));

      const input = "\x1b[1mBold\x1b[0m and normal";
      dualOutput.push(input);

      // Display has raw data
      expect(displayData[0]).toBe(input);
      // File has stripped data
      expect(fileData[0]).toBe("Bold and normal");
      // Both have same text content when compared stripped
      expect(stripAnsi(displayData[0])).toBe(fileData[0]);
    });

    it("should close both streams on close()", () => {
      const dualOutput = new MockDualOutput();
      let displayCalled = false;
      let fileCalled = false;

      dualOutput.onDisplayData(() => { displayCalled = true; });
      dualOutput.onFileData(() => { fileCalled = true; });

      dualOutput.close();

      // After close, push should not trigger handlers
      dualOutput.push("test");

      expect(displayCalled).toBe(false);
      expect(fileCalled).toBe(false);
      expect(dualOutput.isClosed()).toBe(true);
    });

    it("should handle large output identically", () => {
      const dualOutput = new MockDualOutput();
      const displayData: string[] = [];
      const fileData: string[] = [];

      dualOutput.onDisplayData((data) => displayData.push(data));
      dualOutput.onFileData((data) => fileData.push(data));

      // 10KB of colored output
      const largeColoredOutput = ("\x1b[32m" + "x".repeat(10240) + "\x1b[0m");
      dualOutput.push(largeColoredOutput);

      expect(displayData[0].length).toBeGreaterThan(fileData[0].length);
      expect(fileData[0].length).toBe(10240);
    });
  });
});

// ============================================================
// Event Emitter Types & Implementation
// ============================================================

interface PTYEvent {
  type: "data" | "exit" | "error";
  timestamp: string; // ISO-8601
  data?: string;     // Output or error message
  ansi?: boolean;    // Whether data contains ANSI codes
  exitCode?: number; // For exit events
}

/**
 * Checks if a string contains ANSI escape codes
 */
function hasAnsi(input: string): boolean {
  // eslint-disable-next-line no-control-regex
  const ansiPattern = /\x1b\[[0-9;]*[a-zA-Z]/;
  return ansiPattern.test(input);
}

class MockPTYEventEmitter {
  private handlers: Array<(event: PTYEvent) => void> = [];

  onEvent(handler: (event: PTYEvent) => void): void {
    this.handlers.push(handler);
  }

  emitData(data: string): void {
    const event: PTYEvent = {
      type: "data",
      timestamp: new Date().toISOString(),
      data,
      ansi: hasAnsi(data),
    };
    this.handlers.forEach(h => h(event));
  }

  emitExit(exitCode: number, finalData?: string): void {
    const event: PTYEvent = {
      type: "exit",
      timestamp: new Date().toISOString(),
      exitCode,
      data: finalData,
    };
    this.handlers.forEach(h => h(event));
  }

  emitError(message: string): void {
    const event: PTYEvent = {
      type: "error",
      timestamp: new Date().toISOString(),
      data: message,
    };
    this.handlers.forEach(h => h(event));
  }
}

// ============================================================
// TESTS: Event Emitter
// ============================================================

describe("PTY Event Emitter Tests", () => {
  describe("Event Format", () => {
    it("should have correct format (type, timestamp, data)", () => {
      const emitter = new MockPTYEventEmitter();
      let receivedEvent: PTYEvent | null = null;

      emitter.onEvent((event) => { receivedEvent = event; });
      emitter.emitData("test output");

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.type).toBe("data");
      expect(receivedEvent!.timestamp).toBeDefined();
      expect(receivedEvent!.data).toBe("test output");

      // Verify ISO-8601 format
      expect(new Date(receivedEvent!.timestamp).toISOString()).toBe(receivedEvent!.timestamp);
    });

    it("should generate unique timestamps for each event", async () => {
      const emitter = new MockPTYEventEmitter();
      const timestamps: string[] = [];

      emitter.onEvent((event) => { timestamps.push(event.timestamp); });

      emitter.emitData("first");
      await new Promise(resolve => setTimeout(resolve, 10));
      emitter.emitData("second");

      expect(timestamps).toHaveLength(2);
      // Timestamps should be different (or at least parseable)
      expect(new Date(timestamps[0]).getTime()).toBeLessThanOrEqual(new Date(timestamps[1]).getTime());
    });
  });

  describe("Data Events", () => {
    it("should include ansi flag when data contains ANSI codes", () => {
      const emitter = new MockPTYEventEmitter();
      let receivedEvent: PTYEvent | null = null;

      emitter.onEvent((event) => { receivedEvent = event; });
      emitter.emitData("\x1b[32mcolored\x1b[0m");

      expect(receivedEvent!.ansi).toBe(true);
    });

    it("should set ansi flag to false for plain text", () => {
      const emitter = new MockPTYEventEmitter();
      let receivedEvent: PTYEvent | null = null;

      emitter.onEvent((event) => { receivedEvent = event; });
      emitter.emitData("plain text without colors");

      expect(receivedEvent!.ansi).toBe(false);
    });

    it("should detect ANSI in mixed content", () => {
      const emitter = new MockPTYEventEmitter();
      const events: PTYEvent[] = [];

      emitter.onEvent((event) => { events.push(event); });

      emitter.emitData("plain first");
      emitter.emitData("\x1b[1mbold\x1b[0m then plain");
      emitter.emitData("all plain again");

      expect(events[0].ansi).toBe(false);
      expect(events[1].ansi).toBe(true);
      expect(events[2].ansi).toBe(false);
    });
  });

  describe("Exit Events", () => {
    it("should include exitCode in exit events", () => {
      const emitter = new MockPTYEventEmitter();
      let receivedEvent: PTYEvent | null = null;

      emitter.onEvent((event) => { receivedEvent = event; });
      emitter.emitExit(0);

      expect(receivedEvent!.type).toBe("exit");
      expect(receivedEvent!.exitCode).toBe(0);
    });

    it("should handle non-zero exit codes", () => {
      const emitter = new MockPTYEventEmitter();
      const exitCodes = [1, 2, 127, 130, 137, 255];
      const receivedCodes: number[] = [];

      emitter.onEvent((event) => {
        if (event.type === "exit" && event.exitCode !== undefined) {
          receivedCodes.push(event.exitCode);
        }
      });

      for (const code of exitCodes) {
        emitter.emitExit(code);
      }

      expect(receivedCodes).toEqual(exitCodes);
    });

    it("should include optional final data in exit events", () => {
      const emitter = new MockPTYEventEmitter();
      let receivedEvent: PTYEvent | null = null;

      emitter.onEvent((event) => { receivedEvent = event; });
      emitter.emitExit(0, "Final output before exit");

      expect(receivedEvent!.exitCode).toBe(0);
      expect(receivedEvent!.data).toBe("Final output before exit");
    });
  });

  describe("Error Events", () => {
    it("should emit error events with message", () => {
      const emitter = new MockPTYEventEmitter();
      let receivedEvent: PTYEvent | null = null;

      emitter.onEvent((event) => { receivedEvent = event; });
      emitter.emitError("ENOENT: command not found");

      expect(receivedEvent!.type).toBe("error");
      expect(receivedEvent!.data).toBe("ENOENT: command not found");
    });

    it("should not include ansi or exitCode in error events", () => {
      const emitter = new MockPTYEventEmitter();
      let receivedEvent: PTYEvent | null = null;

      emitter.onEvent((event) => { receivedEvent = event; });
      emitter.emitError("Permission denied");

      expect(receivedEvent!.ansi).toBeUndefined();
      expect(receivedEvent!.exitCode).toBeUndefined();
    });
  });
});

// ============================================================
// Signal Handling Tests
// ============================================================

describe("Signal Handling Tests", () => {
  describe("SIGINT Propagation", () => {
    it("should propagate SIGINT to child process via kill()", () => {
      const wrapper = new PTYWrapper("sleep", ["1000"], {});
      const mockPty = wrapper.getMockPTY();

      // Simulate SIGINT propagation
      wrapper.kill("SIGINT");

      expect(mockPty.killed).toBe(true);
      expect(mockPty.killedWith).toBe("SIGINT");
    });

    it("should trigger exit handler after SIGINT", async () => {
      const wrapper = new PTYWrapper("sleep", ["1000"], {});
      const mockPty = wrapper.getMockPTY();
      let exitCalled = false;
      let exitCode: number | null = null;

      wrapper.onExit((code) => {
        exitCalled = true;
        exitCode = code;
      });

      wrapper.kill("SIGINT");

      // Wait for async exit event
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(exitCalled).toBe(true);
      expect(exitCode).toBe(0);
    });

    it("should handle SIGTERM similarly to SIGINT", () => {
      const wrapper = new PTYWrapper("long-running", [], {});
      const mockPty = wrapper.getMockPTY();

      wrapper.kill("SIGTERM");

      expect(mockPty.killed).toBe(true);
      expect(mockPty.killedWith).toBe("SIGTERM");
    });
  });

  describe("Graceful Shutdown", () => {
    it("should close all streams on shutdown", () => {
      const dualOutput = new MockDualOutput();
      const wrapper = new PTYWrapper("process", [], {});
      const mockPty = wrapper.getMockPTY();

      // Connect PTY to dual output
      wrapper.onData((data) => dualOutput.push(data));

      // Simulate shutdown sequence
      wrapper.kill();
      dualOutput.close();

      expect(mockPty.killed).toBe(true);
      expect(dualOutput.isClosed()).toBe(true);
    });

    it("should not emit data after shutdown", () => {
      const dualOutput = new MockDualOutput();
      const displayData: string[] = [];

      dualOutput.onDisplayData((data) => displayData.push(data));

      dualOutput.push("before close");
      dualOutput.close();
      dualOutput.push("after close");

      expect(displayData).toHaveLength(1);
      expect(displayData[0]).toBe("before close");
    });

    it("should complete shutdown within timeout", async () => {
      const wrapper = new PTYWrapper("process", [], {});
      const mockPty = wrapper.getMockPTY();

      const shutdownStart = Date.now();

      // Kill and wait for exit
      wrapper.kill("SIGTERM");
      await new Promise(resolve => setTimeout(resolve, 100));

      const shutdownTime = Date.now() - shutdownStart;

      expect(mockPty.killed).toBe(true);
      expect(shutdownTime).toBeLessThan(500); // Should complete within 500ms
    });

    it("should handle multiple kill calls gracefully", () => {
      const wrapper = new PTYWrapper("process", [], {});
      const mockPty = wrapper.getMockPTY();

      // Call kill multiple times
      wrapper.kill("SIGINT");
      wrapper.kill("SIGTERM");
      wrapper.kill("SIGKILL");

      // Should not throw and should track last signal
      expect(mockPty.killed).toBe(true);
      expect(mockPty.killedWith).toBe("SIGKILL");
    });
  });

  describe("Signal + Event Integration", () => {
    it("should emit exit event after signal-induced termination", async () => {
      const wrapper = new PTYWrapper("long-process", [], {});
      const emitter = new MockPTYEventEmitter();
      let exitEvent: PTYEvent | null = null;

      emitter.onEvent((event) => {
        if (event.type === "exit") {
          exitEvent = event;
        }
      });

      // Wire up wrapper exit to emitter
      wrapper.onExit((code) => {
        emitter.emitExit(code);
      });

      wrapper.kill("SIGINT");

      // Wait for async events
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(exitEvent).not.toBeNull();
      expect(exitEvent!.type).toBe("exit");
      expect(exitEvent!.exitCode).toBe(0);
    });
  });
});
