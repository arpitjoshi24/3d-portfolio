"use client";

// Extra dep used for the neon glow:
//   npm i @react-three/postprocessing postprocessing
// (If you don't want it, delete the EffectComposer block + its import.)
import { useState, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Text,
  MeshReflectorMaterial,
  Sparkles,
  Stars,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import Car, { type Section } from "./Car";
import Billboard from "./Billboard";

/* ------------------------------------------------------------------ */
/*  Palette + helpers                                                  */
/* ------------------------------------------------------------------ */

const NEON = {
  cyan: "#00f0ff",
  pink: "#ff2bd6",
  purple: "#9d4bff",
  lime: "#a6ff00",
  amber: "#ffb020",
};

// deterministic RNG so the window pattern doesn't jump between renders
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
/*  Portfolio content — this is the part you actually edit             */
/* ------------------------------------------------------------------ */
// Each section is a spot on the road (z) plus how close the car has to
// get before the overlay appears. Move a section by changing its z;
// add a new one by adding an entry here AND a matching <Billboard/>
// + <NeonSign/> lower down.

const ROAD_HALF_LENGTH = 170; // bigger map — was 110

const SECTIONS: Section[] = [
  { id: "about", z: 130, range: 11 },
  { id: "skills", z: 60, range: 11 },
  { id: "projects", z: -20, range: 11 },
  { id: "contact", z: -100, range: 11 },
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
/*  Road (wet, reflective) + lane markings                             */
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
          roughness={0.85}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#07070d"
          metalness={0.75}
        />
      </mesh>

      {/* lane dashes */}
      {dashes.map((z, i) => (
        <mesh key={i} position={[0, -0.47, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.22, 3.6]} />
          <meshBasicMaterial color="#243048" toneMapped={false} />
        </mesh>
      ))}

      {/* glowing center strip */}
      <mesh position={[0, -0.46, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.06, length]} />
        <meshBasicMaterial color={NEON.cyan} transparent opacity={0.35} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidewalk with a neon curb strip                                    */
/* ------------------------------------------------------------------ */

function Sidewalk({ x }: { x: number }) {
  const inner = x > 0 ? -1.4 : 1.4;
  const length = ROAD_HALF_LENGTH * 2;

  return (
    <group position={[x, -0.2, 0]}>
      <mesh>
        <boxGeometry args={[3, 0.6, length]} />
        <meshStandardMaterial color="#101018" roughness={0.6} metalness={0.5} />
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
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Building with instanced lit windows + neon trim                    */
/* ------------------------------------------------------------------ */

type BuildingProps = {
  position: [number, number, number];
  size: [number, number, number];
  accent?: string;
  seed?: number;
};

function Building({ position, size, accent = NEON.cyan, seed = 1 }: BuildingProps) {
  const [w, h, d] = size;
  const instRef = useRef<THREE.InstancedMesh>(null);
  const face = position[0] < 0 ? 1 : -1;

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
    <group position={position}>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#0b0b13" roughness={0.55} metalness={0.7} />
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

      <pointLight position={[face * (w / 2 + 0.6), h / 4, 0]} color={accent} intensity={8} distance={16} />
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
    const flicker = 0.78 + Math.sin(t * 9 + seed) * 0.12 + Math.random() * 0.1;
    if (bulb.current) bulb.current.opacity = flicker;
    if (light.current) light.current.intensity = 16 * flicker;
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
      <pointLight ref={light} position={[0, 4.4, 0]} color={color} intensity={16} distance={16} decay={2} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Small shopfront neon sign (atmosphere only — not clickable)        */
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
    if (glow.current) glow.current.opacity = 0.12 + k * 0.28;
    if (light.current) light.current.intensity = 9 * k;
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[width, 0.95]} />
        <meshBasicMaterial
          ref={glow}
          color={color}
          transparent
          opacity={0.25}
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
      <pointLight ref={light} color={color} intensity={9} distance={14} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  City layout — bigger map: more buildings, spread further out       */
/* ------------------------------------------------------------------ */

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
        <meshStandardMaterial color="#04040a" roughness={0.9} metalness={0.6} />
      </mesh>

      <Road />
      <Sidewalk x={-7.5} />
      <Sidewalk x={7.5} />

      {BUILDINGS.map((b, i) => (
        <Building key={i} {...b} />
      ))}

      {SKYLINE.map((b, i) => (
        <mesh key={i} position={b.position}>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color="#07070f" roughness={0.9} metalness={0.4} />
        </mesh>
      ))}

      {/* street lights, spaced down the now-longer road */}
      {Array.from({ length: 17 }, (_, i) => -160 + i * 20).map((z, i) => (
        <group key={z}>
          <StreetLight position={[-6.5, 0, z]} color={i % 2 ? NEON.pink : NEON.cyan} />
          <StreetLight position={[6.5, 0, z]} color={i % 2 ? NEON.cyan : NEON.purple} />
        </group>
      ))}

      {/* small shopfront signs for atmosphere, independent of the
          clickable portfolio billboards below */}
      <NeonSign position={[-8.9, 5.5, -100]} rotation={[0, Math.PI / 2, 0]} text="NOODLES" color={NEON.pink} width={3} />
      <NeonSign position={[8.9, 6, -40]} rotation={[0, -Math.PI / 2, 0]} text="ARCADE" color={NEON.cyan} width={3.2} />
      <NeonSign position={[-8.9, 5, 40]} rotation={[0, Math.PI / 2, 0]} text="TATTOO" color={NEON.lime} width={3} />
      <NeonSign position={[8.9, 7, 100]} rotation={[0, -Math.PI / 2, 0]} text="24HR" color={NEON.purple} width={2.6} />

      {/* atmosphere */}
      <Sparkles count={100} scale={[34, 8, 300]} size={2.6} speed={0.3} opacity={0.5} color="#7fe9ff" position={[0, 3, 0]} />
      <Sparkles count={60} scale={[26, 5, 220]} size={3.4} speed={0.2} opacity={0.35} color="#ff8adf" position={[0, 2, 0]} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Portfolio overlay — plain-CSS panel that appears when the car      */
/*  is under a billboard. Move to a stylesheet/Tailwind if you prefer. */
/* ------------------------------------------------------------------ */

function SectionOverlay({ activeId }: { activeId: string | null }) {
  const data = activeId ? SECTION_CONTENT[activeId] : null;

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
        border: `1px solid ${data ? data.color : "transparent"}`,
        boxShadow: data ? `0 0 26px ${data.color}55` : "none",
        color: "#eae6ff",
        fontFamily: "'Courier New', monospace",
        opacity: data ? 1 : 0,
        transform: data ? "translateY(0)" : "translateY(-10px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
        pointerEvents: "none",
      }}
    >
      {data && (
        <>
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
        </>
      )}
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
        camera={{ position: [0, 6, 165], fov: 55, near: 0.1, far: 700 }}
      >
        <color attach="background" args={["#030308"]} />
        <fog attach="fog" args={["#08031a", 18, 220]} />
        <Stars radius={160} depth={80} count={3000} factor={4} fade speed={0.6} />

        <ambientLight color="#221046" intensity={0.6} />
        <hemisphereLight color="#4b2a8f" groundColor="#05030c" intensity={0.5} />
        <directionalLight position={[0, 24, 12]} color="#5a6bff" intensity={1.2} />

        <pointLight position={[-18, 9, 10]} color={NEON.cyan} intensity={120} distance={45} />
        <pointLight position={[18, 9, 22]} color={NEON.pink} intensity={120} distance={45} />
        <pointLight position={[0, 6, 45]} color={NEON.purple} intensity={140} distance={60} />

        <City />

        {/* the clickable portfolio billboards */}
        {SECTIONS.map((s) => (
          <Billboard
            key={s.id}
            z={s.z}
            label={s.id.toUpperCase()}
            color={SECTION_CONTENT[s.id].color}
          />
        ))}

        <Car 
  position={[0, 0, 150]} 
  rotation={THREE.MathUtils.degToRad(0)}
  sections={SECTIONS}
  onSectionChange={setActiveSection}
  zLimits={[-ROAD_HALF_LENGTH + 10, ROAD_HALF_LENGTH - 10]}
/>

        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          target={[0, 4, 150]}
          minDistance={6}
          maxDistance={110}
          maxPolarAngle={Math.PI / 2.08}
        />

        <EffectComposer>
          <Bloom intensity={1.35} luminanceThreshold={0.15} luminanceSmoothing={0.3} mipmapBlur radius={0.75} />
          <Vignette eskil={false} offset={0.25} darkness={0.85} />
        </EffectComposer>
      </Canvas>

      <SectionOverlay activeId={activeSection} />
      <DriveHint hide={!!activeSection} />
    </div>
  );
}