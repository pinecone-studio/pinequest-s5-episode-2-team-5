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
 * Middle of what the seated (V) bench camera frames. It sees only about ±0.7 m of the 2.4 m
 * worktop, so new items gather here — straight in front of the student — not at the far ends.
 * Tall items (bottles) line up behind, short ones (beakers, thermometers) in front, so the
 * camera sees every piece instead of a heap.
 */
const FOCUS = { x: 8.27, backZ: -14.7, frontZ: -14.42 };
const TALL = 0.12;
/** How strongly an item keeps to its row: a row spreads about ±0.5 m sideways before the next one starts. */
const ROW_WEIGHT = 4;
/** Wider gap for new items, so neighbours stay readable from the seated view. */
const SPAWN_GAP = 0.04;

/**
 * First free spot for a w × d footprint (`h` tall): `prefer` if it is free, else the free spot
 * nearest the middle of its row (back for tall items, front for short), filling a row sideways
 * before starting another. Null when the bench is full.
 */
export function freeBenchSpot(w: number, d: number, occupied: BenchRect[], prefer?: [number, number], h = 0): [number, number] | null {
  const fits = (x: number, z: number, gap = GAP) => x - w / 2 >= AREA.x0 && x + w / 2 <= AREA.x1 && z - d / 2 >= AREA.z0 && z + d / 2 <= AREA.z1
    && occupied.every((o) => Math.abs(o.x - x) >= (o.w + w) / 2 + gap || Math.abs(o.z - z) >= (o.d + d) / 2 + gap);
  if (prefer && fits(prefer[0], prefer[1])) return prefer;
  const rowZ = h > TALL ? FOCUS.backZ : FOCUS.frontZ;
  const nearest = (gap: number): [number, number] | null => {
    let best: [number, number] | null = null;
    let bestCost = Infinity;
    for (let z = AREA.z0 + d / 2; z <= AREA.z1 - d / 2 + 1e-9; z += STEP) {
      for (let x = AREA.x0 + w / 2; x <= AREA.x1 - w / 2 + 1e-9; x += STEP) {
        const cost = Math.abs(x - FOCUS.x) + ROW_WEIGHT * Math.abs(z - rowZ);
        if (cost < bestCost - 1e-9 && fits(x, z, gap)) {
          bestCost = cost;
          best = [+x.toFixed(3), +z.toFixed(3)];
        }
      }
    }
    return best;
  };
  // A crowded bench settles for the usual small gap.
  return nearest(SPAWN_GAP) ?? nearest(GAP);
}

/** Put the primary Grade 9 instrument in the visible centre, with stock behind it.
 * The front row avoids its footprint even for the largest recipe. */
export function grade9SupplyPosition(slot:number):[number,number,number]{
 if(slot===0)return [8.25,.915,-14.36];
 const stock=slot-1;
 if(stock<12)return [7.65+stock%6*.24,.915,-14.79+Math.floor(stock/6)*.2];
 return [[7.65,7.9,8.65,8.9][(stock-12)%4],.915,-14.36];
}
