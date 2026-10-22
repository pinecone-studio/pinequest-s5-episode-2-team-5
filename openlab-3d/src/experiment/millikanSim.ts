/**
 * Live droplet simulation shared by the 3D chamber particles and the eyepiece view.
 * Positions are in millimetres. y = 0 is the bottom of the eyepiece field and
 * y = FIELD_H its top; the plates sit at y = PLATE_BOTTOM and y = PLATE_TOP.
 * Mutable on purpose: render loops read it every frame without React re-renders.
 */
import { MILLIKAN } from '../utils/constants';
import { useExperimentStore } from '../store/useExperimentStore';
import { brownianSigma, dropVelocity } from './millikanPhysics';

export const FIELD_H = MILLIKAN.fieldHeightMm;
export const FIELD_W = MILLIKAN.fieldWidthMm;
const GAP_MM = MILLIKAN.plateSeparation * 1000;
export const PLATE_BOTTOM = FIELD_H / 2 - GAP_MM / 2;
export const PLATE_TOP = FIELD_H / 2 + GAP_MM / 2;
const MAX_DROPS = 14;
const LIFETIME_S = 360;

export interface Drop {
  id: number;
  label: string;
  /** Radius (m). */
  radius: number;
  /** Charge magnitude (C) = n·e. */
  charge: number;
  n: number;
  x: number;
  y: number;
  /** Current vertical velocity (mm/s, up positive), for display. */
  vy: number;
  age: number;
  twinkle: number;
}

export const sim = {
  drops: [] as Drop[],
  nextId: 1,
  time: 0,
};

function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Charge multiplicities skew low, as in a real spray. */
function randomMultiplicity(): number {
  const r = Math.random();
  if (r < 0.28) return 1;
  if (r < 0.52) return 2;
  if (r < 0.7) return 3;
  if (r < 0.83) return 4;
  if (r < 0.92) return 5;
  return 6 + Math.floor(Math.random() * 3);
}

/** Spray a puff of droplets into the chamber (called when the atomizer is squeezed). */
export function sprayDrops(count = 6 + Math.floor(Math.random() * 3)): void {
  for (let i = 0; i < count; i++) {
    const n = randomMultiplicity();
    const radius = (0.5 + Math.random() * 0.5) * 1e-6;
    const id = sim.nextId++;
    sim.drops.push({
      id,
      label: `D${id}`,
      radius,
      charge: n * MILLIKAN.e,
      n,
      x: (Math.random() - 0.5) * FIELD_W * 0.8,
      y: FIELD_H * (0.75 + Math.random() * 1.6),
      vy: 0,
      age: 0,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
  while (sim.drops.length > MAX_DROPS) sim.drops.shift();
  useExperimentStore.getState().syncDropCount(sim.drops.length);
}

export function clearDrops(): void {
  sim.drops = [];
  useExperimentStore.getState().syncDropCount(0);
}

export function getDrop(id: number | null): Drop | undefined {
  if (id === null) return undefined;
  return sim.drops.find((d) => d.id === id);
}

/** Advance the simulation by dt seconds. */
export function stepSim(dt: number): void {
  const step = Math.min(dt, 0.05);
  sim.time += step;
  if (sim.drops.length === 0) return;
  const { power, voltage, polarity, selectedDrop } = useExperimentStore.getState();
  let removed = false;
  for (const d of sim.drops) {
    const vMs = dropVelocity(d.radius, d.charge, voltage, polarity, power);
    d.vy = vMs * 1000;
    // Brownian jitter is physically tiny; scale it a little so it reads on screen.
    const sigma = brownianSigma(d.radius, step) * 1000 * 1.6;
    d.y += d.vy * step + gaussian() * sigma;
    d.x += gaussian() * sigma * 0.8;
    d.x = Math.max(-FIELD_W * 0.62, Math.min(FIELD_W * 0.62, d.x));
    d.age += step;
  }
  const before = sim.drops.length;
  sim.drops = sim.drops.filter((d) => d.y > PLATE_BOTTOM && d.y < PLATE_TOP && d.age < LIFETIME_S);
  removed = sim.drops.length !== before;
  if (removed) {
    const store = useExperimentStore.getState();
    store.syncDropCount(sim.drops.length);
    if (selectedDrop !== null && !sim.drops.some((d) => d.id === selectedDrop)) store.selectDrop(null);
  }
}

let rafId = 0;
let last = 0;
/** Runs independently of the WebGL render loop so the experiment keeps going while the main canvas is paused. */
export function startSimLoop(): void {
  if (rafId) return;
  last = performance.now();
  const tick = (now: number) => {
    const dt = (now - last) / 1000;
    last = now;
    stepSim(dt);
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}
