// layout.ts
export const JUNCTION_Z = 18;      // where the cross road meets the main road
export const SIDE_LENGTH = 104;    // how far the side roads run (x = ±104)
export const SIDE_WIDTH = 10;      // side road width
export const MAIN_HALF_W = 5.2;    // main road drivable half-width
export const SIDE_HALF_W = SIDE_WIDTH / 2 - 0.8;

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

/** Keeps the car on the T/cross-road. Call this instead of your old x clamp. */
export function clampToRoad(x: number, z: number) {
  let nx = x;
  let nz = z;
  if (Math.abs(x) > MAIN_HALF_W) {
    const inBand = Math.abs(z - JUNCTION_Z) <= SIDE_HALF_W;
    if (inBand || Math.abs(x) > MAIN_HALF_W + 1) {
      // on a side road: stay inside its lane, limit how far it runs
      nx = clamp(x, -SIDE_LENGTH + 4, SIDE_LENGTH - 4);
      nz = clamp(z, JUNCTION_Z - SIDE_HALF_W, JUNCTION_Z + SIDE_HALF_W);
    } else {
      nx = Math.sign(x) * MAIN_HALF_W; // not at the junction: stay on main road
    }
  }
  return { x: nx, z: nz };
}