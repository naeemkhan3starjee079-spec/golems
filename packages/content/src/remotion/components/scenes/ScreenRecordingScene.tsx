/**
 * ScreenRecordingScene — plays a screen recording with optional
 * device frame, captions, and playback speed control.
 */

import * as React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SPACING, TYPOGRAPHY } from "../../lib/design-tokens";
import { clampedInterpolate, springProgress } from "../../lib/motion";
import type { ScreenRecordingSceneProps } from "../../lib/scenes";
import { SlideIn } from "../SlideIn";

export const ScreenRecordingScene: React.FC<ScreenRecordingSceneProps> = ({
  src,
  startFrom = 0,
  endAt,
  playbackRate = 1,
  // AIDEV-TODO: Only "browser" and "none" are implemented.
  // iphone/macbook frames need device mockup images in public/devices/.
  deviceFrame = "none",
  // AIDEV-TODO: showCursor requires a cursor overlay component that follows
  // a recorded cursor position track. Not implemented yet.
  showCursor,
  captions = [],
  entrance = { type: "scale", from: 0.95 },
  entranceDelay = 0,
  brand,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entranceProgress = springProgress(frame, fps, "smooth", entranceDelay);
  const scale = clampedInterpolate(entranceProgress, [0, 1], [0.95, 1]);
  const opacity = entranceProgress;

  // Find active caption
  const activeCaption = captions.find(
    (c) => frame >= c.fromFrame && frame <= c.toFrame,
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: SPACING.lg,
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          borderRadius: deviceFrame !== "none" ? 16 : 0,
          overflow: "hidden",
          boxShadow:
            deviceFrame !== "none"
              ? "0 20px 60px rgba(0,0,0,0.3)"
              : undefined,
          maxWidth: "90%",
          maxHeight: "80%",
        }}
      >
        {deviceFrame === "browser" && (
          <div
            style={{
              height: 36,
              backgroundColor: "#E5E7EB",
              display: "flex",
              alignItems: "center",
              gap: 6,
              paddingLeft: 12,
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#EF4444" }} />
            <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#F59E0B" }} />
            <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#22C55E" }} />
          </div>
        )}

        <OffthreadVideo
          src={staticFile(src)}
          startFrom={startFrom * fps}
          endAt={endAt ? endAt * fps : undefined}
          playbackRate={playbackRate}
          style={{ width: "100%", display: "block" }}
        />
      </div>

      {activeCaption && (
        <div
          style={{
            position: "absolute",
            [activeCaption.position === "top" ? "top" : "bottom"]: SPACING.xl,
            left: "50%",
            transform: "translateX(-50%)",
            padding: `${SPACING.sm}px ${SPACING.md}px`,
            backgroundColor: "rgba(0,0,0,0.75)",
            borderRadius: 8,
            color: "#FFFFFF",
            fontSize: TYPOGRAPHY[activeCaption.variant ?? "body"].fontSize,
            maxWidth: "80%",
            textAlign: "center",
          }}
        >
          {activeCaption.text}
        </div>
      )}
    </AbsoluteFill>
  );
};
