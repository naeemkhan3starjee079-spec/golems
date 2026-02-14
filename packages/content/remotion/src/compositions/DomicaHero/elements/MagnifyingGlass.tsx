/**
 * MagnifyingGlass — 3D magnifying glass using React Three Fiber via @remotion/three.
 * Thick blue glass ring, cylindrical handle, transparent lens with specular highlights.
 * Frame-driven animation (no useFrame from R3F — uses useCurrentFrame from Remotion).
 */

import { useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { springProgress, clampedInterpolate } from "../../../lib";

type Props = {
  x: number;
  y: number;
  delay: number;
  size?: number;
};

/** 3D scene contents — all animation driven by Remotion frame */
const MagnifyingGlassScene: React.FC<{ frame: number; fps: number; delay: number }> = ({
  frame,
  fps,
  delay,
}) => {
  const entranceFactor = clampedInterpolate(frame - delay, [0, 30], [0, 1]);
  // Decay: big movement on entrance, settles to gentle idle
  const t = Math.max(0, frame - delay);
  const entranceSwing = Math.exp(-t * 0.04); // decays from 1 → ~0 over 60 frames

  // Big rotation on entrance that relaxes to subtle idle
  const rotY = Math.sin(t * 0.06) * (0.4 * entranceSwing + 0.06) * entranceFactor;
  const rotX = Math.cos(t * 0.05) * (0.3 * entranceSwing + 0.04) * entranceFactor;

  return (
    <>
      {/* Lighting for realistic 3D look */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} color="#ffffff" />
      <directionalLight position={[-2, 1, 3]} intensity={0.4} color="#93C5FD" />
      <pointLight position={[0, 2, 4]} intensity={0.5} color="#DBEAFE" />

      <group rotation={[rotX - 0.15, rotY + 0.3, -0.45]} position={[0, 0.1, 0]}>
        {/* Ring — torus (thick blue glass rim) */}
        <mesh>
          <torusGeometry args={[1.0, 0.19, 32, 64]} />
          <meshPhysicalMaterial
            color="#7CB8F8"
            metalness={0.18}
            roughness={0.08}
            clearcoat={1.0}
            clearcoatRoughness={0.03}
            envMapIntensity={2.0}
          />
        </mesh>

        {/* Outer ring highlight */}
        <mesh>
          <torusGeometry args={[1.0, 0.20, 32, 64]} />
          <meshPhysicalMaterial
            color="#DBEAFE"
            metalness={0.05}
            roughness={0.2}
            transparent
            opacity={0.3}
          />
        </mesh>

        {/* Lens — visible glass disc */}
        <mesh position={[0, 0, -0.02]}>
          <circleGeometry args={[0.82, 64]} />
          <meshPhysicalMaterial
            color="#DBEAFE"
            metalness={0.0}
            roughness={0.05}
            transparent
            opacity={0.25}
          />
        </mesh>

        {/* Lens highlight — bright reflection spot */}
        <mesh position={[-0.2, 0.22, 0.01]}>
          <circleGeometry args={[0.3, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
        </mesh>

        {/* Handle — cylinder flush with ring edge */}
        <mesh position={[1.16, -1.16, 0]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.13, 0.15, 0.9, 16]} />
          <meshPhysicalMaterial
            color="#60A5FA"
            metalness={0.2}
            roughness={0.12}
            clearcoat={0.9}
            clearcoatRoughness={0.05}
          />
        </mesh>

        {/* Handle cap — rounded end */}
        <mesh position={[1.48, -1.48, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshPhysicalMaterial
            color="#3B82F6"
            metalness={0.3}
            roughness={0.1}
            clearcoat={1.0}
          />
        </mesh>

        {/* Handle highlight streak */}
        <mesh position={[1.1, -1.1, 0.08]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
          <meshBasicMaterial color="#93C5FD" transparent opacity={0.35} />
        </mesh>
      </group>
    </>
  );
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

  const t = Math.max(0, frame - delay);
  const swing = Math.exp(-t * 0.04); // decays over ~60 frames

  // Big float on entrance, settles to gentle idle
  const floatX = Math.cos(t * 0.05) * (40 * swing + 8) * entranceFactor;
  const floatY = Math.sin(t * 0.04) * (30 * swing + 6) * entranceFactor;

  const entranceScale = 0.3 + 0.7 * entrance;
  const entranceY = -80 * (1 - entrance);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        opacity,
        transform: `translate(${floatX}px, ${entranceY + floatY}px) scale(${entranceScale})`,
        transformOrigin: "center center",
        filter:
          "drop-shadow(0 10px 30px rgba(37, 99, 235, 0.25)) drop-shadow(0 4px 10px rgba(0,0,0,0.1))",
      }}
    >
      <ThreeCanvas
        width={size}
        height={size}
        camera={{ position: [0.4, -0.4, 6], fov: 40 }}
        style={{ width: size, height: size }}
      >
        <MagnifyingGlassScene frame={frame} fps={fps} delay={delay} />
      </ThreeCanvas>
    </div>
  );
};
