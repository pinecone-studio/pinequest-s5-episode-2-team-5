import { Box3, Sphere, Vector3, type Object3D } from 'three';
import type { EquipmentKind } from '../equipment/equipmentCatalog';

export interface InteractableEntry {
  id: string;
  object: Object3D;
  label: string;
  verb: string;
  enabled: boolean;
  inspectKind?: EquipmentKind;
  onInteract?: () => void;
  /** Hold E (or the mouse button) and move the mouse: dx, dy in pixels. */
  onDrag?: (dx: number, dy: number) => void;
  onDragEnd?: () => void;
  /** Mouse wheel while focused: +1 / -1 per notch. */
  onWheel?: (direction: number) => void;
  /** Cached local-space bounding sphere for cheap range culling. */
  bounds: Sphere | null;
}

export const interactables = new Map<string, InteractableEntry>();

const box = new Box3();
const scaleTmp = new Vector3();

/** Bounding sphere in the object's local space (computed once, lazily). */
export function localBounds(entry: InteractableEntry): Sphere {
  if (entry.bounds) return entry.bounds;
  const obj = entry.object;
  obj.updateWorldMatrix(true, true);
  box.makeEmpty();
  box.setFromObject(obj, false);
  const sphere = new Sphere();
  if (box.isEmpty()) {
    sphere.radius = 0.3;
  } else {
    box.getBoundingSphere(sphere);
    // Store the sphere in local space so it stays valid when the object moves.
    obj.worldToLocal(sphere.center);
    sphere.radius /= Math.max(1e-6, obj.getWorldScale(scaleTmp).x);
  }
  entry.bounds = sphere;
  return sphere;
}

/** Whether the object and all of its ancestors are visible. */
export function isVisibleInScene(obj: Object3D): boolean {
  let o: Object3D | null = obj;
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

/** Walk up from a hit mesh to the innermost enabled interactable. */
export function resolveInteractable(hit: Object3D): InteractableEntry | null {
  let o: Object3D | null = hit;
  while (o) {
    const id = (o.userData as { interactableId?: string }).interactableId;
    if (id) {
      const entry = interactables.get(id);
      if (entry && entry.enabled) return entry;
    }
    o = o.parent;
  }
  return null;
}
