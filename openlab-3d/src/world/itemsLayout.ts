/**
 * Initial positions of every pickable item. Coordinates are world space (meters) with
 * y at the supporting surface; bench tops sit at y = 0.9.
 */
import type { EquipmentKind } from '../equipment/equipmentCatalog';
import { roomAt, type RoomId } from './layout';

export interface ItemVariant {
  liquid?: string;
  fill?: number;
  label?: string;
}

export interface WorldItem {
  id: string;
  kind: EquipmentKind;
  position: [number, number, number];
  rotY: number;
  variant?: ItemVariant;
  room: RoomId;
}

type Seed = [EquipmentKind, number, number, number, number?, ItemVariant?];

const T = 0.9; // bench top height

const SEEDS: Seed[] = [
  // Physics Lab — Millikan station accessories.
  ['beaker', -12.66, T, -9.28, 0, { liquid: '#2f7ff0', fill: 0.55 }],
  ['creamBottle', -12.86, T, -8.98, 0.4],
  // Physics Lab — back bench.
  ['goggles', -16.9, T, -14.45, 0.3],
  ['graduatedCylinder', -15.6, T, -14.5, 0, { liquid: '#cfe8ff', fill: 0.6 }],
  ['thermometer', -13.2, T, -14.42, 1.2],
  ['beaker', -10.0, T, -14.45, 0, { liquid: '#dff1ff', fill: 0.4 }],
  ['erlenmeyer', -9.5, T, -14.5, 0, { liquid: '#ffb347', fill: 0.35 }],
  // Physics Lab — electronics island.
  ['multimeter', -6.55, T, -8.95, -0.3],
  ['goggles', -7.9, T, -8.7, -0.2],

  // Chemistry Lab — island A.
  ['beaker', 0.35, T, -7.0, 0, { liquid: '#e2363c', fill: 0.5 }],
  ['erlenmeyer', 0.8, T, -6.98, 0, { liquid: '#8b4fd8', fill: 0.4 }],
  ['testTubeRack', 2.35, T, -7.0, 0],
  ['beaker', 3.0, T, -7.85, 0, { liquid: '#33c46a', fill: 0.6 }],
  ['graduatedCylinder', 0.2, T, -7.85, 0, { liquid: '#7fd3ff', fill: 0.7 }],
  // Chemistry Lab — island B.
  ['beaker', 0.4, T, -10.4, 0, { liquid: '#f5c400', fill: 0.45 }],
  ['erlenmeyer', 2.9, T, -10.38, 0, { liquid: '#ff7a1a', fill: 0.5 }],
  ['erlenmeyer', 3.15, T, -11.2, 0, { liquid: '#2fb6a8', fill: 0.35 }],
  ['testTubeRack', 1.0, T, -11.2, 0.1],
  ['pipette', 2.2, T, -11.25, 0.2],
  // Chemistry Lab — island C.
  ['testTubeRack', 7.2, T, -8.0, Math.PI / 2],
  ['beaker', 7.0, T, -9.3, 0, { liquid: '#3a6df0', fill: 0.3 }],
  ['thermometer', 7.35, T, -9.9, 0.1],
  ['reagentBottle', 7.0, T, -10.4, 0, { label: 'NaCl' }],
  // Chemistry Lab — west bench.
  ['reagentBottle', -3.5, T, -6.0, 0, { label: 'HCl' }],
  ['reagentBottle', -3.55, T, -6.35, 0, { label: 'NaOH' }],
  ['reagentBottle', -3.5, T, -11.6, 0, { label: 'CuSO₄' }],
  ['goggles', -3.5, T, -12.1, 1.4],
  ['graduatedCylinder', -3.55, T, -10.9, 0, { liquid: '#f0f6ff', fill: 0.5 }],

  // Biology Lab — south bench.
  ['petriDish', -13.6, T, 14.45, 0],
  ['petriDish', -13.3, T, 14.62, 0.5],
  ['petriDish', -12.95, T, 14.4, 1.1],
  ['slideBox', -11.6, T, 14.5, 0.1],
  ['slideBox', -6.9, T, 14.5, -0.15],
  ['specimenJar', -9.4, T, 14.5, 0, { label: 'Frog' }],
  ['specimenJar', -8.8, T, 14.5, 0, { label: 'Starfish' }],
  ['specimenJar', -4.6, T, 14.55, 0, { label: 'Squid' }],
  ['pipette', -5.6, T, 14.45, 1.3],
  ['petriDish', -2.2, T, 14.5, 0.3],
  ['beaker', -1.4, T, 14.5, 0, { liquid: '#cde7c8', fill: 0.45 }],

  // Storage Room — packing table by the door.
  ['beaker', 16.4, 0.86, -5.0, 0],
  ['erlenmeyer', 16.75, 0.86, -4.85, 0],
  ['goggles', 17.25, 0.86, -5.05, 0.6],
  ['testTube', 17.6, 0.86, -4.9, 0, { liquid: '#ff5a5a', fill: 0.5 }],
];

export function createInitialItems(): WorldItem[] {
  return SEEDS.map(([kind, x, y, z, rotY = 0, variant], i) => ({
    id: `item-${i}-${kind}`,
    kind,
    position: [x, y + 0.004, z],
    rotY,
    variant,
    room: roomAt(x, z) ?? 'mainHall',
  }));
}
