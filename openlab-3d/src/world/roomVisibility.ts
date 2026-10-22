import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { useLoadingStore, type LoadStep } from '../store/useLoadingStore';
import type { RoomId } from './layout';

/** True while the room is near the player and should render its detailed contents. */
export function useRoomActive(id: RoomId): boolean {
  return useGameStore((s) => s.activeRooms.includes(id));
}

/** Report a lazily loaded room (or other step) as ready for the loading screen. */
export function useReady(step: LoadStep): void {
  useEffect(() => {
    useLoadingStore.getState().markReady(step);
  }, [step]);
}
