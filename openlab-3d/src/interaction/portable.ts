import { create } from 'zustand';
import { Box3, Quaternion, Vector3, type Object3D } from 'three';

/** Carries an existing live scene object, preserving its contents and identity. */
export interface Portable {
  id: string;
  label: string;
  footprint: number;
  move: (bottom: Vector3, yaw: number, tilt: number) => void;
}

export const usePortableStore = create<{ held: Portable | null }>()(() => ({ held: null }));

/** Placement is supplied by the same surface solver used for ordinary inventory. */
export const portableApi = { place: (): boolean => false };
const originals = new Map<Object3D, { position: Vector3; rotation: Object3D['rotation'] }>();
export function resetScenePortables() {
  usePortableStore.setState({ held: null });
  originals.forEach((original, object) => { object.position.copy(original.position); object.rotation.copy(original.rotation); });
  originals.clear();
}

export function scenePortable(id: string, label: string, object: Object3D): Portable {
  if (!originals.has(object)) originals.set(object, { position: object.position.clone(), rotation: object.rotation.clone() });
  object.updateWorldMatrix(true, true);
  const box = new Box3().setFromObject(object);
  const originalOrientation = object.getWorldQuaternion(new Quaternion());
  let firstYaw: number | null = null;
  const up = new Vector3(0, 1, 0);
  const tiltAxis = new Vector3(0, 0, 1);
  return {
    id, label, footprint: Math.min(0.16, Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2),
    move: (point, yaw, tilt) => {
      firstYaw ??= yaw;
      const rotation = new Quaternion().setFromAxisAngle(up, yaw - firstYaw).multiply(originalOrientation).multiply(new Quaternion().setFromAxisAngle(tiltAxis, tilt));
      if (object.parent) rotation.premultiply(object.parent.getWorldQuaternion(new Quaternion()).invert());
      object.quaternion.copy(rotation);
      object.updateWorldMatrix(true, true);
      box.setFromObject(object);
      const bottom = new Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
      const offset = bottom.sub(object.getWorldPosition(new Vector3()));
      const at = point.clone().sub(offset);
      object.position.copy(object.parent ? object.parent.worldToLocal(at) : at);
      object.updateWorldMatrix(true, true);
    },
  };
}
