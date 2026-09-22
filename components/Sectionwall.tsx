"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

type SectionWallProps = {
  position: [number, number, number];
  rotationY?: number; // aim the screen back toward the junction/incoming road
  color: string;
  heading: string; // big title, e.g. "SKILLS"
  lines: string[]; // shown as smaller lines beneath the heading (first 4)
};

/**
 * Landmark "screen wall" at the end of a branch road — same visual
 * language as the Contact wall at the end of the main road. Used for
 * both Skills and Projects; just the heading/lines/color/facing differ.
 */
export default function SectionWall({
  position,
  rotationY = 0,
  color,
  heading,
  lines,
}: SectionWallProps) {
  const glow = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (glow.current) glow.current.opacity = 0.55 + Math.sin(clock.getElapsedTime() * 1.2) * 0.1;
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* building body */}
      <mesh position={[0, 8, -2]}>
        <boxGeometry args={[12, 16, 6]} />
        <meshStandardMaterial color="#0b0b13" roughness={0.6} metalness={0.6} />
      </mesh>

      {/* frame */}
      <mesh position={[0, 8.5, 1.05]}>
        <planeGeometry args={[9.5, 7.5]} />
        <meshBasicMaterial color="#1a1a24" toneMapped={false} />
      </mesh>

      {/* glowing screen */}
      <mesh position={[0, 8.5, 1.1]}>
        <planeGeometry args={[9, 7]} />
        <meshBasicMaterial ref={glow} color={color} transparent opacity={0.55} toneMapped={false} />
      </mesh>

      {/* heading */}
      <Text
        position={[0, 10.6, 1.16]}
        fontSize={1.1}
        letterSpacing={0.05}
        color="#0a0510"
        anchorX="center"
        anchorY="middle"
      >
        {heading}
      </Text>

      {/* body lines, stacked under the heading */}
      {lines.slice(0, 4).map((line, i) => (
        <Text
          key={i}
          position={[0, 9.1 - i * 0.75, 1.16]}
          fontSize={0.32}
          color="#0a0510"
          anchorX="center"
          anchorY="middle"
          maxWidth={8}
        >
          {line}
        </Text>
      ))}

      {/* support struts */}
      {[-5.5, 5.5].map((x) => (
        <mesh key={x} position={[x, 4, 3]}>
          <boxGeometry args={[0.25, 8, 0.25]} />
          <meshStandardMaterial color="#1a1a24" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}

      <pointLight position={[0, 8.5, 6]} color={color} intensity={45} distance={32} />
      <pointLight position={[0, 2, 6]} color={color} intensity={16} distance={16} />
    </group>
  );
}