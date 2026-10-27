/**
 * Сурах бичгийн туршилтын тоо — src/data/textbook-experiments/experiments_grade*.json файл бүрийн мөрийг тоолно.
 * Гараар бичихгүй: шинэ ангийн файл (жишээ нь experiments_grade11.json) нэмэхэд тоо өөрөө өснө.
 */
import { buildChapters, type ChapterNode } from './chapterBuild';
import { summarizeGrades } from './gradeSummary';

const FILES = import.meta.glob('../data/textbook-experiments/experiments_grade*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

export const TEXTBOOK_EXPERIMENT_COUNT: number = Object.values(FILES).reduce<number>((total, rows) => total + (Array.isArray(rows) ? rows.length : 0), 0);

/** Анги бүрийн бүлэг, туршилтын тоо ("Анги сонгох" дэлгэцэд) */
export const GRADE_SUMMARIES = summarizeGrades(FILES);

/** Ангийн бүлэг → сэдэв → туршилтууд ("Бүлэг сонгох" дэлгэцэд). Нэг ангийг нэг л удаа бүтээж хадгална */
const chapterCache = new Map<number, ChapterNode[]>();
export function chaptersForGrade(grade: number): ChapterNode[] {
  if (!chapterCache.has(grade)) chapterCache.set(grade, buildChapters(FILES, grade));
  return chapterCache.get(grade)!;
}
