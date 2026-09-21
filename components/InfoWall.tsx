"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

type InfoWallProps = {
  position: [number, number, number];
  rotationY?: number; // rotate so the screen faces the road
  title: string;
  subtitle: string;
  lines: string[]; // up to 4
  color: string;
  status?: string;
};

const CYAN = "#00f0ff";
const AMBER = "#ffb020";
const LIME = "#a6ff00";
const PURPLE = "#9d4bff";

export default function InfoWall({
  position,
  rotationY = 0,
  title,
  subtitle,
  lines,
  color,
  status = "SIGNAL OPEN",
}: InfoWallProps) {
  const screenGlow = useRef<THREE.MeshBasicMaterial>(null);
  const scanline = useRef<THREE.Mesh>(null);
  const scanlineMat = useRef<THREE.MeshBasicMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const titleGroup = useRef<THREE.Group>(null);
  const beacon = useRef<THREE.MeshBasicMaterial>(null);
  const beaconLight = useRef<THREE.PointLight>(null);
  const stripMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (screenGlow.current) screenGlow.current.opacity = 0.35 + Math.sin(t * 1.4) * 0.12;
    if (scanline.current) scanline.current.position.y = 5 + ((t * 0.55) % 1) * 7;
    if (scanlineMat.current) scanlineMat.current.opacity = 0.35 + Math.sin(t * 8) * 0.15;
    if (ring.current) ring.current.rotation.z = t * 0.5;
    if (ringMat.current) ringMat.current.opacity = 0.25 + Math.sin(t * 2.5) * 0.12;
    if (titleGroup.current) {
      const g = Math.sin(t * 11.3) > 0.94 ? (Math.random() - 0.5) * 0.18 : 0;
      titleGroup.current.position.x = g;
    }
    const blink = Math.sin(t * 3.5) > 0.4 ? 1 : 0.08;
    if (beacon.current) beacon.current.opacity = blink;
    if (beaconLight.current) beaconLight.current.intensity = 40 * blink;
    stripMats.current.forEach((m, i) => {
      if (m) m.opacity = 0.3 + (Math.sin(t * 3 + i * 0.9) * 0.5 + 0.5) * 0.6;
    });
  });

  const corners: [number, number][] = [
    [-5.5, 12],
    [5.5, 12],
    [-5.5, 5],
    [5.5, 5],
  ];

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* body */}
      <mesh position={[0, 8, -2]}>
        <boxGeometry args={[14, 16, 6]} />
        <meshStandardMaterial color="#0b0b13" roughness={0.6} metalness={0.6} />
      </mesh>

      {[-7.05, 7.05].map((x, i) => (
        <mesh key={x} position={[x, 8, 0.5]}>
          <boxGeometry args={[0.08, 15, 0.08]} />
          <meshBasicMaterial
            ref={(m) => {
              stripMats.current[i] = m;
            }}
            color={i === 0 ? CYAN : color}
            transparent
            opacity={0.8}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* antenna + beacon */}
      <mesh position={[0, 17.5, -2]}>
        <cylinderGeometry args={[0.06, 0.06, 4, 6]} />
        <meshStandardMaterial color="#1a1a24" metalness={0.9} />
      </mesh>
      <mesh position={[0, 19.8, -2]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshBasicMaterial ref={beacon} color={color} transparent toneMapped={false} />
      </mesh>
      <pointLight ref={beaconLight} position={[0, 19.8, -2]} color={color} intensity={40} distance={20} />

      {/* halo */}
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

      {/* screen frame, glow, surface */}
      <mesh position={[0, 8.5, 1.05]}>
        <planeGeometry args={[12, 8]} />
        <meshBasicMaterial color="#1a1a24" toneMapped={false} />
      </mesh>
      <mesh position={[0, 8.5, 1.08]}>
        <planeGeometry args={[12.4, 8.4]} />
        <meshBasicMaterial
          ref={screenGlow}
          color={color}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 8.5, 1.1]}>
        <planeGeometry args={[11, 7]} />
        <meshBasicMaterial color="#05000a" transparent opacity={0.9} toneMapped={false} />
      </mesh>

      {/* chromatic tints */}
      <mesh position={[-0.06, 8.5, 1.11]}>
        <planeGeometry args={[11, 7]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0.06, 8.5, 1.11]}>
        <planeGeometry args={[11, 7]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* scanline */}
      <mesh ref={scanline} position={[0, 8.5, 1.14]}>
        <planeGeometry args={[11, 0.15]} />
        <meshBasicMaterial ref={scanlineMat} color={CYAN} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* title (3-layer chromatic aberration) */}
      <group ref={titleGroup} position={[0, 10.4, 0]}>
        <Text position={[-0.06, 0, 1.16]} fontSize={1.35} letterSpacing={0.12} color={color} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor={color}>
          {title}
        </Text>
        <Text position={[0.06, 0, 1.17]} fontSize={1.35} letterSpacing={0.12} color={CYAN} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor={CYAN}>
          {title}
        </Text>
        <Text position={[0, 0, 1.18]} fontSize={1.35} letterSpacing={0.12} color="#ffffff" anchorX="center" anchorY="middle" outlineWidth={0.012} outlineColor="#ffffff">
          {title}
        </Text>
      </group>

      <Text position={[0, 9.15, 1.16]} fontSize={0.32} letterSpacing={0.35} color={AMBER} anchorX="center" anchorY="middle">
        {`// ${subtitle} //`}
      </Text>

      <mesh position={[0, 8.55, 1.15]}>
        <planeGeometry args={[8.5, 0.035]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.75} toneMapped={false} />
      </mesh>

      {/* content lines */}
      {lines.slice(0, 4).map((line, i) => (
        <Text
          key={i}
          position={[0, 7.75 - i * 0.62, 1.16]}
          fontSize={0.4}
          letterSpacing={0.05}
          maxWidth={10.5}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {line}
        </Text>
      ))}

      <Text position={[0, 5.2, 1.16]} fontSize={0.22} letterSpacing={0.4} color={LIME} anchorX="center" anchorY="middle">
        {`|| ${status} ||`}
      </Text>

      {/* corner brackets */}
      {corners.map(([cx, cy], i) => {
        const sx = cx < 0 ? 1 : -1;
        const sy = cy > 8.5 ? -1 : 1;
        return (
          <group key={i}>
            <mesh position={[cx + sx * 0.5, cy, 1.14]}>
              <boxGeometry args={[1, 0.09, 0.04]} />
              <meshBasicMaterial color={CYAN} toneMapped={false} />
            </mesh>
            <mesh position={[cx, cy + sy * 0.5, 1.14]}>
              <boxGeometry args={[0.09, 1, 0.04]} />
              <meshBasicMaterial color={CYAN} toneMapped={false} />
            </mesh>
          </group>
        );
      })}

      {/* struts */}
      {[-6.5, 6.5].map((x, i) => (
        <group key={x}>
          <mesh position={[x, 4, 3]}>
            <boxGeometry args={[0.25, 8, 0.25]} />
            <meshStandardMaterial color="#1a1a24" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[x, 4, 3.15]}>
            <boxGeometry args={[0.06, 7.5, 0.02]} />
            <meshBasicMaterial color={i === 0 ? CYAN : color} toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* lighting */}
      <pointLight position={[0, 8.5, 6]} color={color} intensity={55} distance={35} />
      <pointLight position={[0, 2, 6]} color={color} intensity={18} distance={16} />
    </group>
  );
}