/** Geometry of the analytical balance pan, shared by placement (lift onto the pan) and weighing. */
import { CATALOG } from '../equipment/equipmentCatalog';
import type { WorldItem } from '../world/itemsLayout';

const PAN_FORWARD = -0.03;
const PAN_TOP = 0.084;
const PAN_RADIUS = 0.055;

function panCenter(scale: WorldItem): [number, number] {
  return [scale.position[0] + Math.sin(scale.rotY) * PAN_FORWARD, scale.position[2] + Math.cos(scale.rotY) * PAN_FORWARD];
}

/** Height of the pan if (x, z) is over a balance's pan, else null. */
export function panHeightAt(x: number, z: number, items: WorldItem[], ignoreId?: string): number | null {
  for (const w of items) {
    if (w.kind !== 'scale' || w.id === ignoreId) continue;
    const [px, pz] = panCenter(w);
    if (Math.hypot(x - px, z - pz) < PAN_RADIUS) return w.position[1] + PAN_TOP;
  }
  return null;
}

/** Total mass in grams of the items resting on this balance's pan. */
export function gramsOnPan(scale: WorldItem, items: WorldItem[]): number {
  const [px, pz] = panCenter(scale);
  return items
    .filter((w) => w.id !== scale.id && Math.hypot(w.position[0] - px, w.position[2] - pz) < PAN_RADIUS && w.position[1] > scale.position[1] + PAN_TOP - 0.01)
    .reduce((sum, w) => sum + CATALOG[w.kind].massKg * 1000 + liquidGrams(w), 0);
}

function liquidGrams(w: WorldItem): number {
  return (w.variant?.contents ?? []).reduce((sum, c) => sum + c.ml, 0);
}
