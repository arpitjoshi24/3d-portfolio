"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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

/* --------------------------- mouse-look hook -------------------------- */
// Camera look only changes while the LEFT mouse button is held down and
// dragged — not on plain mouse movement. Tracks the drag delta into an
// accumulated, clamped offset; releasing the button lets it ease back
// toward center (handled in useFrame, since that's where delta-time lives).
function useDragLook() {
  const offset = useRef({ x: 0, y: 0 }); // accumulated, clamped to [-1, 1]
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // left button only
      dragging.current = true;
      last.current.x = e.clientX;
      last.current.y = e.clientY;
    };
    const handleUp = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging.current = false;
    };
    const handleMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      last.current.x = e.clientX;
      last.current.y = e.clientY;

      offset.current.x = THREE.MathUtils.clamp(offset.current.x + dx / window.innerWidth, -1, 1);
      offset.current.y = THREE.MathUtils.clamp(offset.current.y + dy / window.innerHeight, -1, 1);
    };

    window.addEventListener("pointerdown", handleDown);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointerleave", handleUp);
    window.addEventListener("pointermove", handleMove);
    return () => {
      window.removeEventListener("pointerdown", handleDown);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointerleave", handleUp);
      window.removeEventListener("pointermove", handleMove);
    };
  }, []);

  return { offset, dragging };
}

/* ------------------------- portfolio sections ------------------------ */
export type Section = { id: string; x?: number; z: number; range?: number };

/* ----------------------------- the car ------------------------------ */

type CarProps = {
  position?: [number, number, number];
  startYaw?: number; // initial facing, in radians — set ONCE on spawn, never re-applied
  scale?: number;
  speed?: number; // units/sec
  turnSpeed?: number; // radians/sec
  roadHalfWidth?: number; // main road: how far left/right of center before hitting the curb
  zLimits?: [number, number]; // main road: how far the car can drive before hitting the end
  intersectionZ?: number; // z of the T-junction where branch roads split off
  branchHalfWidth?: number; // branch roads: how far off-center before hitting their curb
  branchLength?: number; // how far each branch road extends from the main road
  sections?: Section[];
  onSectionChange?: (id: string | null) => void;

  // chase camera
  followCamera?: boolean; // if true (default), the scene camera tracks this car
  camDistance?: number; // how far behind the car the camera sits
  camHeight?: number; // how high above the car the camera sits
  camLookHeight?: number; // how far above the car's base the camera aims by default
  camDamping?: number; // 0–1, higher = snappier follow, lower = smoother/laggier

  // mouse look — hold LEFT MOUSE + drag to glance around (e.g. up to
  // see an overhead banner); release to ease back to facing forward
  enableMouseLook?: boolean;
  mouseYawRange?: number; // radians the camera can swing left/right around the car
  mouseLookHeightRange?: number; // units the look target can rise/fall — tall enough to reach banner height
  mouseLookDamping?: number; // 0–1, how quickly the applied look catches up to the drag
  mouseReturnDamping?: number; // 0–1, how quickly it eases back to center after release
};

export default function Car({
  position = [0, 0, 0],
  startYaw = 0,
  scale = 0.02,
  speed = 40,
  turnSpeed = 1.6,
  roadHalfWidth = 5.3,
  zLimits = [-140, 140],
  intersectionZ = 60,
  branchHalfWidth = 5.3,
  branchLength = 70,
  sections = [],
  onSectionChange,
  followCamera = true,
  camDistance = 7,
  camHeight = 3.2,
  camLookHeight = 1.2,
  camDamping = 0.08,
  enableMouseLook = true,
  mouseYawRange = 0.55,
  mouseLookHeightRange = 13,
  mouseLookDamping = 0.15,
  mouseReturnDamping = 0.05,
}: CarProps) {
  const group = useRef<THREE.Group>(null);
  const keys = useKeys();
  const { offset: dragOffset, dragging } = useDragLook();
  const { scene } = useGLTF(MODEL_PATH);
  const { camera } = useThree();
  const activeSection = useRef<string | null>(null);

  // Reusable scratch objects — avoid allocating new THREE.Vector3s every frame.
  const desiredCamPos = useRef(new THREE.Vector3());
  const lookTarget = useRef(new THREE.Vector3());
  const mouseSmoothed = useRef({ x: 0, y: 0 });

  // Set the starting facing exactly once, imperatively — NOT as a JSX
  // prop, which React would re-apply on every re-render (e.g. whenever
  // onSectionChange fires) and silently wipe out any turning from A/D.
  useEffect(() => {
    if (group.current) group.current.rotation.y = startYaw;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Same trap applies to the camera: set its starting spot once, on
  // mount, instead of relying on Canvas's `camera` prop being stable.
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    camera.position.set(
      g.position.x + Math.sin(startYaw) * camDistance,
      g.position.y + camHeight,
      g.position.z + Math.cos(startYaw) * camDistance
    );
    camera.lookAt(g.position.x, g.position.y + camLookHeight, g.position.z);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const k = keys.current;

    if (k.left) g.rotation.y += turnSpeed * delta;
    if (k.right) g.rotation.y -= turnSpeed * delta;

    // dir=1 is "forward" (W). At yaw=0 this drives toward -z, i.e. from
    // a positive-z spawn point toward sections laid out at decreasing z.
    const dir = k.forward ? 1 : k.backward ? -1 : 0;
    if (dir !== 0) {
      const nextX = g.position.x - Math.sin(g.rotation.y) * dir * speed * delta;
      const nextZ = g.position.z - Math.cos(g.rotation.y) * dir * speed * delta;

      // Collision on a T-shaped track: valid ground is EITHER the main
      // road (a strip along Z, fixed X width) OR the crossroad band (a
      // strip along X, at intersectionZ) that the branch roads run
      // along. If the proposed move lands in neither, fall back to
      // clamping within whichever strip the car is CURRENTLY in — this
      // is what stops the car from cutting through the corner and
      // driving into a building at the junction.
      const onMain = (x: number, z: number) =>
        Math.abs(x) <= roadHalfWidth && z >= zLimits[0] && z <= zLimits[1];
      const onCross = (x: number, z: number) =>
        Math.abs(z - intersectionZ) <= branchHalfWidth &&
        x >= -branchLength &&
        x <= branchLength;

      if (onMain(nextX, nextZ) || onCross(nextX, nextZ)) {
        g.position.x = nextX;
        g.position.z = nextZ;
      } else if (onCross(g.position.x, g.position.z)) {
        g.position.x = THREE.MathUtils.clamp(nextX, -branchLength, branchLength);
        g.position.z = THREE.MathUtils.clamp(
          nextZ,
          intersectionZ - branchHalfWidth,
          intersectionZ + branchHalfWidth
        );
      } else {
        g.position.x = THREE.MathUtils.clamp(nextX, -roadHalfWidth, roadHalfWidth);
        g.position.z = THREE.MathUtils.clamp(nextZ, zLimits[0], zLimits[1]);
      }
    }

    // Proximity check: which section (if any) is the car near right
    // now? 2D distance, since Skills/Projects now sit off to the side
    // on their branch roads rather than on the main centerline.
    if (sections.length && onSectionChange) {
      const nearby = sections.find((s) => {
        const dx = g.position.x - (s.x ?? 0);
        const dz = g.position.z - s.z;
        return Math.sqrt(dx * dx + dz * dz) < (s.range ?? 9);
      });
      const id = nearby ? nearby.id : null;
      if (id !== activeSection.current) {
        activeSection.current = id;
        onSectionChange(id);
      }
    }

    // Chase camera, with click-drag mouse-look layered on top.
    if (followCamera) {
      if (enableMouseLook) {
        // Not dragging: ease the accumulated offset back toward center,
        // so releasing the mouse smoothly returns to facing forward.
        if (!dragging.current) {
          const rt = 1 - Math.pow(1 - mouseReturnDamping, delta * 60);
          /* eslint-disable react-hooks/immutability -- dragOffset is a
             ref returned from useDragLook(); mutating its `.current`
             inside useFrame is the standard react-three-fiber pattern
             (the per-frame callback runs outside React's render/commit
             cycle, so this isn't a render-time mutation). */
          dragOffset.current.x += (0 - dragOffset.current.x) * rt;
          dragOffset.current.y += (0 - dragOffset.current.y) * rt;
          /* eslint-enable react-hooks/immutability */
        }
        // Smooth what's actually applied, so drag deltas don't feel jittery.
        const mt = 1 - Math.pow(1 - mouseLookDamping, delta * 60);
        mouseSmoothed.current.x += (dragOffset.current.x - mouseSmoothed.current.x) * mt;
        mouseSmoothed.current.y += (dragOffset.current.y - mouseSmoothed.current.y) * mt;
      }

      const yawOffset = enableMouseLook ? mouseSmoothed.current.x * mouseYawRange : 0;
      // Dragging UP (cursor moves up the screen, dy negative) should
      // look UP — hence the negative sign here.
      const lookHeightOffset = enableMouseLook
        ? -mouseSmoothed.current.y * mouseLookHeightRange
        : 0;

      const yaw = g.rotation.y + yawOffset;
      desiredCamPos.current.set(
        g.position.x + Math.sin(yaw) * camDistance,
        g.position.y + camHeight,
        g.position.z + Math.cos(yaw) * camDistance
      );
      const camT = 1 - Math.pow(1 - camDamping, delta * 60);
      camera.position.lerp(desiredCamPos.current, camT);

      lookTarget.current.set(
        g.position.x,
        g.position.y + camLookHeight + lookHeightOffset,
        g.position.z
      );
      camera.lookAt(lookTarget.current);
    }
  });

  return (
    <group ref={group} position={position} scale={scale}>
      <primitive object={scene} />
    </group>
  );
}