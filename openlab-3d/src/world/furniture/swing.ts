/**
 * Spring-driven opening of drawers and doors: an amount from 0 (shut) to 1 (open) that
 * overshoots slightly as it opens and lands softly as it shuts, with a latch sound on
 * landing. Contents stay mounted from the moment it starts opening until it is shut.
 */
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { sounds } from '../../utils/sounds';
import { stepSpring, type Spring, type SpringParams } from '../../utils/spring';

export interface SwingParams {
  open: SpringParams;
  close: SpringParams;
}

/** Drawers glide out and bump softly against the runner stop; they close over-damped (soft-close). */
export const DRAWER_SWING: SwingParams = {
  open: { omega: 11, zeta: 0.62, stop: 1, restitution: 0.22 },
  close: { omega: 10, zeta: 1.1 },
};

/** Doors swing out with a little overshoot and close damped. */
export const DOOR_SWING: SwingParams = {
  open: { omega: 8, zeta: 0.7 },
  close: { omega: 8.5, zeta: 1.05 },
};

/** Animate `apply(amount)` toward `open`. Returns whether the contents should be shown. */
export function useSwing(open: boolean, params: SwingParams, apply: (amount: number) => void): boolean {
  const spring = useRef<Spring>({ x: 0, v: 0 });
  const [shut, setShut] = useState(true);
  useFrame((_, dt) => {
    const s = spring.current;
    if (open && shut) setShut(false);
    const target = open ? 1 : 0;
    if (s.x === target && s.v === 0) return;
    const before = s.x;
    const moving = stepSpring(s, target, dt, open ? params.open : params.close);
    apply(s.x);
    if (!open && before > 0.03 && s.x <= 0.03) sounds.play('latch', 0.6);
    if (!moving && !open) setShut(true);
  });
  return open || !shut;
}
