import { useSettingsStore } from '../store/useSettingsStore';
import { isTouchDevice } from '../utils/device';

let target: HTMLElement | null = null;
let expectingUnlock = false;

export function setPointerTarget(el: HTMLElement | null): void {
  target = el;
}

export function isPointerLocked(): boolean {
  return !!target && document.pointerLockElement === target;
}

export function requestLock(): void {
  // Phones and tablets look around by dragging; there is no mouse to capture.
  if (!target || isTouchDevice() || useSettingsStore.getState().lookMode !== 'mouse') return;
  if (document.pointerLockElement === target) return;
  try {
    const result = target.requestPointerLock() as unknown;
    if (result instanceof Promise) result.catch(() => undefined);
  } catch {
    // Browsers throttle re-locking right after Esc; the "click to look" hint covers it.
  }
}

export function releaseLock(): void {
  if (document.pointerLockElement) {
    expectingUnlock = true;
    document.exitPointerLock();
  }
}

export function consumeExpectedUnlock(): boolean {
  const expected = expectingUnlock;
  expectingUnlock = false;
  return expected;
}
