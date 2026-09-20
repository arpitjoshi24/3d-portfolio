"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

type BillboardProps = {
  z: number;
  label: string;
  color: string;
  roadHalfWidth?: number; // distance from center to each support post
  height?: number; // clearance height of the arch above the road
};

/**
 * An overhead gantry sign spanning the road — like a highway exit sign.
 * Readable from both directions of travel (text is duplicated back-to-back),
 * and pulses gently so it reads as a landmark, not wallpaper.
 */
export default function Billboard({
  z,
  label,
  color,
  roadHalfWidth = 6.2,
  height = 7.5,
}: BillboardProps) {
  const glow = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!glow.current) return;
    glow.current.opacity = 0.6 + Math.sin(clock.getElapsedTime() * 1.6 + z) * 0.15;
  });

  return (
    <group position={[0, 0, z]}>
      {/* support posts, just outside the driveable road */}
      {[-roadHalfWidth, roadHalfWidth].map((x) => (
        <mesh key={x} position={[x, height / 2, 0]}>
          <boxGeometry args={[0.3, height, 0.3]} />
          <meshStandardMaterial color="#1a1a24" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}

      {/* crossbeam */}
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[roadHalfWidth * 2 + 0.6, 0.3, 0.3]} />
        <meshStandardMaterial color="#1a1a24" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* glowing panel the label sits on */}
      <mesh position={[0, height, 0]}>
        <boxGeometry args={[roadHalfWidth * 1.6, 1.7, 0.12]} />
        <meshBasicMaterial ref={glow} color={color} transparent opacity={0.7} toneMapped={false} />
      </mesh>

      {/* label, facing both directions so it reads coming and going */}
      {[0, Math.PI].map((ry) => (
        <Text
          key={ry}
          position={[0, height, ry === 0 ? 0.1 : -0.1]}
          rotation={[0, ry, 0]}
          fontSize={0.8}
          letterSpacing={0.12}
          color="#050505"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      ))}

      <pointLight position={[0, height, 0]} color={color} intensity={22} distance={22} />
    </group>
  );
}