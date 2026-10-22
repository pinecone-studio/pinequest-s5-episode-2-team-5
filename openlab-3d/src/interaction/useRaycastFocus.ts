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

const CENTER = new Vector2(0, 0);

export function useRaycastFocus(): void {
  const camera = useThree((s) => s.camera);
  const { world, rapier } = useRapier();
  const state = useMemo(
    () => ({
      raycaster: new Raycaster(),
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
    }

    // Occlusion: a wall (or other static geometry) clearly in front of the hit point.
    if (best) {
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
          canDrag: !!best.onDrag,
          canScroll: !!best.onWheel,
        }
      : null;
    if (focus && !best?.onInteract && !best?.inspectKind) {
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
