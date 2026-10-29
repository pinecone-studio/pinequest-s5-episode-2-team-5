/**
 * Лабын "Туршилт" картад харуулах сурах бичгийн "Хэрхэн хийх" алхмуудыг лабын id-аар олно.
 * Цэвэр функц (import.meta-гүй) тул тестлэхэд хялбар. Өгөгдлийг labProcedureData.ts уншиж ирнэ.
 */
import type { TextbookExperiment } from './chapterBuild';

/** Нэг туршилтын алхмууд. Нэг лаб хоёр туршилттай холбогдсон бол хоёр бүлэг гарч, title-аар ялгана */
export interface ProcedureGroup {
  title: string;
  steps: string[];
}

/**
 * Энэ лабтай холбогдсон (lab-links.json) бөгөөд алхамтай туршилтуудыг JSON-ийн дарааллаар буцаана.
 * Алхамгүй туршилтыг алгасна — хоосон бүлэг харуулахгүй.
 */
export function groupsForLab(labId: string, experiments: readonly TextbookExperiment[], linkOf: (textbookId: string) => string | null): ProcedureGroup[] {
  return experiments
    .filter((e) => e.procedure.length > 0 && linkOf(e.id) === labId)
    .map((e) => ({ title: e.title, steps: e.procedure }));
}
