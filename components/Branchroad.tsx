"use client";

import { useMemo } from "react";
import { MeshReflectorMaterial } from "@react-three/drei";

type BranchRoadProps = {
  z: number; // where the branch meets the main road
  fromX: number; // start x (usually the main road's edge)
  toX: number; // end x (where the branch's landmark wall sits)
};

/**
 * One side-road segment running along X, from the main road's edge out
 * to a branch's end. Same reflective-road styling as the main road,
 * just rotated 90°. Called once per branch (left and right each pass
 * their own fromX/toX), so it only ever draws in one direction.
 */
export default function BranchRoad({ z, fromX, toX }: BranchRoadProps) {
  const length = Math.abs(toX - fromX);
  const centerX = (fromX + toX) / 2;

  const dashes = useMemo(() => {
    const count = Math.max(1, Math.floor(length / 10));
    const start = Math.min(fromX, toX) + 5;
    return Array.from({ length: count }, (_, i) => start + i * 10);
  }, [length, fromX, toX]);

  return (
    <group position={[0, 0, z]}>
      <mesh position={[centerX, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length, 12]} />
        <MeshReflectorMaterial
          resolution={512}
          mixBlur={1}
          mixStrength={45}
          blur={[300, 100]}
          roughness={0.85}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#07070d"
          metalness={0.75}
        />
      </mesh>

      {/* lane dashes, running along the branch */}
      {dashes.map((x, i) => (
        <mesh key={i} position={[x, -0.47, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.6, 0.22]} />
          <meshBasicMaterial color="#243048" toneMapped={false} />
        </mesh>
      ))}

      {/* glowing center strip */}
      <mesh position={[centerX, -0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[length, 0.06]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.35} toneMapped={false} />
      </mesh>
    </group>
  );
}