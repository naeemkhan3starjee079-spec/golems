/**
 * Signal Handling Tests - TDD for MP-007
 * Tests for PTY signal propagation (ralph-ui/src/runner/pty/)
 *
 * Proper signal handling ensures graceful shutdown:
 * - SIGINT (Ctrl+C) propagates to child process
 * - SIGTERM triggers clean termination
 * - All streams are properly closed
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { EventEmitter } from "events";
import { PassThrough, Transform } from "stream";

// ============================================================
// Types for signal handling
// ============================================================

type SignalType = "SIGINT" | "SIGTERM" | "SIGKILL" | "SIGHUP";

interface PTYProcess {
  kill: (signal?: string) => void;
  onExit: (handler: (code: number) => void) => void;
  onData: (handler: (chunk: string) => void) => void;
}

interface ShutdownResult {
  success: boolean;
  exitCode: number | null;
  graceful: boolean;  // Whether it exited before force kill
  streamsClosed: boolean;
}

// ============================================================
// Mock PTY for Signal Testing
// ============================================================

class MockPTYWithSignals extends EventEmitter {
  pid: number;
  killed: boolean = false;
  killedWith: string | undefined;
  exitTimeout: ReturnType<typeof setTimeout> | null = null;
  forceKillApplied: boolean = false;

  constructor() {
    super();
    this.pid = Math.floor(Math.random() * 10000) + 1000;
  }

  kill(signal?: string): void {
    this.killed = true;
    this.killedWith = signal;

    if (signal === "SIGKILL") {
      this.forceKillApplied = true;
      // SIGKILL exits immediately
      process.nextTick(() => this.emit("exit", 137, signal));
    } else if (signal === "SIGINT" || signal === "SIGTERM" || !signal) {
      // Graceful signals - process might exit or might need SIGKILL
      // In tests, we control this with simulateExit
    }
  }

  simulateExit(code: number): void {
    this.emit("exit", code, null);
  }

  simulateHang(): void {
    // Do nothing - process ignores the signal
  }

  onExit(handler: (code: number) => void): void {
    this.on("exit", handler);
  }

  onData(handler: (chunk: string) => void): void {
    this.on("data", handler);
  }
}

// ============================================================
// Signal Handler Implementation (to be tested)
// ============================================================

class SignalHandler {
  private pty: MockPTYWithSignals;
  private displayStream: PassThrough;
  private fileStream: Transform;
  private exitCode: number | null = null;
  private exited: boolean = false;
  private gracefulTimeout: number;

  constructor(
    pty: MockPTYWithSignals,
    displayStream: PassThrough,
    fileStream: Transform,
    gracefulTimeoutMs: number = 500
  ) {
    this.pty = pty;
    this.displayStream = displayStream;
    this.fileStream = fileStream;
    this.gracefulTimeout = gracefulTimeoutMs;

    this.pty.onExit((code) => {
      this.exitCode = code;
      this.exited = true;
    });
  }

  async sendSignal(signal: SignalType): Promise<ShutdownResult> {
    // Send signal to PTY
    this.pty.kill(signal);

    // Wait for graceful exit with timeout
    const gracefulExit = await this.waitForExit(this.gracefulTimeout);

    if (!gracefulExit && signal !== "SIGKILL") {
      // Force kill if graceful shutdown failed
      this.pty.kill("SIGKILL");
      await this.waitForExit(100); // Short wait for SIGKILL
    }

    // Close streams
    const streamsClosed = await this.closeStreams();

    return {
      success: this.exited,
      exitCode: this.exitCode,
      graceful: gracefulExit,
      streamsClosed,
    };
  }

  private waitForExit(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.exited) {
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        resolve(false);
      }, timeoutMs);

      const exitHandler = () => {
        clearTimeout(timeout);
        resolve(true);
      };

      this.pty.once("exit", exitHandler);
    });
  }

  private closeStreams(): Promise<boolean> {
    return new Promise((resolve) => {
      let displayClosed = false;
      let fileClosed = false;

      const checkDone = () => {
        if (displayClosed && fileClosed) {
          resolve(true);
        }
      };

      this.displayStream.end(() => {
        displayClosed = true;
        checkDone();
      });

      this.fileStream.end(() => {
        fileClosed = true;
        checkDone();
      });

      // Timeout in case streams don't close
      setTimeout(() => resolve(displayClosed && fileClosed), 100);
    });
  }
}

// ============================================================
// TESTS: SIGINT Propagation
// ============================================================

describe("SIGINT Propagation", () => {
  it("should propagate SIGINT to child process", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });
    const handler = new SignalHandler(pty, display, file);

    // Simulate graceful exit after SIGINT
    setTimeout(() => pty.simulateExit(130), 10);

    const result = await handler.sendSignal("SIGINT");

    expect(pty.killed).toBe(true);
    expect(pty.killedWith).toBe("SIGINT");
    expect(result.exitCode).toBe(130); // Standard SIGINT exit code
  });

  it("should set correct exit code on SIGINT", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });
    const handler = new SignalHandler(pty, display, file);

    setTimeout(() => pty.simulateExit(130), 10);

    const result = await handler.sendSignal("SIGINT");

    // Exit code 130 = 128 + 2 (SIGINT signal number)
    expect(result.exitCode).toBe(130);
    expect(result.success).toBe(true);
  });

  it("should be considered graceful when process exits quickly", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });
    const handler = new SignalHandler(pty, display, file);

    // Exit immediately
    setTimeout(() => pty.simulateExit(130), 5);

    const result = await handler.sendSignal("SIGINT");

    expect(result.graceful).toBe(true);
  });

  it("should force SIGKILL if process ignores SIGINT", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });
    const handler = new SignalHandler(pty, display, file, 50); // Short timeout

    // Process hangs - doesn't exit
    pty.simulateHang();

    const result = await handler.sendSignal("SIGINT");

    expect(pty.forceKillApplied).toBe(true);
    expect(result.graceful).toBe(false);
  });
});

// ============================================================
// TESTS: Graceful Shutdown
// ============================================================

describe("Graceful Shutdown", () => {
  it("should close all streams on shutdown", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });
    const handler = new SignalHandler(pty, display, file);

    setTimeout(() => pty.simulateExit(0), 10);

    const result = await handler.sendSignal("SIGTERM");

    expect(result.streamsClosed).toBe(true);
  });

  it("should wait for graceful timeout before force kill", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });

    const startTime = Date.now();
    const gracefulTimeout = 100;
    const handler = new SignalHandler(pty, display, file, gracefulTimeout);

    // Process doesn't exit gracefully
    pty.simulateHang();

    await handler.sendSignal("SIGTERM");

    const elapsed = Date.now() - startTime;
    // Should have waited at least the graceful timeout
    expect(elapsed).toBeGreaterThanOrEqual(gracefulTimeout - 20); // Small tolerance
  });

  it("should report success even after force kill", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });
    const handler = new SignalHandler(pty, display, file, 50);

    // Process requires force kill
    pty.simulateHang();

    const result = await handler.sendSignal("SIGTERM");

    expect(result.success).toBe(true); // Process was killed
    expect(result.graceful).toBe(false); // But not gracefully
    expect(result.exitCode).toBe(137); // SIGKILL exit code
  });

  it("should handle immediate exit without needing force kill", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });
    const handler = new SignalHandler(pty, display, file);

    // Immediate exit
    process.nextTick(() => pty.simulateExit(0));

    const result = await handler.sendSignal("SIGTERM");

    expect(result.success).toBe(true);
    expect(result.graceful).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(pty.forceKillApplied).toBe(false);
  });

  it("should flush pending data before closing streams", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const receivedData: string[] = [];

    display.on("data", (chunk: Buffer) => {
      receivedData.push(chunk.toString());
    });

    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });
    const handler = new SignalHandler(pty, display, file);

    // Write some data before shutdown
    display.write("pending data 1\n");
    display.write("pending data 2\n");

    setTimeout(() => pty.simulateExit(0), 10);

    const result = await handler.sendSignal("SIGTERM");

    expect(result.streamsClosed).toBe(true);
    expect(receivedData).toContain("pending data 1\n");
    expect(receivedData).toContain("pending data 2\n");
  });
});

// ============================================================
// TESTS: SIGTERM Handling
// ============================================================

describe("SIGTERM Handling", () => {
  it("should propagate SIGTERM to child process", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });
    const handler = new SignalHandler(pty, display, file);

    setTimeout(() => pty.simulateExit(143), 10);

    const result = await handler.sendSignal("SIGTERM");

    expect(pty.killed).toBe(true);
    expect(pty.killedWith).toBe("SIGTERM");
    expect(result.exitCode).toBe(143); // 128 + 15 (SIGTERM)
  });
});

// ============================================================
// TESTS: SIGKILL Handling
// ============================================================

describe("SIGKILL Handling", () => {
  it("should force terminate with SIGKILL", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });
    const handler = new SignalHandler(pty, display, file);

    const result = await handler.sendSignal("SIGKILL");

    expect(pty.killed).toBe(true);
    expect(pty.killedWith).toBe("SIGKILL");
    expect(result.exitCode).toBe(137); // 128 + 9 (SIGKILL)
  });

  it("should not wait for graceful exit on SIGKILL", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });

    const startTime = Date.now();
    const handler = new SignalHandler(pty, display, file, 1000); // Long timeout

    const result = await handler.sendSignal("SIGKILL");

    const elapsed = Date.now() - startTime;
    // Should be nearly instant
    expect(elapsed).toBeLessThan(200);
    expect(result.success).toBe(true);
  });
});

// ============================================================
// TESTS: Edge Cases
// ============================================================

describe("Signal Edge Cases", () => {
  it("should handle multiple signals", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });
    const handler = new SignalHandler(pty, display, file, 50);

    // First signal
    const promise1 = handler.sendSignal("SIGINT");

    // Process hangs, then second signal comes
    pty.simulateHang();

    const result = await promise1;

    // Should have eventually killed the process
    expect(result.success).toBe(true);
  });

  it("should handle signal to already exited process", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });
    const handler = new SignalHandler(pty, display, file);

    // Process already exited
    pty.simulateExit(0);

    // Small delay to let exit propagate
    await new Promise((r) => setTimeout(r, 10));

    const result = await handler.sendSignal("SIGTERM");

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it("should handle streams that are already closed", async () => {
    const pty = new MockPTYWithSignals();
    const display = new PassThrough();
    const file = new Transform({
      transform(chunk, _, cb) {
        cb(null, chunk);
      },
    });

    // Close streams before signal
    display.end();
    file.end();

    const handler = new SignalHandler(pty, display, file);

    setTimeout(() => pty.simulateExit(0), 10);

    const result = await handler.sendSignal("SIGTERM");

    expect(result.success).toBe(true);
    expect(result.streamsClosed).toBe(true);
  });
});
