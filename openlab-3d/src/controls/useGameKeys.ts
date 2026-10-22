import { useEffect } from 'react';
import { useGameStore, type Panel } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { interactables } from '../interaction/registry';
import { dragState, heldApi, throwCharge } from '../interaction/heldApi';
import { beginUse, endUse } from '../interaction/actions';
import { sounds } from '../utils/sounds';
import { actionsForKey } from './keyMap';
import { isPointerLocked, lookBy, releaseLock, requestLock } from './usePointerLock';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** Use whatever is in focus (E / Enter / click). */
export function interactWithFocus(): boolean {
  const focus = useGameStore.getState().focus;
  if (!focus) return false;
  const entry = interactables.get(focus.id);
  if (!entry?.enabled || !entry.onInteract) return false;
  entry.onInteract();
  return true;
}

function startDrag(source: 'key' | 'mouse'): boolean {
  const focus = useGameStore.getState().focus;
  if (!focus) return false;
  const entry = interactables.get(focus.id);
  if (!entry?.onDrag) return false;
  dragState.id = entry.id;
  dragState.moved = 0;
  dragState.source = source;
  useGameStore.getState().setDragging(entry.id);
  return true;
}

function endDrag(): void {
  if (!dragState.id) return;
  const entry = interactables.get(dragState.id);
  const tapped = dragState.moved < 4;
  entry?.onDragEnd?.();
  dragState.id = null;
  dragState.source = null;
  useGameStore.getState().setDragging(null);
  // A quick tap without moving still counts as a normal interaction.
  if (tapped) entry?.onInteract?.();
}

export function openPanelFromGame(panel: Exclude<Panel, 'none'>): void {
  releaseLock();
  sounds.play('whoosh');
  useGameStore.getState().openPanel(panel);
}

export function resumeWalk(): void {
  const game = useGameStore.getState();
  game.closePanel();
  game.setMode('walk');
  requestLock();
}

function inspectFocusOrHeld(): void {
  const game = useGameStore.getState();
  const focus = game.focus;
  const entry = focus ? interactables.get(focus.id) : undefined;
  if (entry?.inspectKind) {
    releaseLock();
    game.startInspect(entry.inspectKind, entry.id);
    sounds.play('whoosh');
    return;
  }
  const held = useInventoryStore.getState().held;
  if (held) {
    releaseLock();
    game.startInspect(held.kind, held.id);
    sounds.play('whoosh');
  }
}

/** G: pick the focused item up even when E does something else (light a burner, tare the balance). */
function grabFocus(): void {
  const focus = useGameStore.getState().focus;
  const entry = focus ? interactables.get(focus.id) : undefined;
  entry?.onGrab?.();
}

/** T down: start winding up a throw; T up: let go (a longer press throws harder). */
export function startThrow(): void {
  if (!useInventoryStore.getState().held) return;
  throwCharge.since = performance.now();
}

export function releaseThrow(): void {
  if (throwCharge.since === null) return;
  const power = Math.min(1, (performance.now() - throwCharge.since) / 900);
  throwCharge.since = null;
  heldApi.throwHeld(power);
}

/**
 * C: free the mouse so HUD buttons can be clicked while standing in the lab, and take it
 * back with the same key (or a click on the view).
 */
export function toggleCursor(): void {
  const game = useGameStore.getState();
  if (useSettingsStore.getState().lookMode !== 'mouse') {
    game.showToast('Хулган чөлөөтэй байна', 'Товчлуураар эргэх горимд хулган үргэлж идэвхтэй');
    return;
  }
  if (isPointerLocked()) {
    releaseLock();
    game.setCursorFree(true);
    sounds.play('ui');
  } else {
    game.setCursorFree(false);
    requestLock();
  }
}

export function dropHeld(): void {
  if (!useInventoryStore.getState().held) return;
  // An open drawer, cabinet or rack in focus takes the item instead of the bench.
  const focus = useGameStore.getState().focus;
  const entry = focus ? interactables.get(focus.id) : undefined;
  if (entry?.onStore) {
    entry.onStore();
    return;
  }
  if (!heldApi.place()) {
    useGameStore.getState().showToast('Энд тавих боломжгүй', 'Ширээний гадаргуу эсвэл ойрхон шал руу хар');
  }
}

/** Global keyboard, mouse-button and wheel dispatch for one-shot actions. */
export function useGameKeys(canvas: HTMLElement | null): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.dataset?.capture === 'keys') return;
      if (isTyping(e.target)) {
        if (e.code === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (e.ctrlKey || e.metaKey) return;
      const game = useGameStore.getState();
      const { bindings, lookMode } = useSettingsStore.getState();
      const mode = game.mode;
      const actions = actionsForKey(e.code, bindings, lookMode);

      if (mode === 'walk' && (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow') || e.code === 'PageUp' || e.code === 'PageDown' || e.code === 'Backspace')) {
        e.preventDefault();
      }
      if (mode === 'ui' && e.code === 'Tab') e.preventDefault();

      switch (mode) {
        case 'walk': {
          if (e.code === 'Escape') {
            if (!isPointerLocked()) game.setMode('paused');
            return;
          }
          if (e.repeat) return;
          if (actions.includes('interact')) {
            if (!startDrag('key')) interactWithFocus();
          }
          if (actions.includes('inspect')) inspectFocusOrHeld();
          if (actions.includes('drop')) dropHeld();
          if (actions.includes('grab')) grabFocus();
          if (actions.includes('pour')) beginUse();
          if (actions.includes('throw')) startThrow();
          if (actions.includes('cursor')) toggleCursor();
          if (actions.includes('tools')) openPanelFromGame('tools');
          if (actions.includes('notes')) openPanelFromGame('notes');
          if (actions.includes('map')) {
            game.toggleMinimap();
            sounds.play('ui');
          }
          return;
        }
        case 'ui': {
          const closeKeys = e.code === 'Escape' || (game.panel === 'tools' && actions.includes('tools')) || (game.panel === 'notes' && actions.includes('notes'));
          if (closeKeys) {
            e.preventDefault();
            resumeWalk();
          } else if (actions.includes('tools') && game.panel !== 'tools') {
            game.openPanel('tools');
          } else if (actions.includes('notes') && game.panel !== 'notes') {
            game.openPanel('notes');
          }
          return;
        }
        case 'paused': {
          // After Esc the browser refuses an immediate re-lock, so only keyboard-turn mode resumes on Esc.
          if (e.code === 'Escape' && lookMode === 'keyboard') resumeWalk();
          return;
        }
        case 'inspect': {
          if (e.code === 'Escape' || actions.includes('inspect') || actions.includes('interact')) {
            e.preventDefault();
            game.setMode('walk');
            requestLock();
          }
          return;
        }
        default:
          return;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const { bindings, lookMode } = useSettingsStore.getState();
      const actions = actionsForKey(e.code, bindings, lookMode);
      if (dragState.id && dragState.source === 'key' && actions.includes('interact')) endDrag();
      if (actions.includes('pour')) endUse();
      if (actions.includes('throw')) releaseThrow();
    };

    let keyboardLookDrag = false;
    const onMouseDown = (e: MouseEvent) => {
      if (e.target !== canvas) return;
      const game = useGameStore.getState();
      if (game.mode !== 'walk' || e.button !== 0) return;
      const { lookMode } = useSettingsStore.getState();
      // With a free mouse a click on equipment uses it; a click on empty view takes the mouse back.
      const free = lookMode === 'mouse' && !isPointerLocked();
      if (!free || game.focus) {
        if (startDrag('mouse')) return;
        if (interactWithFocus()) return;
      }
      if (free) {
        requestLock();
        return;
      }
      if (lookMode === 'keyboard') keyboardLookDrag = true;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (isPointerLocked()) return;
      if (dragState.id && dragState.source === 'mouse') lookBy(e.movementX, e.movementY);
      else if (keyboardLookDrag) lookBy(e.movementX, e.movementY);
    };
    const onMouseUp = () => {
      keyboardLookDrag = false;
      if (dragState.id && dragState.source === 'mouse') endDrag();
    };
    const onWheel = (e: WheelEvent) => {
      const game = useGameStore.getState();
      if (game.mode !== 'walk' || !game.focus) return;
      const entry = interactables.get(game.focus.id);
      if (!entry?.onWheel) return;
      entry.onWheel(e.deltaY < 0 ? 1 : -1);
    };
    const onBlur = () => {
      if (dragState.id) endDrag();
      keyboardLookDrag = false;
      endUse();
      throwCharge.since = null;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', onBlur);
    };
  }, [canvas]);
}
