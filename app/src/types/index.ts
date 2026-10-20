export type Tier = 'Beginner' | 'Intermediate' | 'Advanced';

export const TIERS: Tier[] = ['Beginner', 'Intermediate', 'Advanced'];

export interface Question {
  q: string;
  options: string[];
  answer: number;
}

export interface Lesson {
  id: string;
  tier: Tier;
  title: string;
  questions: Question[];
}

export interface Account {
  nickname: string;
  password: string;
  startTier: Tier;
  xp: number;
  completed: string[];
  color: string;
}

export interface Rival {
  nickname: string;
  xp: number;
  tier: Tier;
  color: string;
}
