/**
 * Floor plan: a single Chemistry Lab spanning x ∈ [-4, 10], z ∈ [-15, -3] (14 m × 12 m).
 *
 *   x: -4                 10
 * z=-15 ┌──[W]────[W]──────┐
 *       │                  │
 *       │  CHEMISTRY LAB   │
 *       │                  │
 * z=-3  └───────[W]──[W]───┘
 *
 * North is -z. The camera's default forward is -z, so yaw 0 faces north.
 */

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const LAB_BOUNDS: Rect = { minX: -4, maxX: 10, minZ: -15, maxZ: -3 };

/** Spawn point: by the south wall, facing the island benches (north). */
export const SPAWN = { x: 1, z: -4.5, yaw: 0 };

export interface Opening {
  kind: 'window';
  center: number;
  width: number;
  sill: number;
  head: number;
}

/**
 * A straight wall. `axis: 'x'` means the wall runs along x at constant z = `at`;
 * `axis: 'z'` means it runs along z at constant x = `at`.
 */
export interface WallDef {
  id: string;
  axis: 'x' | 'z';
  at: number;
  from: number;
  to: number;
  openings: Opening[];
}

const win = (center: number, width = 2.2, sill = 1.0, head = 2.5): Opening => ({
  kind: 'window',
  center,
  width,
  sill,
  head,
});

export const WALLS: readonly WallDef[] = [
  // North: window bench run with the sink and the fume hood.
  { id: 'north', axis: 'x', at: -15, from: -4, to: 10, openings: [win(-1, 2.4), win(2.6, 2.4)] },
  // South: whiteboard, extinguisher and posters between two windows.
  { id: 'south', axis: 'x', at: -3, from: -4, to: 10, openings: [win(1, 1.6), win(4.6, 2.0)] },
  // West: bench run with the analytical balance (solid).
  { id: 'west', axis: 'z', at: -4, from: -15, to: -3, openings: [] },
  // East: reagent shelving, flammables cabinet and safety shower (solid).
  { id: 'east', axis: 'z', at: 10, from: -15, to: -3, openings: [] },
];
