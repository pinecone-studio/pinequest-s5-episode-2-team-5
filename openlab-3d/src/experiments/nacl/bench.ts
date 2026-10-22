import { playerApi, playerState, useGameStore } from '../../store/useGameStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { releaseLock, requestLock } from '../../controls/usePointerLock';
import { sounds } from '../../utils/sounds';
import type { NaClEngine } from './engine';
import { useBenchView } from './view';

/** The mounted bench engine (set by NaClStation), so the DOM overlay can call into it. */
export const bench: { engine: NaClEngine | null } = { engine: null };

/** Optional room waypoint; it never selects a lesson or takes over the camera. */
export function openNaClExperiment(): void {
  const game = useGameStore.getState();
  if (!bench.engine || !['start', 'walk', 'paused', 'ui'].includes(game.mode)) return;
  sounds.unlock();
  sounds.setVolume(useSettingsStore.getState().volume);
  // Stand in front of the station so leaving the close-up returns to this bench.
  playerApi.teleport(8.25, -13.6, 0);
  playerState.pitch = -0.55;
  game.closePanel();
  requestLock();
}

/** Sit down at the NaCl bench: free the mouse and hand the camera to the bench view. */
export function enterBench(readId?: string): void {
  const game = useGameStore.getState();
  if (game.mode !== 'walk') return;
  useBenchView.setState(readId ? { selected: readId, level: 'detail' } : { level: 'table' });
  releaseLock();
  game.setMode('bench');
  game.logEvent('Ажлын ширээг ойроос харлаа (чөлөөт горим).');
  sounds.play('whoosh');
}

/** Stand up again and go back to walking (must run inside a user gesture to re-lock the mouse). */
export function exitBench(): void {
  const game = useGameStore.getState();
  if (game.mode !== 'bench') return;
  game.setMode('walk');
  requestLock();
  sounds.play('whoosh');
}
