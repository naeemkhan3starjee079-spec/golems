/**
 * LocationPin — 3D animated pin with DomicaMarker SVG embedded on top.
 * Keeps bounce entrance + pulse animation from before, but replaces
 * the generic inner circle with Domica's actual marker (blue circle + eye + house).
 */

import { useCurrentFrame, useVideoConfig } from "remotion";
import { springProgress, clampedInterpolate } from "../../../lib";

type Props = {
  x: number;
  y: number;
  delay: number;
  size?: number;
};

/** Domica's actual map marker — blue circle with white eye shape + house icon */
const DomicaMarkerIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="20" fill="#2563EB" />
    <path
      d="M20 8C12.5 8 7 15.5 4.5 19.5C3.5 21 3.5 21.5 4.5 23C7 27 12.5 34.5 20 34.5C27.5 34.5 33 27 35.5 23C36.5 21.5 36.5 21 35.5 19.5C33 15.5 27.5 8 20 8Z"
      fill="white"
    />
    <circle cx="20" cy="21" r="10" fill="#2563EB" />
    <path
      d="M20.2 13.5C20.05 13.35 19.8 13.35 19.65 13.5L13.5 19.7C13.35 19.85 13.35 20.1 13.5 20.25L14.25 21C14.35 21.1 14.4 21.2 14.4 21.35V25.5C14.4 25.75 14.6 25.95 14.85 25.95H17.5C17.75 25.95 17.95 25.75 17.95 25.5V22C17.95 21.75 18.15 21.55 18.4 21.55H21.6C21.85 21.55 22.05 21.75 22.05 22V25.5C22.05 25.75 22.25 25.95 22.5 25.95H25.15C25.4 25.95 25.6 25.75 25.6 25.5V21.35C25.6 21.2 25.65 21.1 25.75 21L26.5 20.25C26.65 20.1 26.65 19.85 26.5 19.7L20.2 13.5Z"
      fill="white"
    />
  </svg>
);

export const LocationPin: React.FC<Props> = ({ x, y, delay, size = 50 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = springProgress(frame, fps, "bouncy", delay);
  const opacity = clampedInterpolate(frame - delay, [0, 5], [0, 1]);
  const bounceY = -30 * (1 - progress);
  const bounceScale = 0.5 + 0.5 * progress;

  const entranceDone = frame - delay > 25;
  const pulse = entranceDone ? 1.0 + 0.05 * Math.sin((frame / 90) * Math.PI * 2) : 1;

  // DomicaMarker sits on top of the 3D pin — sized to fill the pin head area
  const markerSize = size * 0.7;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity,
        transform: `translateY(${bounceY}px) scale(${bounceScale * pulse})`,
        transformOrigin: "center bottom",
        filter: "drop-shadow(0 6px 12px rgba(37, 99, 235, 0.35)) drop-shadow(0 2px 4px rgba(0,0,0,0.15))",
      }}
    >
      {/* 3D pin body — teardrop shape with gradient */}
      <svg width={size} height={size * 1.3} viewBox="0 0 40 52" fill="none">
        <defs>
          <linearGradient id={`pinBody-${x}-${y}`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="30%" stopColor="#3B82F6" />
            <stop offset="60%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
          <radialGradient id={`pinGloss-${x}-${y}`} cx="0.35" cy="0.25" r="0.4">
            <stop offset="0%" stopColor="white" stopOpacity="0.6" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Pin body */}
        <path
          d="M20 0C9 0 0 9 0 20C0 35 20 52 20 52C20 52 40 35 40 20C40 9 31 0 20 0Z"
          fill={`url(#pinBody-${x}-${y})`}
        />
        {/* Glossy overlay */}
        <path
          d="M20 0C9 0 0 9 0 20C0 35 20 52 20 52C20 52 40 35 40 20C40 9 31 0 20 0Z"
          fill={`url(#pinGloss-${x}-${y})`}
        />
        {/* Edge highlight */}
        <path
          d="M8 10 Q4 16 6 24"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Specular dot */}
        <circle cx="15" cy="12" r="3" fill="white" opacity="0.4" />
      </svg>

      {/* DomicaMarker icon — centered on the pin head */}
      <div
        style={{
          position: "absolute",
          top: (size * 1.3 * 0.37) - (markerSize / 2),
          left: (size - markerSize) / 2,
          borderRadius: "50%",
          overflow: "hidden",
        }}
      >
        <DomicaMarkerIcon size={markerSize} />
      </div>
    </div>
  );
};
