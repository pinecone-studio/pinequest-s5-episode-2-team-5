import { create } from 'zustand';
import { MILLIKAN } from '../utils/constants';
import { chargeFromMeasurements, chargeUnits, type Polarity } from '../experiment/millikanPhysics';

export type MeasurementKind = 'fall' | 'field' | 'balance';

export interface Measurement {
  id: number;
  dropId: number;
  dropLabel: string;
  kind: MeasurementKind;
  /** Stopwatch time (s); 0 for balance records. */
  timeS: number;
  distanceMm: number;
  voltage: number;
  polarity: Polarity;
  /** Signed velocity, mm/s, up positive. */
  velocityMmS: number;
  at: number;
}

export interface MeasurementResult extends Measurement {
  /** Charge magnitude in coulombs, when it can be computed. */
  charge: number | null;
  /** q / e. */
  units: number | null;
}

export type StepId = 'reachedLab' | 'powerOn' | 'sprayed' | 'viewed' | 'measuredFall' | 'measuredField' | 'openedLaptop';

export const STEP_ORDER: { id: StepId; label: string }[] = [
  { id: 'reachedLab', label: 'Walk to the Millikan station in the Physics Lab' },
  { id: 'powerOn', label: 'Switch the apparatus ON' },
  { id: 'sprayed', label: 'Squeeze the atomizer to spray oil drops' },
  { id: 'viewed', label: 'Look through the microscope' },
  { id: 'measuredFall', label: 'Time a drop falling with the field off (polarity 0)' },
  { id: 'measuredField', label: 'Time the same drop rising, or balance it, with the field on' },
  { id: 'openedLaptop', label: 'Review the computed charges on the laptop' },
];

interface Stopwatch {
  running: boolean;
  startedAt: number;
  elapsed: number;
  /** Drop and voltage state when the timing started. */
  dropId: number | null;
}

interface ExperimentState {
  power: boolean;
  voltage: number;
  polarity: Polarity;
  dropCount: number;
  selectedDrop: number | null;
  distanceMm: number;
  stopwatch: Stopwatch;
  measurements: Measurement[];
  steps: Record<StepId, boolean>;
  squeezeId: number;
  /** Generic toggles for other stations (burners, fume hood sash, pendulum…). */
  toggles: Record<string, boolean>;
  values: Record<string, number>;
  /** Specimen microscope focus (0..1) per microscope id. */
  focus: Record<string, number>;
  togglePower: () => void;
  setVoltage: (v: number) => void;
  nudgeVoltage: (delta: number) => void;
  setPolarity: (p: Polarity) => void;
  cyclePolarity: () => void;
  squeeze: () => void;
  syncDropCount: (n: number) => void;
  selectDrop: (id: number | null) => void;
  setDistance: (mm: number) => void;
  toggleStopwatch: (dropId: number | null) => void;
  resetStopwatch: () => void;
  record: (kind: MeasurementKind, dropId: number, dropLabel: string, timeS: number, direction: 1 | -1) => Measurement | null;
  deleteMeasurement: (id: number) => void;
  clearMeasurements: () => void;
  markStep: (id: StepId) => void;
  toggle: (key: string) => boolean;
  setValue: (key: string, value: number) => void;
  setFocusValue: (id: string, value: number) => void;
  reset: () => void;
}

const initialSteps: Record<StepId, boolean> = {
  reachedLab: false,
  powerOn: false,
  sprayed: false,
  viewed: false,
  measuredFall: false,
  measuredField: false,
  openedLaptop: false,
};

let measurementId = 1;

export const useExperimentStore = create<ExperimentState>()((set, get) => ({
  power: false,
  voltage: 0,
  polarity: 0,
  dropCount: 0,
  selectedDrop: null,
  distanceMm: 0.2,
  stopwatch: { running: false, startedAt: 0, elapsed: 0, dropId: null },
  measurements: [],
  steps: { ...initialSteps },
  squeezeId: 0,
  toggles: {},
  values: {},
  focus: {},
  togglePower: () => {
    const power = !get().power;
    set({ power });
    if (power) get().markStep('powerOn');
  },
  setVoltage: (v) => set({ voltage: Math.max(0, Math.min(MILLIKAN.maxVoltage, Math.round(v))) }),
  nudgeVoltage: (delta) => get().setVoltage(get().voltage + delta),
  setPolarity: (polarity) => set({ polarity }),
  cyclePolarity: () => {
    // Physical 3-position toggle: + → 0 → − → 0 → + …
    const order: Polarity[] = [1, 0, -1, 0];
    const idx = get().values.polarityIdx ?? 1;
    const next = (idx + 1) % order.length;
    set((s) => ({ polarity: order[next], values: { ...s.values, polarityIdx: next } }));
  },
  squeeze: () => {
    set((s) => ({ squeezeId: s.squeezeId + 1 }));
    get().markStep('sprayed');
  },
  syncDropCount: (dropCount) => {
    if (dropCount !== get().dropCount) set({ dropCount });
  },
  selectDrop: (selectedDrop) => set({ selectedDrop }),
  setDistance: (distanceMm) => set({ distanceMm }),
  toggleStopwatch: (dropId) => {
    const sw = get().stopwatch;
    if (sw.running) {
      set({ stopwatch: { ...sw, running: false, elapsed: (performance.now() - sw.startedAt) / 1000 } });
    } else {
      set({ stopwatch: { running: true, startedAt: performance.now(), elapsed: 0, dropId } });
    }
  },
  resetStopwatch: () => set({ stopwatch: { running: false, startedAt: 0, elapsed: 0, dropId: null } }),
  record: (kind, dropId, dropLabel, timeS, direction) => {
    const { voltage, polarity, power, distanceMm } = get();
    const fieldOn = power && polarity !== 0 && voltage > 0;
    if (kind === 'fall' && fieldOn) return null;
    if ((kind === 'field' || kind === 'balance') && !fieldOn) return null;
    if (kind !== 'balance' && timeS <= 0.05) return null;
    let velocityMmS = 0;
    if (kind === 'fall') velocityMmS = -distanceMm / timeS;
    // The stopwatch gives speed; direction comes from the drop's observed motion.
    if (kind === 'field') velocityMmS = direction * (distanceMm / timeS);
    const m: Measurement = {
      id: measurementId++,
      dropId,
      dropLabel,
      kind,
      timeS: kind === 'balance' ? 0 : timeS,
      distanceMm: kind === 'balance' ? 0 : distanceMm,
      voltage: fieldOn ? voltage : 0,
      polarity: fieldOn ? polarity : 0,
      velocityMmS,
      at: Date.now(),
    };
    set((s) => ({ measurements: [...s.measurements, m] }));
    if (kind === 'fall') get().markStep('measuredFall');
    else if (get().measurements.some((x) => x.dropId === dropId && x.kind === 'fall')) get().markStep('measuredField');
    return m;
  },
  deleteMeasurement: (id) => set((s) => ({ measurements: s.measurements.filter((m) => m.id !== id) })),
  clearMeasurements: () => set({ measurements: [] }),
  markStep: (id) => {
    if (!get().steps[id]) set((s) => ({ steps: { ...s.steps, [id]: true } }));
  },
  toggle: (key) => {
    const next = !get().toggles[key];
    set((s) => ({ toggles: { ...s.toggles, [key]: next } }));
    return next;
  },
  setValue: (key, value) => set((s) => ({ values: { ...s.values, [key]: value } })),
  setFocusValue: (id, value) => set((s) => ({ focus: { ...s.focus, [id]: Math.max(0, Math.min(1, value)) } })),
  reset: () =>
    set({
      power: false,
      voltage: 0,
      polarity: 0,
      selectedDrop: null,
      stopwatch: { running: false, startedAt: 0, elapsed: 0, dropId: null },
      measurements: [],
      steps: { ...initialSteps },
      toggles: {},
      values: {},
      focus: {},
    }),
}));

/** Attach computed charges: a drop needs one fall record before its field records can be solved. */
export function computeResults(measurements: Measurement[]): MeasurementResult[] {
  const fallByDrop = new Map<number, number[]>();
  for (const m of measurements) {
    if (m.kind === 'fall') {
      const list = fallByDrop.get(m.dropId) ?? [];
      list.push(-m.velocityMmS / 1000);
      fallByDrop.set(m.dropId, list);
    }
  }
  return measurements.map((m) => {
    if (m.kind === 'fall') return { ...m, charge: null, units: null };
    const falls = fallByDrop.get(m.dropId);
    if (!falls || falls.length === 0) return { ...m, charge: null, units: null };
    const vFall = falls.reduce((a, b) => a + b, 0) / falls.length;
    const q = chargeFromMeasurements(vFall, m.velocityMmS / 1000, m.voltage, m.polarity);
    return { ...m, charge: q, units: q === null ? null : chargeUnits(q) };
  });
}

/** Best estimate of e from all solved charges: mean of q / round(q / e). */
export function estimateElementaryCharge(results: MeasurementResult[]): { e: number; count: number } | null {
  const solved = results.filter((r) => r.charge !== null && r.units !== null && Math.round(r.units) >= 1);
  if (solved.length === 0) return null;
  const sum = solved.reduce((acc, r) => acc + (r.charge as number) / Math.round(r.units as number), 0);
  return { e: sum / solved.length, count: solved.length };
}
