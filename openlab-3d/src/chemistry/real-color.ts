/**
 * True colors of the stock substances: what the liquid or powder in a bottle or jar really
 * looks like. Bottle contents, label bands, thumbnails and the bench cards all read from here,
 * so a reagent looks the same in the drawer, on a shelf and on the worktop.
 */
import { REAGENTS, type ReagentId } from './reagents';
import { SOLIDS } from './species';
import { mixtureLook } from './color';
import { reagentMixture, type Mixture } from './mixture';

/** Clear water as the scene draws it (faintly blue so it reads as liquid). */
export const CLEAR_LIQUID = '#e2f0fa';

const cache = new Map<ReagentId, string>();

/** Real color of the undiluted stock: the liquid in its bottle, or the powder / metal in its jar. */
export function reagentColor(id: ReagentId): string {
  let color = cache.get(id);
  if (!color) {
    const r = REAGENTS[id];
    color = r.color ?? (r.solid ? SOLIDS[r.solid].color : mixtureLook(reagentMixture(id, r.stock)).liquid) ?? CLEAR_LIQUID;
    cache.set(id, color);
  }
  return color;
}

/**
 * Real stock color of a vessel that still holds only one reagent. Once anything else is
 * added (even water) the simulated Beer–Lambert color takes over again.
 */
export function pureReagentColor(m: Mixture): string | undefined {
  return m.from.length === 1 ? REAGENTS[m.from[0]].color : undefined;
}
