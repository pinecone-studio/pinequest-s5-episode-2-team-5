import { create } from 'zustand';
import type { PartKey, SubstanceId } from './data';

export type NoteTone = 'info' | 'ok' | 'warn';

export interface BenchResult {
  acid: number;
  carbonate: number;
  needed: number;
  co2: number;
  theoretical: number;
  recovered: number;
  spit: boolean;
  overflow: boolean;
}

/**
 * UI state of the NaCl bench, written by the engine and read by the DOM overlay.
 * Everything here is transient (no persistence) and local to this browser tab.
 */
export interface NaClUIState {
  /** Index into STEPS (0 = а … 7 = з). */
  step: number;
  /** One short line: what to do next. */
  hint: string;
  /** Short feedback under the hint (replaces pop-up toasts); cleared after a few seconds. */
  note: { text: string; tone: NoteTone; id: number } | null;
  buttons: string[];
  hold: string | null;
  canSkip: boolean;
  data: { carbonate: number; co2: number; temp: number; clock: string };
  rx: 'acid' | 'evap' | null;
  info: { key: PartKey; substance: SubstanceId | null; volume: number | null } | null;
  scope: boolean;
  focus: number;
  labels: boolean;
  result: BenchResult | null;
}

export const initialUI: NaClUIState = {
  step: 0,
  hint: '',
  note: null,
  buttons: [],
  hold: null,
  canSkip: false,
  data: { carbonate: 0, co2: 0, temp: 20, clock: '' },
  rx: null,
  info: null,
  scope: false,
  focus: 10,
  labels: true,
  result: null,
};

export const useNaClUI = create<NaClUIState>()(() => ({ ...initialUI }));
