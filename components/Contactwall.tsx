"use client";

import { useRef } from "react";
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

/**
 * The scene's finale landmark — a giant backlit video-wall billboard
 * at the end of the road. Fully glitched out for the cyberpunk look.
 * Houses the CONTACT section.
 */
export default function ContactWall({ z, color = "#ff2bd6" }: ContactWallProps) {
  const PINK = color;

  /* ---------------- animated refs ---------------- */
  const screenGlow = useRef<THREE.MeshBasicMaterial>(null);
  const screenInner = useRef<THREE.MeshBasicMaterial>(null);
  const scanline = useRef<THREE.Mesh>(null);
  const scanlineMat = useRef<THREE.MeshBasicMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const titleGroup = useRef<THREE.Group>(null);
  const emailGroup = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.MeshBasicMaterial>(null);
  const beaconLight = useRef<THREE.PointLight>(null);
  const cornerMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const ledMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const sideStripMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  /* ---------------- animation loop ---------------- */
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // screen pulse
    if (screenGlow.current) {
      screenGlow.current.opacity = 0.35 + Math.sin(t * 1.4) * 0.12;
    }
    if (screenInner.current) {
      screenInner.current.opacity = 0.88 + Math.sin(t * 2.1 + 1) * 0.06;
    }

    // scanline sweep (bottom → top)
    if (scanline.current) {
      const p = (t * 0.55) % 1;
      scanline.current.position.y = 5 + p * 7;
    }
    if (scanlineMat.current) {
      scanlineMat.current.opacity = 0.35 + Math.sin(t * 8) * 0.15;
    }

    // rotating halo
    if (ring.current) ring.current.rotation.z = t * 0.5;
    if (ringMat.current) {
      ringMat.current.opacity = 0.25 + Math.sin(t * 2.5) * 0.12;
    }

    // glitch offsets on title + email
    if (titleGroup.current) {
      const g = Math.sin(t * 11.3) > 0.94 ? (Math.random() - 0.5) * 0.18 : 0;
      titleGroup.current.position.x = g;
    }
    if (emailGroup.current) {
      const g = Math.sin(t * 7.7) > 0.95 ? (Math.random() - 0.5) * 0.1 : 0;
      emailGroup.current.position.x = g;
    }

    // rooftop beacon blink
    const blink = Math.sin(t * 3.5) > 0.4 ? 1 : 0.08;
    if (beacon.current) beacon.current.opacity = blink;
    if (beaconLight.current) beaconLight.current.intensity = 40 * blink;

    // corner brackets flicker
    cornerMats.current.forEach((m, i) => {
      if (m) m.opacity = 0.55 + Math.sin(t * (2.4 + i * 0.3) + i) * 0.4;
    });

    // status LEDs alternate
    ledMats.current.forEach((m, i) => {
      if (m) m.opacity = Math.sin(t * (4 + i * 0.5) + i * 1.7) > 0 ? 1 : 0.1;
    });

    // side neon strips flow
    sideStripMats.current.forEach((m, i) => {
      if (m) m.opacity = 0.3 + (Math.sin(t * 3 + i * 0.9) * 0.5 + 0.5) * 0.6;
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
      {/* BUILDING BODY                                                 */}
      {/* ============================================================ */}
      <mesh position={[0, 8, -2]}>
        <boxGeometry args={[14, 16, 6]} />
        <meshStandardMaterial color="#0b0b13" roughness={0.6} metalness={0.6} />
      </mesh>

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
      {/* HALO RING BEHIND THE SCREEN                                   */}
      {/* ============================================================ */}
      <mesh ref={ring} position={[0, 8.5, 0.95]}>
        <ringGeometry args={[5.8, 6.2, 64]} />
        <meshBasicMaterial
          ref={ringMat}
          color={PURPLE}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* ============================================================ */}
      {/* SCREEN FRAME + BACKLIGHT GLOW                                 */}
      {/* ============================================================ */}
      <mesh position={[0, 8.5, 1.05]}>
        <planeGeometry args={[12, 8]} />
        <meshBasicMaterial color="#1a1a24" toneMapped={false} />
      </mesh>

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

      {/* ============================================================ */}
      {/* SCREEN SURFACE                                                */}
      {/* ============================================================ */}
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

      {/* chromatic aberration tints over the whole screen */}
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

      {/* ============================================================ */}
      {/* SCANLINE                                                      */}
      {/* ============================================================ */}
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
      {/* CORNER BRACKETS                                               */}
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
          </group>
        );
      })}

      {/* ============================================================ */}
      {/* STATUS LEDs ALONG THE BOTTOM OF THE FRAME                    */}
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
      {/* LIGHTING                                                      */}
      {/* ============================================================ */}
      <pointLight position={[0, 8.5, 6]} color={PINK} intensity={55} distance={35} />
      <pointLight position={[-4, 10, 4]} color={CYAN} intensity={25} distance={20} />
      <pointLight position={[4, 7, 4]} color={PURPLE} intensity={25} distance={20} />
      <pointLight position={[0, 2, 6]} color={PINK} intensity={18} distance={16} />
    </group>
  );
}