/**
 * Center-screen focus: each frame a ray from the camera finds the nearest enabled
 * Interactable within 2.5 m. A rapier ray against static geometry rejects targets hidden
 * behind walls. The result is pushed to the game store (prompt + outline).
 */
import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import { Raycaster, Sphere, Vector2, Vector3, type Intersection } from 'three';
import { useGameStore, type FocusInfo } from '../store/useGameStore';
import { INTERACT_RANGE } from '../utils/constants';
import { interactables, isVisibleInScene, localBounds, resolveInteractable, type InteractableEntry } from './registry';
import { playerBodyRef } from '../controls/Player';
import { MERGED_LAYER } from './stillBatch';

const CENTER = new Vector2(0, 0);

/** Stored items drawn through a merged copy keep their meshes on MERGED_LAYER; aim at those too. */
export function withMergedLayer(raycaster: Raycaster): Raycaster {
  raycaster.layers.enable(MERGED_LAYER);
  return raycaster;
}
/** Items whose bounding sphere is smaller than this get aim assist. */
const ASSIST_RADIUS = 0.1;
const toCenter = new Vector3();

export function useRaycastFocus(): void {
  const camera = useThree((s) => s.camera);
  const { world, rapier } = useRapier();
  const state = useMemo(
    () => ({
      raycaster: withMergedLayer(new Raycaster()),
      hits: [] as Intersection[],
      sphere: new Sphere(),
      camPos: new Vector3(),
      frame: 0,
    }),
    [],
  );

  useFrame(() => {
    const game = useGameStore.getState();
    if (game.mode !== 'walk') {
      if (game.focus) game.setFocus(null);
      return;
    }
    if (game.dragging) return;
    state.frame++;
    const { raycaster, hits, sphere, camPos } = state;
    raycaster.setFromCamera(CENTER, camera);
    raycaster.far = INTERACT_RANGE + 0.5;
    camPos.copy(camera.position);

    let best: InteractableEntry | null = null;
    let bestDist = INTERACT_RANGE;
    for (const entry of interactables.values()) {
      if (!entry.enabled) continue;
      const b = localBounds(entry);
      sphere.center.copy(b.center);
      entry.object.localToWorld(sphere.center);
      sphere.radius = b.radius;
      if (sphere.center.distanceTo(camPos) - sphere.radius > INTERACT_RANGE) continue;
      if (!raycaster.ray.intersectsSphere(sphere)) continue;
      if (!isVisibleInScene(entry.object)) continue;
      hits.length = 0;
      raycaster.intersectObject(entry.object, true, hits);
      for (const h of hits) {
        if (h.distance >= bestDist) break;
        if (!isVisibleInScene(h.object)) continue;
        const resolved = resolveInteractable(h.object);
        if (resolved) {
          best = resolved;
          bestDist = h.distance;
        }
        break;
      }
      // Aim assist: a small hollow item (a funnel's mouth, a tube, a beaker seen from above)
      // still counts when the ray passes through the core of its bounds between the glass walls.
      if (hits.length === 0 && sphere.radius < ASSIST_RADIUS && entry.useTarget?.type === 'item') {
        const along = toCenter.subVectors(sphere.center, camPos).dot(raycaster.ray.direction);
        if (along > 0 && along < bestDist && raycaster.ray.distanceSqToPoint(sphere.center) < (sphere.radius * 0.6) ** 2) {
          best = entry;
          bestDist = along;
        }
      }
    }

    // Occlusion: a wall (or other static geometry) clearly in front of the hit point. Items
    // kept in drawers and cabinets sit inside their bench's collider, so they are exempt.
    // Shelf glassware also sits inside its rack's coarse, solid collision hull.
    const stored = best?.useTarget?.type === 'item' && (!!best.useTarget.holderId || /^stock-\d+-(beaker|flask|bottle)-/.test(best.id));
    if (best && !stored) {
      const dir = raycaster.ray.direction;
      const ray = new rapier.Ray({ x: camPos.x, y: camPos.y, z: camPos.z }, { x: dir.x, y: dir.y, z: dir.z });
      const hit = world.castRay(ray, bestDist, true, undefined, undefined, undefined, playerBodyRef.current ?? undefined, (c) => {
        const rb = c.parent();
        return !rb || rb.isFixed();
      });
      if (hit && hit.timeOfImpact < bestDist - 0.1) best = null;
    }

    const focus: FocusInfo | null = best
      ? {
          id: best.id,
          label: best.label,
          verb: best.verb,
          canUse: !!best.onInteract,
          canInspect: !!best.inspectKind,
          canGrab: !!best.onGrab && best.onGrab !== best.onInteract,
          canStore: !!best.onStore,
          storeVerb: best.storeVerb,
          canDrag: !!best.onDrag,
          canScroll: !!best.onWheel,
        }
      : null;
    if (focus && !best?.onInteract && !best?.inspectKind && !best?.useTarget) {
      game.setFocus(null);
      return;
    }
    game.setFocus(focus);
  });
}

export function FocusRaycaster() {
  useRaycastFocus();
  return null;
}
