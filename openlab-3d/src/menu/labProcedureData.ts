/**
 * Лабын id → сурах бичгийн "Хэрхэн хийх" алхмууд. experiments_grade*.json файлуудыг нэг л удаа задалж хадгална.
 * Лабыг цэснээс биш (жишээ нь апп дахь ▶ товчоор) нээсэн үед ч картад жинхэнэ алхам гаргахад хэрэгтэй.
 */
import { parseExperiment, type TextbookExperiment } from './chapterBuild';
import { groupsForLab, type ProcedureGroup } from './labProcedure';
import { labIdFor } from './labLinks';

const FILES = import.meta.glob('../data/textbook-experiments/experiments_grade*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

let all: TextbookExperiment[] | null = null;
const cache = new Map<string, ProcedureGroup[]>();

function allExperiments(): TextbookExperiment[] {
  if (!all) {
    all = Object.values(FILES)
      .flatMap((rows) => (Array.isArray(rows) ? rows : []))
      .map(parseExperiment)
      .filter((e): e is TextbookExperiment => e !== null);
  }
  return all;
}

/** Энэ лабтай холбогдсон сурах бичгийн алхмууд; холбоосгүй эсвэл алхамгүй бол хоосон жагсаалт */
export function procedureGroupsForLab(labId: string): ProcedureGroup[] {
  let groups = cache.get(labId);
  if (!groups) {
    groups = groupsForLab(labId, allExperiments(), labIdFor);
    cache.set(labId, groups);
  }
  return groups;
}

/** Энэ лабтай холбогдсон эхний сурах бичгийн туршилт (апп-аас шууд нээхэд номын хэрэгслийг ширээнд гаргахад) */
export function textbookForLab(labId: string): TextbookExperiment | null {
  return allExperiments().find((e) => labIdFor(e.id) === labId) ?? null;
}
