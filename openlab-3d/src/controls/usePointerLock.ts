import { useEffect } from 'react';
import { playerState, useGameStore } from '../store/useGameStore';
import { PITCH_LIMIT } from '../utils/constants';
import { useSettingsStore } from '../store/useSettingsStore';
import { dragState } from '../interaction/heldApi';
import { interactables } from '../interaction/registry';
import { consumeExpectedUnlock, isPointerLocked, releaseLock, requestLock, setPointerTarget } from './pointerLock';

export { isPointerLocked, releaseLock, requestLock, setPointerTarget };

/** Mouse-look for the first-person camera; also routes hold-to-drag input to interactables. */
function applyLook(dx: number, dy: number): void {
  if (dragState.id) {
    const entry = interactables.get(dragState.id);
    dragState.moved += Math.abs(dx) + Math.abs(dy);
    entry?.onDrag?.(dx, dy);
    return;
  }
  const { sensitivity, invertY } = useSettingsStore.getState();
  const k = 0.0022 * sensitivity;
  playerState.yaw -= dx * k;
  playerState.pitch -= dy * k * (invertY ? -1 : 1);
  playerState.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, playerState.pitch));
}

export function lookBy(dx: number, dy: number): void {
  applyLook(dx, dy);
}

/** Keeps the store in sync with the browser's pointer-lock state and handles mouse look. */
export function usePointerLockSync(): void {
  useEffect(() => {
    const onChange = () => {
      const locked = isPointerLocked();
      const game = useGameStore.getState();
      game.setPointerLocked(locked);
      if (locked) game.setCursorFree(false);
      if (!locked) {
        if (consumeExpectedUnlock()) {
        } else if (game.mode === 'walk') {
          game.setMode('paused');
        }
      }
    };
    const onMove = (e: MouseEvent) => {
      if (!isPointerLocked()) return;
      const mode = useGameStore.getState().mode;
      if (mode !== 'walk') return;
      // Ignore the occasional giant jump some browsers emit right after locking.
      if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return;
      applyLook(e.movementX, e.movementY);
    };
    document.addEventListener('pointerlockchange', onChange);
    document.addEventListener('mousemove', onMove);
    return () => {
      document.removeEventListener('pointerlockchange', onChange);
      document.removeEventListener('mousemove', onMove);
    };
  }, []);
}
