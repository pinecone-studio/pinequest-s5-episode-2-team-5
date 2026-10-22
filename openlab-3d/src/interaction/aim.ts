import { useEffect } from 'react';
import { Vector2, Vector3, type Camera } from 'three';
import { useGameStore } from '../store/useGameStore';
import { isTouchDevice } from '../utils/device';

/**
 * Where the player points on screen. While the mouse is captured (pointer lock) that is the
 * view center; while it is free (C key, after a panel closed, keyboard-turn mode) it follows
 * the real mouse, so equipment can be pointed at and clicked directly.
 */
export const aim = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  /** The mouse is over the 3D view, not over a HUD button or panel. */
  overView: true,
};

const TOUCH = isTouchDevice();
const ndc = new Vector2();
const ray = new Vector3();

export function isRoaming(): boolean {
  const g = useGameStore.getState();
  return g.mode === 'walk' && !g.pointerLocked && !TOUCH;
}

/** Reactive version of {@link isRoaming}. */
export function useRoaming(): boolean {
  const free = useGameStore((s) => s.mode === 'walk' && !s.pointerLocked);
  return free && !TOUCH;
}

export function centerAim(): void {
  aim.x = window.innerWidth / 2;
  aim.y = window.innerHeight / 2;
  aim.overView = true;
}

/** Aim point in normalized device coordinates ((0, 0) = view center). */
export function aimNdc(out: Vector2): Vector2 {
  if (!isRoaming()) return out.set(0, 0);
  return out.set((aim.x / window.innerWidth) * 2 - 1, -(aim.y / window.innerHeight) * 2 + 1);
}

/** World direction of the aim point (the camera's look direction while the mouse is captured). */
export function aimDirection(camera: Camera, out: Vector3): Vector3 {
  if (!isRoaming() || !aim.overView) return camera.getWorldDirection(out);
  aimNdc(ndc);
  return out.copy(ray.set(ndc.x, ndc.y, 0.5).unproject(camera)).sub(camera.position).normalize();
}

/** Follows the free mouse; the point is frozen while something is being dragged. */
export function useAimTracking(onMove: () => void): void {
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!isRoaming() || useGameStore.getState().dragging) return;
      aim.x = e.clientX;
      aim.y = e.clientY;
      aim.overView = e.target instanceof HTMLCanvasElement;
      onMove();
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [onMove]);
}
