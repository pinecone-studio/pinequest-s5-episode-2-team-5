/**
 * Damped spring for furniture motion (drawers, doors). Unlike a fixed-time ease it can be
 * reversed mid-motion without a jump, and it settles with a natural overshoot or a soft,
 * over-damped landing depending on the damping ratio.
 */
export interface Spring {
  x: number;
  v: number;
}

export interface SpringParams {
  /** Natural frequency, rad/s (higher = faster). */
  omega: number;
  /** Damping ratio: < 1 overshoots, 1 is critical, > 1 creeps in softly. */
  zeta: number;
  /** Hard stop at `stop`: the spring bounces back off it with this restitution. */
  stop?: number;
  restitution?: number;
}

/** Advance `s` toward `target` by `dt` seconds. Returns false once it has settled on the target. */
export function stepSpring(s: Spring, target: number, dt: number, p: SpringParams): boolean {
  const k = p.omega * p.omega;
  const c = 2 * p.zeta * p.omega;
  let left = Math.min(dt, 0.1);
  while (left > 1e-6) {
    const h = Math.min(left, 1 / 240);
    s.v += (k * (target - s.x) - c * s.v) * h;
    s.x += s.v * h;
    if (p.stop !== undefined && s.x > p.stop && s.v > 0) {
      s.x = p.stop;
      s.v = -s.v * (p.restitution ?? 0);
    }
    left -= h;
  }
  if (Math.abs(target - s.x) < 5e-4 && Math.abs(s.v) < 5e-3) {
    s.x = target;
    s.v = 0;
    return false;
  }
  return true;
}
