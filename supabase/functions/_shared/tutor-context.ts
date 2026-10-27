/**
 * The lab sends everything it knows as one JSON string: every lesson, every experiment, then what
 * the student is doing now. Cut at a fixed length, the current experiment came last and was the
 * first thing lost. This keeps the student's situation whole and fills a smaller budget with the
 * lessons and experiments that share the most words with the question.
 */
export const CONTEXT_BUDGET = 16000;

/** Too common to tell lessons apart. */
const STOP = new Set(['энэ', 'тэр', 'яаж', 'ямар', 'юуг', 'юу', 'гэж', 'бол', 'вэ', 'бэ', 'уу', 'үү', 'гэх', 'хэрхэн', 'яагаад', 'the', 'and', 'how', 'what', 'why']);

/** Word starts (Mongolian words take many endings), formulas included. */
function keys(question: string): string[] {
  const words = question.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [];
  return [...new Set(words.filter((w) => !STOP.has(w) && (w.length >= 3 || /\d/.test(w))).map((w) => w.slice(0, 5)))];
}

function score(item: unknown, wanted: string[]): number {
  const text = JSON.stringify(item).toLowerCase();
  return wanted.reduce((n, key) => n + (text.includes(key) ? 1 : 0), 0);
}

const idOf = (item: unknown) => (item && typeof item === 'object' ? (item as { id?: unknown }).id : undefined);

export function compactContext(raw: string, question: string, budget = CONTEXT_BUDGET): string {
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return raw.slice(0, budget);
    data = parsed as Record<string, unknown>;
  } catch {
    return raw.slice(0, budget);
  }
  const current = data.currentExperiment ?? null;
  const currentId = idOf(current);
  const progress = data.completedSteps && typeof data.completedSteps === 'object' ? (data.completedSteps as Record<string, unknown>) : {};
  const core = { app: data.app, controls: data.controls, currentExperiment: current, completedSteps: typeof currentId === 'string' ? progress[currentId] ?? [] : [] };
  const base = JSON.stringify({ ...core, related: [] });
  if (base.length >= budget) return base.slice(0, budget);

  const wanted = keys(question);
  const pool = [...(Array.isArray(data.experiments) ? data.experiments : []), ...(Array.isArray(data.lessons) ? data.lessons : [])]
    .filter((item) => currentId === undefined || idOf(item) !== currentId)
    .map((item) => ({ item, score: score(item, wanted), size: JSON.stringify(item).length }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.size - b.size);
  const related: unknown[] = [];
  let size = base.length;
  for (const entry of pool) {
    // Larger matches that no longer fit are skipped; smaller ones further down may still fit.
    if (size + entry.size + 1 > budget) continue;
    related.push(entry.item);
    size += entry.size + 1;
  }
  return JSON.stringify({ ...core, related });
}
