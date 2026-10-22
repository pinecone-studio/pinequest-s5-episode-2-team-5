/** JSON lesson catalog. Supabase-published rows replace the bundled demo catalog. */
import { create } from 'zustand';
import bundled from '../data/experiments.json';
import { parseExperiment, parseExperimentRows, type Experiment } from './experiment-schema';
export { matchesCompletion } from './experiment-schema';
export type { CompletionRule, Experiment, ExperimentStep } from './experiment-schema';

export const BUNDLED_EXPERIMENTS = bundled.map(parseExperiment);
export const useExperimentCatalog = create<{
  experiments: Experiment[];
  source: 'bundled' | 'supabase';
}>()(() => ({ experiments: BUNDLED_EXPERIMENTS, source: 'bundled' }));

export function getExperiments(): Experiment[] {
  return useExperimentCatalog.getState().experiments;
}
export function experimentById(id: string): Experiment | undefined {
  return getExperiments().find((experiment) => experiment.id === id);
}
export function applyRemoteExperiments(rows: unknown): boolean {
  try {
    const experiments = parseExperimentRows(rows);
    useExperimentCatalog.setState({ experiments, source: 'supabase' });
    return true;
  } catch {
    // Preserve a usable catalog if a row is malformed or a future schema is published.
    return false;
  }
}

/** ChemQuest fetches with its existing Supabase client and sends public lesson data only. */
export function connectExperimentCatalog(): () => void {
  if (window.parent === window) return () => {};
  const origin = window.location.origin;
  const receive = (event: MessageEvent<unknown>) => {
    if (event.origin !== origin || event.source !== window.parent) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || !('type' in data) || data.type !== 'chemquest:experiment-catalog' || !('version' in data) || data.version !== 1 || !('rows' in data)) return;
    applyRemoteExperiments(data.rows);
  };
  window.addEventListener('message', receive);
  window.parent.postMessage({ type: 'openlab:catalog-ready', version: 1 }, origin);
  return () => window.removeEventListener('message', receive);
}
