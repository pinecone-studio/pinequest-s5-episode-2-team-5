/**
 * Drives the (paused) rapier world manually: each rendered frame is split into substeps
 * of at most 1/60 s, and registered pre-step hooks (the player controller) run before
 * every substep. Long frames (tab switches, hitches) therefore never produce a giant
 * physics step that could knock glassware over or tunnel through a bench.
 */
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';

const MAX_STEP = 1 / 60;
const MAX_FRAME = 0.1;

export const preStepHooks = new Set<(dt: number) => void>();

export function PhysicsDriver() {
  const { step } = useRapier();
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, MAX_FRAME);
    if (dt <= 0) return;
    const n = Math.max(1, Math.ceil(dt / MAX_STEP - 1e-6));
    const sub = dt / n;
    for (let i = 0; i < n; i++) {
      preStepHooks.forEach((hook) => hook(sub));
      step(sub);
    }
  });
  return null;
}
