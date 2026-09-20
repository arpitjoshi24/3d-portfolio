"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_PATH = "/models/car/scene.gltf";

// Starts the download as soon as this module loads.
useGLTF.preload(MODEL_PATH);

/* --------------------------- input hook ---------------------------- */
// A ref, not state, so held-key checks don't re-render every frame.
function useKeys() {
  const keys = useRef({ forward: false, backward: false, left: false, right: false });

  useEffect(() => {
    const setKey = (key: string, value: boolean) => {
      switch (key.toLowerCase()) {
        case "w":
        case "arrowup":
          keys.current.forward = value;
          break;
        case "s":
        case "arrowdown":
          keys.current.backward = value;
          break;
        case "a":
        case "arrowleft":
          keys.current.left = value;
          break;
        case "d":
        case "arrowright":
          keys.current.right = value;
          break;
      }
    };

    const down = (e: KeyboardEvent) => setKey(e.key, true);
    const up = (e: KeyboardEvent) => setKey(e.key, false);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return keys;
}

/* ------------------------- portfolio sections ------------------------ */
// A "section" is just a z position on the road plus how close the car
// has to get before it counts as "arrived". Car reports which one (if
// any) it's currently near via onSectionChange, so the parent page can
// show the matching content overlay.
export type Section = { id: string; z: number; range?: number };

/* ----------------------------- the car ------------------------------ */

type CarProps = {
  position?: [number, number, number];
  rotation?: number; // initial yaw in radians — flip with Math.PI if the model faces backwards
  scale?: number;
  speed?: number; // units/sec
  turnSpeed?: number; // radians/sec
  roadHalfWidth?: number; // how far left/right of center the car can go before hitting the curb
  zLimits?: [number, number]; // how far the car can drive before hitting the end of the road
  sections?: Section[];
  onSectionChange?: (id: string | null) => void;
};

export default function Car({
  position = [0, 0, 0],
  rotation = 0,
  scale = 0.02,
  speed = 20,
  turnSpeed = 1.6,
  roadHalfWidth = 5.3,
  zLimits = [-140, 140],
  sections = [],
  onSectionChange,
}: CarProps) {
  const group = useRef<THREE.Group>(null);
  const keys = useKeys();
  const { scene } = useGLTF(MODEL_PATH);
  const activeSection = useRef<string | null>(null);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const k = keys.current;

    // A/D rotate the car; W/S move it along the direction it's facing.
    if (k.left) g.rotation.y += turnSpeed * delta;
    if (k.right) g.rotation.y -= turnSpeed * delta;

    const dir = k.forward ? 1 : k.backward ? -1 : 0;
    if (dir !== 0) {
      const nextX = g.position.x + Math.sin(g.rotation.y) * dir * speed * delta;
      const nextZ = g.position.z + Math.cos(g.rotation.y) * dir * speed * delta;

      // Collision: instead of full physics, just clamp the car to the
      // paved road corridor so it can never cross the curb into the
      // sidewalks or buildings. Simple, cheap, and good enough for a
      // road-only driving experience.
      g.position.x = THREE.MathUtils.clamp(nextX, -roadHalfWidth, roadHalfWidth);
      g.position.z = THREE.MathUtils.clamp(nextZ, zLimits[0], zLimits[1]);
    }

    // Proximity check: which billboard (if any) is the car under right
    // now? Only fires the callback when the answer actually changes,
    // so the parent isn't re-rendering 60 times a second.
    if (sections.length && onSectionChange) {
      const nearby = sections.find(
        (s) => Math.abs(g.position.z - s.z) < (s.range ?? 9)
      );
      const id = nearby ? nearby.id : null;
      if (id !== activeSection.current) {
        activeSection.current = id;
        onSectionChange(id);
      }
    }
  });

  return (
    <group ref={group} position={position} rotation={[0, rotation, 0]} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}