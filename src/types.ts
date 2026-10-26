import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { LocationProfile } from '@/data/location';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type ClassId = 'beginner' | 'medium' | 'hard';

export type LessonStep =
  | { type: 'info'; title: string; body: string; icon: IconName }
  | {
      type: 'quiz';
      question: string;
      options: string[];
      /** Index into `options`. */
      answer: number;
      explanation: string;
    };

export interface Lesson {
  id: string;
  classId: ClassId;
  title: string;
  summary: string;
  icon: IconName;
  minutes: number;
  /** XP for a perfect (3-star) run. */
  xp: number;
  steps: LessonStep[];
}

export interface ClassPalette {
  main: string;
  dark: string;
  light: string;
  /** Text color that reads well on `main`. */
  ink: string;
}

export interface ChemClass {
  id: ClassId;
  name: string;
  title: string;
  description: string;
  icon: IconName;
  color: ClassPalette;
  lessons: Lesson[];
}

export type Stars = 1 | 2 | 3;

export interface LessonResult {
  stars: Stars;
  xp: number;
  completedAt: string;
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  /** Highest unlocked class. Starts as the class picked at sign-up. */
  classId: ClassId;
  xp: number;
  completed: Record<string, LessonResult>;
  createdAt: string;
  location: LocationProfile | null;
  /** Distinguishes an incomplete profile from a location query unavailable before migration. */
  locationStatus: 'complete' | 'incomplete' | 'unavailable';
}

/** What other players can see about you (hub, ranking). */
export interface PublicPlayer {
  id: string;
  nickname: string;
  classId: ClassId;
  xp: number;
}
