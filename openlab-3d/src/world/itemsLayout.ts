/**
 * Initial positions of every loose item on the benches. Coordinates are world space
 * (meters) with y at the supporting surface; bench tops sit at y = 0.9. The benches
 * are laid out as working stations: heating and evaporating (island A), titration
 * (island B), flame tests (island C), weighing (west bench), stock bottles and dyes
 * (window bench) and the elephant-toothpaste demo inside the fume hood. Everything
 * else is in the labelled drawers and cabinets.
 */
import type { EquipmentKind } from '../equipment/equipmentCatalog';
import { REAGENTS, type ReagentId } from '../chemistry/reagents';
import { rackSeeds } from '../interaction/holders';

export interface ItemVariant {
  /** Stock reagent held by a bottle, dropper bottle or jar (also sets its label). */
  reagent?: ReagentId;
  /** Stock amount (mL or g) when it is not the reagent's default. */
  amount?: number;
  /** Initial contents of glassware: reagents and amounts (mL or g). */
  fill?: { reagent: ReagentId; amount: number }[];
  /** Fixed look for thumbnails of empty glassware. */
  liquid?: string;
  fillLevel?: number;
  label?: string;
  /** Test-tube rack: contents of its tubes (undefined = empty tube). */
  tubes?: (ItemVariant | undefined)[];
}

/** A stock bottle / jar of one reagent. */
export function stock(id: ReagentId, amount?: number): ItemVariant {
  return { reagent: id, amount };
}

/** Glassware pre-filled with reagents: filled(['water', 120], ['dyeRed', 0.3]). */
export function filled(...parts: [ReagentId, number][]): ItemVariant {
  return { fill: parts.map(([reagent, amount]) => ({ reagent, amount })) };
}

export interface WorldItem {
  id: string;
  kind: EquipmentKind;
  position: [number, number, number];
  rotY: number;
  variant?: ItemVariant;
  /** Full orientation (thrown items). Overrides rotY. */
  quaternion?: [number, number, number, number];
  /** Initial velocity (thrown items), m/s. */
  velocity?: [number, number, number];
  spin?: [number, number, number];
}

type Seed = [EquipmentKind, number, number, number, number?, ItemVariant?];

const T = 0.9; // bench top height
const HOOD = 0.93; // fume hood work surface

const bottle = (id: ReagentId, x: number, z: number, rot = 0, y = T): Seed => [REAGENTS[id].container, x, y, z, rot, stock(id)];

const SEEDS: Seed[] = [
  // Island A, south: heating station (burner under a tripod) with a dyed beaker and a rack.
  ['beaker', 0.35, T, -7.0, 0, filled(['water', 120], ['dyeRed', 0.3])],
  ['erlenmeyer', 0.8, T, -6.98, 0, filled(['water', 90], ['kmno4', 6])],
  ['spatula', 1.1, T, -6.95, 0.3],
  ['bunsenBurner', 1.55, T, -7.0],
  ['tripod', 1.55, T, -7.0],
  ['beaker', 1.55, T + 0.205, -7.0, 0, filled(['water', 100])],
  ['glassRod', 1.95, T, -6.95, 0.15],
  ['testTubeRack', 2.35, T, -7.0, 0, { tubes: [undefined, undefined, undefined, undefined] }],
  ['thermometer', 2.85, T, -6.95, -0.2],
  ['tongs', 3.15, T, -6.95, -0.2],
  // Island A, north: evaporate a salt solution to crystals.
  ['graduatedCylinder', 0.2, T, -7.85, 0, filled(['water', 70])],
  ['funnel', 0.75, T, -7.85, 0],
  ['watchGlass', 1.2, T, -7.85, 0],
  ['petriDish', 1.65, T, -7.85, 0],
  ['bunsenBurner', 2.4, T, -7.85],
  ['tripod', 2.4, T, -7.85],
  ['evaporatingDish', 2.4, T + 0.205, -7.85, 0, filled(['nacl', 15])],
  ['beaker', 3.0, T, -7.85, 0, filled(['water', 150], ['dyeGreen', 0.2], ['dyeYellow', 0.2])],
  // Island B, south: titration under the burette (NaOH above, HCl + phenolphthalein below).
  ['beaker', 0.4, T, -10.4, 0, filled(['water', 110], ['dyeYellow', 0.35])],
  ['evaporatingDish', 1.0, T, -10.4, 0],
  ['bunsenBurner', 1.6, T, -10.42],
  ['volumetricFlask', 2.15, T, -10.4, 0],
  ['burette', 2.85, T, -10.45, 0, filled(['naoh', 50])],
  ['erlenmeyer', 2.87, T + 0.016, -10.425, 0, filled(['hcl', 20], ['phph', 0.15])],
  ['dropperBottle', 3.25, T, -10.35, 0, stock('phph')],
  // Island B, north: precipitation tubes.
  ['bunsenBurner', 0.15, T, -11.2],
  // Solutions for precipitation tests.
  ['testTubeRack', 1.0, T, -11.2, 0.1, { tubes: [filled(['cuso4', 5]), filled(['fecl3', 5]), filled(['feso4', 5]), filled(['nacl', 5]), filled(['na2so4', 5]), undefined] }],
  ['mortar', 1.65, T, -11.2, 0],
  ['pipette', 2.2, T, -11.25, 0.2],
  ['testTubeHolder', 2.65, T, -11.2, 0.1],
  ['erlenmeyer', 3.15, T, -11.2, 0, filled(['water', 90], ['btb', 0.2])],
  // Island C: flame-test station.
  // Flame-test samples, plus HCl to clean the loop.
  ['testTubeRack', 7.2, T, -8.0, Math.PI / 2, { tubes: [filled(['nacl', 8]), filled(['kcl', 8]), filled(['licl', 8]), filled(['cacl2', 8]), filled(['cuso4', 8]), filled(['hcl', 10])] }],
  ['washBottle', 7.62, T, -7.6, 0, stock('water')],
  ['bunsenBurner', 7.45, T, -8.95],
  ['wireLoop', 7.0, T, -8.75, 0.2],
  ['beaker', 7.0, T, -9.3, 0, filled(['cuso4', 120])],
  ['phPaper', 7.55, T, -9.55, 0.3],
  ['thermometer', 7.35, T, -9.9, 0.1],
  ['reagentBottle', 7.0, T, -10.4, 0, stock('nacl')],
  ['spatula', 7.5, T, -10.45, -0.4],
  // West bench: stock bottles, the balance with solid jars and safety gear.
  bottle('mo', -3.5, -5.6),
  bottle('hcl', -3.5, -6.0),
  bottle('naoh', -3.55, -6.35),
  bottle('phph', -3.5, -6.7),
  bottle('btb', -3.5, -6.95),
  ['scale', -3.6, T, -8.6, Math.PI / 2],
  ['beaker', -3.63, T + 0.09, -8.6, 0],
  bottle('s_nacl', -3.5, -9.25),
  bottle('s_cuso4', -3.5, -9.55),
  bottle('s_nahco3', -3.5, -9.85),
  bottle('kmno4', -3.45, -10.25),
  ['graduatedCylinder', -3.55, T, -10.9, 0, filled(['water', 60])],
  bottle('cuso4', -3.5, -11.6),
  ['goggles', -3.5, T, -12.1, 1.4],
  ['gloves', -3.5, T, -12.45, 0.2],
  // Window bench run: glassware, dyes and water.
  ['beaker', -2.95, T, -14.5, 0],
  ['beaker', -2.6, T, -14.5, 0],
  ['erlenmeyer', -2.2, T, -14.48, 0],
  ['graduatedCylinder', -1.75, T, -14.5, 0],
  ['testTube', -1.3, T, -14.55, 0.3],
  ['testTube', -1.15, T, -14.55, 0.3],
  bottle('dyeRed', 0.8, -14.5),
  bottle('dyeYellow', 1.05, -14.5),
  bottle('dyeGreen', 1.3, -14.5),
  bottle('dyeBlue', 1.55, -14.5),
  bottle('water', 2.0, -14.5),
  ['goggles', 3.3, T, -14.5, 0.2],
  ['gloves', 3.65, T, -14.5, -0.2],
  ['petriDish', 4.0, T, -14.5, 0],
  ['goggles', 7.6, T, -14.5, -0.3],
  // Fume hood: elephant toothpaste (H₂O₂ + soap + KI catalyst in a tall cylinder).
  ['graduatedCylinder', 5.75, HOOD, -14.35, 0],
  bottle('h2o2', 6.05, -14.55, 0, HOOD),
  bottle('soap', 6.3, -14.55, 0, HOOD),
  bottle('ki', 6.5, -14.4, 0, HOOD),
  // Safety.
  ['fireExtinguisher', 2.5, 0, -3.45, Math.PI],
];

export function createInitialItems(): WorldItem[] {
  return SEEDS.map(([kind, x, y, z, rotY = 0, variant], i) => {
    const id = `item-${i}-${kind}`;
    if (variant?.tubes) rackSeeds.set(id, variant.tubes);
    return { id, kind, position: [x, y + 0.004, z], rotY, variant };
  });
}
