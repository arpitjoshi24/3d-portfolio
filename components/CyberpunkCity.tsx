"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Text,
  MeshReflectorMaterial,
  Sparkles,
  Stars,
  Environment,
  Lightformer,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing"; // requires: npm i postprocessing (see note below)
import * as THREE from "three";
import Car, { type Section } from "./Car";
import Billboard from "./Billboard";
import ContactWall from "./Contactwall";
import SectionWall from "./Sectionwall";
import DirectionSign from "./Directionsign";
import BranchRoad from "./Branchroad";

/* ------------------------------------------------------------------ */
/*  Palette + helpers                                                  */
/* ------------------------------------------------------------------ */

const NEON = {
  cyan: "#00f0ff",
  pink: "#ff2bd6",
  purple: "#9d4bff",
  lime: "#a6ff00",
  amber: "#ffb020",
  red: "#ff2b4a",
  blue: "#2b6cff",
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

/* ------------------------------------------------------------------ */
/*  Portfolio content                                                  */
/* ------------------------------------------------------------------ */

const ROAD_HALF_LENGTH = 170;
const INTERSECTION_Z = 60;
const BRANCH_HALF_WIDTH = 5.3;
const BRANCH_LENGTH = 70;
// How wide the opening in the sidewalk curb is, centered on the branch
// road, so the branch road reads as a clean cut rather than driving
// into a solid curb wall.
const CURB_CUT_HALFWIDTH = BRANCH_HALF_WIDTH + 1;

const CAMERA_CONFIG = {
  position: [0, 3.2, 157] as [number, number, number],
  fov: 55,
  near: 0.1,
  far: 700,
};

const SECTIONS: Section[] = [
  { id: "about", z: 130, range: 11 },
  { id: "skills", x: -BRANCH_LENGTH, z: INTERSECTION_Z, range: 13 },
  { id: "projects", x: BRANCH_LENGTH, z: INTERSECTION_Z, range: 13 },
  { id: "contact", z: -150, range: 16 },
];

const SECTION_CONTENT: Record<
  string,
  { title: string; color: string; body: string[] }
> = {
  about: {
    title: "About Me",
    color: NEON.pink,
    body: [
      "Hey, I'm [Your Name] — a developer who likes building things that are a little more fun to look at than a normal portfolio.",
      "This whole site is one of those things: drive down the street to see the rest.",
    ],
  },
  skills: {
    title: "Skills",
    color: NEON.cyan,
    body: [
      "React / Next.js",
      "TypeScript",
      "Three.js & React Three Fiber",
      "Node.js / REST & GraphQL APIs",
    ],
  },
  projects: {
    title: "Projects",
    color: NEON.purple,
    body: [
      "Project One — one line on what it is and what you used.",
      "Project Two — same.",
      "Project Three — same. Link these to case studies or repos.",
    ],
  },
  contact: {
    title: "Contact",
    color: NEON.lime,
    body: ["you@email.com", "github.com/yourname", "linkedin.com/in/yourname"],
  },
};

/* ------------------------------------------------------------------ */
/*  Road                                                               */
/* ------------------------------------------------------------------ */

function Road() {
  const length = ROAD_HALF_LENGTH * 2;
  const dashes = useMemo(
    () =>
      Array.from(
        { length: Math.floor(length / 10) },
        (_, i) => -ROAD_HALF_LENGTH + 5 + i * 10
      ),
    [length]
  );

  return (
    <group>
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, length]} />
        <MeshReflectorMaterial
          resolution={1024}
          mixBlur={1}
          mixStrength={45}
          blur={[300, 100]}
          roughness={0.75}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0b0b18"
          metalness={0.8}
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
        <meshBasicMaterial color={NEON.cyan} transparent opacity={0.55} toneMapped={false} />
      </mesh>

      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 5.7, -0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, length]} />
          <meshBasicMaterial color={NEON.pink} transparent opacity={0.5} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidewalk — with an optional curb-cut gap for a branch road          */
/* ------------------------------------------------------------------ */
// FIX: the old version was one unbroken curb the full length of the
// map. At the intersection, that meant a solid raised curb sitting
// directly across the branch road's exit — the car could still drive
// there (collision is road-based, not curb-based), but visually there
// was no opening, which is exactly why the junction read as confusing.
// This version optionally splits into two segments with a gap between
// them, plus a flush paved apron filling that gap so it reads as a
// deliberate curb cut rather than a broken mesh.

function Sidewalk({ x, gap }: { x: number; gap?: [number, number] }) {
  const inner = x > 0 ? -1.4 : 1.4;
  const half = ROAD_HALF_LENGTH;

  const segments = gap
    ? [
        { from: -half, to: gap[0] },
        { from: gap[1], to: half },
      ]
    : [{ from: -half, to: half }];

  return (
    <group position={[x, 0, 0]}>
      {segments.map((seg, i) => {
        const length = seg.to - seg.from;
        if (length <= 0) return null;
        const centerZ = (seg.from + seg.to) / 2;
        return (
          <group key={i} position={[0, -0.2, centerZ]}>
            <mesh>
              <boxGeometry args={[3, 0.6, length]} />
              <meshStandardMaterial color="#12122a" roughness={0.6} metalness={0.6} />
            </mesh>
            <mesh position={[inner, 0.28, 0]}>
              <boxGeometry args={[0.1, 0.06, length]} />
              <meshBasicMaterial color={NEON.cyan} toneMapped={false} />
            </mesh>
            <mesh position={[inner, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.9, length]} />
              <meshBasicMaterial
                color={NEON.cyan}
                transparent
                opacity={0.12}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}

      {/* paved apron filling the gap, flush with the road surface —
          this is what makes the opening read as a deliberate curb cut */}
      {gap && (
        <mesh position={[0, -0.49, (gap[0] + gap[1]) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3, gap[1] - gap[0]]} />
          <meshStandardMaterial color="#0b0b18" roughness={0.8} metalness={0.6} />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Building                                                           */
/* ------------------------------------------------------------------ */

type BuildingProps = {
  position: [number, number, number];
  size: [number, number, number];
  accent?: string;
  seed?: number;
  rotationY?: number;
  face?: number;
  light?: boolean;
};

function Building({
  position,
  size,
  accent = NEON.cyan,
  seed = 1,
  rotationY = 0,
  face: faceProp,
  light = false, // FIX: was `true` — see the light-count note below
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
        if (rand() > 0.7) continue;
        const y = -h / 2 + 1.2 + r * 1.1;
        const z = -d / 2 + 0.9 + c * 1.1;
        const color = new THREE.Color(palette[Math.floor(rand() * palette.length)]);
        color.multiplyScalar(0.45 + rand() * 0.9);
        list.push({ y, z, side: 1, color });
        if (rand() > 0.4) list.push({ y, z, side: -1, color });
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
        <meshStandardMaterial color="#0f0f22" roughness={0.55} metalness={0.7} />
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

      {/* NOTE: the neon trim strips above are self-illuminating
          (meshBasicMaterial, toneMapped=false) and read as glowing
          under Bloom regardless of whether this building casts a real
          light — the pointLight below only adds colored spill onto
          neighboring surfaces, which is why it's optional/sparse. */}
      {light && (
        <pointLight
          position={[face * (w / 2 + 0.6), h / 4, 0]}
          color={accent}
          intensity={12}
          distance={20}
          decay={1.7}
        />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Street light                                                       */
/* ------------------------------------------------------------------ */

function StreetLight({ position, color = NEON.cyan }: { position: [number, number, number]; color?: string }) {
  const bulb = useRef<THREE.MeshBasicMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const seed = useMemo(() => Math.random() * 100, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const flicker = 0.82 + Math.sin(t * 9 + seed) * 0.1 + Math.random() * 0.08;
    if (bulb.current) bulb.current.opacity = flicker;
    if (light.current) light.current.intensity = 45 * flicker;
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
      <pointLight ref={light} position={[0, 4.4, 0]} color={color} intensity={45} distance={24} decay={1.7} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Chase light rig — what actually lights the car                     */
/* ------------------------------------------------------------------ */

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
      <pointLight ref={key} color="#e8f0ff" intensity={260} distance={40} decay={1.3} />
      <pointLight ref={fill} color="#a8c4ff" intensity={140} distance={30} decay={1.3} />
      <pointLight ref={rim} color="#d8b0ff" intensity={180} distance={35} decay={1.3} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Neon sign                                                          */
/* ------------------------------------------------------------------ */

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
    if (glow.current) glow.current.opacity = 0.18 + k * 0.3;
    if (light.current) light.current.intensity = 22 * k;
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[width, 0.95]} />
        <meshBasicMaterial
          ref={glow}
          color={color}
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Text
        position={[0, 0, 0.03]}
        fontSize={0.52}
        letterSpacing={0.14}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor={color}
      >
        {text}
      </Text>
      <pointLight ref={light} color={color} intensity={22} distance={16} decay={1.7} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Light shaft — visual only, no pointLight                           */
/* ------------------------------------------------------------------ */
// FIX: this used to carry its own pointLight, but the beam itself is
// an additive-blended, self-illuminating cone — it doesn't need to
// cast real light on anything else to be visible. Removing the light
// keeps the look identical while cutting 8 lights from the scene.

function LightShaft({
  position,
  color,
  height = 40,
  radius = 0.5,
}: {
  position: [number, number, number];
  color: string;
  height?: number;
  radius?: number;
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const seed = useMemo(() => Math.random() * 100, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.6 + Math.sin(t * 0.8 + seed) * 0.4;
    if (mat.current) mat.current.opacity = 0.06 + pulse * 0.06;
  });

  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]}>
      <cylinderGeometry args={[radius, radius * 0.4, height, 16, 1, true]} />
      <meshBasicMaterial
        ref={mat}
        color={color}
        transparent
        opacity={0.09}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Holographic panel — visual only, no pointLight                     */
/* ------------------------------------------------------------------ */
// FIX: same reasoning as LightShaft — the panel is additive/emissive
// and self-glowing; the pointLight it used to carry was redundant.
// Removes 7 more lights from the scene with no visible difference.

function HoloPanel({
  position,
  rotation = [0, 0, 0],
  color,
  glyph,
  size = 2.4,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  glyph: string;
  size?: number;
}) {
  const panel = useRef<THREE.Group>(null);
  const seed = useMemo(() => Math.random() * 10, []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (panel.current) {
      panel.current.position.y = Math.sin(t * 0.8 + seed) * 0.25;
      panel.current.rotation.z = Math.sin(t * 0.5 + seed) * 0.05;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={panel}>
        <mesh>
          <planeGeometry args={[size * 1.6, size]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.12}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        <Text
          fontSize={size * 0.9}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor={color}
        >
          {glyph}
        </Text>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Ground mist                                                        */
/* ------------------------------------------------------------------ */

function GroundMist({ z, color = NEON.pink }: { z: number; color?: string }) {
  const ref = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) ref.current.opacity = 0.04 + Math.sin(t * 0.3 + z * 0.1) * 0.02;
  });
  return (
    <mesh position={[0, 1.2, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[44, 60]} />
      <meshBasicMaterial
        ref={ref}
        color={color}
        transparent
        opacity={0.05}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  City layout                                                        */
/* ------------------------------------------------------------------ */
// FIX: buildings default to `light={false}` now (see Building above).
// Rather than hand-edit every entry, only every 3rd main-road building
// gets a real light — the rest still glow via their emissive trim
// under Bloom, just without spilling colored light onto neighbors.
// This cuts ~26 lights down to ~9 while looking almost identical.

const BUILDINGS: BuildingProps[] = [
  { position: [-12, 7.7, -135], size: [6, 16, 9], accent: NEON.purple, seed: 1 },
  { position: [-12, 4.2, -118], size: [6, 9, 8], accent: NEON.cyan, seed: 2 },
  { position: [-12, 5.7, -95], size: [6, 12, 9], accent: NEON.pink, seed: 3 },
  { position: [-12, 8.7, -75], size: [6, 18, 8], accent: NEON.cyan, seed: 4 },
  { position: [-12, 4.7, -55], size: [6, 10, 9], accent: NEON.lime, seed: 5 },
  { position: [-12, 6.7, -35], size: [6, 14, 8], accent: NEON.pink, seed: 6 },
  { position: [-12, 3.7, -12], size: [6, 8, 9], accent: NEON.purple, seed: 7 },
  { position: [-12, 9.7, 8], size: [6, 20, 8], accent: NEON.cyan, seed: 8 },
  { position: [-12, 5.2, 28], size: [6, 11, 9], accent: NEON.pink, seed: 9 },
  { position: [-12, 3.7, 95], size: [6, 8, 9], accent: NEON.purple, seed: 11 },
  { position: [-12, 6.2, 110], size: [6, 13, 8], accent: NEON.lime, seed: 12 },
  { position: [-12, 9.2, 118], size: [6, 19, 9], accent: NEON.pink, seed: 13 },
  { position: [-12, 4.7, 142], size: [6, 10, 8], accent: NEON.cyan, seed: 14 },

  { position: [12, 5.2, -142], size: [6, 11, 9], accent: NEON.pink, seed: 21 },
  { position: [12, 8.2, -120], size: [6, 17, 8], accent: NEON.cyan, seed: 22 },
  { position: [12, 3.7, -98], size: [6, 8, 9], accent: NEON.purple, seed: 23 },
  { position: [12, 6.2, -78], size: [6, 13, 8], accent: NEON.lime, seed: 24 },
  { position: [12, 9.2, -58], size: [6, 19, 9], accent: NEON.pink, seed: 25 },
  { position: [12, 4.7, -38], size: [6, 10, 8], accent: NEON.cyan, seed: 26 },
  { position: [12, 7.2, -15], size: [6, 15, 9], accent: NEON.purple, seed: 27 },
  { position: [12, 4.2, 5], size: [6, 9, 8], accent: NEON.pink, seed: 28 },
  { position: [12, 5.5, 28], size: [6, 12, 9], accent: NEON.cyan, seed: 29 },
  { position: [12, 4.2, 95], size: [6, 9, 9], accent: NEON.lime, seed: 31 },
  { position: [12, 7.7, 110], size: [6, 16, 8], accent: NEON.pink, seed: 32 },
  { position: [12, 3.7, 118], size: [6, 8, 9], accent: NEON.cyan, seed: 33 },
  { position: [12, 6.2, 140], size: [6, 13, 8], accent: NEON.purple, seed: 34 },
].map((b, i) => ({ ...b, light: i % 3 === 0 }));

// Corner buildings frame the intersection itself — only 4 of them, so
// all stay lit; they're the visual anchor for "this is the junction."
const CORNER_BUILDINGS: BuildingProps[] = [
  { position: [-12, 5.7, INTERSECTION_Z - 13], size: [6, 12, 12], accent: NEON.cyan, seed: 40, light: true },
  { position: [-12, 7.2, INTERSECTION_Z + 14], size: [6, 15, 12], accent: NEON.pink, seed: 41, light: true },
  { position: [12, 5.2, INTERSECTION_Z - 13], size: [6, 11, 12], accent: NEON.purple, seed: 42, light: true },
  { position: [12, 6.7, INTERSECTION_Z + 14], size: [6, 14, 12], accent: NEON.lime, seed: 43, light: true },
];

const BRANCH_BUILDINGS: BuildingProps[] = (() => {
  const out: BuildingProps[] = [];
  const accents = [NEON.cyan, NEON.pink, NEON.purple, NEON.lime];
  let seed = 60;

  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      // stop one slot short of the branch's end (k < 4, not < 5) so
      // buildings don't crowd right up against the Skills/Projects
      // landmark walls at x = ±BRANCH_LENGTH
      for (let k = 0; k < 4; k++) {
        const x = sx * (18 + k * 13);
        const h = 10 + ((k * 5 + (sx > 0 ? 2 : 0) + (sz > 0 ? 3 : 0)) % 4) * 3.5;
        out.push({
          position: [x, h / 2 - 0.3, INTERSECTION_Z + sz * (BRANCH_HALF_WIDTH + 4.5)],
          size: [6, h, 10],
          accent: accents[(k + (sx > 0 ? 1 : 0) + (sz > 0 ? 2 : 0)) % 4],
          seed: seed++,
          rotationY: Math.PI / 2,
          face: sz < 0 ? -1 : 1,
          light: k === 0, // just the ones nearest the junction
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
  return (
    <>
      <mesh position={[0, -0.85, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#080814" roughness={0.9} metalness={0.6} />
      </mesh>

      <Road />

      {/* FIX: both sidewalks now open up at the intersection instead of
          running as one unbroken curb across the branch roads' exits */}
      <Sidewalk
        x={-7.5}
        gap={[INTERSECTION_Z - CURB_CUT_HALFWIDTH, INTERSECTION_Z + CURB_CUT_HALFWIDTH]}
      />
      <Sidewalk
        x={7.5}
        gap={[INTERSECTION_Z - CURB_CUT_HALFWIDTH, INTERSECTION_Z + CURB_CUT_HALFWIDTH]}
      />

      {BUILDINGS.map((b, i) => (
        <Building key={`m${i}`} {...b} />
      ))}
      {CORNER_BUILDINGS.map((b, i) => (
        <Building key={`c${i}`} {...b} />
      ))}
      {BRANCH_BUILDINGS.map((b, i) => (
        <Building key={`b${i}`} {...b} />
      ))}

      {SKYLINE.map((b, i) => (
        <mesh key={i} position={b.position}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#0a0a1c" roughness={0.9} metalness={0.5} />
        </mesh>
      ))}

      {/* FIX: streetlights every 40 units instead of every 20 — half as
          many poles (9 pairs = 18 lights instead of 17 pairs = 34),
          still reads as continuously lit down the road */}
      {Array.from({ length: 9 }, (_, i) => -160 + i * 40).map((z, i) => (
        <group key={z}>
          <StreetLight position={[-6.5, 0, z]} color={i % 2 ? NEON.pink : NEON.cyan} />
          <StreetLight position={[6.5, 0, z]} color={i % 2 ? NEON.cyan : NEON.purple} />
        </group>
      ))}

      <NeonSign position={[-8.9, 5.5, -100]} rotation={[0, Math.PI / 2, 0]} text="NOODLES" color={NEON.pink} width={3} />
      <NeonSign position={[8.9, 6, -40]} rotation={[0, -Math.PI / 2, 0]} text="ARCADE" color={NEON.cyan} width={3.2} />
      <NeonSign position={[-8.9, 5, 40]} rotation={[0, Math.PI / 2, 0]} text="TATTOO" color={NEON.lime} width={3} />
      <NeonSign position={[8.9, 7, 100]} rotation={[0, -Math.PI / 2, 0]} text="24HR" color={NEON.purple} width={2.6} />
      <NeonSign position={[-8.9, 6.5, -20]} rotation={[0, Math.PI / 2, 0]} text="CYBER CAFE" color={NEON.cyan} width={3.6} />
      <NeonSign position={[8.9, 5.5, 20]} rotation={[0, -Math.PI / 2, 0]} text="HOTEL" color={NEON.red} width={2.4} />
      <NeonSign position={[-8.9, 7, 120]} rotation={[0, Math.PI / 2, 0]} text="BAR" color={NEON.pink} width={2} />
      <NeonSign position={[8.9, 6, -120]} rotation={[0, -Math.PI / 2, 0]} text="CLINIC" color={NEON.lime} width={2.8} />

      {[
        { z: -140, x: -13, color: NEON.pink, h: 44 },
        { z: -90, x: 13, color: NEON.cyan, h: 38 },
        { z: -30, x: -13, color: NEON.purple, h: 42 },
        { z: 15, x: 13, color: NEON.red, h: 40 },
        { z: 80, x: -13, color: NEON.cyan, h: 46 },
        { z: 130, x: 13, color: NEON.pink, h: 42 },
        { z: INTERSECTION_Z - 12, x: -20, color: NEON.lime, h: 36 },
        { z: INTERSECTION_Z + 12, x: 20, color: NEON.cyan, h: 36 },
      ].map((s, i) => (
        <LightShaft key={i} position={[s.x, -0.5, s.z]} color={s.color} height={s.h} radius={0.55} />
      ))}

      <HoloPanel position={[-5, 9, 90]} color={NEON.cyan} glyph="未来" size={2.2} />
      <HoloPanel position={[5, 10, 40]} color={NEON.pink} glyph="東京" size={2.4} />
      <HoloPanel position={[-5.5, 8.5, -30]} color={NEON.purple} glyph="電脳" size={2} />
      <HoloPanel position={[5, 9.5, -90]} color={NEON.lime} glyph="接続" size={2.2} />
      <HoloPanel position={[0, 11, -140]} color={NEON.red} glyph="停止" size={2.6} />
      <HoloPanel position={[-22, 9, INTERSECTION_Z]} color={NEON.cyan} glyph="技能" size={2} />
      <HoloPanel position={[22, 9, INTERSECTION_Z]} color={NEON.purple} glyph="作品" size={2} />

      <GroundMist z={80} color={NEON.pink} />
      <GroundMist z={-30} color={NEON.cyan} />
      <GroundMist z={-120} color={NEON.purple} />
      <GroundMist z={INTERSECTION_Z} color={NEON.lime} />

      <Sparkles count={140} scale={[40, 10, 320]} size={3} speed={0.4} opacity={0.5} color="#7fe9ff" position={[0, 4, 0]} />
      <Sparkles count={90} scale={[30, 6, 240]} size={3.6} speed={0.25} opacity={0.4} color="#ff8adf" position={[0, 2.5, 0]} />
      <Sparkles count={50} scale={[24, 5, 200]} size={2.2} speed={0.5} opacity={0.35} color="#c9a6ff" position={[0, 3, 0]} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Overlays                                                           */
/* ------------------------------------------------------------------ */

function StandardOverlay({ data }: { data: (typeof SECTION_CONTENT)[string] }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 24,
        right: 24,
        width: 320,
        maxWidth: "calc(100vw - 48px)",
        padding: "20px 22px",
        borderRadius: 14,
        background: "rgba(8, 6, 20, 0.75)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: `1px solid ${data.color}`,
        boxShadow: `0 0 26px ${data.color}55`,
        color: "#eae6ff",
        fontFamily: "'Courier New', monospace",
        pointerEvents: "none",
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.55, marginBottom: 6 }}>
        NOW ENTERING
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: data.color, marginBottom: 10 }}>
        {data.title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, fontSize: 14 }}>
        {data.body.map((line, i) => (
          <li key={i} style={{ marginBottom: 4 }}>
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactOverlay() {
  const color = SECTION_CONTENT.contact.color;

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
      <div
        style={{
          fontSize: 34,
          fontWeight: 800,
          color,
          letterSpacing: 1,
          textShadow: `0 0 18px ${color}aa`,
          marginBottom: 6,
        }}
      >
        Let's Connect
      </div>
      <div style={{ fontSize: 13, color: "#cfd0e6", opacity: 0.85, marginBottom: 18 }}>
        Open to freelance work, collabs, and anything weird and creative.
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <a
          href="mailto:you@email.com"
          style={{
            padding: "9px 18px",
            borderRadius: 999,
            background: color,
            color: "#0a0510",
            fontWeight: 700,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          EMAIL ME
        </a>
        <a
          href="https://github.com/yourname"
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "9px 18px",
            borderRadius: 999,
            background: "transparent",
            color,
            fontWeight: 700,
            fontSize: 13,
            border: `1px solid ${color}`,
            textDecoration: "none",
          }}
        >
          RESUME
        </a>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {[
          { label: "gh", href: "https://github.com/yourname" },
          { label: "in", href: "https://linkedin.com/in/yourname" },
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

function SectionOverlay({ activeId }: { activeId: string | null }) {
  if (activeId === "contact") return <ContactOverlay />;

  const data = activeId ? SECTION_CONTENT[activeId] : null;
  if (!data) return null;
  return <StandardOverlay data={data} />;
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
      W / S — drive · A / D — steer · drive under a sign to open it
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene                                                              */
/* ------------------------------------------------------------------ */

export default function CyberpunkCity() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={CAMERA_CONFIG}
      >
        <color attach="background" args={["#05050f"]} />
        <fog attach="fog" args={["#0a0520", 25, 260]} />
        <Stars radius={160} depth={80} count={3500} factor={4} fade speed={0.6} />

        <Environment resolution={64}>
          <Lightformer intensity={1.2} color={NEON.cyan} position={[-10, 6, 0]} scale={[10, 10, 1]} />
          <Lightformer intensity={1.2} color={NEON.pink} position={[10, 6, 0]} scale={[10, 10, 1]} />
          <Lightformer intensity={0.9} color={NEON.purple} position={[0, 10, -10]} rotation={[Math.PI / 2, 0, 0]} scale={[15, 15, 1]} />
          <Lightformer intensity={0.5} color="#8090b0" position={[0, 2, 15]} rotation={[-Math.PI / 2, 0, 0]} scale={[20, 20, 1]} />
        </Environment>

        <ambientLight color="#3a2a6a" intensity={0.55} />
        <hemisphereLight color="#5a3f9e" groundColor="#180c28" intensity={0.6} />
        <directionalLight position={[0, 30, 20]} color="#6a78b8" intensity={0.9} />

        <pointLight position={[-18, 9, 10]} color={NEON.cyan} intensity={180} distance={55} decay={1.8} />
        <pointLight position={[18, 9, 22]} color={NEON.pink} intensity={180} distance={55} decay={1.8} />
        <pointLight position={[0, 6, 45]} color={NEON.purple} intensity={200} distance={65} decay={1.8} />
        <pointLight position={[0, 6, -55]} color={NEON.cyan} intensity={160} distance={55} decay={1.8} />
        <pointLight position={[0, 8, 100]} color={NEON.pink} intensity={150} distance={55} decay={1.8} />
        <pointLight position={[0, 8, -130]} color={NEON.lime} intensity={140} distance={55} decay={1.8} />
        <pointLight position={[0, 10, INTERSECTION_Z]} color={NEON.cyan} intensity={180} distance={50} decay={1.8} />

        <City />

        <ChaseLight />

        {SECTIONS.filter((s) => s.id === "about").map((s) => (
          <Billboard
            key={s.id}
            z={s.z}
            label={s.id.toUpperCase()}
            color={SECTION_CONTENT[s.id].color}
          />
        ))}

        <BranchRoad z={INTERSECTION_Z} fromX={-BRANCH_HALF_WIDTH} toX={-BRANCH_LENGTH} />
        <BranchRoad z={INTERSECTION_Z} fromX={BRANCH_HALF_WIDTH} toX={BRANCH_LENGTH} />

        {/* FIX: moved from x=6.6 (inside the sidewalk box, x∈[6,9]) to
            x=9.8 — clear of all geometry, standing just past the curb */}
        <DirectionSign
          position={[9.8, 0, INTERSECTION_Z + 14]}
          entries={[
            { label: "SKILLS", arrow: "◄", color: SECTION_CONTENT.skills.color },
            { label: "PROJECTS", arrow: "►", color: SECTION_CONTENT.projects.color },
            { label: "CONTACT", arrow: "▲", color: SECTION_CONTENT.contact.color },
          ]}
        />

        <SectionWall
          position={[-BRANCH_LENGTH, 0, INTERSECTION_Z]}
          rotationY={Math.PI / 2}
          color={SECTION_CONTENT.skills.color}
          heading="SKILLS"
          lines={SECTION_CONTENT.skills.body}
        />

        <SectionWall
          position={[BRANCH_LENGTH, 0, INTERSECTION_Z]}
          rotationY={-Math.PI / 2}
          color={SECTION_CONTENT.projects.color}
          heading="PROJECTS"
          lines={SECTION_CONTENT.projects.body}
        />

        <ContactWall z={-150} color={SECTION_CONTENT.contact.color} />

        <Car
          position={[0, 0, 150]}
          sections={SECTIONS}
          onSectionChange={setActiveSection}
          zLimits={[-ROAD_HALF_LENGTH + 10, ROAD_HALF_LENGTH - 10]}
        />

        <EffectComposer>
          <Bloom
            intensity={1.15}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.35}
            mipmapBlur
            radius={0.7}
          />
          {/* FIX: offset must be a THREE.Vector2, not a raw array —
              the `as any` cast in the old version was masking this */}
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={new THREE.Vector2(0.0006, 0.0009)}
            radialModulation={false}
            modulationOffset={0}
          />
          <Vignette eskil={false} offset={0.28} darkness={0.9} />
        </EffectComposer>
      </Canvas>

      <SectionOverlay activeId={activeSection} />
      <DriveHint hide={!!activeSection} />
    </div>
  );
}