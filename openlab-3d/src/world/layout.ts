/**
 * Facility floor plan. The whole building spans x ∈ [-20, 20], z ∈ [-15, 15] (40 m × 30 m).
 *
 *   x: -20            -4             10          20
 * z=-15 ┌──────────────┬──────────────┬───────────┐
 *       │ PHYSICS LAB  │ CHEMISTRY    │ STORAGE   │
 * z=-3  ├────[D]───────┴───[D]────────┼───[D]─────┤
 *       │ MAIN HALL (x -20..6)     6 →│ CORRIDOR  │
 * z=1   │                           ┌─┴───────────┘
 * z=5   ├────────[D]────────────────┤  courtyard (outdoors)
 *       │ BIOLOGY / MICROSCOPY LAB  │
 * z=15  └───────────────────────────┘
 *
 * North is -z. The camera's default forward is -z, so yaw 0 faces north.
 */
import { DOOR_HEIGHT } from '../utils/constants';

export type RoomId = 'mainHall' | 'corridor' | 'physics' | 'chemistry' | 'biology' | 'storage';

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface RoomDef {
  id: RoomId;
  name: string;
  bounds: Rect;
  /** Teleport target used by the Rooms menu. */
  spawn: { x: number; z: number; yaw: number };
  /** Minimap fill color. */
  mapColor: string;
}

export const ROOMS: readonly RoomDef[] = [
  {
    id: 'mainHall',
    name: 'Main Hall',
    bounds: { minX: -20, maxX: 6, minZ: -3, maxZ: 5 },
    spawn: { x: -12, z: 1.8, yaw: 0 },
    mapColor: '#e9edf1',
  },
  {
    id: 'corridor',
    name: 'East Corridor',
    bounds: { minX: 6, maxX: 20, minZ: -3, maxZ: 1 },
    spawn: { x: 9, z: -1, yaw: -Math.PI / 2 },
    mapColor: '#e3e8ed',
  },
  {
    id: 'physics',
    name: 'Physics Lab',
    bounds: { minX: -20, maxX: -4, minZ: -15, maxZ: -3 },
    spawn: { x: -12, z: -6.6, yaw: 0 },
    mapColor: '#dbe9f7',
  },
  {
    id: 'chemistry',
    name: 'Chemistry Lab',
    bounds: { minX: -4, maxX: 10, minZ: -15, maxZ: -3 },
    spawn: { x: 1, z: -4.5, yaw: 0 },
    mapColor: '#e2f3e4',
  },
  {
    id: 'storage',
    name: 'Storage Room',
    bounds: { minX: 10, maxX: 20, minZ: -15, maxZ: -3 },
    spawn: { x: 15, z: -4.4, yaw: 0 },
    mapColor: '#f1ebdf',
  },
  {
    id: 'biology',
    name: 'Biology & Microscopy Lab',
    bounds: { minX: -20, maxX: 6, minZ: 5, maxZ: 15 },
    spawn: { x: -7, z: 6.6, yaw: Math.PI },
    mapColor: '#f3e3ef',
  },
];

export const ROOM_BY_ID: Record<RoomId, RoomDef> = Object.fromEntries(
  ROOMS.map((r) => [r.id, r]),
) as Record<RoomId, RoomDef>;

/** Spawn point: Main Hall, facing the Physics Lab door (north). */
export const SPAWN = { x: -12, z: 1.8, yaw: 0 };

export type Opening =
  | { kind: 'door'; center: number; width: number; height: number }
  | { kind: 'window'; center: number; width: number; sill: number; head: number; interior?: boolean }
  | { kind: 'open'; center: number; width: number };

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
  exterior?: boolean;
}

const win = (center: number, width = 2.2, sill = 1.0, head = 2.5): Opening => ({
  kind: 'window',
  center,
  width,
  sill,
  head,
});
const door = (center: number, width = 1.6): Opening => ({
  kind: 'door',
  center,
  width,
  height: DOOR_HEIGHT,
});

export const WALLS: readonly WallDef[] = [
  // North exterior: physics back wall (benches + cabinets, no windows), chemistry, storage.
  {
    id: 'north',
    axis: 'x',
    at: -15,
    from: -20,
    to: 20,
    exterior: true,
    openings: [win(-1, 2.4), win(2.6, 2.4), win(15, 2.4, 1.9, 2.7)],
  },
  // Labs ↔ Main Hall / Corridor, with glass-paneled doors and interior viewing windows.
  {
    id: 'labs-south',
    axis: 'x',
    at: -3,
    from: -20,
    to: 20,
    openings: [
      door(-12),
      { kind: 'window', center: -16.6, width: 2.6, sill: 1.0, head: 2.2, interior: true },
      door(1),
      { kind: 'window', center: 4.6, width: 2.0, sill: 1.0, head: 2.2, interior: true },
      door(15),
    ],
  },
  // Corridor south wall looking onto the courtyard.
  {
    id: 'corridor-south',
    axis: 'x',
    at: 1,
    from: 6,
    to: 20,
    exterior: true,
    openings: [win(8.6, 2.0, 0.9, 2.4), win(11.8, 2.0, 0.9, 2.4), win(17.6, 2.0, 0.9, 2.4)],
  },
  // Main Hall ↔ Biology lab.
  {
    id: 'bio-north',
    axis: 'x',
    at: 5,
    from: -20,
    to: 6,
    openings: [
      door(-7),
      { kind: 'window', center: -13, width: 3.0, sill: 1.0, head: 2.2, interior: true },
      { kind: 'window', center: 0.5, width: 3.0, sill: 1.0, head: 2.2, interior: true },
    ],
  },
  // Biology south exterior.
  {
    id: 'south',
    axis: 'x',
    at: 15,
    from: -20,
    to: 6,
    exterior: true,
    openings: [win(-16.5), win(-12), win(-7.5), win(-3), win(1.5)],
  },
  // West exterior: physics windows and the main entrance glazing (biology has a display wall).
  {
    id: 'west',
    axis: 'z',
    at: -20,
    from: -15,
    to: 15,
    exterior: true,
    openings: [
      win(-12.2),
      win(-8.6),
      win(-5.2),
      { kind: 'window', center: 1, width: 4.4, sill: 0.08, head: 2.7 },
    ],
  },
  // Physics | Chemistry partition.
  { id: 'phys-chem', axis: 'z', at: -4, from: -15, to: -3, openings: [] },
  // Chemistry | Storage partition.
  { id: 'chem-store', axis: 'z', at: 10, from: -15, to: -3, openings: [] },
  // East exterior: storage (solid) and corridor end window.
  {
    id: 'east',
    axis: 'z',
    at: 20,
    from: -15,
    to: 1,
    exterior: true,
    openings: [win(-1, 2.6, 0.6, 2.6)],
  },
  // Main Hall / Biology east wall facing the courtyard.
  {
    id: 'courtyard-west',
    axis: 'z',
    at: 6,
    from: 1,
    to: 15,
    exterior: true,
    openings: [win(3, 2.0, 0.9, 2.4), win(8.4), win(12)],
  },
];

export interface DoorDef {
  id: string;
  /** World position of the doorway center at floor level. */
  x: number;
  z: number;
  /** Axis along which the doorway spans (and the panels slide). */
  axis: 'x' | 'z';
  width: number;
  rooms: [RoomId, RoomId];
  sign: string;
  /** Which side of the wall (sign of the normal) the room sign faces. */
  signSide: 1 | -1;
}

export const DOORS: readonly DoorDef[] = [
  { id: 'door-physics', x: -12, z: -3, axis: 'x', width: 1.6, rooms: ['physics', 'mainHall'], sign: 'PHYSICS LAB', signSide: 1 },
  { id: 'door-chemistry', x: 1, z: -3, axis: 'x', width: 1.6, rooms: ['chemistry', 'mainHall'], sign: 'CHEMISTRY LAB', signSide: 1 },
  { id: 'door-storage', x: 15, z: -3, axis: 'x', width: 1.6, rooms: ['storage', 'corridor'], sign: 'STORAGE', signSide: 1 },
  { id: 'door-biology', x: -7, z: 5, axis: 'x', width: 1.6, rooms: ['biology', 'mainHall'], sign: 'BIOLOGY & MICROSCOPY', signSide: -1 },
];

export function pointInRect(x: number, z: number, r: Rect, pad = 0): boolean {
  return x >= r.minX - pad && x <= r.maxX + pad && z >= r.minZ - pad && z <= r.maxZ + pad;
}

export function distanceToRect(x: number, z: number, r: Rect): number {
  const dx = Math.max(r.minX - x, 0, x - r.maxX);
  const dz = Math.max(r.minZ - z, 0, z - r.maxZ);
  return Math.hypot(dx, dz);
}

/** Room containing the point, or null when standing inside a wall/doorway gap. */
export function roomAt(x: number, z: number): RoomId | null {
  for (const room of ROOMS) {
    if (pointInRect(x, z, room.bounds)) return room.id;
  }
  return null;
}

/** Openings you can see through from one room into another (doors, interior windows, archway). */
export interface Portal {
  rooms: [RoomId, RoomId];
  x: number;
  z: number;
}

export const PORTALS: readonly Portal[] = [
  { rooms: ['physics', 'mainHall'], x: -12, z: -3 },
  { rooms: ['physics', 'mainHall'], x: -16.6, z: -3 },
  { rooms: ['chemistry', 'mainHall'], x: 1, z: -3 },
  { rooms: ['chemistry', 'mainHall'], x: 4.6, z: -3 },
  { rooms: ['storage', 'corridor'], x: 15, z: -3 },
  { rooms: ['biology', 'mainHall'], x: -7, z: 5 },
  { rooms: ['biology', 'mainHall'], x: -13, z: 5 },
  { rooms: ['biology', 'mainHall'], x: 0.5, z: 5 },
  { rooms: ['mainHall', 'corridor'], x: 6, z: -1 },
];

/**
 * Rooms whose detailed contents should render: the current room, any room the player is
 * practically standing in (doorways), and rooms seen through a nearby portal.
 */
export function roomsNear(x: number, z: number, portalRadius: number, current: RoomId): RoomId[] {
  const out = new Set<RoomId>([current]);
  for (const r of ROOMS) if (distanceToRect(x, z, r.bounds) <= 0.6) out.add(r.id);
  for (const p of PORTALS) {
    if (!p.rooms.includes(current)) continue;
    if (Math.hypot(x - p.x, z - p.z) <= portalRadius) out.add(p.rooms[0] === current ? p.rooms[1] : p.rooms[0]);
  }
  return [...out];
}
