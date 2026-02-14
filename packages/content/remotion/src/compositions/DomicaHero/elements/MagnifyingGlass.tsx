/**
 * MagnifyingGlass — transparent lens using SVG mask,
 * metallic blue ring gradient, handle with highlight/shadow.
 * Continuous floating animation after entrance.
 */

import { useCurrentFrame, useVideoConfig } from "remotion";
import { springProgress, clampedInterpolate } from "../../../lib";

type Props = {
  x: number;
  y: number;
  delay: number;
  size?: number;
};

export const MagnifyingGlass: React.FC<Props> = ({
  x,
  y,
  delay,
  size = 200,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = springProgress(frame, fps, "smooth", delay);
  const opacity = clampedInterpolate(frame - delay, [0, 10], [0, 1]);
  const entranceFactor = clampedInterpolate(frame - delay, [0, 30], [0, 1]);

  // Continuous floating after entrance
  const floatX = Math.cos(frame * 0.018) * 14 * entranceFactor;
  const floatY = Math.sin(frame * 0.022) * 10 * entranceFactor;
  const floatRotate = Math.sin(frame * 0.012) * 3 * entranceFactor;

  const entranceScale = 0.3 + 0.7 * entrance;
  const entranceY = -60 * (1 - entrance);

  const lensR = size * 0.34;
  const lensCx = size * 0.42;
  const lensCy = size * 0.38;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        opacity,
        transform: `translate(${floatX}px, ${entranceY + floatY}px) scale(${entranceScale}) rotate(${floatRotate}deg)`,
        transformOrigin: "center center",
        filter:
          "drop-shadow(0 8px 20px rgba(37, 99, 235, 0.25)) drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          {/* Ring gradient — metallic blue */}
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#93C5FD" />
            <stop offset="30%" stopColor="#60A5FA" />
            <stop offset="60%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          {/* Transparent lens mask — white = visible, black = transparent */}
          <mask id="lensMask">
            <rect width={size} height={size} fill="white" />
            <circle cx={lensCx} cy={lensCy} r={lensR - 8} fill="black" />
          </mask>

          {/* Handle gradient */}
          <linearGradient
            id="handleGrad"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
        </defs>

        {/* Everything except the lens hole */}
        <g mask="url(#lensMask)">
          {/* Glass ring */}
          <circle
            cx={lensCx}
            cy={lensCy}
            r={lensR}
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth={12}
          />

          {/* Inner ring highlight */}
          <circle
            cx={lensCx}
            cy={lensCy}
            r={lensR - 6}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />

          {/* Outer ring shadow */}
          <circle
            cx={lensCx}
            cy={lensCy}
            r={lensR + 2}
            fill="none"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth={1}
          />
        </g>

        {/* Very subtle lens tint (not opaque) */}
        <circle
          cx={lensCx}
          cy={lensCy}
          r={lensR - 8}
          fill="rgba(219, 234, 254, 0.08)"
        />

        {/* Specular highlight on lens */}
        <ellipse
          cx={lensCx - lensR * 0.25}
          cy={lensCy - lensR * 0.3}
          rx={lensR * 0.35}
          ry={lensR * 0.18}
          fill="rgba(255,255,255,0.15)"
          transform={`rotate(-20 ${lensCx} ${lensCy})`}
        />

        {/* Handle */}
        <line
          x1={lensCx + lensR * 0.6}
          y1={lensCy + lensR * 0.6}
          x2={lensCx + lensR * 1.35}
          y2={lensCy + lensR * 1.35}
          stroke="url(#handleGrad)"
          strokeWidth={16}
          strokeLinecap="round"
        />

        {/* Handle highlight */}
        <line
          x1={lensCx + lensR * 0.65}
          y1={lensCy + lensR * 0.55}
          x2={lensCx + lensR * 1.25}
          y2={lensCy + lensR * 1.15}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* Handle shadow */}
        <line
          x1={lensCx + lensR * 0.65}
          y1={lensCy + lensR * 0.7}
          x2={lensCx + lensR * 1.3}
          y2={lensCy + lensR * 1.4}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
