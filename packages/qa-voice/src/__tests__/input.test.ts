import { describe, it, expect } from "bun:test";
import { calculateRMS, clearInput } from "../input";

describe("input module", () => {
  describe("calculateRMS", () => {
    it("returns 0 for empty buffer", () => {
      const buffer = new Uint8Array(0);
      expect(calculateRMS(buffer)).toBe(0);
    });

    it("returns 0 for silent audio (all zeros)", () => {
      // 100 samples of silence (200 bytes, 16-bit)
      const buffer = new Uint8Array(200);
      expect(calculateRMS(buffer)).toBe(0);
    });

    it("returns high RMS for loud audio", () => {
      // Create buffer with max-amplitude 16-bit samples
      const numSamples = 100;
      const buffer = new Uint8Array(numSamples * 2);
      const view = new DataView(buffer.buffer);
      for (let i = 0; i < numSamples; i++) {
        view.setInt16(i * 2, 20000, true); // loud signal
      }

      const rms = calculateRMS(buffer);
      expect(rms).toBeGreaterThan(10000);
    });

    it("returns moderate RMS for moderate audio", () => {
      const numSamples = 100;
      const buffer = new Uint8Array(numSamples * 2);
      const view = new DataView(buffer.buffer);
      for (let i = 0; i < numSamples; i++) {
        view.setInt16(i * 2, 1000, true); // moderate signal
      }

      const rms = calculateRMS(buffer);
      expect(rms).toBeGreaterThan(500);
      expect(rms).toBeLessThan(5000);
    });

    it("handles alternating positive/negative samples", () => {
      const numSamples = 100;
      const buffer = new Uint8Array(numSamples * 2);
      const view = new DataView(buffer.buffer);
      for (let i = 0; i < numSamples; i++) {
        // Alternating +5000 / -5000 — RMS should be same as constant 5000
        view.setInt16(i * 2, i % 2 === 0 ? 5000 : -5000, true);
      }

      const rms = calculateRMS(buffer);
      expect(rms).toBeCloseTo(5000, -1); // within rounding
    });
  });

  describe("clearInput", () => {
    it("does not throw (no-op in WebSocket mode)", () => {
      expect(() => clearInput()).not.toThrow();
    });
  });

  describe("waitForInput", () => {
    it("throws when WISPR_KEY is not set", async () => {
      // Save and clear the env var
      const saved = process.env.QA_VOICE_WISPR_KEY;
      delete process.env.QA_VOICE_WISPR_KEY;

      try {
        // Re-import to pick up cleared env var
        // Since the module reads env at import time, we need to test the check
        const { waitForInput } = await import("../input");
        await expect(waitForInput(1000)).rejects.toThrow("QA_VOICE_WISPR_KEY");
      } finally {
        // Restore
        if (saved) process.env.QA_VOICE_WISPR_KEY = saved;
      }
    });
  });
});
