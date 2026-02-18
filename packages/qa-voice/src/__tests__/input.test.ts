import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { waitForInput, clearInput } from "../input";
import { writeFileSync, unlinkSync, existsSync } from "fs";

const TEST_INPUT_FILE = "/tmp/golems-qa-test-input.txt";

describe("input module", () => {
  beforeEach(() => {
    // Clean up test file
    if (existsSync(TEST_INPUT_FILE)) {
      unlinkSync(TEST_INPUT_FILE);
    }
  });

  afterEach(() => {
    if (existsSync(TEST_INPUT_FILE)) {
      unlinkSync(TEST_INPUT_FILE);
    }
  });

  it("waitForInput returns content when file has text", async () => {
    // Write content before waiting
    writeFileSync(TEST_INPUT_FILE, "hello from wispr");

    const result = await waitForInput(TEST_INPUT_FILE, 2000);
    expect(result).toBe("hello from wispr");
  });

  it("waitForInput clears the file after reading", async () => {
    writeFileSync(TEST_INPUT_FILE, "test content");

    await waitForInput(TEST_INPUT_FILE, 2000);

    // File should be empty after reading
    const content = Bun.file(TEST_INPUT_FILE).size;
    expect(content).toBe(0);
  });

  it("waitForInput returns null on timeout", async () => {
    // Don't write anything — should timeout
    const result = await waitForInput(TEST_INPUT_FILE, 500);
    expect(result).toBeNull();
  });

  it("waitForInput ignores empty file", async () => {
    // Create empty file
    writeFileSync(TEST_INPUT_FILE, "");

    const result = await waitForInput(TEST_INPUT_FILE, 500);
    expect(result).toBeNull();
  });

  it("waitForInput picks up content written after polling starts", async () => {
    // Start waiting, then write after a delay
    const waitPromise = waitForInput(TEST_INPUT_FILE, 3000);

    // Write after 300ms (file watcher polls every 200ms)
    setTimeout(() => {
      writeFileSync(TEST_INPUT_FILE, "delayed response");
    }, 300);

    const result = await waitPromise;
    expect(result).toBe("delayed response");
  });

  it("clearInput creates an empty file", () => {
    writeFileSync(TEST_INPUT_FILE, "stale data");
    clearInput(TEST_INPUT_FILE);

    const content = require("fs").readFileSync(TEST_INPUT_FILE, "utf-8");
    expect(content).toBe("");
  });

  it("clearInput works when file doesn't exist", () => {
    // Should not throw
    clearInput(TEST_INPUT_FILE);
    expect(existsSync(TEST_INPUT_FILE)).toBe(true);
  });

  it("waitForInput trims whitespace from response", async () => {
    writeFileSync(TEST_INPUT_FILE, "  response with spaces  \n");

    const result = await waitForInput(TEST_INPUT_FILE, 2000);
    expect(result).toBe("response with spaces");
  });
});
