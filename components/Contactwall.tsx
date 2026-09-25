"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

type ContactWallProps = {
  z: number;
  color?: string;
};

/* ---------------- palette ---------------- */
const CYAN = "#00f0ff";
const PURPLE = "#9d4bff";
const LIME = "#a6ff00";
const AMBER = "#ffb020";

/* ---------------- contact details ---------------- */
// swap the placeholders for your real handles
const EMAIL = "arpitjoshi564@gmail.com";
const INSTAGRAM = "@arpitjoshi";
const LINKEDIN = "linkedin.com/in/arpitjoshi";

/* ---------------- helpers ---------------- */
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@*<>/\\|";
const scramble = (n: number) =>
  Array.from({ length: n }, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]).join("");

/**
 * The scene's finale landmark — a giant backlit video-wall billboard
 * at the end of the road. Fully glitched out for the cyberpunk look.
 * Houses the CONTACT section.
 */
export default function ContactWall({ z, color = "#ff2bd6" }: ContactWallProps) {
  const PINK = color;

  /* ---------------- animated refs ---------------- */
  const screenGroup = useRef<THREE.Group>(null);
  const flickerMat = useRef<THREE.MeshBasicMaterial>(null);
  const screenGlow = useRef<THREE.MeshBasicMaterial>(null);
  const screenInner = useRef<THREE.MeshBasicMaterial>(null);
  const scanline = useRef<THREE.Mesh>(null);
  const scanlineMat = useRef<THREE.MeshBasicMaterial>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringAMat = useRef<THREE.MeshBasicMaterial>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const ringBMat = useRef<THREE.MeshBasicMaterial>(null);
  const titleGroup = useRef<THREE.Group>(null);
  const emailGroup = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.MeshBasicMaterial>(null);
  const beaconLight = useRef<THREE.PointLight>(null);
  const gridRef = useRef<THREE.GridHelper>(null);
  const tickerGroup = useRef<THREE.Group>(null);
  const scrambleRef = useRef<any>(null);
  const lastScramble = useRef(0);

  const cornerMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const ledMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const sideStripMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const glitchMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const glitchMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const pulseMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const pulseMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const barMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const barMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const droneRefs = useRef<(THREE.Group | null)[]>([]);
  const rainMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const hudMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  /* ---------------- static random data ---------------- */
  const glitchSlices = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        y: 5.6 + i * 0.82,
        color: i % 2 === 0 ? CYAN : PINK,
        seed: Math.random() * 10,
      })),
    []
  );

  const rainData = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        x: rand(-20, 20),
        z: rand(-10, 12),
        y: rand(0, 26),
        speed: rand(4, 13),
        len: rand(0.5, 2.6),
        color: Math.random() > 0.45 ? CYAN : PINK,
      })),
    []
  );

  const droneData = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        r: 7.5 + i * 1.7,
        y: 4.5 + i * 3.4,
        speed: 0.3 + i * 0.16,
        phase: i * 1.9,
        color: [CYAN, PINK, LIME, PURPLE][i % 4],
      })),
    []
  );

  const bars = useMemo(() => Array.from({ length: 20 }, (_, i) => i), []);

  const tickerText = useMemo(() => {
    const phrase =
      "// UPLINK STABLE :: INCOMING TRANSMISSION :: OPEN FOR COLLAB :: RESPONSE < 24H ";
    return phrase.repeat(2).slice(0, 96);
  }, []);

  const TICKER_LOOP = 26;

  /* ---------------- animation loop ---------------- */
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    /* ---- glitch burst trigger ---- */
    const burst = Math.sin(t * 9.3) > 0.962 || Math.sin(t * 23.7) > 0.972;

    /* ---- whole-screen shake ---- */
    if (screenGroup.current) {
      screenGroup.current.position.x = burst
        ? (Math.random() - 0.5) * 0.32
        : Math.sin(t * 41) * 0.012;
      screenGroup.current.position.y = burst ? (Math.random() - 0.5) * 0.14 : 0;
    }

    /* ---- blackout flicker ---- */
    if (flickerMat.current) {
      flickerMat.current.opacity = burst ? 0.7 : Math.sin(t * 31) > 0.985 ? 0.4 : 0;
    }

    /* ---- screen pulse ---- */
    if (screenGlow.current) {
      screenGlow.current.opacity = 0.35 + Math.sin(t * 1.4) * 0.12;
    }
    if (screenInner.current) {
      screenInner.current.opacity = 0.88 + Math.sin(t * 2.1 + 1) * 0.06;
    }

    /* ---- scanline sweep (bottom → top) ---- */
    if (scanline.current) {
      const p = (t * 0.55) % 1;
      scanline.current.position.y = 5 + p * 7;
    }
    if (scanlineMat.current) {
      scanlineMat.current.opacity = 0.35 + Math.sin(t * 8) * 0.15;
    }

    /* ---- rotating halos (counter-rotating) ---- */
    if (ringA.current) ringA.current.rotation.z = t * 0.5;
    if (ringAMat.current) {
      ringAMat.current.opacity = 0.25 + Math.sin(t * 2.5) * 0.12;
    }
    if (ringB.current) ringB.current.rotation.z = -t * 0.32;
    if (ringBMat.current) {
      ringBMat.current.opacity = 0.18 + Math.sin(t * 1.8 + 2) * 0.1;
    }

    /* ---- glitch slices jump around ---- */
    glitchSlices.forEach((s, i) => {
      const m = glitchMeshes.current[i];
      const mat = glitchMats.current[i];
      if (!m || !mat) return;
      const active = Math.sin(t * 6.1 + s.seed) > 0.7;
      m.position.x = active ? (Math.random() - 0.5) * 2.4 : 0;
      m.scale.x = active ? rand(0.4, 1.4) : 0.02;
      mat.opacity = active ? rand(0.25, 0.7) : 0;
    });

    /* ---- expanding energy pulses behind the wall ---- */
    pulseMeshes.current.forEach((m, i) => {
      const mat = pulseMats.current[i];
      if (!m || !mat) return;
      const p = ((t * 0.42 + i * 0.33) % 1 + 1) % 1;
      const s = 0.55 + p * 1.5;
      m.scale.set(s, s, s);
      mat.opacity = (1 - p) * 0.55;
    });

    /* ---- audio-style equalizer bars ---- */
    bars.forEach((i) => {
      const m = barMeshes.current[i];
      const mat = barMats.current[i];
      if (!m || !mat) return;
      const h =
        0.08 +
        (Math.sin(t * 6 + i * 0.55) * 0.5 + 0.5) *
          (0.2 + (Math.sin(t * 13 + i) * 0.5 + 0.5) * 0.45);
      m.scale.y = h;
      m.position.y = 5.08 + h / 2;
      mat.opacity = 0.45 + h * 0.9;
    });

    /* ---- title + email glitch offsets ---- */
    if (titleGroup.current) {
      const g = burst ? (Math.random() - 0.5) * 0.4 : 0;
      titleGroup.current.position.x = g;
    }
    if (emailGroup.current) {
      const g = burst ? (Math.random() - 0.5) * 0.24 : 0;
      emailGroup.current.position.x = g;
    }

    /* ---- text scramble readout ---- */
    if (scrambleRef.current && t - lastScramble.current > 0.075) {
      lastScramble.current = t;
      try {
        scrambleRef.current.text = scramble(9);
        scrambleRef.current.sync?.();
      } catch {
        /* noop */
      }
    }

    /* ---- rooftop beacon blink ---- */
    const blink = Math.sin(t * 3.5) > 0.4 ? 1 : 0.08;
    if (beacon.current) beacon.current.opacity = blink;
    if (beaconLight.current) beaconLight.current.intensity = 40 * blink;

    /* ---- corner brackets flicker ---- */
    cornerMats.current.forEach((m, i) => {
      if (m) m.opacity = 0.55 + Math.sin(t * (2.4 + i * 0.3) + i) * 0.4;
    });

    /* ---- HUD ticks ---- */
    hudMats.current.forEach((m, i) => {
      if (m) m.opacity = Math.sin(t * (3 + i * 0.7) + i) > 0.2 ? 1 : 0.15;
    });

    /* ---- status LEDs alternate ---- */
    ledMats.current.forEach((m, i) => {
      if (m) m.opacity = Math.sin(t * (4 + i * 0.5) + i * 1.7) > 0 ? 1 : 0.1;
    });

    /* ---- side neon strips flow ---- */
    sideStripMats.current.forEach((m, i) => {
      if (m) m.opacity = 0.3 + (Math.sin(t * 3 + i * 0.9) * 0.5 + 0.5) * 0.6;
    });

    /* ---- scrolling holo floor grid ---- */
    if (gridRef.current) {
      gridRef.current.position.z = 8 + ((t * 5) % 1);
    }

    /* ---- marquee ticker ---- */
    if (tickerGroup.current) {
      tickerGroup.current.position.x = -((t * 3.2) % TICKER_LOOP);
    }

    /* ---- data rain ---- */
    rainData.forEach((d, i) => {
      const m = rainMeshes.current[i];
      if (!m) return;
      m.position.y = 26 - ((t * d.speed + d.y) % 30);
      m.scale.y = d.len;
    });

    /* ---- orbiting drones ---- */
    droneData.forEach((d, i) => {
      const g = droneRefs.current[i];
      if (!g) return;
      const a = t * d.speed + d.phase;
      g.position.set(Math.cos(a) * d.r, d.y + Math.sin(t * 1.3 + d.phase) * 0.6, Math.sin(a) * d.r * 0.55 + 3);
      g.rotation.y = -a;
    });
  });

  /* ---------------- corner bracket positions ---------------- */
  const corners: [number, number][] = [
    [-5.5, 12],
    [5.5, 12],
    [-5.5, 5],
    [5.5, 5],
  ];

  return (
    <group position={[0, 0, z]}>
      {/* ============================================================ */}
      {/* SCROLLING HOLO FLOOR GRID                                     */}
      {/* ============================================================ */}
      <gridHelper
        args={[140, 140, CYAN, "#0d1020"]}
        position={[0, 0.02, 8]}
        ref={(g) => {
          gridRef.current = g;
          if (g) {
            const mat = g.material as THREE.LineBasicMaterial;
            mat.transparent = true;
            mat.opacity = 0.28;
            mat.depthWrite = false;
            mat.toneMapped = false;
          }
        }}
      />

      {/* ============================================================ */}
      {/* BUILDING BODY                                                 */}
      {/* ============================================================ */}
      <mesh position={[0, 8, -2]}>
        <boxGeometry args={[14, 16, 6]} />
        <meshStandardMaterial color="#0b0b13" roughness={0.6} metalness={0.6} />
      </mesh>

      {/* horizontal panel seams */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[0, 1.5 + i * 2.2, 0.98]}>
          <boxGeometry args={[13.4, 0.03, 0.02]} />
          <meshBasicMaterial color="#1b2340" transparent opacity={0.8} toneMapped={false} />
        </mesh>
      ))}

      {/* vertical neon strips on the body's front corners */}
      {[-7.05, 7.05].map((x, i) => (
        <mesh key={x} position={[x, 8, 0.5]}>
          <boxGeometry args={[0.08, 15, 0.08]} />
          <meshBasicMaterial
            ref={(m) => {
              sideStripMats.current[i] = m;
            }}
            color={i === 0 ? CYAN : PINK}
            transparent
            opacity={0.8}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* ============================================================ */}
      {/* ROOFTOP ANTENNA + BEACON                                      */}
      {/* ============================================================ */}
      <mesh position={[0, 17.5, -2]}>
        <cylinderGeometry args={[0.06, 0.06, 4, 6]} />
        <meshStandardMaterial color="#1a1a24" metalness={0.9} />
      </mesh>
      <mesh position={[0, 19.8, -2]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial ref={beacon} color={PINK} transparent toneMapped={false} />
      </mesh>
      <pointLight
        ref={beaconLight}
        position={[0, 19.8, -2]}
        color={PINK}
        intensity={40}
        distance={20}
      />

      {/* ============================================================ */}
      {/* HALO RINGS BEHIND THE SCREEN                                  */}
      {/* ============================================================ */}
      <mesh ref={ringA} position={[0, 8.5, 0.9]}>
        <ringGeometry args={[5.8, 6.2, 64]} />
        <meshBasicMaterial
          ref={ringAMat}
          color={PURPLE}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ringB} position={[0, 8.5, 0.86]}>
        <ringGeometry args={[7.4, 7.55, 6]} />
        <meshBasicMaterial
          ref={ringBMat}
          color={CYAN}
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* ============================================================ */}
      {/* EXPANDING ENERGY PULSES                                       */}
      {/* ============================================================ */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[0, 8.5, 0.84]}
          ref={(m) => {
            pulseMeshes.current[i] = m;
          }}
        >
          <ringGeometry args={[3.6, 3.85, 72]} />
          <meshBasicMaterial
            ref={(m) => {
              pulseMats.current[i] = m;
            }}
            color={i % 2 === 0 ? PINK : CYAN}
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* ============================================================ */}
      {/* ==================  SCREEN ASSEMBLY  ======================= */}
      {/* ============================================================ */}
      <group ref={screenGroup}>
        {/* frame */}
        <mesh position={[0, 8.5, 1.05]}>
          <planeGeometry args={[12, 8]} />
          <meshBasicMaterial color="#1a1a24" toneMapped={false} />
        </mesh>

        {/* backlight glow */}
        <mesh position={[0, 8.5, 1.08]}>
          <planeGeometry args={[12.4, 8.4]} />
          <meshBasicMaterial
            ref={screenGlow}
            color={PINK}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* screen surface */}
        <mesh position={[0, 8.5, 1.1]}>
          <planeGeometry args={[11, 7]} />
          <meshBasicMaterial
            ref={screenInner}
            color="#05000a"
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </mesh>

        {/* chromatic aberration tints */}
        <mesh position={[-0.06, 8.5, 1.11]}>
          <planeGeometry args={[11, 7]} />
          <meshBasicMaterial
            color={PINK}
            transparent
            opacity={0.12}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0.06, 8.5, 1.11]}>
          <planeGeometry args={[11, 7]} />
          <meshBasicMaterial
            color={CYAN}
            transparent
            opacity={0.12}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* ---- GLITCH SLICES ---- */}
        {glitchSlices.map((s, i) => (
          <mesh
            key={i}
            position={[0, s.y, 1.13]}
            ref={(m) => {
              glitchMeshes.current[i] = m;
            }}
          >
            <planeGeometry args={[11, 0.26]} />
            <meshBasicMaterial
              ref={(m) => {
                glitchMats.current[i] = m;
              }}
              color={s.color}
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* ---- SCANLINE ---- */}
        <mesh ref={scanline} position={[0, 8.5, 1.14]}>
          <planeGeometry args={[11, 0.15]} />
          <meshBasicMaterial
            ref={scanlineMat}
            color={CYAN}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* ============================================================ */}
        {/* TEXT CONTENT                                                  */}
        {/* ============================================================ */}

        {/* big CONTACT title with 3-layer chromatic aberration */}
        <group ref={titleGroup} position={[0, 10.4, 0]}>
          <Text
            position={[-0.06, 0, 1.16]}
            fontSize={1.35}
            letterSpacing={0.12}
            color={PINK}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor={PINK}
          >
            CONTACT
          </Text>
          <Text
            position={[0.06, 0, 1.17]}
            fontSize={1.35}
            letterSpacing={0.12}
            color={CYAN}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor={CYAN}
          >
            CONTACT
          </Text>
          <Text
            position={[0, 0, 1.18]}
            fontSize={1.35}
            letterSpacing={0.12}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="#ffffff"
          >
            CONTACT
          </Text>
        </group>

        {/* subhead */}
        <Text
          position={[0, 9.15, 1.16]}
          fontSize={0.32}
          letterSpacing={0.35}
          color={AMBER}
          anchorX="center"
          anchorY="middle"
        >
          // ESTABLISH UPLINK //
        </Text>

        {/* divider */}
        <mesh position={[0, 8.55, 1.15]}>
          <planeGeometry args={[8.5, 0.035]} />
          <meshBasicMaterial color={CYAN} transparent opacity={0.75} toneMapped={false} />
        </mesh>

        {/* hero email with chromatic aberration */}
        <group ref={emailGroup} position={[0, 7.6, 0]}>
          <Text
            position={[-0.04, 0, 1.16]}
            fontSize={0.62}
            letterSpacing={0.04}
            color={PINK}
            anchorX="center"
            anchorY="middle"
          >
            {EMAIL}
          </Text>
          <Text
            position={[0.04, 0, 1.17]}
            fontSize={0.62}
            letterSpacing={0.04}
            color={CYAN}
            anchorX="center"
            anchorY="middle"
          >
            {EMAIL}
          </Text>
          <Text
            position={[0, 0, 1.18]}
            fontSize={0.62}
            letterSpacing={0.04}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {EMAIL}
          </Text>
        </group>

        {/* socials */}
        <Text
          position={[0, 6.75, 1.16]}
          fontSize={0.32}
          letterSpacing={0.08}
          color={CYAN}
          anchorX="center"
          anchorY="middle"
        >
          {`IG  ${INSTAGRAM}   //   IN  ${LINKEDIN}`}
        </Text>

        {/* status bar */}
        <Text
          position={[0, 6.0, 1.16]}
          fontSize={0.22}
          letterSpacing={0.4}
          color={LIME}
          anchorX="center"
          anchorY="middle"
        >
          ▮ SIGNAL OPEN ▮ ACCEPTING TRANSMISSIONS ▮ 2077 ▮
        </Text>

        {/* ============================================================ */}
        {/* EQUALIZER BARS                                                */}
        {/* ============================================================ */}
        {bars.map((i) => (
          <mesh
            key={i}
            position={[-5.2 + i * 0.548, 5.2, 1.15]}
            ref={(m) => {
              barMeshes.current[i] = m;
            }}
          >
            <boxGeometry args={[0.3, 1, 0.02]} />
            <meshBasicMaterial
              ref={(m) => {
                barMats.current[i] = m;
              }}
              color={i % 3 === 0 ? LIME : i % 3 === 1 ? CYAN : PINK}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* ============================================================ */}
        {/* MARQUEE TICKER                                                */}
        {/* ============================================================ */}
        <group position={[0, 11.55, 0]}>
          <group ref={tickerGroup}>
            <Text
              position={[TICKER_LOOP / 2, 0, 1.15]}
              fontSize={0.22}
              letterSpacing={0.12}
              color={AMBER}
              anchorX="center"
              anchorY="middle"
            >
              {tickerText}
            </Text>
            <Text
              position={[-TICKER_LOOP / 2, 0, 1.15]}
              fontSize={0.22}
              letterSpacing={0.12}
              color={AMBER}
              anchorX="center"
              anchorY="middle"
            >
              {tickerText}
            </Text>
          </group>
        </group>

        {/* ============================================================ */}
        {/* CORNER BRACKETS + HUD                                         */}
        {/* ============================================================ */}
        {corners.map(([cx, cy], i) => {
          const sx = cx < 0 ? 1 : -1;
          const sy = cy > 8.5 ? -1 : 1;
          return (
            <group key={i}>
              <mesh position={[cx + sx * 0.5, cy, 1.14]}>
                <boxGeometry args={[1, 0.09, 0.04]} />
                <meshBasicMaterial
                  ref={(m) => {
                    cornerMats.current[i * 2] = m;
                  }}
                  color={CYAN}
                  transparent
                  opacity={0.8}
                  toneMapped={false}
                />
              </mesh>
              <mesh position={[cx, cy + sy * 0.5, 1.14]}>
                <boxGeometry args={[0.09, 1, 0.04]} />
                <meshBasicMaterial
                  ref={(m) => {
                    cornerMats.current[i * 2 + 1] = m;
                  }}
                  color={CYAN}
                  transparent
                  opacity={0.8}
                  toneMapped={false}
                />
              </mesh>
              {/* tiny crosshair in the corner */}
              <mesh position={[cx + sx * 0.9, cy + sy * 0.9, 1.14]}>
                <boxGeometry args={[0.22, 0.03, 0.02]} />
                <meshBasicMaterial
                  ref={(m) => {
                    hudMats.current[i * 2] = m;
                  }}
                  color={LIME}
                  transparent
                  opacity={0.9}
                  toneMapped={false}
                />
              </mesh>
              <mesh position={[cx + sx * 0.9, cy + sy * 0.9, 1.14]}>
                <boxGeometry args={[0.03, 0.22, 0.02]} />
                <meshBasicMaterial
                  ref={(m) => {
                    hudMats.current[i * 2 + 1] = m;
                  }}
                  color={LIME}
                  transparent
                  opacity={0.9}
                  toneMapped={false}
                />
              </mesh>
            </group>
          );
        })}

        {/* REC indicator + live scramble readout */}
        <Text
          position={[-4.6, 11.75, 1.16]}
          fontSize={0.24}
          letterSpacing={0.2}
          color="#ff2b4d"
          anchorX="left"
          anchorY="middle"
        >
          ● REC
        </Text>
        <Text
          ref={scrambleRef}
          position={[4.6, 11.75, 1.16]}
          fontSize={0.24}
          letterSpacing={0.2}
          color={CYAN}
          anchorX="right"
          anchorY="middle"
        >
          000000000
        </Text>

        {/* ============================================================ */}
        {/* STATUS LEDs ALONG THE BOTTOM OF THE FRAME                     */}
        {/* ============================================================ */}
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh key={i} position={[-4 + i, 4.75, 1.14]}>
            <circleGeometry args={[0.09, 8]} />
            <meshBasicMaterial
              ref={(m) => {
                ledMats.current[i] = m;
              }}
              color={i % 2 === 0 ? LIME : AMBER}
              transparent
              opacity={0.9}
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* ---- BLACKOUT FLICKER OVERLAY ---- */}
        <mesh position={[0, 8.5, 1.2]}>
          <planeGeometry args={[11, 7]} />
          <meshBasicMaterial
            ref={flickerMat}
            color="#000000"
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* ============================================================ */}
      {/* SIDE STRUTS                                                   */}
      {/* ============================================================ */}
      {[-6.5, 6.5].map((x, i) => (
        <group key={x}>
          <mesh position={[x, 4, 3]}>
            <boxGeometry args={[0.25, 8, 0.25]} />
            <meshStandardMaterial color="#1a1a24" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[x, 4, 3.15]}>
            <boxGeometry args={[0.06, 7.5, 0.02]} />
            <meshBasicMaterial color={i === 0 ? CYAN : PINK} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* ============================================================ */}
      {/* VOLUMETRIC LIGHT CONES                                        */}
      {/* ============================================================ */}
      {[-3.4, 3.4].map((x, i) => (
        <mesh key={x} position={[x, 15.5, 3.4]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[2.6, 8, 24, 1, true]} />
          <meshBasicMaterial
            color={i === 0 ? CYAN : PINK}
            transparent
            opacity={0.055}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* ============================================================ */}
      {/* DATA RAIN                                                     */}
      {/* ============================================================ */}
      {rainData.map((d, i) => (
        <mesh
          key={i}
          position={[d.x, d.y, d.z]}
          ref={(m) => {
            rainMeshes.current[i] = m;
          }}
        >
          <boxGeometry args={[0.035, 1, 0.035]} />
          <meshBasicMaterial
            color={d.color}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* ============================================================ */}
      {/* ORBITING SURVEILLANCE DRONES                                  */}
      {/* ============================================================ */}
      {droneData.map((d, i) => (
        <group
          key={i}
          ref={(g) => {
            droneRefs.current[i] = g;
          }}
        >
          <mesh>
            <octahedronGeometry args={[0.16, 0]} />
            <meshBasicMaterial color={d.color} toneMapped={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.45, 10, 10]} />
            <meshBasicMaterial
              color={d.color}
              transparent
              opacity={0.12}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}

      {/* ============================================================ */}
      {/* LIGHTING                                                      */}
      {/* ============================================================ */}
      <pointLight position={[0, 8.5, 6]} color={PINK} intensity={55} distance={35} />
      <pointLight position={[-4, 10, 4]} color={CYAN} intensity={25} distance={20} />
      <pointLight position={[4, 7, 4]} color={PURPLE} intensity={25} distance={20} />
      <pointLight position={[0, 2, 6]} color={PINK} intensity={18} distance={16} />
      <pointLight position={[0, 16, 2]} color={CYAN} intensity={20} distance={26} />
    </group>
  );
}