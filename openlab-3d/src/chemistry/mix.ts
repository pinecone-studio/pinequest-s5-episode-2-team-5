/** Pouring one mixture into another: neutralization heat, then equilibrium. */
import type { SolidId } from './species';
import { acidityToNeutral, equilibrate } from './equilibrium';
import { heatCapacity, merge, type Mixture } from './mixture';

const NEUTRALIZATION_J = 56000;

export function equilibrateHeat(dst: Mixture, add: Mixture, glassJK: number): { m: Mixture; neutralized: number; formed: SolidId[] } {
  const a = acidityToNeutral(dst);
  const b = acidityToNeutral(add);
  let neutralized = 0;
  if (a > 0 && b < 0) neutralized = Math.min(a, -b);
  else if (a < 0 && b > 0) neutralized = Math.min(-a, b);
  let merged = merge(dst, add);
  if (neutralized > 0) merged = { ...merged, temp: merged.temp + (NEUTRALIZATION_J * neutralized) / (heatCapacity(merged) + glassJK) };
  const eq = equilibrate(merged);
  return { m: eq.m, neutralized, formed: eq.formed };
}
