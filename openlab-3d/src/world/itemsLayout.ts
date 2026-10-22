/**
 * Initial positions of every pickable item. Coordinates are world space (meters) with
 * y at the supporting surface; bench tops sit at y = 0.9.
 */
import type { EquipmentKind } from '../equipment/equipmentCatalog';
import { SUBSTANCES, type Contents, type SubstanceId } from '../chemistry/substances';

export interface ItemVariant {
  /** Fixed liquid look, for items without tracked contents (Tools thumbnails). */
  liquid?: string;
  fill?: number;
  label?: string;
  /** What is in the vessel; drives the liquid color, level, pH and reactions. */
  contents?: Contents;
}

/** A reagent bottle holding 250 mL of one substance, labelled with its formula. */
export function bottleOf(id: SubstanceId): ItemVariant {
  return { label: SUBSTANCES[id].formula, contents: [{ id, ml: 250 }] };
}

/** A vessel pre-filled with a single substance. */
export function filled(id: SubstanceId, ml: number): ItemVariant {
  return { contents: [{ id, ml }] };
}

export interface WorldItem {
  id: string;
  kind: EquipmentKind;
  position: [number, number, number];
  rotY: number;
  variant?: ItemVariant;
}

type Seed = [EquipmentKind, number, number, number, number?, ItemVariant?];

const T = 0.9; // bench top height

const SEEDS: Seed[] = [
  // Chemistry Lab — island A.
  ['beaker', 0.35, T, -7.0, 0, filled('dyeRed', 120)],
  ['erlenmeyer', 0.8, T, -6.98, 0, filled('kmno4', 100)],
  ['spatula', 1.1, T, -6.95, 0.3],
  ['bunsenBurner', 1.5, T, -7.0],
  ['glassRod', 1.95, T, -6.95, 0.15],
  ['testTubeRack', 2.35, T, -7.0, 0],
  ['tongs', 3.0, T, -6.95, -0.2],
  ['graduatedCylinder', 0.2, T, -7.85, 0, filled('water', 70)],
  ['funnel', 0.8, T, -7.85, 0],
  ['watchGlass', 1.4, T, -7.85, 0],
  ['petriDish', 1.9, T, -7.85, 0],
  ['bunsenBurner', 2.4, T, -7.85],
  ['beaker', 3.0, T, -7.85, 0, filled('dyeGreen', 150)],
  // Chemistry Lab — island B.
  ['beaker', 0.4, T, -10.4, 0, filled('dyeYellow', 110)],
  ['evaporatingDish', 1.05, T, -10.4, 0],
  ['bunsenBurner', 1.6, T, -10.4],
  ['volumetricFlask', 2.25, T, -10.4, 0],
  ['erlenmeyer', 2.9, T, -10.38, 0, filled('methylOrange', 100)],
  ['bunsenBurner', 0.15, T, -11.2],
  ['testTubeRack', 1.0, T, -11.2, 0.1],
  ['mortar', 1.65, T, -11.2, 0],
  ['pipette', 2.2, T, -11.25, 0.2],
  ['testTubeHolder', 2.65, T, -11.2, 0.1],
  ['erlenmeyer', 3.15, T, -11.2, 0, filled('bromothymol', 90)],
  // Chemistry Lab — island C.
  ['testTubeRack', 7.2, T, -8.0, Math.PI / 2],
  ['washBottle', 7.62, T, -7.6, 0, { label: 'H₂O', contents: [{ id: 'water', ml: 250 }] }],
  ['bunsenBurner', 7.45, T, -8.95],
  ['beaker', 7.0, T, -9.3, 0, filled('cuso4', 120)],
  ['thermometer', 7.35, T, -9.9, 0.1],
  ['reagentBottle', 7.0, T, -10.4, 0, bottleOf('nacl')],
  ['spatula', 7.5, T, -10.45, -0.4],
  // Chemistry Lab — west bench.
  ['reagentBottle', -3.5, T, -5.6, 0, bottleOf('methylOrange')],
  ['reagentBottle', -3.5, T, -6.0, 0, bottleOf('hcl')],
  ['reagentBottle', -3.55, T, -6.35, 0, bottleOf('naoh')],
  ['reagentBottle', -3.5, T, -6.75, 0, bottleOf('phenolphthalein')],
  ['reagentBottle', -3.5, T, -7.05, 0, bottleOf('bromothymol')],
  ['scale', -3.6, T, -8.6, Math.PI / 2],
  ['reagentBottle', -3.45, T, -9.4, 0, bottleOf('kmno4')],
  ['graduatedCylinder', -3.55, T, -10.9, 0, filled('water', 60)],
  ['reagentBottle', -3.5, T, -11.6, 0, bottleOf('cuso4')],
  ['goggles', -3.5, T, -12.1, 1.4],
  // Chemistry Lab — window bench run.
  ['beaker', -2.95, T, -14.5, 0],
  ['beaker', -2.6, T, -14.5, 0],
  ['erlenmeyer', -2.2, T, -14.48, 0],
  ['graduatedCylinder', -1.75, T, -14.5, 0],
  ['testTube', -1.3, T, -14.55, 0.3],
  ['testTube', -1.15, T, -14.55, 0.3],
  ['reagentBottle', 0.8, T, -14.5, 0, bottleOf('dyeRed')],
  ['reagentBottle', 1.1, T, -14.5, 0, bottleOf('dyeYellow')],
  ['reagentBottle', 1.4, T, -14.5, 0, bottleOf('dyeGreen')],
  ['reagentBottle', 1.7, T, -14.5, 0, bottleOf('dyeBlue')],
  ['reagentBottle', 2.0, T, -14.5, 0, bottleOf('water')],
  ['goggles', 3.3, T, -14.5, 0.2],
  ['petriDish', 4.0, T, -14.5, 0],
  ['goggles', 7.6, T, -14.5, -0.3],
  // Safety.
  ['fireExtinguisher', 2.5, 0, -3.45, Math.PI],
];

export function createInitialItems(): WorldItem[] {
  return SEEDS.map(([kind, x, y, z, rotY = 0, variant], i) => ({
    id: `item-${i}-${kind}`,
    kind,
    position: [x, y + 0.004, z],
    rotY,
    variant,
  }));
}
