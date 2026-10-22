/** Glass that hits something too hard shatters: shards fly, the contents spill. */
import { CATALOG } from '../equipment/equipmentCatalog';
import { isEmptyMixture } from '../chemistry/mixture';
import { mixtureOf, useChemStore } from '../store/useChemStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { emitLab } from '../lab/events';
import { forget } from '../lab/observe';
import { spillMixture } from '../lab/spill';
import { livePose } from '../interaction/bodies';
import { surfaceYAt } from '../interaction/surfaces';
import { sounds } from '../utils/sounds';
import type { WorldItem } from '../world/itemsLayout';

/** Impact speed (m/s) above which glass breaks: a fall of ~0.6 m. */
export const BREAK_SPEED = 3.5;

const broken = new Set<string>();

export function breakItem(item: WorldItem): void {
  if (broken.has(item.id)) return;
  broken.add(item.id);
  const pose = livePose(item);
  const m = mixtureOf(item.id, item.variant);
  const y = surfaceYAt(pose.x, pose.z, pose.y + 0.02);
  useInventoryStore.getState().removeWorld(item.id);
  const chem = useChemStore.getState();
  chem.addBurst(pose.x, Math.max(y, pose.y), pose.z);
  if (!isEmptyMixture(m)) spillMixture(m, pose.x, y, pose.z);
  chem.removeMixture(item.id);
  forget(item.id);
  sounds.play('shatter');
  emitLab({
    key: 'break',
    title: `${CATALOG[item.kind].name} хагарлаа!`,
    detail: 'Хагархайг гараар бүү түү — сойз, хүрзээр цуглуулж шилний хаягдлын саванд хий. Асгарсныг арчиж цэвэрлэ (E).',
  });
  window.setTimeout(() => broken.delete(item.id), 2000);
}

const lastImpact = new Map<string, number>();

/** Clink / knock when an item hits something, louder the faster it was moving. */
export function impactSound(item: WorldItem, speed: number): void {
  const now = performance.now();
  if (now - (lastImpact.get(item.id) ?? 0) < 120) return;
  lastImpact.set(item.id, now);
  const k = Math.min(1.2, speed / 3.5);
  if (CATALOG[item.kind].glass) sounds.play('clink', 0.3 + k * 0.7);
  else sounds.play(CATALOG[item.kind].massKg > 1 ? 'thud' : 'tick', 0.4 + k);
}
