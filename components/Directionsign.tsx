"use client";

import { Text } from "@react-three/drei";

type Entry = { label: string; arrow: string; color: string };

type DirectionSignProps = {
  position: [number, number, number];
  entries: Entry[]; // rendered top-to-bottom, in the order given
};

/**
 * A roadside signpost planted just before the junction — a stacked
 * plank for each destination (arrow + label), like a real intersection
 * sign. `entries` is data-driven so adding a fifth section later is
 * just one more array entry, no new component needed.
 */
export default function DirectionSign({ position, entries }: DirectionSignProps) {
  const plankGap = 0.9;
  const topY = 3.2 + entries.length * plankGap;

  return (
    <group position={position}>
      {/* pole, tall enough to hold every plank */}
      <mesh position={[0, topY / 2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, topY, 8]} />
        <meshStandardMaterial color="#1a1a24" metalness={0.85} roughness={0.3} />
      </mesh>

      {entries.map((e, i) => (
        <group key={e.label} position={[0, topY - i * plankGap, 0]}>
          <mesh>
            <boxGeometry args={[2.6, 0.7, 0.1]} />
            <meshBasicMaterial color={e.color} toneMapped={false} />
          </mesh>
          <Text
            position={[0, 0, 0.06]}
            fontSize={0.28}
            letterSpacing={0.03}
            color="#050508"
            anchorX="center"
            anchorY="middle"
          >
            {`${e.arrow} ${e.label}`}
          </Text>
        </group>
      ))}

      <pointLight position={[0, topY * 0.65, 1.5]} color="#ffffff" intensity={12} distance={14} />
    </group>
  );
}