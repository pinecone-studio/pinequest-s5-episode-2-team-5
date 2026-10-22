import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EXPERIMENTS } from '../lab/experiments';
import type { LabEvent } from '../lab/events';

/** Experiment guide progress (kept across reloads) and what was observed this session. */
interface LabState {
  /** Completed step ids per experiment. */
  progress: Record<string, string[]>;
  active: string | null;
  /** Distinct reactions / observations seen this session. */
  seen: string[];
  measurements: number;
  setActive: (id: string | null) => void;
  /** Applies an event to every experiment; returns the steps it completed. */
  record: (e: LabEvent) => { experiment: string; step: string }[];
  resetSession: () => void;
  resetProgress: () => void;
}

export const useLabStore = create<LabState>()(
  persist(
    (set, get) => ({
      progress: {},
      active: 'safety',
      seen: [],
      measurements: 0,
      setActive: (active) => set({ active }),
      record: (e) => {
        const progress = get().progress;
        const completed: { experiment: string; step: string }[] = [];
        let next: Record<string, string[]> | null = null;
        for (const x of EXPERIMENTS) {
          const done = progress[x.id] ?? [];
          for (const step of x.steps) {
            if (done.includes(step.id) || !step.done(e)) continue;
            next = next ?? { ...progress };
            next[x.id] = [...(next[x.id] ?? done), step.id];
            completed.push({ experiment: x.id, step: step.id });
          }
        }
        const seen = get().seen;
        const notable = !e.quiet && e.title && !seen.includes(e.key);
        const patch: Partial<LabState> = {};
        if (next) patch.progress = next;
        if (notable) patch.seen = [...seen, e.key];
        if (e.key.startsWith('measure:')) patch.measurements = get().measurements + 1;
        if (Object.keys(patch).length > 0) set(patch);
        return completed;
      },
      resetSession: () => set({ seen: [], measurements: 0 }),
      resetProgress: () => set({ progress: {}, active: 'safety' }),
    }),
    {
      name: 'openlab3d-experiments',
      version: 1,
      partialize: (s) => ({ progress: s.progress, active: s.active }),
    },
  ),
);

export function experimentDone(progress: Record<string, string[]>, id: string): boolean {
  const x = EXPERIMENTS.find((e) => e.id === id);
  return !!x && x.steps.every((s) => progress[id]?.includes(s.id));
}
