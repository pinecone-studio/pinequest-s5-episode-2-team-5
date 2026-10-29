/** Taking items out of / putting them into drawers, cabinets and racks, with the usual checks. */
import { CATALOG } from '../equipment/equipmentCatalog';
import { mixtureOf } from '../store/useChemStore';
import { useGameStore } from '../store/useGameStore';
import { storedIn, useInventoryStore } from '../store/useInventoryStore';
import { emitLab } from '../lab/events';
import { sounds } from '../utils/sounds';
import { HOLDER_CAPACITY, STORAGE_INFO, holderCategory, holderType } from './holders';
import { livePose } from './bodies';
import type { ItemVariant } from '../world/itemsLayout';

export const HOT_C = 55;

/** Too hot to hold with bare hands. */
export function tooHot(id: string, variant?: ItemVariant): number | null {
  const t = mixtureOf(id, variant).temp;
  return t > HOT_C ? t : null;
}

function canGrip(): boolean {
  const held = useInventoryStore.getState().held;
  return !!held && !!CATALOG[held.kind].grip && !held.grip;
}

/** Shared checks before something goes into the hand. Returns false (with a toast) when it may not. */
export function mayTake(id: string, variant?: ItemVariant): boolean {
  const game = useGameStore.getState();
  const held = useInventoryStore.getState().held;
  if (held && !canGrip()) {
    game.showToast('Гар завгүй байна', 'Эхлээд барьж буй зүйлээ тавь (Q)');
    return false;
  }
  const hot = tooHot(id, variant);
  if (hot !== null && !canGrip()) {
    game.showToast(`Хэт халуун! (${Math.round(hot)} °C)`, 'Тигель хавчаар эсвэл хуруу шил барих хавчаар барьж байж ав');
    emitLab({ key: 'safety:hot', quiet: true });
    sounds.play('beep', 0.8);
    return false;
  }
  return true;
}

export function takeFrom(holderId: string, itemId: string): void {
  const inv = useInventoryStore.getState();
  const item = storedIn(inv.storage, holderId).find((it) => it.id === itemId);
  if (!item || !mayTake(item.id, item.variant)) return;
  if (inv.takeStored(holderId, itemId)) sounds.play('pickup');
}

export function storeInto(holderId: string): void {
  const game = useGameStore.getState();
  const inv = useInventoryStore.getState();
  const held = inv.held;
  if (!held) return;
  const result = inv.storeHeld(holderId);
  const info = STORAGE_INFO[holderCategory(holderId)];
  if (result === 'ok') {
    sounds.play(CATALOG[held.kind].glass ? 'clink' : 'tick', 0.8);
    if (holderType(holderId) !== 'rack') game.showToast(`${CATALOG[held.kind].name} хадгаллаа`, info.label);
  } else if (result === 'full') {
    game.showToast('Энд зай алга', `${info.label} дүүрэн байна`);
  } else if (result === 'wrong') {
    game.showToast('Энд багтахгүй', holderType(holderId) === 'rack' ? 'Тавиурт зөвхөн хуруу шил хийнэ' : `${CATALOG[held.kind].name} энд багтахгүй`);
  }
}

/**
 * A loose test tube lies on its side and cannot hold liquid. Stands it in a free slot of the
 * nearest test-tube rack within `reach` (m, about one bench), as you would before filling it. False when none.
 */
export function standTube(id: string, reach = 2.6): boolean {
  const inv = useInventoryStore.getState();
  const tube = inv.worldItems.find((w) => w.id === id && w.kind === 'testTube');
  if (!tube) return false;
  const at = livePose(tube);
  let rack: string | null = null;
  let best = reach;
  for (const w of inv.worldItems) {
    if (w.kind !== 'testTubeRack' || storedIn(inv.storage, w.id).length >= HOLDER_CAPACITY.rack) continue;
    const p = livePose(w);
    const d = Math.hypot(p.x - at.x, p.z - at.z);
    if (d < best) { best = d; rack = w.id; }
  }
  if (!rack) return false;
  const holder = rack;
  useInventoryStore.setState((s) => ({
    worldItems: s.worldItems.filter((w) => w.id !== id),
    storage: { ...s.storage, [holder]: [...storedIn(s.storage, holder), { id, kind: 'testTube', variant: tube.variant }] },
  }));
  sounds.play('clink', 0.6);
  return true;
}

/** A test tube lying loose in the room (not in a rack, not in the hand). */
export function isLooseTube(id: string): boolean {
  return useInventoryStore.getState().worldItems.some((w) => w.id === id && w.kind === 'testTube');
}
