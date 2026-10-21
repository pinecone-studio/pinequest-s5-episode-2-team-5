import { XP_PER_LEVEL } from '@/constants/theme';
import { CLASS_ORDER, findLesson, getClass } from '@/data/classes';
import type { ChemClass, ClassId, Lesson, Stars, User } from '@/types';

export function levelForXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function levelProgress(xp: number) {
  const into = xp % XP_PER_LEVEL;
  return { level: levelForXp(xp), into, needed: XP_PER_LEVEL, ratio: into / XP_PER_LEVEL };
}

export function classIndex(id: ClassId): number {
  return CLASS_ORDER.indexOf(id);
}

/** Your current class and every class below it are open. */
export function isClassUnlocked(user: User, classId: ClassId): boolean {
  return classIndex(classId) <= classIndex(user.classId);
}

export type LessonStatus = 'completed' | 'current' | 'available' | 'locked';

/**
 * In your current class lessons unlock one by one.
 * Classes below it (ones you skipped or finished) are fully open for review.
 */
export function lessonStatuses(user: User, chemClass: ChemClass): LessonStatus[] {
  if (!isClassUnlocked(user, chemClass.id)) return chemClass.lessons.map(() => 'locked');
  const isCurrentClass = chemClass.id === user.classId;
  let currentAssigned = false;
  return chemClass.lessons.map((lesson) => {
    if (user.completed[lesson.id]) return 'completed';
    if (!isCurrentClass) return 'available';
    if (!currentAssigned) {
      currentAssigned = true;
      return 'current';
    }
    return 'locked';
  });
}

export function classProgress(user: User, chemClass: ChemClass) {
  const done = chemClass.lessons.filter((l) => user.completed[l.id]).length;
  return { done, total: chemClass.lessons.length };
}

export function previousClass(classId: ClassId): ChemClass | null {
  const prev = CLASS_ORDER[classIndex(classId) - 1];
  return prev ? getClass(prev) : null;
}

const STAR_MULTIPLIER: Record<Stars, number> = { 1: 0.6, 2: 0.8, 3: 1 };

export function xpForStars(lesson: Lesson, stars: Stars): number {
  return Math.round(lesson.xp * STAR_MULTIPLIER[stars]);
}

export function starsForMistakes(mistakes: number): Stars {
  if (mistakes === 0) return 3;
  if (mistakes === 1) return 2;
  return 1;
}

export interface CompletionResult {
  stars: Stars;
  xpGained: number;
  unlockedClass: ClassId | null;
  leveledUp: boolean;
  level: number;
}

/**
 * Records a finished lesson. Replays only award the XP difference when you beat
 * your previous best, so grinding an easy lesson doesn't climb the ranking.
 */
export function applyLessonResult(
  user: User,
  lessonId: string,
  stars: Stars,
  now: Date = new Date(),
): { user: User; result: CompletionResult } {
  const lesson = findLesson(lessonId);
  if (!lesson) throw new Error(`Unknown lesson: ${lessonId}`);

  const previous = user.completed[lessonId];
  const earned = xpForStars(lesson, stars);
  const improved = !previous || earned > previous.xp;
  const xpGained = improved ? earned - (previous?.xp ?? 0) : 0;

  const completed = improved
    ? { ...user.completed, [lessonId]: { stars, xp: earned, completedAt: now.toISOString() } }
    : user.completed;

  let classId = user.classId;
  let unlockedClass: ClassId | null = null;
  const nextClass = CLASS_ORDER[classIndex(user.classId) + 1];
  const finishedCurrent = getClass(user.classId).lessons.every((l) => completed[l.id]);
  if (finishedCurrent && nextClass) {
    classId = nextClass;
    unlockedClass = nextClass;
  }

  const xp = user.xp + xpGained;
  return {
    user: { ...user, xp, classId, completed },
    result: {
      stars,
      xpGained,
      unlockedClass,
      leveledUp: levelForXp(xp) > levelForXp(user.xp),
      level: levelForXp(xp),
    },
  };
}
