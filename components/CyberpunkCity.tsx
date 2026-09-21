"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Text, MeshReflectorMaterial, Sparkles, Stars } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import Car, { type Section } from "./Car";
import ContactWall from "./Contactwall";
import InfoWall from "./InfoWall";
import { JUNCTION_Z, SIDE_LENGTH, SIDE_WIDTH } from "../layout";

/* ---------------- palette + helpers ---------------- */

const NEON = {
  cyan: "#00f0ff",
  pink: "#ff2bd6",
  purple: "#9d4bff",
  lime: "#a6ff00",
  amber: "#ffb020",
};

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- content (edit here) ---------------- */

const ROAD_HALF_LENGTH = 170;

const CAMERA_CONFIG = {
  position: [0, 3.2, 157] as [number, number, number],
  fov: 55,
  near: 0.1,
  far: 700,
};

// Only Contact needs proximity detection now (it shows the overlay).
// Skills + Projects are walls you read straight off the screen.
const SECTIONS: Section[] = [{ id: "contact", z: -150, range: 16 }];

const COLORS = {
  skills: NEON.cyan,
  projects: NEON.purple,
  contact: NEON.lime,
};

const SKILLS_WALL = {
  title: "SKILLS",
  subtitle: "LOADED MODULES",
  lines: [
    "React / Next.js",
    "TypeScript",
    "Three.js & React Three Fiber",
    "Node.js / REST & GraphQL APIs",
  ],
};

const PROJECTS_WALL = {
  title: "PROJECTS",
  subtitle: "SELECTED WORK",
  lines: [
    "PROJECT ONE // what it is + stack",
    "PROJECT TWO // what it is + stack",
    "PROJECT THREE // link to repo",
  ],
};

/* ---------------- main road (wet, reflective) ---------------- */

function Road() {
  const length = ROAD_HALF_LENGTH * 2;
  const dashes = useMemo(
    () =>
      Array.from({ length: Math.floor(length / 10) }, (_, i) => -ROAD_HALF_LENGTH + 5 + i * 10)
        // no lane dashes through the junction
        .filter((z) => Math.abs(z - JUNCTION_Z) > SIDE_WIDTH / 2),
    [length]
  );

  return (
    <group>
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, length]} />
        <MeshReflectorMaterial
          resolution={1024}
          mixBlur={1}
          mixStrength={55}
          blur={[300, 100]}
          roughness={0.7}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0e0e1c"
          metalness={0.7}
        />
      </mesh>

      {dashes.map((z, i) => (
        <mesh key={i} position={[0, -0.47, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.22, 3.6]} />
          <meshBasicMaterial color="#3a4a70" toneMapped={false} />
        </mesh>
      ))}

      <mesh position={[0, -0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.06, length]} />
        <meshBasicMaterial color={NEON.cyan} transparent opacity={0.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ---------------- side roads (left = skills, right = projects) ---------------- */
// Uses a glossy standard material instead of a 2nd reflector — a second
// MeshReflectorMaterial would re-render the whole scene again.

function SideRoad({ sx }: { sx: 1 | -1 }) {
  const len = SIDE_LENGTH - 6;
  const cx = sx * (6 + len / 2);
  const accent = sx < 0 ? NEON.cyan : NEON.purple;
  const dashes = useMemo(
    () => Array.from({ length: Math.floor(len / 10) }, (_, i) => sx * (11 + i * 10)),
    [len, sx]
  );

  return (
    <group>
      <mesh position={[cx, -0.49, JUNCTION_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[len, SIDE_WIDTH]} />
        <meshStandardMaterial color="#0e0e1c" roughness={0.25} metalness={0.85} />
      </mesh>

      {dashes.map((x, i) => (
        <mesh key={i} position={[x, -0.47, JUNCTION_Z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.6, 0.22]} />
          <meshBasicMaterial color="#3a4a70" toneMapped={false} />
        </mesh>
      ))}

      {/* glowing centre line + edge strips */}
      <mesh position={[cx, -0.46, JUNCTION_Z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[len, 0.06]} />
        <meshBasicMaterial color={accent} transparent opacity={0.5} toneMapped={false} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[cx, -0.46, JUNCTION_Z + s * (SIDE_WIDTH / 2 - 0.15)]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[len, 0.12]} />
          <meshBasicMaterial color={s < 0 ? NEON.cyan : NEON.pink} transparent opacity={0.6} toneMapped={false} />
        </mesh>
      ))}

      {/* side-road sidewalks */}
      {[-1, 1].map((s) => (
        <group key={s} position={[sx * (9 + (SIDE_LENGTH - 9) / 2), -0.2, JUNCTION_Z + s * (SIDE_WIDTH / 2 + 0.75)]}>
          <mesh>
            <boxGeometry args={[SIDE_LENGTH - 9, 0.6, 1.5]} />
            <meshStandardMaterial color="#181826" roughness={0.55} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.3, -s * 0.7]}>
            <boxGeometry args={[SIDE_LENGTH - 9, 0.06, 0.08]} />
            <meshBasicMaterial color={NEON.cyan} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------------- main-road sidewalk (with junction gap) ---------------- */

function Sidewalk({ x, z0, z1 }: { x: number; z0: number; z1: number }) {
  const inner = x > 0 ? -1.4 : 1.4;
  const length = z1 - z0;

  return (
    <group position={[x, -0.2, (z0 + z1) / 2]}>
      <mesh>
        <boxGeometry args={[3, 0.6, length]} />
        <meshStandardMaterial color="#181826" roughness={0.55} metalness={0.5} />
      </mesh>
      <mesh position={[inner, 0.28, 0]}>
        <boxGeometry args={[0.1, 0.06, length]} />
        <meshBasicMaterial color={NEON.cyan} toneMapped={false} />
      </mesh>
      <mesh position={[inner, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.9, length]} />
        <meshBasicMaterial color={NEON.cyan} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ---------------- building ---------------- */

type BuildingProps = {
  position: [number, number, number];
  size: [number, number, number];
  accent?: string;
  seed?: number;
  rotationY?: number; // for buildings along the side roads
  face?: number; // which local side gets the neon trim
  light?: boolean; // side-road buildings skip the point light (perf)
};

function Building({
  position,
  size,
  accent = NEON.cyan,
  seed = 1,
  rotationY = 0,
  face: faceProp,
  light = true,
}: BuildingProps) {
  const [w, h, d] = size;
  const instRef = useRef<THREE.InstancedMesh>(null);
  const face = faceProp ?? (position[0] < 0 ? 1 : -1);

  const windows = useMemo(() => {
    const rand = mulberry32(seed);
    const palette = ["#00f0ff", "#ff2bd6", "#9d4bff", "#ffe066", "#00ff9d"];
    const list: { y: number; z: number; side: number; color: THREE.Color }[] = [];
    const cols = Math.max(2, Math.floor((d - 1.2) / 1.1));
    const rows = Math.max(2, Math.floor((h - 2) / 1.1));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rand() > 0.6) continue;
        const y = -h / 2 + 1.2 + r * 1.1;
        const z = -d / 2 + 0.9 + c * 1.1;
        const color = new THREE.Color(palette[Math.floor(rand() * palette.length)]);
        color.multiplyScalar(0.35 + rand() * 0.85);
        list.push({ y, z, side: 1, color });
        if (rand() > 0.45) list.push({ y, z, side: -1, color });
      }
    }
    return list;
  }, [d, h, seed]);

  useEffect(() => {
    const inst = instRef.current;
    if (!inst) return;
    const dummy = new THREE.Object3D();
    windows.forEach((win, i) => {
      dummy.position.set(win.side * (w / 2 + 0.02), win.y, win.z);
      dummy.rotation.set(0, win.side > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      inst.setColorAt(i, win.color);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  }, [windows, w]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#15152a" roughness={0.5} metalness={0.65} />
      </mesh>

      <instancedMesh ref={instRef} args={[undefined, undefined, windows.length]}>
        <planeGeometry args={[0.45, 0.55]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {[-1, 1].map((s) => (
        <mesh key={s} position={[face * (w / 2 + 0.04), 0, s * (d / 2 - 0.35)]}>
          <boxGeometry args={[0.07, h * 0.92, 0.07]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      ))}

      <mesh position={[face * (w / 2 + 0.04), h / 2 - 0.9, 0]}>
        <boxGeometry args={[0.07, 0.07, d * 0.95]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>

      <mesh position={[0, h / 2 + 1.4, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 2.8, 6]} />
        <meshStandardMaterial color="#2a2a35" metalness={0.9} />
      </mesh>
      <mesh position={[0, h / 2 + 2.9, 0]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>

      {light && (
        <pointLight position={[face * (w / 2 + 0.6), h / 4, 0]} color={accent} intensity={40} distance={26} decay={1.6} />
      )}
    </group>
  );
}

/* ---------------- street light ---------------- */

function StreetLight({
  position,
  color = NEON.cyan,
  withLight = true,
}: {
  position: [number, number, number];
  color?: string;
  withLight?: boolean;
}) {
  const bulb = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const seed = useMemo(() => Math.random() * 100, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const flicker = 0.78 + Math.sin(t * 9 + seed) * 0.12 + Math.random() * 0.1;
    if (bulb.current) bulb.current.opacity = flicker;
    if (light.current) light.current.intensity = 90 * flicker;
  });

  return (
    <group position={position}>
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.07, 0.11, 4.4, 8]} />
        <meshStandardMaterial color="#191922" metalness={0.9} roughness={0.35} />
      </mesh>
      <mesh position={[0, 4.4, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial ref={bulb} color={color} transparent opacity={1} toneMapped={false} />
      </mesh>
      {withLight && (
        <pointLight ref={light} position={[0, 4.4, 0]} color={color} intensity={90} distance={30} decay={1.6} />
      )}
    </group>
  );
}

/* ---------------- chase light rig ---------------- */

function ChaseLight() {
  const key = useRef<THREE.PointLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const rim = useRef<THREE.PointLight>(null);
  const { camera } = useThree();

  useFrame(() => {
    const p = camera.position;
    if (key.current) key.current.position.set(p.x + 2.5, p.y + 4.5, p.z - 7);
    if (fill.current) fill.current.position.set(p.x - 4, p.y + 1.5, p.z + 3);
    if (rim.current) rim.current.position.set(p.x, p.y + 6, p.z + 5);
  });

  return (
    <>
      <pointLight ref={key} color="#dfe9ff" intensity={420} distance={45} decay={1.5} />
      <pointLight ref={fill} color="#9fc0ff" intensity={260} distance={35} decay={1.5} />
      <pointLight ref={rim} color="#c9a6ff" intensity={300} distance={40} decay={1.5} />
    </>
  );
}

/* ---------------- small shopfront neon sign ---------------- */

function NeonSign({
  position,
  rotation = [0, 0, 0],
  text,
  color = NEON.pink,
  width = 3,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  text: string;
  color?: string;
  width?: number;
}) {
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const seed = useMemo(() => Math.random() * 10, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const buzz = Math.sin(t * 18 + seed) * 0.5 + 0.5;
    const dropout = Math.sin(t * 3 + seed) > -0.97 ? 1 : 0.15;
    const k = (0.55 + buzz * 0.45) * dropout;
    if (glow.current) glow.current.opacity = 0.12 + k * 0.28;
    if (light.current) light.current.intensity = 40 * k;
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[width, 0.95]} />
        <meshBasicMaterial ref={glow} color={color} transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <Text position={[0, 0, 0.03]} fontSize={0.52} letterSpacing={0.14} color={color} anchorX="center" anchorY="middle" outlineWidth={0.012} outlineColor={color}>
        {text}
      </Text>
      <pointLight ref={light} color={color} intensity={40} distance={22} decay={1.6} />
    </group>
  );
}

/* ---------------- overhead direction signboard ---------------- */
// Drivers coming down the road (toward -z) read it head-on:
//   <- SKILLS      ^ CONTACT      PROJECTS ->

type Dir = "left" | "up" | "right";

function Arrow({ dir, color }: { dir: Dir; color: string }) {
  const rotZ = dir === "left" ? Math.PI / 2 : dir === "right" ? -Math.PI / 2 : 0;
  return (
    <mesh rotation={[0, 0, rotZ]} scale={[1, 1, 0.15]}>
      <coneGeometry args={[0.38, 0.75, 3]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function DirectionSign({ z }: { z: number }) {
  const panels: { x: number; label: string; color: string; dir: Dir }[] = [
    { x: -4.6, label: "SKILLS", color: COLORS.skills, dir: "left" },
    { x: 0, label: "CONTACT", color: NEON.pink, dir: "up" },
    { x: 4.6, label: "PROJECTS", color: COLORS.projects, dir: "right" },
  ];
  const beamY = 7.8;
  const panelY = 6.4;

  return (
    <group position={[0, 0, z]}>
      {/* poles on the sidewalks + top beam */}
      {[-7.6, 7.6].map((x) => (
        <mesh key={x} position={[x, beamY / 2 - 0.1, 0]}>
          <cylinderGeometry args={[0.14, 0.18, beamY + 0.2, 8]} />
          <meshStandardMaterial color="#191922" metalness={0.9} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, beamY, 0]}>
        <boxGeometry args={[15.6, 0.3, 0.3]} />
        <meshStandardMaterial color="#191922" metalness={0.9} roughness={0.35} />
      </mesh>
      <mesh position={[0, beamY + 0.17, 0.16]}>
        <boxGeometry args={[15.6, 0.04, 0.04]} />
        <meshBasicMaterial color={NEON.cyan} toneMapped={false} />
      </mesh>

      {panels.map((p) => (
        <group key={p.label} position={[p.x, panelY, 0]}>
          {/* hanger rods */}
          {[-1.6, 1.6].map((rx) => (
            <mesh key={rx} position={[rx, 0.95, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.7, 6]} />
              <meshStandardMaterial color="#2a2a35" metalness={0.9} />
            </mesh>
          ))}
          {/* neon border + dark backing */}
          <mesh position={[0, 0, -0.03]}>
            <planeGeometry args={[4.5, 1.85]} />
            <meshBasicMaterial color={p.color} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[4.3, 1.65]} />
            <meshBasicMaterial color="#08060f" toneMapped={false} />
          </mesh>
          {/* glow */}
          <mesh position={[0, 0, 0.01]}>
            <planeGeometry args={[4.3, 1.65]} />
            <meshBasicMaterial color={p.color} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>

          {p.dir === "right" ? (
            <>
              <Text position={[-0.35, 0, 0.04]} fontSize={0.46} letterSpacing={0.08} color={p.color} anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor={p.color}>
                {p.label}
              </Text>
              <group position={[1.75, 0, 0.04]}>
                <Arrow dir="right" color={p.color} />
              </group>
            </>
          ) : (
            <>
              <group position={[-1.75, 0, 0.04]}>
                <Arrow dir={p.dir} color={p.color} />
              </group>
              <Text position={[0.35, 0, 0.04]} fontSize={0.46} letterSpacing={0.08} color={p.color} anchorX="center" anchorY="middle" outlineWidth={0.01} outlineColor={p.color}>
                {p.label}
              </Text>
            </>
          )}

          <pointLight position={[0, -0.6, 2.5]} color={p.color} intensity={25} distance={14} decay={1.6} />
        </group>
      ))}
    </group>
  );
}

/* ---------------- city layout ---------------- */

const BUILDINGS: BuildingProps[] = [
  // left side (x = -12)
  { position: [-12, 7.7, -135], size: [6, 16, 9], accent: NEON.purple, seed: 1 },
  { position: [-12, 4.2, -118], size: [6, 9, 8], accent: NEON.cyan, seed: 2 },
  { position: [-12, 5.7, -95], size: [6, 12, 9], accent: NEON.pink, seed: 3 },
  { position: [-12, 8.7, -75], size: [6, 18, 8], accent: NEON.cyan, seed: 4 },
  { position: [-12, 4.7, -55], size: [6, 10, 9], accent: NEON.lime, seed: 5 },
  { position: [-12, 6.7, -35], size: [6, 14, 8], accent: NEON.pink, seed: 6 },
  { position: [-12, 3.7, -12], size: [6, 8, 9], accent: NEON.purple, seed: 7 },
  { position: [-12, 9.7, 8], size: [6, 20, 8], accent: NEON.cyan, seed: 8 },
  { position: [-12, 5.2, 30], size: [6, 11, 9], accent: NEON.pink, seed: 9 },
  { position: [-12, 8.2, 50], size: [6, 17, 8], accent: NEON.cyan, seed: 10 },
  { position: [-12, 3.7, 72], size: [6, 8, 9], accent: NEON.purple, seed: 11 },
  { position: [-12, 6.2, 95], size: [6, 13, 8], accent: NEON.lime, seed: 12 },
  { position: [-12, 9.2, 118], size: [6, 19, 9], accent: NEON.pink, seed: 13 },
  { position: [-12, 4.7, 142], size: [6, 10, 8], accent: NEON.cyan, seed: 14 },

  // right side (x = 12)
  { position: [12, 5.2, -142], size: [6, 11, 9], accent: NEON.pink, seed: 21 },
  { position: [12, 8.2, -120], size: [6, 17, 8], accent: NEON.cyan, seed: 22 },
  { position: [12, 3.7, -98], size: [6, 8, 9], accent: NEON.purple, seed: 23 },
  { position: [12, 6.2, -78], size: [6, 13, 8], accent: NEON.lime, seed: 24 },
  { position: [12, 9.2, -58], size: [6, 19, 9], accent: NEON.pink, seed: 25 },
  { position: [12, 4.7, -38], size: [6, 10, 8], accent: NEON.cyan, seed: 26 },
  { position: [12, 7.2, -15], size: [6, 15, 9], accent: NEON.purple, seed: 27 },
  { position: [12, 4.2, 5], size: [6, 9, 8], accent: NEON.pink, seed: 28 },
  { position: [12, 5.5, 28], size: [6, 12, 9], accent: NEON.cyan, seed: 29 },
  { position: [12, 8.7, 50], size: [6, 18, 8], accent: NEON.purple, seed: 30 },
  { position: [12, 4.2, 72], size: [6, 9, 9], accent: NEON.lime, seed: 31 },
  { position: [12, 7.7, 95], size: [6, 16, 8], accent: NEON.pink, seed: 32 },
  { position: [12, 3.7, 118], size: [6, 8, 9], accent: NEON.cyan, seed: 33 },
  { position: [12, 6.2, 140], size: [6, 13, 8], accent: NEON.purple, seed: 34 },
];

// Buildings lining both sides of both side roads
const SIDE_BUILDINGS: BuildingProps[] = (() => {
  const out: BuildingProps[] = [];
  const accents = [NEON.cyan, NEON.pink, NEON.purple, NEON.lime];
  let seed = 100;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        const h = 8 + ((k * 7 + (sx > 0 ? 3 : 0) + (sz > 0 ? 5 : 0)) % 4) * 3.2;
        out.push({
          position: [sx * (24 + k * 13), h / 2 - 0.3, JUNCTION_Z + sz * (SIDE_WIDTH / 2 + 1.5 + 3)],
          size: [6, h, 11],
          accent: accents[(k + (sz > 0 ? 1 : 0) + (sx > 0 ? 2 : 0)) % 4],
          seed: seed++,
          rotationY: sz < 0 ? -Math.PI / 2 : Math.PI / 2,
          face: 1,
          light: false,
        });
      }
    }
  }
  return out;
})();

const SKYLINE: { position: [number, number, number]; size: [number, number, number] }[] = [
  { position: [-34, 18, -160], size: [10, 36, 10] },
  { position: [-22, 12, -175], size: [8, 24, 8] },
  { position: [0, 22, -185], size: [12, 44, 12] },
  { position: [24, 14, -170], size: [9, 28, 9] },
  { position: [36, 20, -156], size: [10, 40, 10] },
  { position: [-34, 18, 160], size: [10, 36, 10] },
  { position: [0, 22, 185], size: [12, 44, 12] },
  { position: [36, 20, 156], size: [10, 40, 10] },
];

function City() {
  const gap = SIDE_WIDTH / 2;
  return (
    <>
      <mesh position={[0, -0.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#0a0a16" roughness={0.85} metalness={0.55} />
      </mesh>

      <Road />
      <SideRoad sx={-1} />
      <SideRoad sx={1} />

      {/* main sidewalks, split so the junction is open */}
      {[-7.5, 7.5].map((x) => (
        <group key={x}>
          <Sidewalk x={x} z0={-ROAD_HALF_LENGTH} z1={JUNCTION_Z - gap} />
          <Sidewalk x={x} z0={JUNCTION_Z + gap} z1={ROAD_HALF_LENGTH} />
        </group>
      ))}

      {BUILDINGS.map((b, i) => (
        <Building key={i} {...b} />
      ))}
      {SIDE_BUILDINGS.map((b, i) => (
        <Building key={`s${i}`} {...b} />
      ))}

      {SKYLINE.map((b, i) => (
        <mesh key={i} position={b.position}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#0e0e1c" roughness={0.9} metalness={0.4} />
        </mesh>
      ))}

      {/* main-road street lights (skip the ones sitting in the junction) */}
      {Array.from({ length: 17 }, (_, i) => -160 + i * 20)
        .filter((z) => Math.abs(z - JUNCTION_Z) > gap + 1)
        .map((z, i) => (
          <group key={z}>
            <StreetLight position={[-6.5, 0, z]} color={i % 2 ? NEON.pink : NEON.cyan} />
            <StreetLight position={[6.5, 0, z]} color={i % 2 ? NEON.cyan : NEON.purple} />
          </group>
        ))}

      {/* side-road lamps: glowing bulbs only (no point lights) */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) =>
          Array.from({ length: 5 }, (_, k) => (
            <StreetLight
              key={`${sx}${sz}${k}`}
              position={[sx * (20 + k * 18), 0.1, JUNCTION_Z + sz * (SIDE_WIDTH / 2 + 0.75)]}
              color={(k + (sz > 0 ? 1 : 0)) % 2 ? NEON.pink : sx < 0 ? NEON.cyan : NEON.purple}
              withLight={false}
            />
          ))
        )
      )}

      {/* atmosphere signs */}
      <NeonSign position={[-8.9, 5.5, -100]} rotation={[0, Math.PI / 2, 0]} text="NOODLES" color={NEON.pink} width={3} />
      <NeonSign position={[8.9, 6, -40]} rotation={[0, -Math.PI / 2, 0]} text="ARCADE" color={NEON.cyan} width={3.2} />
      <NeonSign position={[-8.9, 5, 60]} rotation={[0, Math.PI / 2, 0]} text="TATTOO" color={NEON.lime} width={3} />
      <NeonSign position={[8.9, 7, 100]} rotation={[0, -Math.PI / 2, 0]} text="24HR" color={NEON.purple} width={2.6} />

      <Sparkles count={100} scale={[34, 8, 300]} size={2.6} speed={0.3} opacity={0.5} color="#7fe9ff" position={[0, 3, 0]} />
      <Sparkles count={60} scale={[26, 5, 220]} size={3.4} speed={0.2} opacity={0.35} color="#ff8adf" position={[0, 2, 0]} />
    </>
  );
}

/* ---------------- overlays ---------------- */

function ContactOverlay() {
  const color = COLORS.contact;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 90,
        transform: "translateX(-50%)",
        width: 380,
        maxWidth: "calc(100vw - 48px)",
        padding: "26px 28px",
        borderRadius: 16,
        background: "rgba(6, 4, 14, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${color}`,
        boxShadow: `0 0 40px ${color}66`,
        fontFamily: "'Courier New', monospace",
        pointerEvents: "auto",
      }}
    >
      <div style={{ fontSize: 34, fontWeight: 800, color, letterSpacing: 1, textShadow: `0 0 18px ${color}aa`, marginBottom: 6 }}>
        Let's Connect
      </div>
      <div style={{ fontSize: 13, color: "#cfd0e6", opacity: 0.85, marginBottom: 18 }}>
        Open to freelance work, collabs, and anything weird and creative.
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <a
          href="mailto:arpitjoshi564@gmail.com"
          style={{ padding: "9px 18px", borderRadius: 999, background: color, color: "#0a0510", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
        >
          EMAIL ME
        </a>
        <a
          href="https://github.com/yourname"
          target="_blank"
          rel="noreferrer"
          style={{ padding: "9px 18px", borderRadius: 999, background: "transparent", color, fontWeight: 700, fontSize: 13, border: `1px solid ${color}`, textDecoration: "none" }}
        >
          RESUME
        </a>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {[
          { label: "gh", href: "https://github.com/yourname" },
          { label: "in", href: "https://linkedin.com/in/arpitjoshi" },
          { label: "tw", href: "https://twitter.com/yourname" },
        ].map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noreferrer"
            style={{
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              color: "#cfd0e6",
              fontSize: 11,
              letterSpacing: 0.5,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {s.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function DriveHint({ hide }: { hide: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        color: "#9adfff",
        fontFamily: "'Courier New', monospace",
        fontSize: 13,
        letterSpacing: 1,
        opacity: hide ? 0 : 0.75,
        transition: "opacity 0.4s ease",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      W / S — drive · A / D — steer · follow the signs
    </div>
  );
}

/* ---------------- scene ---------------- */

export default function CyberpunkCity() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas dpr={[1, 2]} gl={{ antialias: true, powerPreference: "high-performance" }} camera={CAMERA_CONFIG}>
        <color attach="background" args={["#07070f"]} />
        <fog attach="fog" args={["#0d0724", 30, 320]} />
        <Stars radius={160} depth={80} count={3000} factor={4} fade speed={0.6} />

        <ambientLight color="#3d2f6e" intensity={1.4} />
        <hemisphereLight color="#7a63c9" groundColor="#181228" intensity={1.6} />
        <directionalLight position={[0, 30, 20]} color="#8f9dff" intensity={2.4} />

        <pointLight position={[-18, 9, 10]} color={NEON.cyan} intensity={500} distance={70} decay={1.5} />
        <pointLight position={[18, 9, 22]} color={NEON.pink} intensity={500} distance={70} decay={1.5} />
        <pointLight position={[0, 6, 45]} color={NEON.purple} intensity={560} distance={90} decay={1.5} />
        <pointLight position={[0, 6, -55]} color={NEON.cyan} intensity={420} distance={80} decay={1.5} />

        <City />
        <ChaseLight />

        {/* signboard before the junction: skills left, projects right, contact ahead */}
        <DirectionSign z={JUNCTION_Z + 18} />

        {/* left road ends at the SKILLS wall (screen faces +x, toward the junction) */}
        <InfoWall
          position={[-(SIDE_LENGTH + 1), 0, JUNCTION_Z]}
          rotationY={Math.PI / 2}
          color={COLORS.skills}
          status="MODULES ONLINE"
          {...SKILLS_WALL}
        />

        {/* right road ends at the PROJECTS wall (screen faces -x) */}
        <InfoWall
          position={[SIDE_LENGTH + 1, 0, JUNCTION_Z]}
          rotationY={-Math.PI / 2}
          color={COLORS.projects}
          status="ARCHIVE UNLOCKED"
          {...PROJECTS_WALL}
        />

        {/* straight ahead: the contact wall at the end of the road */}
        <ContactWall z={-150} color={COLORS.contact} />

        <Car
          position={[0, 0, 150]}
          sections={SECTIONS}
          onSectionChange={setActiveSection}
          zLimits={[-ROAD_HALF_LENGTH + 10, ROAD_HALF_LENGTH - 10]}
        />

        <EffectComposer>
          <Bloom intensity={1.35} luminanceThreshold={0.15} luminanceSmoothing={0.3} mipmapBlur radius={0.75} />
          <Vignette eskil={false} offset={0.25} darkness={0.85} />
        </EffectComposer>
      </Canvas>

      {activeSection === "contact" && <ContactOverlay />}
      <DriveHint hide={!!activeSection} />
    </div>
  );
}