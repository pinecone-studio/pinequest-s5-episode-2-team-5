/** Route one R action to the bench apparatus or the room's general chemistry tools. */
import { useGameStore } from '../store/useGameStore';
import { usePortableStore } from './portable';
import { beginUse, endUse } from './actions';
import { labUse } from '../experiments/nacl/sandbox';

export function beginHeldUse(targetId?: string | null): void {
  endHeldUse();
  const target = targetId === undefined ? useGameStore.getState().focus?.id ?? null : targetId;
  if (usePortableStore.getState().held || target?.startsWith('nacl-')) labUse.start(target);
  else beginUse();
}

export function endHeldUse(): void {
  endUse();
  labUse.end();
}
