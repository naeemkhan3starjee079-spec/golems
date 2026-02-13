/**
 * BackgroundMusic — plays background audio with fade in/out and volume ducking.
 *
 * Uses Sequence for timeline positioning (startFrom = composition frame).
 * Volume automatically fades in/out. Ducking requires parent coordination via duckToVolume prop.
 */

import * as React from "react";
import { Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { clampedInterpolate } from "../../lib/motion";
import type { BackgroundMusicProps } from "../../lib/audio";

const BackgroundMusicInner: React.FC<
  Omit<BackgroundMusicProps, "startFrom"> & { parentDurationInFrames: number }
> = ({
  src,
  volume = 0.3,
  fadeInFrames = 30,
  fadeOutFrames = 30,
  duckToVolume,
  loop = true,
  parentDurationInFrames,
}) => {
  const frame = useCurrentFrame();

  // Fade in from start of this Sequence
  const fadeIn = clampedInterpolate(frame, [0, fadeInFrames], [0, 1]);

  // Fade out at end of parent composition
  const fadeOut = clampedInterpolate(
    frame,
    [parentDurationInFrames - fadeOutFrames, parentDurationInFrames],
    [1, 0],
  );

  // AIDEV-TODO: duckToVolume needs parent to pass an "isNarrationPlaying" signal.
  // For now, base volume only. When narration support is wired, multiply by
  // (isNarrationPlaying ? duckToVolume : 1.0) here.
  const currentVolume = volume * fadeIn * fadeOut;

  return (
    <Audio
      src={staticFile(src)}
      volume={currentVolume}
      loop={loop}
    />
  );
};

export const BackgroundMusic: React.FC<BackgroundMusicProps> = ({
  startFrom = 0,
  ...rest
}) => {
  const { durationInFrames } = useVideoConfig();

  return (
    <Sequence from={startFrom} layout="none">
      <BackgroundMusicInner {...rest} parentDurationInFrames={durationInFrames - startFrom} />
    </Sequence>
  );
};
