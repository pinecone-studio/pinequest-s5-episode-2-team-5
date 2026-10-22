/** Taking items out of / putting them into drawers, cabinets and racks, with the usual checks. */
import { CATALOG } from '../equipment/equipmentCatalog';
import { mixtureOf } from '../store/useChemStore';
import { useGameStore } from '../store/useGameStore';
import { storedIn, useInventoryStore } from '../store/useInventoryStore';
import { emitLab } from '../lab/events';
import { sounds } from '../utils/sounds';
import { STORAGE_INFO, holderCategory, holderType } from './holders';
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
