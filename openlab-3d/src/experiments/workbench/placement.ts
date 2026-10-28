/** chem-n4: centre [8.3, -14.55], width 2.6 m, depth .7 m.
 * Match its inset placement surface; include small raised supports above it. */
export function isWorkbenchPosition(at: { x: number; y: number; z: number }, height = .9): boolean {
  return at.x >= 7.02 && at.x <= 9.58 && at.z >= -14.89 && at.z <= -14.21 && at.y >= height - .035 && at.y <= height + .42;
}

/** A footprint on the bench top: centre and size along x and z, m. */
export interface BenchRect { x: number; z: number; w: number; d: number }

/** Usable part of the worktop: a little inside its edges so nothing overhangs. */
const AREA = { x0: 7.08, x1: 9.52, z0: -14.85, z1: -14.25 };
const GAP = 0.02;
const STEP = 0.02;

/** Footprint of a w × d item turned by `yaw` about the vertical axis. */
export function turnedFootprint(w: number, d: number, yaw: number): { w: number; d: number } {
  const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
  return { w: c * w + s * d, d: s * w + c * d };
}

/**
 * First free spot for a w × d footprint: `prefer` if it is free, else back row first, left to
 * right, keeping a small gap to everything already on the bench. Null when the bench is full.
 */
export function freeBenchSpot(w: number, d: number, occupied: BenchRect[], prefer?: [number, number]): [number, number] | null {
  const fits = (x: number, z: number) => x - w / 2 >= AREA.x0 && x + w / 2 <= AREA.x1 && z - d / 2 >= AREA.z0 && z + d / 2 <= AREA.z1
    && occupied.every((o) => Math.abs(o.x - x) >= (o.w + w) / 2 + GAP || Math.abs(o.z - z) >= (o.d + d) / 2 + GAP);
  if (prefer && fits(prefer[0], prefer[1])) return prefer;
  for (let z = AREA.z0 + d / 2; z <= AREA.z1 - d / 2 + 1e-9; z += STEP) {
    for (let x = AREA.x0 + w / 2; x <= AREA.x1 - w / 2 + 1e-9; x += STEP) {
      if (fits(x, z)) return [+x.toFixed(3), +z.toFixed(3)];
    }
  }
  return null;
}

/** Put the primary Grade 9 instrument in the visible centre, with stock behind it.
 * The front row avoids its footprint even for the largest recipe. */
export function grade9SupplyPosition(slot:number):[number,number,number]{
 if(slot===0)return [8.25,.915,-14.36];
 const stock=slot-1;
 if(stock<12)return [7.65+stock%6*.24,.915,-14.79+Math.floor(stock/6)*.2];
 return [[7.65,7.9,8.65,8.9][(stock-12)%4],.915,-14.36];
}
