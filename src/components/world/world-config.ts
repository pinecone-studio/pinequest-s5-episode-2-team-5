import type { Href } from 'expo-router';

import type { IconName } from '@/types';

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Obstacle = ({ kind: 'rect' } & Rect) | { kind: 'ellipse'; x: number; y: number; rx: number; ry: number };

/** World units are dp. The camera follows the player across this map. */
export const WORLD = { width: 640, height: 1100 } as const;

/** Scenery-only band at the top, so building signs clear the HUD. */
const TOP_STRIP = 112;

export type BuildingId = 'lessons' | 'ranking' | 'versus' | 'friendly' | 'openlab';

export interface BuildingDef {
  id: BuildingId;
  label: string;
  route: Href;
  icon: IconName;
  /** Accent for the name plate and the door transition. */
  color: string;
  /** Sprite bounds. */
  rect: Rect;
  /** Where the player stands to enter. */
  door: Point;
}

/** Add a hub here (and a sprite in buildings.tsx) to grow the campus. */
export const BUILDINGS: BuildingDef[] = [
  {
    id: 'lessons',
    label: 'Lessons Hall',
    route: '/lessons',
    icon: 'flask',
    color: '#7C4DFF',
    rect: { x: 170, y: 130, w: 300, h: 280 },
    door: { x: 320, y: 434 },
  },
  {
    id: 'ranking',
    label: 'Global Ranking',
    route: '/ranking',
    icon: 'trophy',
    color: '#F5A623',
    rect: { x: 440, y: 470, w: 190, h: 320 },
    door: { x: 535, y: 812 },
  },
  {
    id: 'versus', label: 'Versus Hub', route: '/versus', icon: 'sword-cross', color: '#FF5C7A',
    rect: { x: 10, y: 390, w: 200, h: 260 }, door: { x: 110, y: 662 },
  },
  {
    id: 'friendly', label: 'Friendly Hub', route: '/friendly', icon: 'heart-multiple', color: '#3DE0F5',
    rect: { x: 10, y: 710, w: 200, h: 260 }, door: { x: 110, y: 980 },
  },
  {
    id: 'openlab', label: 'OpenLab', route: '/', icon: 'flask-outline', color: '#B5F23D',
    rect: { x: 430, y: 820, w: 200, h: 260 }, door: { x: 530, y: 1080 },
  },
];

export const SPAWN: Point = { x: 350, y: 850 };

export const PLAZA = { x: 300, y: 640, r: 115 };
export const FOUNTAIN = { x: 300, y: 640, r: 56 };
export const POND = { x: 150, y: 930, rx: 95, ry: 58 };

/** Sand paths drawn on the ground, as polylines. */
export const PATHS: Point[][] = [
  [
    { x: 320, y: 412 },
    { x: 318, y: 480 },
    { x: 305, y: 528 },
  ],
  [
    { x: 400, y: 700 },
    { x: 446, y: 808 },
    { x: 535, y: 818 },
    { x: 535, y: 796 },
  ],
  [
    { x: 300, y: 754 },
    { x: 335, y: 850 },
    { x: 345, y: 960 },
    { x: 330, y: 1100 },
  ],
  [
    { x: 342, y: 940 },
    { x: 246, y: 932 },
  ],
];

export type TreeKind = 'round' | 'pine';

/** (x, y) is the base of the trunk. */
export const TREES: { x: number; y: number; kind: TreeKind; scale: number }[] = [
  { x: 226, y: 62, kind: 'round', scale: 0.8 },
  { x: 420, y: 58, kind: 'pine', scale: 0.8 },
  { x: 330, y: 40, kind: 'round', scale: 0.7 },
  { x: 52, y: 188, kind: 'round', scale: 1.15 },
  { x: 128, y: 134, kind: 'pine', scale: 1 },
  { x: 62, y: 322, kind: 'pine', scale: 1 },
  { x: 132, y: 378, kind: 'round', scale: 0.9 },
  { x: 524, y: 168, kind: 'round', scale: 1.1 },
  { x: 600, y: 126, kind: 'pine', scale: 0.95 },
  { x: 590, y: 300, kind: 'round', scale: 1 },
  { x: 512, y: 396, kind: 'pine', scale: 0.85 },
  { x: 60, y: 590, kind: 'round', scale: 1 },
  { x: 118, y: 728, kind: 'pine', scale: 0.9 },
  { x: 40, y: 795, kind: 'round', scale: 0.85 },
  { x: 604, y: 880, kind: 'round', scale: 0.95 },
  { x: 470, y: 960, kind: 'round', scale: 0.85 },
  { x: 596, y: 1020, kind: 'pine', scale: 1.05 },
  { x: 506, y: 1082, kind: 'round', scale: 1.1 },
  { x: 44, y: 1070, kind: 'pine', scale: 1 },
];

export const LAMPS: Point[] = [
  { x: 274, y: 490 },
  { x: 364, y: 490 },
  { x: 290, y: 830 },
  { x: 392, y: 820 },
];

export const BENCHES: Point[] = [
  { x: 236, y: 728 },
  { x: 364, y: 728 },
  { x: 214, y: 830 },
];

export const SIGNPOST: Point = { x: 404, y: 900 };

export const FLOWER_BEDS = [
  { x: 248, y: 462, rx: 34, ry: 14 },
  { x: 394, y: 462, rx: 34, ry: 14 },
  { x: 160, y: 490, rx: 30, ry: 12 },
  { x: 430, y: 1020, rx: 40, ry: 15 },
  { x: 170, y: 820, rx: 26, ry: 11 },
];

/** Everything the avatars must walk around. */
export function worldObstacles(): Obstacle[] {
  return [
    ...BUILDINGS.map((b) => ({ kind: 'rect' as const, ...b.rect })),
    { kind: 'ellipse', x: FOUNTAIN.x, y: FOUNTAIN.y, rx: FOUNTAIN.r, ry: FOUNTAIN.r * 0.8 },
    { kind: 'ellipse', x: POND.x, y: POND.y, rx: POND.rx, ry: POND.ry },
    ...TREES.map((t) => ({
      kind: 'ellipse' as const,
      x: t.x,
      y: t.y - 34 * t.scale,
      rx: 28 * t.scale,
      ry: 38 * t.scale,
    })),
    ...LAMPS.map((l) => ({ kind: 'ellipse' as const, x: l.x, y: l.y - 4, rx: 5, ry: 5 })),
    ...BENCHES.map((b) => ({ kind: 'rect' as const, x: b.x - 22, y: b.y - 16, w: 44, h: 16 })),
    { kind: 'rect', x: SIGNPOST.x - 6, y: SIGNPOST.y - 10, w: 12, h: 10 },
    // Decorative strip behind the Lessons Hall.
    { kind: 'rect', x: 0, y: 0, w: WORLD.width, h: TOP_STRIP },
  ];
}
