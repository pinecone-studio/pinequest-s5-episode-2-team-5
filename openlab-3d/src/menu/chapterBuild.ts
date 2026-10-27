/**
 * Сурах бичгийн туршилтын JSON → бүлэг → сэдэв → туршилт бүтэц ("Бүлэг сонгох" дэлгэцэд).
 * Цэвэр функц (import.meta-гүй) тул тестлэхэд хялбар. Файлуудыг catalogCount.ts уншиж ирнэ.
 * Дараалал: JSON-д байгаагаар (сурах бичгийн дараалал) хадгална — өөрөө эрэмбэлэхгүй.
 */

/** JSON-ы нэг мөр. Олон утгатай талбарыг ("; "-ээр тусгаарласан) жагсаалт (массив) болгосон */
export interface TextbookExperiment {
  /** "7-26" */
  id: string;
  grade: number;
  chapter: string;
  section: string;
  /** "Туршилт 1", "Үзүүлэн", "Даалгавар" */
  number: string;
  title: string;
  /** Сурах бичгийн хуудас: "62" эсвэл "24–25" */
  page: string;
  type: string;
  substances: string[];
  equipment: string[];
  actions: string[];
  phenomena: string[];
  engine: string[];
  equation: string;
  duration: string;
  safety: string;
  difficulty: string;
  /** Хийх дараалал (алхам алхмаар). Химичийн бичсэн `procedure` баганаас; бичээгүй бол хоосон жагсаалт */
  procedure: string[];
  /** Онцлох (⭐) туршилт */
  showcase: boolean;
  note: string;
  status: string;
}

export interface SectionNode {
  name: string;
  experiments: TextbookExperiment[];
}

export interface ChapterNode {
  name: string;
  sections: SectionNode[];
  /** Бүлгийн бүх сэдвийн нийт туршилтын тоо */
  experimentCount: number;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : '');
/** JSON-д "хоосон" гэдгийг "—" гэж бичсэн (томьёо, хугацаа, аюулгүй байдал). Үүнийг жинхэнэ хоосон болгоно */
const optional = (value: unknown): string => {
  const result = text(value);
  return result === '—' || result === '-' ? '' : result;
};
const list = (value: unknown): string[] =>
  text(value)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

/**
 * Хийх дараалал (`procedure`) хоёр хэлбэрээр ирж болно:
 *  - жагсаалт: ["Хуруу шилд бодис хий.", "Халаа."]
 *  - нэг текст: алхам бүрийг шинэ мөрөнд эсвэл " | "-ээр тусгаарласан (хүснэгтээс хуулахад хялбар)
 * Алхмын өмнөх "1.", "2)" гэсэн дугаарыг хасна — дугаарыг дэлгэц өөрөө тавина.
 */
export function parseProcedure(value: unknown): string[] {
  const parts = Array.isArray(value) ? value.map((item) => text(item)) : text(value).split(/\r?\n| \| /);
  return parts.map((part) => part.trim().replace(/^\d+\s*[.)]\s*/, '')).filter(Boolean);
}

/** Нэг мөрийг шалгаж хувиргана. id, гарчиг, анги, бүлэг, сэдвийн аль нэг нь дутуу бол null (мөрийг алгасна) */
export function parseExperiment(row: unknown): TextbookExperiment | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const grade = Number(r.grade);
  const id = text(r.id);
  const title = text(r.title);
  const chapter = text(r.chapter);
  const section = text(r.section);
  if (!Number.isInteger(grade) || !id || !title || !chapter || !section) return null;
  return {
    id,
    grade,
    chapter,
    section,
    number: text(r.number),
    title,
    page: text(r.page),
    type: text(r.type),
    substances: list(r.substances),
    equipment: list(r.equipment),
    actions: list(r.actions),
    phenomena: list(r.phenomena),
    engine: list(r.engine),
    equation: optional(r.equation),
    duration: optional(r.duration),
    safety: optional(r.safety),
    difficulty: text(r.difficulty),
    procedure: parseProcedure(r.procedure),
    showcase: text(r.showcase) !== '',
    note: text(r.note),
    status: text(r.status),
  };
}

/**
 * files = {файлын зам: JSON-ы мөрүүдийн массив}. Тухайн ангийн мөрүүдийг (файлын нэрээс биш мөр доторх `grade`-ээр) авч,
 * бүлэг → сэдэв → туршилт болгон бүлэглэнэ. Бүлэг, сэдэв нь JSON-д анх гарсан дарааллаар байна.
 */
export function buildChapters(files: Record<string, unknown>, grade: number): ChapterNode[] {
  const chapters = new Map<string, Map<string, TextbookExperiment[]>>();
  // Файлын дарааллыг тогтвортой болгоно (grade7 < grade10 гэж тооны дарааллаар)
  const paths = Object.keys(files).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const path of paths) {
    const rows = files[path];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const experiment = parseExperiment(row);
      if (!experiment || experiment.grade !== grade) continue;
      if (!chapters.has(experiment.chapter)) chapters.set(experiment.chapter, new Map());
      const sections = chapters.get(experiment.chapter)!;
      if (!sections.has(experiment.section)) sections.set(experiment.section, []);
      sections.get(experiment.section)!.push(experiment);
    }
  }
  return [...chapters].map(([name, sections]) => {
    const nodes = [...sections].map(([sectionName, experiments]) => ({ name: sectionName, experiments }));
    return { name, sections: nodes, experimentCount: nodes.reduce((total, section) => total + section.experiments.length, 0) };
  });
}
