/** Spilled liquids become puddles; hazardous ones are flagged so they get cleaned up. */
import { mixtureLook } from '../chemistry/color';
import { liquidMl, solidVolumeMl, type Mixture } from '../chemistry/mixture';
import { phOf } from '../chemistry/equilibrium';
import { useChemStore } from '../store/useChemStore';

const HEAVY = ['Ag', 'Pb', 'Ba', 'Cu', 'MnO4', 'Fe3'] as const;

/** Corrosive (very acidic / basic) or containing heavy-metal ions. */
export function isHazardous(m: Mixture): boolean {
  if (HEAVY.some((id) => (m.aq[id] ?? 0) > 1e-6)) return true;
  if ((m.s.PbI2 ?? 0) > 0 || (m.s.BaSO4 ?? 0) > 0 || (m.s.AgCl ?? 0) > 0) return true;
  const ph = phOf(m);
  return ph !== null && (ph < 3 || ph > 11) && liquidMl(m) > 0.5;
}

export function spillMixture(m: Mixture, x: number, y: number, z: number): void {
  const ml = liquidMl(m) + solidVolumeMl(m);
  if (ml < 0.3) return;
  const look = mixtureLook(m);
  useChemStore.getState().addPuddle({ x, y, z, ml, color: look.liquid ?? look.solidColor ?? '#cfe6f5', hazardous: isHazardous(m) });
}
