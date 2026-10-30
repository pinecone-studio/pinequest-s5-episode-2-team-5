/**
 * Where a small addition lands, the liquid briefly has the composition of "the drop plus a
 * little of what was there" before it mixes in. In a titration this is the pink flash of
 * phenolphthalein around each drop of base that swirls away until the endpoint, when the
 * whole flask stays pink. Presentation only: the stored mixture is never changed.
 */
import { Color } from 'three';
import { mixtureLook } from '../chemistry/color';
import { liquidMl, merge, scaleMixture, type Mixture } from '../chemistry/mixture';
import type { AqId } from '../chemistry/species';

const a = new Color(),
  b = new Color();

/** Color of the local pocket around an addition, or null when it looks like the bulk. */
export function dropFlash(prev: Mixture | undefined, next: Mixture | undefined): string | null {
  if (!prev || !next) return null;
  const before = liquidMl(prev),
    added = liquidMl(next) - before;
  // Drops and small portions only; a big pour is shown by the plume instead.
  if (!(added > 1e-4) || added > 3 || before < 0.5) return null;
  const aq: Partial<Record<AqId, number>> = {};
  for (const [id, n] of Object.entries(next.aq) as [AqId, number][]) {
    const d = (n ?? 0) - (prev.aq[id] ?? 0);
    if (d > 0) aq[id] = d;
  }
  if (!Object.keys(aq).length) return null;
  // At first the drop's core is mostly drop: about half its volume of old liquid mixes in.
  const pocket = merge(scaleMixture(prev, Math.min(1, (added * 0.5) / before)), { ...prev, water: Math.max(0, added), ethanol: 0, aq, s: {}, g: {}, foam: 0, cloud: 0, from: [] });
  const local = mixtureLook(pocket).liquid,
    bulk = mixtureLook(next).liquid;
  if (!local || !bulk) return null;
  a.set(local);
  b.set(bulk);
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) > 0.08 ? local : null;
}
