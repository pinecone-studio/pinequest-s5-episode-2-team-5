/** Spawning Tools-drawer items onto the nearest free spot of the nearest bench. */
import { Vector3 } from 'three';
import { CATALOG, type EquipmentKind } from '../equipment/equipmentCatalog';
import type { ItemVariant } from '../world/itemsLayout';
import { playerState } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { nearestSurfacePoint, surfaces } from './surfaces';

function footprint(kind: EquipmentKind): number {
  const s = CATALOG[kind].size;
  return Math.max(s[0], s[2]) / 2;
}

function isFree(x: number, z: number, y: number, r: number): boolean {
  return useInventoryStore
    .getState()
    .worldItems.every((w) => Math.abs(w.position[1] - y) > 0.25 || Math.hypot(w.position[0] - x, w.position[2] - z) > r + footprint(w.kind) + 0.02);
}

export function findSpawnSpot(kind: EquipmentKind): { point: Vector3; onSurface: boolean } {
  const r = footprint(kind);
  const base = nearestSurfacePoint(playerState.position, 4, r + 0.03);
  if (base) {
    const s = surfaces.get(base.surfaceId);
    if (s) {
      const step = Math.max(0.08, r * 2 + 0.02);
      for (let ring = 0; ring < 8; ring++) {
        const n = ring === 0 ? 1 : ring * 8;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          const x = Math.min(s.maxX - r - 0.02, Math.max(s.minX + r + 0.02, base.point.x + Math.cos(a) * ring * step));
          const z = Math.min(s.maxZ - r - 0.02, Math.max(s.minZ + r + 0.02, base.point.z + Math.sin(a) * ring * step));
          if (isFree(x, z, s.y, r)) return { point: new Vector3(x, s.y, z), onSurface: true };
        }
      }
    }
  }
  const fx = -Math.sin(playerState.yaw);
  const fz = -Math.cos(playerState.yaw);
  return { point: new Vector3(playerState.position.x + fx * 0.8, 0, playerState.position.z + fz * 0.8), onSurface: false };
}

export function spawnNearPlayer(kind: EquipmentKind, variant?: ItemVariant): { ok: boolean; onSurface: boolean } {
  const { point, onSurface } = findSpawnSpot(kind);
  const id = useInventoryStore.getState().spawn(kind, [point.x, point.y + 0.03, point.z], playerState.yaw, variant);
  return { ok: !!id, onSurface };
}
