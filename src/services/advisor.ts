import { supabase } from '@/lib/supabase';
import type { PackId } from '@/services/learning';

export type AdviceTab = 'notes' | 'cards' | 'quiz' | 'questions';

/** One suggestion from Pip: which topic, which tab to open there, and why. */
export interface StudyAdvice {
  topicId: string;
  tab: AdviceTab;
  title: string;
  why: string;
  action: string;
}

const TABS: AdviceTab[] = ['notes', 'cards', 'quiz', 'questions'];

function restoreAdvice(raw: unknown): StudyAdvice[] {
  if (!Array.isArray(raw)) return [];
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  return raw.slice(0, 5).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const a = item as Record<string, unknown>;
    const advice = { topicId: text(a.topicId, 40), tab: a.tab as AdviceTab, title: text(a.title, 80), why: text(a.why, 200), action: text(a.action, 200) };
    return advice.topicId && TABS.includes(advice.tab) && advice.title && advice.action ? [advice] : [];
  });
}

export interface StudyAdviceResult {
  advice: StudyAdvice[];
  /** Set when the advice is the plain template: why the AI wording is missing (e.g. 'daily_limit', 'gemini_key'). */
  aiError?: string;
}

/**
 * Pip's suggestions for this grade, worked out on the server from the student's synced revision
 * progress (supabase/functions/study-advisor). `refresh` asks for new wording even if nothing changed.
 */
export async function fetchStudyAdvice(packId: PackId, refresh = false): Promise<StudyAdviceResult> {
  const { data, error } = await supabase.functions.invoke('study-advisor', { body: { pack: packId, refresh } });
  if (error) throw new Error('Study advice unavailable');
  const result = data as { advice?: unknown; aiError?: unknown } | null;
  return { advice: restoreAdvice(result?.advice), aiError: typeof result?.aiError === 'string' ? result.aiError.slice(0, 40) : undefined };
}
