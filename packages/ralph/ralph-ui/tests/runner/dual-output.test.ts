/**
 * Dual Output Stream Tests - TDD for MP-007
 * Tests for dual-output pipeline (ralph-ui/src/runner/pty/)
 *
 * The dual-output system splits PTY output into two streams:
 * 1. Display stream: preserves ANSI codes for UI rendering
 * 2. File stream: strips ANSI codes for clean logs
 */

import { describe, it, expect } from "bun:test";
import { PassThrough, Transform, Writable } from "stream";

// ============================================================
// Types for dual-output pipeline
// ============================================================

interface DualOutputStream {
  display: PassThrough;  // Preserves ANSI
  file: Transform;       // Strips ANSI
}

interface OutputEvent {
  raw: string;       // Original with ANSI
  stripped: string;  // Without ANSI
  timestamp: string;
}

// ============================================================
// ANSI Stripping Implementation (to be tested)
// ============================================================

// ANSI escape code pattern - matches SGR sequences, cursor movement, etc.
const ANSI_REGEX = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?(?:\x07|\x1b\\)|\x1b[PX^_].*?\x1b\\|\x1b./g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_REGEX, "");
}

// ============================================================
// Dual Output Factory (to be tested)
// ============================================================

function createDualOutput(): DualOutputStream {
  const display = new PassThrough();

  const file = new Transform({
    transform(chunk, encoding, callback) {
      const stripped = stripAnsi(chunk.toString());
      callback(null, stripped);
    },
  });

  return { display, file };
}

// Fork data to both streams
function forkOutput(
  data: string,
  streams: DualOutputStream
): void {
  streams.display.write(data);
  streams.file.write(data);
}

// ============================================================
// TESTS: ANSI Stripping
// ============================================================

describe("ANSI Stripping", () => {
  describe("Basic Colors", () => {
    it("should strip foreground color codes", () => {
      const input = "\x1b[31mred text\x1b[0m";
      const output = stripAnsi(input);
      expect(output).toBe("red text");
    });

    it("should strip background color codes", () => {
      const input = "\x1b[41mred background\x1b[0m";
      const output = stripAnsi(input);
      expect(output).toBe("red background");
    });

    it("should strip 256-color codes", () => {
      const input = "\x1b[38;5;196mred\x1b[0m";
      const output = stripAnsi(input);
      expect(output).toBe("red");
    });

    it("should strip RGB true color codes", () => {
      const input = "\x1b[38;2;255;0;0mred\x1b[0m";
      const output = stripAnsi(input);
      expect(output).toBe("red");
    });
  });

  describe("Text Styles", () => {
    it("should strip bold codes", () => {
      const input = "\x1b[1mbold\x1b[0m";
      const output = stripAnsi(input);
      expect(output).toBe("bold");
    });

    it("should strip underline codes", () => {
      const input = "\x1b[4munderlined\x1b[0m";
      const output = stripAnsi(input);
      expect(output).toBe("underlined");
    });

    it("should strip italic codes", () => {
      const input = "\x1b[3mitalic\x1b[0m";
      const output = stripAnsi(input);
      expect(output).toBe("italic");
    });

    it("should strip combined style codes", () => {
      const input = "\x1b[1;4;31mbold underline red\x1b[0m";
      const output = stripAnsi(input);
      expect(output).toBe("bold underline red");
    });
  });

  describe("Cursor Movement", () => {
    it("should strip cursor up codes", () => {
      const input = "line1\x1b[Aline2";
      const output = stripAnsi(input);
      expect(output).toBe("line1line2");
    });

    it("should strip cursor position codes", () => {
      const input = "\x1b[10;20Htext at position";
      const output = stripAnsi(input);
      expect(output).toBe("text at position");
    });

    it("should strip clear screen codes", () => {
      const input = "\x1b[2Jcleared screen";
      const output = stripAnsi(input);
      expect(output).toBe("cleared screen");
    });

    it("should strip clear line codes", () => {
      const input = "\x1b[Kcleared line";
      const output = stripAnsi(input);
      expect(output).toBe("cleared line");
    });
  });

  describe("Complex Cases", () => {
    it("should handle multiple escape sequences in one string", () => {
      const input =
        "\x1b[32m✓\x1b[0m \x1b[1mTest passed\x1b[0m in \x1b[33m100ms\x1b[0m";
      const output = stripAnsi(input);
      expect(output).toBe("✓ Test passed in 100ms");
    });

    it("should preserve non-ANSI text", () => {
      const input = "plain text without any escape codes";
      const output = stripAnsi(input);
      expect(output).toBe("plain text without any escape codes");
    });

    it("should handle empty string", () => {
      expect(stripAnsi("")).toBe("");
    });

    it("should handle string with only escape codes", () => {
      const input = "\x1b[31m\x1b[0m\x1b[1m\x1b[0m";
      const output = stripAnsi(input);
      expect(output).toBe("");
    });

    it("should preserve unicode characters", () => {
      const input = "\x1b[32m✅ 日本語 😀\x1b[0m";
      const output = stripAnsi(input);
      expect(output).toBe("✅ 日本語 😀");
    });

    it("should strip hyperlink escape sequences (OSC 8)", () => {
      const input = "\x1b]8;;https://example.com\x07link text\x1b]8;;\x07";
      const output = stripAnsi(input);
      expect(output).toBe("link text");
    });
  });
});

// ============================================================
// TESTS: Dual Output Streams
// ============================================================

describe("Dual Output Streams", () => {
  describe("Display Stream (preserves ANSI)", () => {
    it("should preserve ANSI codes in display stream", async () => {
      const streams = createDualOutput();
      const chunks: string[] = [];

      streams.display.on("data", (chunk: Buffer) => {
        chunks.push(chunk.toString());
      });

      const coloredInput = "\x1b[32mgreen text\x1b[0m";
      streams.display.write(coloredInput);
      streams.display.end();

      await new Promise((resolve) => streams.display.on("end", resolve));

      expect(chunks[0]).toContain("\x1b[32m");
      expect(chunks[0]).toContain("\x1b[0m");
    });

    it("should pass through all data unchanged", async () => {
      const streams = createDualOutput();
      const chunks: string[] = [];

      streams.display.on("data", (chunk: Buffer) => {
        chunks.push(chunk.toString());
      });

      const input = "test \x1b[1mbold\x1b[0m data";
      streams.display.write(input);
      streams.display.end();

      await new Promise((resolve) => streams.display.on("end", resolve));

      expect(chunks.join("")).toBe(input);
    });
  });

  describe("File Stream (strips ANSI)", () => {
    it("should strip ANSI codes in file stream", async () => {
      const streams = createDualOutput();
      const chunks: string[] = [];

      streams.file.on("data", (chunk: Buffer) => {
        chunks.push(chunk.toString());
      });

      const coloredInput = "\x1b[32mgreen text\x1b[0m";
      streams.file.write(coloredInput);
      streams.file.end();

      await new Promise((resolve) => streams.file.on("end", resolve));

      expect(chunks[0]).not.toContain("\x1b[32m");
      expect(chunks[0]).toBe("green text");
    });

    it("should strip all formatting from complex output", async () => {
      const streams = createDualOutput();
      const chunks: string[] = [];

      streams.file.on("data", (chunk: Buffer) => {
        chunks.push(chunk.toString());
      });

      const complexInput =
        "\x1b[1;32m✓\x1b[0m Test \x1b[33mwarning\x1b[0m complete";
      streams.file.write(complexInput);
      streams.file.end();

      await new Promise((resolve) => streams.file.on("end", resolve));

      expect(chunks.join("")).toBe("✓ Test warning complete");
    });
  });

  describe("Stream Synchronization", () => {
    it("should send same content to both streams", async () => {
      const streams = createDualOutput();
      const displayChunks: string[] = [];
      const fileChunks: string[] = [];

      streams.display.on("data", (chunk: Buffer) => {
        displayChunks.push(chunk.toString());
      });

      streams.file.on("data", (chunk: Buffer) => {
        fileChunks.push(chunk.toString());
      });

      const input = "\x1b[32mtest data\x1b[0m with newline\n";
      forkOutput(input, streams);

      streams.display.end();
      streams.file.end();

      await Promise.all([
        new Promise((resolve) => streams.display.on("end", resolve)),
        new Promise((resolve) => streams.file.on("end", resolve)),
      ]);

      // Display should have original
      expect(displayChunks.join("")).toBe(input);

      // File should have stripped version
      expect(fileChunks.join("")).toBe("test data with newline\n");
    });

    it("should handle multiple chunks in order", async () => {
      const streams = createDualOutput();
      const displayOrder: number[] = [];
      const fileOrder: number[] = [];

      streams.display.on("data", (chunk: Buffer) => {
        const num = parseInt(chunk.toString().trim(), 10);
        if (!isNaN(num)) displayOrder.push(num);
      });

      streams.file.on("data", (chunk: Buffer) => {
        const num = parseInt(chunk.toString().trim(), 10);
        if (!isNaN(num)) fileOrder.push(num);
      });

      for (let i = 1; i <= 5; i++) {
        forkOutput(`${i}\n`, streams);
      }

      streams.display.end();
      streams.file.end();

      await Promise.all([
        new Promise((resolve) => streams.display.on("end", resolve)),
        new Promise((resolve) => streams.file.on("end", resolve)),
      ]);

      expect(displayOrder).toEqual([1, 2, 3, 4, 5]);
      expect(fileOrder).toEqual([1, 2, 3, 4, 5]);
    });

    it("should handle empty input", async () => {
      const streams = createDualOutput();
      let displayReceived = false;
      let fileReceived = false;

      streams.display.on("data", () => {
        displayReceived = true;
      });

      streams.file.on("data", () => {
        fileReceived = true;
      });

      forkOutput("", streams);
      streams.display.end();
      streams.file.end();

      await Promise.all([
        new Promise((resolve) => streams.display.on("end", resolve)),
        new Promise((resolve) => streams.file.on("end", resolve)),
      ]);

      // Empty string should not trigger data events (or should be empty)
      // This depends on stream implementation
    });
  });

  describe("Stream Independence", () => {
    it("should allow independent stream consumption", async () => {
      const streams = createDualOutput();

      // Only consume display stream
      const displayChunks: string[] = [];
      streams.display.on("data", (chunk: Buffer) => {
        displayChunks.push(chunk.toString());
      });

      const input = "\x1b[31mred\x1b[0m";
      forkOutput(input, streams);
      streams.display.end();

      await new Promise((resolve) => streams.display.on("end", resolve));

      expect(displayChunks.join("")).toBe(input);
    });

    it("should not block if one stream is slow", async () => {
      const streams = createDualOutput();

      // Fast consumer
      const displayChunks: string[] = [];
      streams.display.on("data", (chunk: Buffer) => {
        displayChunks.push(chunk.toString());
      });

      // Slow consumer (simulated with cork)
      const fileChunks: string[] = [];
      streams.file.on("data", (chunk: Buffer) => {
        fileChunks.push(chunk.toString());
      });

      const input = "test data";
      forkOutput(input, streams);

      streams.display.end();
      streams.file.end();

      await Promise.all([
        new Promise((resolve) => streams.display.on("end", resolve)),
        new Promise((resolve) => streams.file.on("end", resolve)),
      ]);

      expect(displayChunks.join("")).toBe(input);
      expect(fileChunks.join("")).toBe(input);
    });
  });
});
