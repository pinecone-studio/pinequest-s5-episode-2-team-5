/**
 * Live physics bodies of loose items. The inventory store only knows where an item was
 * placed; once things are knocked over, thrown or pushed, the rapier body is the truth.
 * Also: raised placement spots (balance pan, tripod gauze, burette base) and the
 * balance reading, both computed from live positions.
 */
import type { RapierRigidBody } from '@react-three/rapier';
import { Euler, Quaternion, Vector3 } from 'three';
import { CATALOG, type EquipmentKind } from '../equipment/equipmentCatalog';
import { contentMassG } from '../chemistry/mixture';
import { mixtureOf } from '../store/useChemStore';
import type { WorldItem } from '../world/itemsLayout';
import { preStepHooks } from '../controls/PhysicsDriver';

export const bodies = new Map<string, RapierRigidBody>();
/** Speed of each awake body before the latest physics substep (impact detection). */
export const preSpeeds = new Map<string, number>();

let recording = false;
export function startSpeedRecorder(): () => void {
  if (recording) return () => undefined;
  recording = true;
  const hook = () => {
    for (const [id, b] of bodies) {
      if (b.isSleeping()) {
        preSpeeds.delete(id);
        continue;
      }
      const v = b.linvel();
      preSpeeds.set(id, Math.hypot(v.x, v.y, v.z));
    }
  };
  preStepHooks.add(hook);
  return () => {
    preStepHooks.delete(hook);
    recording = false;
  };
}

const q = new Quaternion();
const e = new Euler();

export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** World up of the item's local Y axis (to detect tipping). */
  upY: number;
}

export function livePose(item: WorldItem): Pose {
  const b = bodies.get(item.id);
  if (!b) return { x: item.position[0], y: item.position[1], z: item.position[2], yaw: item.rotY, upY: 1 };
  const t = b.translation();
  const r = b.rotation();
  q.set(r.x, r.y, r.z, r.w);
  e.setFromQuaternion(q, 'YXZ');
  const up = new Vector3(0, 1, 0).applyQuaternion(q);
  return { x: t.x, y: t.y, z: t.z, yaw: e.y, upY: up.y };
}

interface SupportSpec {
  /** Local offset of the spot's center, top height and radius (or half-extents for boxes). */
  offset: [number, number];
  top: number;
  radius?: number;
  half?: [number, number];
}

const SUPPORTS: Partial<Record<EquipmentKind, SupportSpec>> = {
  scale: { offset: [0, -0.03], top: 0.084, radius: 0.055 },
  tripod: { offset: [0, 0], top: 0.205, radius: 0.07 },
  burette: { offset: [0.02, 0.025], top: 0.016, half: [0.09, 0.042] },
};

function localPoint(pose: Pose, x: number, z: number): [number, number] {
  const dx = x - pose.x;
  const dz = z - pose.z;
  const c = Math.cos(pose.yaw);
  const s = Math.sin(pose.yaw);
  return [dx * c - dz * s, dx * s + dz * c];
}

/** Height of a raised spot (balance pan, tripod, burette base) at (x, z), else null. */
export function supportHeightAt(x: number, z: number, items: WorldItem[], ignoreKind?: EquipmentKind): number | null {
  let best: number | null = null;
  for (const w of items) {
    const spec = SUPPORTS[w.kind];
    if (!spec || w.kind === ignoreKind) continue;
    const pose = livePose(w);
    if (pose.upY < 0.9) continue;
    const [lx, lz] = localPoint(pose, x, z);
    const dx = lx - spec.offset[0];
    const dz = lz - spec.offset[1];
    const inside = spec.radius !== undefined ? Math.hypot(dx, dz) < spec.radius : Math.abs(dx) < (spec.half?.[0] ?? 0) && Math.abs(dz) < (spec.half?.[1] ?? 0);
    if (!inside) continue;
    const y = pose.y + spec.top;
    if (best === null || y > best) best = y;
  }
  return best;
}

/** Grams on a balance pan: the items resting on it plus everything they hold. */
export function gramsOnPan(scale: WorldItem, items: WorldItem[]): number {
  const pose = livePose(scale);
  const spec = SUPPORTS.scale as SupportSpec;
  let grams = 0;
  for (const w of items) {
    if (w.id === scale.id) continue;
    const p = livePose(w);
    const [lx, lz] = localPoint(pose, p.x, p.z);
    if (Math.hypot(lx - spec.offset[0], lz - spec.offset[1]) > (spec.radius ?? 0) + 0.01) continue;
    if (p.y < pose.y + spec.top - 0.02 || p.y > pose.y + spec.top + 0.08) continue;
    grams += CATALOG[w.kind].massKg * 1000 + contentMassG(mixtureOf(w.id, w.variant));
  }
  return grams;
}

/** World position of a burette's tip (where drops leave). */
export function buretteTip(item: WorldItem): Vector3 {
  const pose = livePose(item);
  const lx = 0.02;
  const lz = 0.025;
  const c = Math.cos(pose.yaw);
  const s = Math.sin(pose.yaw);
  return new Vector3(pose.x + lx * c + lz * s, pose.y + 0.205, pose.z - lx * s + lz * c);
}

/** Raised surfaces follow moved, upright apparatus and offer a forgiving aiming area. */
export function supportSpots(items: WorldItem[], heldKind: string) {
  return items.flatMap((item) => {
    const spec = SUPPORTS[item.kind];
    if (!spec || item.kind === heldKind) return [];
    if (item.kind === 'tripod' && !['beaker', 'erlenmeyer', 'evaporatingDish', 'dish'].includes(heldKind)) return [];
    if (item.kind === 'burette' && !['beaker', 'erlenmeyer', 'flask'].includes(heldKind)) return [];
    const pose = livePose(item);
    if (pose.upY < .9) return [];
    const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
    const at = new Vector3(pose.x + spec.offset[0] * c + spec.offset[1] * s, pose.y + spec.top, pose.z - spec.offset[0] * s + spec.offset[1] * c);
    return [{id: `support-${item.id}`, point: at, aim: at.clone(), radius: Math.max(.055, spec.radius ?? .06)}];
  });
}
