import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_BINDINGS, type ActionName, type Bindings, type LookMode } from '../controls/keyMap';
import { isTouchDevice } from '../utils/device';

function isLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const device = navigator as Navigator & { deviceMemory?: number };
  return isTouchDevice() || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) || (device.deviceMemory !== undefined && device.deviceMemory <= 4);
}

export type Quality = 'low' | 'medium' | 'high';

export interface QualityPreset {
  dpr: [number, number];
  shadows: boolean;
  /** PCF soft shadows (more texture samples per pixel) instead of plain PCF. */
  softShadows: boolean;
  shadowMapSize: number;
  postprocessing: boolean;
  ao: boolean;
  /** Ambient occlusion at half resolution (about a quarter of the cost). */
  aoHalfRes: boolean;
  /** Refracting glass: three.js redraws every opaque object into a texture whenever it is on screen. */
  transmission: boolean;
  contactShadows: boolean;
  antialias: boolean;
}

export const QUALITY_PRESETS: Record<Quality, QualityPreset> = {
  low: { dpr: [0.6, 1.5], shadows: false, softShadows: false, shadowMapSize: 512, postprocessing: false, ao: false, aoHalfRes: true, transmission: false, contactShadows: false, antialias: false },
  medium: { dpr: [0.75, 1.5], shadows: true, softShadows: false, shadowMapSize: 1024, postprocessing: true, ao: true, aoHalfRes: true, transmission: false, contactShadows: true, antialias: false },
  high: { dpr: [1, 2], shadows: true, softShadows: true, shadowMapSize: 2048, postprocessing: true, ao: true, aoHalfRes: false, transmission: true, contactShadows: true, antialias: false },
};

/** Phones, tablets and machines with few cores or little memory start on Low; Auto raises it if they keep up. */
export function defaultQuality(): Quality {
  return isLowEndDevice() ? 'low' : 'medium';
}

export interface SettingsState {
  sensitivity: number;
  fov: number;
  headBob: boolean;
  quality: Quality;
  qualityManuallySet: boolean;
  /** Auto: the frame-rate governor picks the quality and resolution (Settings → Auto). */
  autoQuality: boolean;
  /** Last level the governor settled on, so the next visit starts there. */
  autoLevel: number | null;
  volume: number;
  lookMode: LookMode;
  invertY: boolean;
  reducedMotion: boolean;
  reactionAutoZoom: boolean;
  molecularLens: boolean;
  jumpEnabled: boolean;
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
      quality: defaultQuality(),
      qualityManuallySet: false,
      autoQuality: true,
      autoLevel: null,
      volume: 0.7,
      lookMode: 'mouse',
      invertY: false,
      reducedMotion: false,
      reactionAutoZoom: false,
      molecularLens: false,
      jumpEnabled: true,
      showFps: false,
      bindings: DEFAULT_BINDINGS,
      set: (patch) => set({ ...patch, ...(patch.quality ? { qualityManuallySet: true } : {}) }),
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
        return {
          ...current,
          ...p,
          quality: p.qualityManuallySet ? (p.quality ?? current.quality) : current.quality,
          qualityManuallySet: p.qualityManuallySet ?? false,
          // A tier picked before Auto existed stays picked.
          autoQuality: p.autoQuality ?? !(p.qualityManuallySet ?? false),
          bindings: { ...DEFAULT_BINDINGS, ...(p.bindings ?? {}) },
        };
      },
    },
  ),
);

/** Effective motion flags (reduced motion disables bob and sway). */
export function motionAllowed(s: Pick<SettingsState, 'reducedMotion'>): boolean {
  return !s.reducedMotion;
}
