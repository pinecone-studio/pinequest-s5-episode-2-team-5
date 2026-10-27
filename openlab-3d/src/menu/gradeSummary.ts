/**
 * Анги бүрийн товч мэдээлэл ("N бүлэг · N туршилт") — JSON-ы мөрүүдийг тоолж гаргана.
 * Цэвэр функц (import.meta-гүй) тул тестлэхэд хялбар. Файлуудыг catalogCount.ts уншиж ирнэ.
 */

/** Сургуулийн хөтөлбөрийн ангиуд: тухайн ангийн JSON файл байхгүй бол "Удахгүй" гэж харагдана */
export const CURRICULUM_GRADES = [7, 8, 9, 10, 11];

export interface GradeSummary {
  grade: number;
  /** Ялгаатай бүлгийн тоо (`chapter` талбар) */
  chapters: number;
  /** Нийт туршилтын тоо */
  experiments: number;
  /** false = JSON байхгүй → "Удахгүй", дарахад идэвхгүй */
  available: boolean;
}

/**
 * files = {файлын зам: JSON-ы мөрүүдийн массив}. Ангийг файлын нэрээс биш мөр доторх `grade` талбараас авна,
 * ингэснээр шинэ ангийн файл (жишээ нь experiments_grade11.json) нэмэхэд код өөрчлөгдөхгүй, өөрөө гарч ирнэ.
 */
export function summarizeGrades(files: Record<string, unknown>): GradeSummary[] {
  const chapters = new Map<number, Set<string>>();
  const experiments = new Map<number, number>();
  for (const rows of Object.values(files)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const grade = Number((row as { grade?: unknown }).grade);
      if (!Number.isInteger(grade)) continue;
      experiments.set(grade, (experiments.get(grade) ?? 0) + 1);
      const chapter = (row as { chapter?: unknown }).chapter;
      if (typeof chapter === 'string' && chapter.trim()) {
        if (!chapters.has(grade)) chapters.set(grade, new Set());
        chapters.get(grade)!.add(chapter);
      }
    }
  }
  const grades = [...new Set([...CURRICULUM_GRADES, ...experiments.keys()])].sort((a, b) => a - b);
  return grades.map((grade) => {
    const count = experiments.get(grade) ?? 0;
    return { grade, chapters: chapters.get(grade)?.size ?? 0, experiments: count, available: count > 0 };
  });
}
