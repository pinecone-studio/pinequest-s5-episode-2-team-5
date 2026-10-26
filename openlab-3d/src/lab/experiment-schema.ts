import type { LabEvent } from './events';

export interface CompletionRule {
  events?: string[];
  prefixes?: string[];
  value?: { gt?: number; gte?: number; lt?: number; lte?: number };
}
export interface ExperimentStep {
  id: string;
  text: string;
  hint: string;
  completion: CompletionRule;
}
export interface Experiment {
  id: string;
  title: string;
  goal: string;
  materials: string[];
  safety: string;
  steps: ExperimentStep[];
  explain: string;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object');
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 16000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('Invalid text');
  return value;
}
function id(value: unknown): string {
  const result = text(value, 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) throw new Error('Invalid stable id');
  return result;
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('Invalid JSON array');
  return value;
}
function rule(value: unknown): CompletionRule {
  const data = object(value);
  if (Object.keys(data).some((key) => !['events', 'prefixes', 'value'].includes(key))) throw new Error('Unknown completion rule');
  const events = data.events === undefined ? [] : list(data.events, 64).map((v) => text(v, 120));
  const prefixes = data.prefixes === undefined ? [] : list(data.prefixes, 64).map((v) => text(v, 120));
  if (!events.length && !prefixes.length) throw new Error('A completion rule needs an event');
  const result: CompletionRule = { ...(events.length ? { events } : {}), ...(prefixes.length ? { prefixes } : {}) };
  if (data.value !== undefined) {
    const bounds = object(data.value);
    const keys = Object.keys(bounds);
    if (!keys.length || keys.some((key) => !['gt', 'gte', 'lt', 'lte'].includes(key) || typeof bounds[key] !== 'number' || !Number.isFinite(bounds[key]))) throw new Error('Invalid measurement bounds');
    result.value = { ...bounds } as CompletionRule['value'];
  }
  return result;
}

/** Validate and copy untrusted database JSON. No source code or functions are executed. */
export function parseExperiment(value: unknown): Experiment {
  const data = object(value);
  if (JSON.stringify(data).length > 131072) throw new Error('Experiment is too large');
  const steps = list(data.steps, 100).map((item) => {
    const step = object(item);
    return { id: id(step.id), text: text(step.text), hint: text(step.hint), completion: rule(step.completion) };
  });
  if (!steps.length || new Set(steps.map((step) => step.id)).size !== steps.length) throw new Error('Step ids must be unique');
  return { id: id(data.id), title: text(data.title, 300), goal: text(data.goal), materials: list(data.materials, 64).map((v) => text(v)), safety: text(data.safety), steps, explain: text(data.explain) };
}

export function parseExperimentRows(value: unknown): Experiment[] {
  const experiments = list(value, 250).map((item) => {
    const row = object(item);
    if (row.schema_version !== 1) throw new Error('Unsupported experiment schema');
    const experiment = parseExperiment(row.content);
    if (row.id !== experiment.id) throw new Error('Experiment id differs from its database row');
    return experiment;
  });
  if (new Set(experiments.map((experiment) => experiment.id)).size !== experiments.length) throw new Error('Duplicate experiment ids');
  return experiments;
}

/** Event names and numeric bounds replace the old JavaScript done(e) callbacks. */
export function matchesCompletion(event: LabEvent, completion: CompletionRule): boolean {
  if (!completion.events?.includes(event.key) && !completion.prefixes?.some((prefix) => event.key.startsWith(prefix))) return false;
  if (!completion.value) return true;
  if (typeof event.value !== 'number' || !Number.isFinite(event.value)) return false;
  const { gt, gte, lt, lte } = completion.value;
  return (gt === undefined || event.value > gt) && (gte === undefined || event.value >= gte)
    && (lt === undefined || event.value < lt) && (lte === undefined || event.value <= lte);
}
