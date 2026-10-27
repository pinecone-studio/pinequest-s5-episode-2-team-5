import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordLessonAttempt } from '@/services/learning';
import type { Stars } from '@/types';

/** One finished lesson: the answer picked at each quiz step, by its position in the lesson. */
export interface LessonAttempt {
  id: string;
  lessonId: string;
  stars: Stars;
  mistakes: number;
  answers: { step: number; picked: number; correct: boolean }[];
  finishedAt: string;
}

/** Finished lessons wait here until Supabase has them; offline, the newest 100 are kept. */
const keyFor = (userId: string) => `chemquest.lesson-attempts.outbox.v1.${userId}`;
let queue: Promise<unknown> = Promise.resolve();
function queued<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.catch(() => undefined).then(task);
  queue = run;
  return run;
}

export function restoreAttempts(raw: unknown): LessonAttempt[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((a): a is LessonAttempt => !!a && typeof a.id === 'string' && typeof a.lessonId === 'string'
    && [1, 2, 3].includes(a.stars) && Number.isInteger(a.mistakes) && Array.isArray(a.answers) && typeof a.finishedAt === 'string');
}

async function pending(userId: string): Promise<LessonAttempt[]> {
  const raw = await AsyncStorage.getItem(keyFor(userId));
  return restoreAttempts(raw ? JSON.parse(raw) : []);
}

/** Sends every waiting attempt in order and forgets the ones Supabase accepted. Resending is harmless. */
export async function flushLessonAttempts(userId: string): Promise<void> {
  const waiting = await queued(() => pending(userId));
  const sent: string[] = [];
  for (const attempt of waiting) {
    try { await recordLessonAttempt(userId, attempt); } catch { break; }
    sent.push(attempt.id);
  }
  if (sent.length) await queued(async () => AsyncStorage.setItem(keyFor(userId), JSON.stringify((await pending(userId)).filter((a) => !sent.includes(a.id)))));
}

export async function saveLessonAttempt(userId: string, attempt: LessonAttempt): Promise<void> {
  await queued(async () => AsyncStorage.setItem(keyFor(userId), JSON.stringify([...(await pending(userId)), attempt].slice(-100))));
  await flushLessonAttempts(userId);
}
