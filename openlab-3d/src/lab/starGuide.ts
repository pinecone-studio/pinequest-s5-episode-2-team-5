/**
 * Star's guiding: after a mistake it flies to whatever fixes it (STAR_POINTS_AT in starLines.ts)
 * and points at it until it is fixed, the student gets there, or GUIDE_MS passes.
 */
import { create } from 'zustand';
import type { Vector3 } from 'three';
import { CATALOG } from '../equipment/equipmentCatalog';
import { interactables } from '../interaction/registry';
import { livePose } from '../interaction/bodies';
import { useChemStore } from '../store/useChemStore';
import { playerState } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { nearest, STAR_POINTS_AT, type StarPointsAt } from './starLines';

export type GuideTarget = { type: 'item'; id: string } | { type: 'spot'; id: string } | { type: 'puddle'; id: string };

export interface StarGuide {
  key: string;
  target: GuideTarget;
  done?: StarPointsAt['done'];
  until: number;
}

/** Longest Star keeps pointing at one thing. */
const GUIDE_MS = 20_000;
/** Close enough to count as "got there" (metres, on the floor plan). */
const REACHED_M = 1.3;

export const useStarGuide = create<{ guide: StarGuide | null }>(() => ({ guide: null }));

function findTarget(spec: StarPointsAt): GuideTarget | null {
  if (spec.puddle) {
    const puddles = useChemStore.getState().puddles;
    const last = puddles[puddles.length - 1];
    return last ? { type: 'puddle', id: last.id } : null;
  }
  if (spec.spot) return interactables.has(spec.spot) ? { type: 'spot', id: spec.spot } : null;
  const kinds = spec.kinds ?? [];
  const items = useInventoryStore.getState().worldItems
    .filter((w) => kinds.includes(w.kind))
    .map((w) => ({ id: w.id, ...livePose(w) }));
  const best = nearest(items, playerState.position.x, playerState.position.z);
  return best ? { type: 'item', id: best.id } : null;
}

/** Sends Star to show the way for this line, when it has somewhere to point. */
export function startGuide(key: string): boolean {
  const spec = STAR_POINTS_AT[key];
  const target = spec && findTarget(spec);
  if (!target) return false;
  useStarGuide.setState({ guide: { key, target, done: spec.done, until: performance.now() + GUIDE_MS } });
  return true;
}

export function stopGuide(): void {
  if (useStarGuide.getState().guide) useStarGuide.setState({ guide: null });
}

/** Where the target is now (items move); false once it is gone. */
export function guidePosition(target: GuideTarget, out: Vector3): boolean {
  if (target.type === 'item') {
    const item = useInventoryStore.getState().worldItems.find((w) => w.id === target.id);
    if (!item) return false;
    const pose = livePose(item);
    out.set(pose.x, pose.y, pose.z);
    return true;
  }
  if (target.type === 'puddle') {
    const puddle = useChemStore.getState().puddles.find((p) => p.id === target.id);
    if (!puddle) return false;
    out.set(puddle.x, puddle.y, puddle.z);
    return true;
  }
  const spot = interactables.get(target.id);
  if (!spot) return false;
  spot.object.getWorldPosition(out);
  return true;
}

/** Fixed, picked up, reached, wiped or timed out: Star can come back. */
export function guideFinished(guide: StarGuide, at: Vector3, found: boolean): boolean {
  if (!found || performance.now() > guide.until) return true;
  const worn = useChemStore.getState().worn;
  const held = useInventoryStore.getState().held;
  if (guide.done === 'goggles') return worn.goggles;
  if (guide.done === 'gloves') return worn.gloves;
  if (guide.done === 'grip') return !!held && !!CATALOG[held.kind].grip;
  if (guide.target.type === 'puddle') return false;
  return Math.hypot(at.x - playerState.position.x, at.z - playerState.position.z) < REACHED_M;
}

/** The screen-edge arrow (in the HUD) that StarCompanion moves when Star is out of view. */
export const starCompass: { el: HTMLElement | null; arrow: HTMLElement | null } = { el: null, arrow: null };
