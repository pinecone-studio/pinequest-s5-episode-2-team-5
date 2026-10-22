/**
 * Horizontal surfaces (bench tops, tables, shelves) where held items can be placed
 * and Tools-drawer items can be spawned.
 */
import { Vector3 } from 'three';
import type { Rect } from '../world/layout';

export interface Surface extends Rect {
  id: string;
  y: number;
}

export const surfaces = new Map<string, Surface>();

export function registerSurface(s: Surface): () => void {
  surfaces.set(s.id, s);
  return () => {
    if (surfaces.get(s.id) === s) surfaces.delete(s.id);
  };
}

/** Axis-aligned top of a box of size (w, d) centered at (x, z), rotated by a multiple of 90°. */
export function rectFromBox(x: number, z: number, w: number, d: number, rotY: number, inset = 0.04): Rect {
  const quarter = Math.round(rotY / (Math.PI / 2)) % 2 !== 0;
  const hw = (quarter ? d : w) / 2 - inset;
  const hd = (quarter ? w : d) / 2 - inset;
  return { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd };
}

export interface Placement {
  point: Vector3;
  surfaceId: string;
}

const tmp = new Vector3();

/** Intersect a ray with every registered surface plane; nearest hit inside a rectangle wins. */
export function raycastSurfaces(origin: Vector3, dir: Vector3, maxDist: number, margin = 0): Placement | null {
  let best: Placement | null = null;
  let bestT = maxDist;
  if (Math.abs(dir.y) < 1e-4) return null;
  for (const s of surfaces.values()) {
    const t = (s.y - origin.y) / dir.y;
    if (t <= 0 || t > bestT) continue;
    tmp.copy(dir).multiplyScalar(t).add(origin);
    if (tmp.x < s.minX + margin || tmp.x > s.maxX - margin || tmp.z < s.minZ + margin || tmp.z > s.maxZ - margin) continue;
    bestT = t;
    best = { point: tmp.clone(), surfaceId: s.id };
  }
  return best;
}

/** Closest point on any surface to `pos` (in the horizontal plane), within maxDist. */
export function nearestSurfacePoint(pos: Vector3, maxDist: number, margin = 0.06): Placement | null {
  let best: Placement | null = null;
  let bestD = maxDist;
  for (const s of surfaces.values()) {
    const x = Math.min(Math.max(pos.x, s.minX + margin), s.maxX - margin);
    const z = Math.min(Math.max(pos.z, s.minZ + margin), s.maxZ - margin);
    const d = Math.hypot(x - pos.x, z - pos.z) + Math.abs(s.y - 0.9) * 0.2;
    if (d < bestD) {
      bestD = d;
      best = { point: new Vector3(x, s.y, z), surfaceId: s.id };
    }
  }
  return best;
}

/** Height of the surface under (x, z) at or below `maxY`, else the floor (0). */
export function surfaceYAt(x: number, z: number, maxY: number): number {
  let best = 0;
  for (const s of surfaces.values()) {
    if (x < s.minX - 0.04 || x > s.maxX + 0.04 || z < s.minZ - 0.04 || z > s.maxZ + 0.04) continue;
    if (s.y <= maxY + 0.03 && s.y > best) best = s.y;
  }
  return best;
}
