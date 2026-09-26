"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

type Entry = { label: string; arrow: string; color: string };

type DirectionSignProps = {
  position: [number, number, number];
  entries: Entry[]; // rendered top-to-bottom, in the order given
};

/**
 * A roadside signpost planted just before the junction — a stacked
 * neon plank for each destination (arrow + label), like a real
 * intersection sign but lit up like a cyberpunk street marker.
 *
 * `entries` is data-driven so adding a fifth section later is just
 * one more array entry, no new component needed.
 */
export default function DirectionSign({ position, entries }: DirectionSignProps) {
  const plankGap = 0.9;
  const topY = 3.2 + entries.length * plankGap;

  /* ---------------- refs ---------------- */
  const groupRef = useRef<THREE.Group>(null);
  const poleStripRef = useRef<THREE.MeshBasicMaterial>(null);
  const polePulseRef = useRef<THREE.Mesh>(null);
  const polePulseMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const topBeaconRef = useRef<THREE.MeshBasicMaterial>(null);
  const topBeaconLightRef = useRef<THREE.PointLight>(null);

  const plankMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const plankGlowMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const plankEdgeMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const arrowMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const arrowMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const plankLights = useRef<(THREE.PointLight | null)[]>([]);

  /* ---------------- animation loop ---------------- */
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    /* whole sign subtle sway */
    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(t * 0.7) * 0.008;
    }

    /* pole neon strip flows upward */
    if (poleStripRef.current) {
      poleStripRef.current.opacity = 0.6 + Math.sin(t * 4) * 0.35;
    }

    /* pole energy pulse travels up */
    if (polePulseRef.current && polePulseMatRef.current) {
      const p = (t * 0.6) % 1;
      polePulseRef.current.position.y = 0.5 + p * (topY - 1);
      polePulseMatRef.current.opacity = (1 - p) * 0.8;
    }

    /* top beacon blink */
    const blink = Math.sin(t * 3.2) > 0.3 ? 1 : 0.05;
    if (topBeaconRef.current) topBeaconRef.current.opacity = blink;
    if (topBeaconLightRef.current) topBeaconLightRef.current.intensity = 18 * blink;

    /* per-plank animation */
    entries.forEach((_, i) => {
      const phase = i * 1.7;

      // plank surface subtle pulse
      const mat = plankMats.current[i];
      if (mat) mat.opacity = 0.85 + Math.sin(t * 2.4 + phase) * 0.12;

      // glow behind plank
      const glow = plankGlowMats.current[i];
      if (glow) glow.opacity = 0.28 + Math.sin(t * 1.8 + phase) * 0.14;

      // edge tube flicker
      const edge = plankEdgeMats.current[i];
      if (edge) {
        const flick = Math.sin(t * 9 + phase) > 0.93 ? 0.2 : 1;
        edge.opacity = 0.7 * flick + Math.sin(t * 5 + phase) * 0.1;
      }

      // arrow indicator slides left ↔ right
      const arrowMesh = arrowMeshes.current[i];
      const arrowMat = arrowMats.current[i];
      if (arrowMesh) {
        const slide = Math.sin(t * 2.2 + phase) * 0.22;
        arrowMesh.position.x = slide;
      }
      if (arrowMat) {
        arrowMat.opacity = 0.7 + Math.sin(t * 6 + phase) * 0.3;
      }

      // plank light breathing
      const light = plankLights.current[i];
      if (light) {
        light.intensity = 6 + Math.sin(t * 2.5 + phase) * 3;
      }
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {/* ============================================================ */}
      {/* POLE                                                          */}
      {/* ============================================================ */}
      <mesh position={[0, topY / 2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, topY, 8]} />
        <meshStandardMaterial color="#1a1a24" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* pole neon strip (front facing) */}
      <mesh position={[0, topY / 2, 0.13]}>
        <boxGeometry args={[0.05, topY - 0.4, 0.02]} />
        <meshBasicMaterial
          ref={poleStripRef}
          color="#00f0ff"
          transparent
          opacity={0.9}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* pole energy pulse (travels up) */}
      <mesh ref={polePulseRef} position={[0, 0.5, 0.14]}>
        <planeGeometry args={[0.22, 0.5]} />
        <meshBasicMaterial
          ref={polePulseMatRef}
          color="#a6ff00"
          transparent
          opacity={0.8}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* pole base cap */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.24, 10]} />
        <meshStandardMaterial color="#0b0b13" metalness={0.9} roughness={0.4} />
      </mesh>

      {/* ============================================================ */}
      {/* TOP BEACON                                                    */}
      {/* ============================================================ */}
      <mesh position={[0, topY + 0.18, 0]}>
        <sphereGeometry args={[0.14, 10, 10]} />
        <meshBasicMaterial
          ref={topBeaconRef}
          color="#ff2bd6"
          transparent
          toneMapped={false}
        />
      </mesh>
      <pointLight
        ref={topBeaconLightRef}
        position={[0, topY + 0.18, 0]}
        color="#ff2bd6"
        intensity={18}
        distance={10}
      />

      {/* ============================================================ */}
      {/* PLANKS                                                        */}
      {/* ============================================================ */}
      {entries.map((e, i) => (
        <group key={e.label} position={[0, topY - i * plankGap, 0]}>
          {/* glow halo behind the plank */}
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[3.2, 1.1]} />
            <meshBasicMaterial
              ref={(m) => {
                plankGlowMats.current[i] = m;
              }}
              color={e.color}
              transparent
              opacity={0.35}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* main plank body */}
          <mesh>
            <boxGeometry args={[2.6, 0.7, 0.1]} />
            <meshStandardMaterial
              color="#0b0b13"
              metalness={0.75}
              roughness={0.35}
            />
          </mesh>

          {/* colored face overlay */}
          <mesh position={[0, 0, 0.052]}>
            <planeGeometry args={[2.56, 0.66]} />
            <meshBasicMaterial
              ref={(m) => {
                plankMats.current[i] = m;
              }}
              color={e.color}
              transparent
              opacity={0.92}
              toneMapped={false}
            />
          </mesh>

          {/* top neon edge tube */}
          <mesh position={[0, 0.36, 0.055]}>
            <boxGeometry args={[2.6, 0.03, 0.02]} />
            <meshBasicMaterial
              ref={(m) => {
                plankEdgeMats.current[i] = m;
              }}
              color={e.color}
              transparent
              opacity={0.9}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* bottom neon edge tube */}
          <mesh position={[0, -0.36, 0.055]}>
            <boxGeometry args={[2.6, 0.03, 0.02]} />
            <meshBasicMaterial
              color={e.color}
              transparent
              opacity={0.6}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* label text (dark on the colored plank) */}
          <Text
            position={[0, 0, 0.07]}
            fontSize={0.28}
            letterSpacing={0.03}
            color="#050508"
            anchorX="center"
            anchorY="middle"
          >
            {e.label}
          </Text>

          {/* animated arrow indicator on the left */}
          <mesh
            position={[-1.05, 0, 0.08]}
            ref={(m) => {
              arrowMeshes.current[i] = m;
            }}
          >
            <planeGeometry args={[0.45, 0.3]} />
            <meshBasicMaterial
              ref={(m) => {
                arrowMats.current[i] = m;
              }}
              color="#050508"
              transparent
              opacity={0.9}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>

          {/* tiny LED stud on the right cap */}
          <mesh position={[1.25, 0, 0.08]}>
            <circleGeometry args={[0.06, 8]} />
            <meshBasicMaterial
              color="#a6ff00"
              transparent
              opacity={0.95}
              toneMapped={false}
            />
          </mesh>

          {/* per-plank colored light */}
          <pointLight
            ref={(l) => {
              plankLights.current[i] = l;
            }}
            position={[0, 0, 1.2]}
            color={e.color}
            intensity={6}
            distance={8}
          />
        </group>
      ))}

      {/* ============================================================ */}
      {/* GENERAL FLOODLIGHT                                            */}
      {/* ============================================================ */}
      <pointLight position={[0, topY * 0.65, 1.5]} color="#ffffff" intensity={12} distance={14} />
    </group>
  );
}