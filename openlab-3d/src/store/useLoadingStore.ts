import { useEffect } from 'react';
import { create } from 'zustand';

/** Everything that must be ready before the start screen: engine, lab, fonts, shaders. */
export const LOAD_STEPS = ['engine', 'architecture', 'chemistry', 'fonts', 'shaders'] as const;
export type LoadStep = (typeof LOAD_STEPS)[number];

const LABELS: Record<LoadStep, string> = {
  engine: 'Starting physics engine',
  architecture: 'Raising walls',
  chemistry: 'Filling beakers',
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

/** Report a part of the lab (or another step) as ready for the loading screen. */
export function useReady(step: LoadStep): void {
  useEffect(() => {
    useLoadingStore.getState().markReady(step);
  }, [step]);
}

export function loadingProgress(done: LoadStep[]): { progress: number; label: string; complete: boolean } {
  const next = LOAD_STEPS.find((s) => !done.includes(s));
  return { progress: done.length / LOAD_STEPS.length, label: next ? LABELS[next] : 'Ready', complete: !next };
}
