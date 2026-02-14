/**
 * DecorativeBubble — small glassmorphic floating circle
 * with gentle drift animation.
 */

import { useCurrentFrame, useVideoConfig } from "remotion";
import { springProgress, clampedInterpolate } from "../../../lib";

type Props = {
  x: number;
  y: number;
  delay: number;
  size?: number;
  amplitude?: number;
  speed?: number;
};

export const DecorativeBubble: React.FC<Props> = ({
  x,
  y,
  delay,
  size = 10,
  amplitude = 6,
  speed = 0.016,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = springProgress(frame, fps, "gentle", delay);
  const opacity = clampedInterpolate(frame - delay, [0, 15], [0, 0.5]);

  const floatX = Math.cos(frame * speed * 1.3) * amplitude;
  const floatY = Math.sin(frame * speed) * amplitude * 0.8;

  return (
    <div
      style={{
        position: "absolute",
        left: x + floatX,
        top: y + floatY,
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(219,234,254,0.3))",
        border: "1px solid rgba(219,234,254,0.4)",
        opacity: opacity * entrance,
        boxShadow: "inset 0 1px 2px rgba(255,255,255,0.5)",
      }}
    />
  );
};
