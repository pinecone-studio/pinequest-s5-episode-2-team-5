import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_BINDINGS, type ActionName, type Bindings, type LookMode } from '../controls/keyMap';

export type Quality = 'low' | 'medium' | 'high';

export interface QualityPreset {
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  postprocessing: boolean;
  ao: boolean;
  transmission: boolean;
  contactShadows: boolean;
}

export const QUALITY_PRESETS: Record<Quality, QualityPreset> = {
  low: { dpr: [0.6, 1], shadows: false, shadowMapSize: 512, postprocessing: false, ao: false, transmission: false, contactShadows: false },
  medium: { dpr: [0.75, 1.5], shadows: true, shadowMapSize: 1024, postprocessing: true, ao: true, transmission: true, contactShadows: true },
  high: { dpr: [1, 2], shadows: true, shadowMapSize: 2048, postprocessing: true, ao: true, transmission: true, contactShadows: true },
};

export interface SettingsState {
  sensitivity: number;
  fov: number;
  headBob: boolean;
  quality: Quality;
  volume: number;
  lookMode: LookMode;
  invertY: boolean;
  reducedMotion: boolean;
  jumpEnabled: boolean;
  guided: boolean;
  showFps: boolean;
  bindings: Bindings;
  set: (patch: Partial<Omit<SettingsState, 'set' | 'rebind' | 'resetBindings'>>) => void;
  rebind: (action: ActionName, code: string) => void;
  resetBindings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sensitivity: 1,
      fov: 75,
      headBob: true,
      quality: 'medium',
      volume: 0.7,
      lookMode: 'mouse',
      invertY: false,
      reducedMotion: false,
      jumpEnabled: true,
      guided: true,
      showFps: false,
      bindings: DEFAULT_BINDINGS,
      set: (patch) => set(patch),
      rebind: (action, code) =>
        set((s) => {
          const current = s.bindings[action];
          // Replace the primary key, keep secondary keys (e.g. arrows) intact.
          const next = [code, ...current.slice(1).filter((k) => k !== code)];
          return { bindings: { ...s.bindings, [action]: next } };
        }),
      resetBindings: () => set({ bindings: DEFAULT_BINDINGS }),
    }),
    {
      name: 'openlab3d-settings',
      version: 1,
      partialize: ({ set: _set, rebind: _rebind, resetBindings: _reset, ...rest }) => rest,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SettingsState>;
        return { ...current, ...p, bindings: { ...DEFAULT_BINDINGS, ...(p.bindings ?? {}) } };
      },
    },
  ),
);

/** Effective motion flags (reduced motion disables bob and sway). */
export function motionAllowed(s: Pick<SettingsState, 'reducedMotion'>): boolean {
  return !s.reducedMotion;
}
