import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { currentSession } from '../experiments/workbench/session';
import { getExperiments, experimentById, matchesCompletion } from '../lab/experiments';
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
  /** Applies an event only to the explicitly selected experiment. */
  record: (e: LabEvent) => { experiment: string; step: string }[];
  resetSession: () => void;
  resetProgress: () => void;
}

export const useLabStore = create<LabState>()(
  persist(
    (set, get) => ({
      progress: {},
      active: null,
      seen: [],
      measurements: 0,
      setActive: (active) => set({ active }),
      record: (e) => {
        const progress = get().progress;
        const completed: { experiment: string; step: string }[] = [];
        let next: Record<string, string[]> | null = null;
        for (const x of getExperiments().filter((x) => x.id === get().active && currentSession()?.ready === true)) {
          const done = progress[x.id] ?? [];
          for (const step of x.steps) {
            if (done.includes(step.id) || !matchesCompletion(e, step.completion)) continue;
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
      resetProgress: () => set({ progress: {}, active: null }),
    }),
    {
      name: 'openlab3d-experiments',
      version: 3,
      migrate: (persisted) => {
        // Version 1 auto-assigned "safety" and subsequent lessons. Those ids do not
        // prove a student chose an experiment. Version 2 kept the last choice across reloads,
        // but the bench preparation is not saved, so a stale choice showed an empty preparation
        // panel on entry. Preserve progress; the student picks an experiment from the menu.
        const previous = (persisted ?? {}) as Partial<LabState>;
        return { progress: previous.progress ?? {}, active: null };
      },
      partialize: (s) => ({ progress: s.progress }),
    },
  ),
);

export function experimentDone(progress: Record<string, string[]>, id: string): boolean {
  const x = experimentById(id);
  return !!x && x.steps.every((s) => progress[id]?.includes(s.id));
}
