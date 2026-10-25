import { TEXTBOOK_EXPERIMENTS } from '../experiments/workbench/textbook';
/** JSON lesson catalog. Published rows override matching bundled guides; textbook-linked fallbacks remain available. */
import { create } from 'zustand';
import bundled from '../data/experiments.json';
import { NACL_LESSON } from '../experiments/nacl/lesson';
import { parseExperiment, parseExperimentRows, type Experiment } from './experiment-schema';
export { matchesCompletion } from './experiment-schema';
export type { CompletionRule, Experiment, ExperimentStep } from './experiment-schema';

export const BUNDLED_EXPERIMENTS = [...bundled.map(parseExperiment), ...TEXTBOOK_EXPERIMENTS.map(parseExperiment), NACL_LESSON];
let textbookLessons: unknown[] = [];
export function getTextbookLessons(): unknown[] { return textbookLessons; }
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
    useExperimentCatalog.setState({ experiments: [...experiments.filter((x) => x.id !== 'nacl'), ...BUNDLED_EXPERIMENTS.filter((x) => x.id !== 'nacl' && !experiments.some((r) => r.id === x.id)), NACL_LESSON], source: 'supabase' });
    return true;
  } catch {
    // Preserve a usable catalog if a row is malformed or a future schema is published.
    return false;
  }
}

/** ChemQuest fetches with its existing Supabase client and sends public lesson data only. */
export function connectExperimentCatalog(): () => void {
  const nativeBridge = (window as Window & { ReactNativeWebView?: { postMessage: (message: string) => void } }).ReactNativeWebView;
  const standalone = window.parent === window;
  if (standalone && !nativeBridge) return () => {};
  const origin = window.location.origin;
  const receive = (event: MessageEvent<unknown>) => {
    if (event.origin !== origin || event.source !== (standalone ? window : window.parent)) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || !('type' in data) || data.type !== 'chemquest:experiment-catalog' || !('version' in data) || data.version !== 1 || !('rows' in data)) return;
    applyRemoteExperiments(data.rows);
    textbookLessons = 'lessons' in data && Array.isArray(data.lessons) ? data.lessons : [];
  };
  window.addEventListener('message', receive);
  const ready = { type: 'openlab:catalog-ready', version: 1 };
  if (standalone) nativeBridge?.postMessage(JSON.stringify(ready));
  else window.parent.postMessage(ready, origin);
  return () => window.removeEventListener('message', receive);
}
