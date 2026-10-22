/**
 * Simplified Millikan oil-drop physics (SI units).
 *
 * Terminal velocity with no field:   v_f = m g / (6 π η r)
 * Balance condition:                  q E = m g,  E = V / d
 * Under a field (up positive):        q E s − m g = 6 π η r v
 */
import { MILLIKAN } from '../utils/constants';

export type Polarity = -1 | 0 | 1;

const { oilDensity: RHO, airViscosity: ETA, g: G, plateSeparation: D, e: E_CHARGE } = MILLIKAN;

export function dropMass(radius: number): number {
  return (4 / 3) * Math.PI * radius ** 3 * RHO;
}

export function stokesCoefficient(radius: number): number {
  return 6 * Math.PI * ETA * radius;
}

/** Terminal fall speed (m/s, positive downward) with no electric field. */
export function terminalFallSpeed(radius: number): number {
  return (dropMass(radius) * G) / stokesCoefficient(radius);
}

/**
 * Vertical terminal velocity (m/s, up positive) of a drop with charge magnitude `q`.
 * Droplets pick up negative charge from friction in the atomizer, so with the top plate
 * positive (polarity +1) the electric force points up.
 */
export function dropVelocity(radius: number, q: number, voltage: number, polarity: Polarity, powered: boolean): number {
  const field = powered ? (voltage / D) * polarity : 0;
  const electric = q * field;
  const weight = dropMass(radius) * G;
  return (electric - weight) / stokesCoefficient(radius);
}

/** Voltage at which the drop hovers (V). */
export function balanceVoltage(radius: number, q: number): number {
  return (dropMass(radius) * G * D) / q;
}

/** Radius from a measured free-fall speed (m/s). */
export function radiusFromFallSpeed(vFall: number): number {
  return Math.sqrt((9 * ETA * vFall) / (2 * RHO * G));
}

/**
 * Charge magnitude (C) from a free-fall speed and a speed measured under a field.
 * `vField` is signed (up positive), `vFall` is the positive downward speed.
 */
export function chargeFromMeasurements(vFall: number, vField: number, voltage: number, polarity: Polarity): number | null {
  if (vFall <= 0 || voltage <= 0 || polarity === 0) return null;
  const r = radiusFromFallSpeed(vFall);
  const field = (voltage / D) * polarity;
  const q = (stokesCoefficient(r) * (vField + vFall)) / field;
  return q > 0 ? q : null;
}

export function chargeUnits(q: number): number {
  return q / E_CHARGE;
}

/** Brownian displacement standard deviation (m) over dt for a sphere of radius r. */
export function brownianSigma(radius: number, dt: number): number {
  const kT = 1.380649e-23 * 293;
  const diffusion = kT / stokesCoefficient(radius);
  return Math.sqrt(2 * diffusion * dt);
}
