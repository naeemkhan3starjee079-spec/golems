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

  // Gentle floating rotation
  const rotY = Math.sin(frame * 0.015) * 0.08 * entranceFactor;
  const rotX = Math.cos(frame * 0.012) * 0.05 * entranceFactor;

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
          <torusGeometry args={[1.0, 0.15, 32, 64]} />
          <meshPhysicalMaterial
            color="#93C5FD"
            metalness={0.15}
            roughness={0.1}
            clearcoat={1.0}
            clearcoatRoughness={0.03}
            envMapIntensity={2.0}
          />
        </mesh>

        {/* Outer ring highlight */}
        <mesh>
          <torusGeometry args={[1.0, 0.16, 32, 64]} />
          <meshPhysicalMaterial
            color="#DBEAFE"
            metalness={0.05}
            roughness={0.2}
            transparent
            opacity={0.35}
          />
        </mesh>

        {/* Lens — transparent glass disc */}
        <mesh>
          <circleGeometry args={[0.88, 64]} />
          <meshPhysicalMaterial
            color="#EFF6FF"
            metalness={0.0}
            roughness={0.0}
            transparent
            opacity={0.15}
            transmission={0.9}
            thickness={0.15}
            ior={1.5}
          />
        </mesh>

        {/* Lens highlight — subtle bright spot */}
        <mesh position={[-0.25, 0.2, 0.02]}>
          <circleGeometry args={[0.35, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
        </mesh>

        {/* Handle — cylinder from ring down-right */}
        <mesh position={[0.85, -0.85, 0]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.14, 0.16, 1.2, 16]} />
          <meshPhysicalMaterial
            color="#60A5FA"
            metalness={0.2}
            roughness={0.12}
            clearcoat={0.9}
            clearcoatRoughness={0.05}
          />
        </mesh>

        {/* Handle cap — rounded end */}
        <mesh position={[1.28, -1.28, 0]}>
          <sphereGeometry args={[0.17, 16, 16]} />
          <meshPhysicalMaterial
            color="#3B82F6"
            metalness={0.3}
            roughness={0.1}
            clearcoat={1.0}
          />
        </mesh>

        {/* Handle highlight streak */}
        <mesh position={[0.78, -0.78, 0.08]} rotation={[0, 0, Math.PI / 4]}>
          <cylinderGeometry args={[0.035, 0.035, 1.0, 8]} />
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

  const floatX = Math.cos(frame * 0.018) * 14 * entranceFactor;
  const floatY = Math.sin(frame * 0.022) * 10 * entranceFactor;

  const entranceScale = 0.3 + 0.7 * entrance;
  const entranceY = -60 * (1 - entrance);

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
        camera={{ position: [0, 0, 3.5], fov: 40 }}
        style={{ width: size, height: size }}
      >
        <MagnifyingGlassScene frame={frame} fps={fps} delay={delay} />
      </ThreeCanvas>
    </div>
  );
};
