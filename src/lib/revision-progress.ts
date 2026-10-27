import type { Topic } from '../data/revision-hub/types';

export function periodicPosition(element: { z: number; period: number; group: number | null; fRow: 'ln' | 'an' | null }) {
  if (element.fRow) return { row: element.fRow === 'ln' ? 9 : 10, col: element.z - (element.fRow === 'ln' ? 57 : 89) + 4 };
  return { row: element.period, col: element.group ?? 3 };
}

export interface RevisionProgress {
  version: 1;
  notes: string[];
  cards: Record<string, 'known' | 'again'>;
  quizBest: Record<string, number>;
  wrong: string[];
  questionBest: Record<string, number>;
  practicals: string[];
  ratings: Record<string, 'red' | 'amber' | 'green'>;
}
export const emptyRevision = (): RevisionProgress => ({
  version: 1, notes: [], cards: {}, quizBest: {}, wrong: [], questionBest: {}, practicals: [], ratings: {},
});

export function restoreRevision(raw: unknown): RevisionProgress {
  if (!raw || typeof raw !== 'object' || (raw as RevisionProgress).version !== 1) return emptyRevision();
  const p = raw as RevisionProgress;
  const strings = (value: unknown): string[] => Array.isArray(value) ? [...new Set(value.filter((x) => typeof x === 'string'))] : [];
  const entries = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : [];
  const scores = (value: unknown, max: number) => Object.fromEntries(entries(value).filter(([, v]) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max));
  return {
    version: 1, notes: strings(p.notes), practicals: strings(p.practicals), wrong: strings(p.wrong),
    cards: Object.fromEntries(entries(p.cards).filter(([, v]) => v === 'known' || v === 'again')),
    quizBest: scores(p.quizBest, 100), questionBest: scores(p.questionBest, 1000),
    ratings: Object.fromEntries(entries(p.ratings).filter(([, v]) => ['red', 'amber', 'green'].includes(v as string))),
  };
}

export function topicStats(topic: Topic, progress: RevisionProgress) {
  const notes = topic.notes.filter((n) => progress.notes.includes(n.id)).length;
  const cards = topic.flashcards.filter((c) => progress.cards[c.id] === 'known').length;
  const marks = topic.questions.reduce((sum, q) => sum + Math.min(q.totalMarks, progress.questionBest[q.id] ?? 0), 0);
  const totalMarks = topic.questions.reduce((sum, q) => sum + q.totalMarks, 0);
  const practicals = topic.practicals.filter((p) => progress.practicals.includes(p.id)).length;
  const quiz = progress.quizBest[topic.id] ?? 0;
  const ratio = (a: number, b: number) => b ? a / b : 1;
  const completion = (ratio(notes, topic.notes.length) + ratio(cards, topic.flashcards.length) + quiz / 100 + ratio(marks, totalMarks) + ratio(practicals, topic.practicals.length)) / 5;
  return { notes, cards, marks, totalMarks, practicals, quiz, completion };
}

export function nextRevisionStep(topic: Topic, progress: RevisionProgress) {
  const s = topicStats(topic, progress);
  if (s.notes < topic.notes.length) return 'notes';
  if (s.cards < topic.flashcards.length * 0.8) return 'cards';
  if (s.quiz < 80) return 'quiz';
  if (s.marks < s.totalMarks * 0.8) return 'questions';
  if (topic.objectives.some((o) => progress.ratings[o.id] === 'red')) return 'notes';
  return null;
}

export function shuffled<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
