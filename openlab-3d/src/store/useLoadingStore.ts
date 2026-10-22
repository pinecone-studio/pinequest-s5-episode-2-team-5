import { create } from 'zustand';

/** Everything that must be ready before the start screen: engine, rooms, fonts, shaders. */
export const LOAD_STEPS = ['engine', 'architecture', 'mainHall', 'corridor', 'physics', 'chemistry', 'biology', 'storage', 'fonts', 'shaders'] as const;
export type LoadStep = (typeof LOAD_STEPS)[number];

const LABELS: Record<LoadStep, string> = {
  engine: 'Starting physics engine',
  architecture: 'Raising walls',
  mainHall: 'Setting up the Main Hall',
  corridor: 'Lighting the corridor',
  physics: 'Calibrating the Millikan apparatus',
  chemistry: 'Filling beakers',
  biology: 'Focusing microscopes',
  storage: 'Stocking the shelves',
  fonts: 'Printing labels',
  shaders: 'Polishing glassware',
};

interface LoadingState {
  done: LoadStep[];
  markReady: (step: LoadStep) => void;
}

export const useLoadingStore = create<LoadingState>()((set, get) => ({
  done: [],
  markReady: (step) => {
    if (!get().done.includes(step)) set((s) => ({ done: [...s.done, step] }));
  },
}));

export function loadingProgress(done: LoadStep[]): { progress: number; label: string; complete: boolean } {
  const next = LOAD_STEPS.find((s) => !done.includes(s));
  return { progress: done.length / LOAD_STEPS.length, label: next ? LABELS[next] : 'Ready', complete: !next };
}
