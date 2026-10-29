/**
 * Цэснээс "Туршилтыг эхлэх" дарсан сурах бичгийн туршилтын "Хэрхэн хийх" алхмуудыг
 * лабын доторх "Туршилт" самбар (LabHud → ExperimentCard) дээр харуулахын тулд хадгална.
 * Лабын өөрийн алхам (x.steps), ✓ явц, зөвлөгөөнд огт хөндөхгүй.
 */
import { create } from 'zustand';
import type { ProcedureGroup } from './labProcedure';

/** false болговол лабын самбар дээр "Хэрхэн хийх" хэсэг гарахгүй (бусад бүх зүйл хэвээр) */
export const SHOW_TEXTBOOK_PROCEDURE: boolean = true;

/**
 * false бол сурах бичгийн алхамтай туршилтын "Туршилт" картаас лабын ерөнхий 3 алхам (Таамаглал, Хэмжилт, Дүгнэ),
 * "0/3" тоо ба 💡 зөвлөгөөг нууж, зөвхөн сурах бичгийн алхмыг харуулна. true болговол хуучин карт буцаж гарна.
 */
export const SHOW_LAB_STEPS_IN_CARD: boolean = false;

/**
 * Лаб өөрөө ширээн дээрх хэрэгслийг хянадаггүй туршилтын «Бэлтгэлээ хийе» жагсаалт.
 * Сурах бичгийн JSON-ийн бодис, хэрэгслээс авна (хянадаг туршилтад null).
 */
export interface TextbookPrep {
  /** Сурах бичгийн туршилтын дугаар (жишээ нь "9-23") */
  id: string;
  substances: string[];
  equipment: string[];
  safety: string;
}

interface LaunchedProcedureState {
  /** Алхмууд аль лабын туршилтад хамаарахыг заана. Лабын заавартай холбоогүй туршилтад null */
  labId: string | null;
  /** Цэснээс сонгосон сурах бичгийн туршилтын нэр (картын гарчигт харуулна) */
  title: string;
  steps: string[];
  /** Бэлтгэлийн жагсаалт. null бол лабын өөрийн (3D) бэлтгэл ажиллана эсвэл бэлтгэл дууссан */
  prep: TextbookPrep | null;
  /** Бэлтгэлийн жагсаалтад сурагчийн тэмдэглэсэн зүйлс */
  checked: string[];
  /** «Туршилтын заавар» карт: аль картынх (StepGuide-ийн key), хэдэн алхмыг «Хийсэн» гэж тэмдэглэсэн */
  stepsKey: string;
  stepsDone: number;
  setStepsDone: (key: string, done: number) => void;
  /** Лабын заавартай холбоотой туршилт эхлүүлэхэд */
  show: (labId: string, steps: string[], title?: string, prep?: TextbookPrep | null) => void;
  /** Лабын заавартай холбоогүй туршилт эхлүүлэхэд (labId байхгүй, карт нэр + алхмаараа гарна) */
  showUnlinked: (title: string, steps: string[], prep?: TextbookPrep | null) => void;
  toggleChecked: (item: string) => void;
  /** Бэлтгэл дууссан: карт «Туршилт» болж алхмаа харуулна */
  finishPrep: () => void;
  clear: () => void;
}

export const useLaunchedProcedure = create<LaunchedProcedureState>()((set) => ({
  labId: null,
  title: '',
  steps: [],
  prep: null,
  checked: [],
  stepsKey: '',
  stepsDone: 0,
  show: (labId, steps, title = '', prep = null) => set({ labId, steps, title, prep, checked: [], stepsDone: 0 }),
  showUnlinked: (title, steps, prep = null) => set({ labId: null, steps, title, prep, checked: [], stepsDone: 0 }),
  toggleChecked: (item) => set((s) => ({ checked: s.checked.includes(item) ? s.checked.filter((c) => c !== item) : [...s.checked, item] })),
  finishPrep: () => set({ prep: null, checked: [] }),
  setStepsDone: (stepsKey, stepsDone) => set({ stepsKey, stepsDone }),
  clear: () => set({ labId: null, steps: [], title: '', prep: null, checked: [], stepsDone: 0 }),
}));

/** Тухайн лабын туршилтад харуулах алхмууд. Өөр туршилтынх эсвэл флаг унтраалттай бол хоосон */
export function procedureFor(labId: string, state: Pick<LaunchedProcedureState, 'labId' | 'steps'>): string[] {
  if (!SHOW_TEXTBOOK_PROCEDURE) return [];
  return state.labId === labId ? state.steps : [];
}

/**
 * Картад харуулах алхмын бүлгүүд. Цэснээс эхлүүлсэн бол яг тэр туршилтын алхам (нэг бүлэг),
 * үгүй бол (жишээ нь апп дахь ▶ товчоор орсон) лабтай холбогдсон туршилтуудын алхам (`linked`).
 */
export function groupsToShow(labId: string, state: Pick<LaunchedProcedureState, 'labId' | 'steps' | 'title'>, linked: ProcedureGroup[]): ProcedureGroup[] {
  if (!SHOW_TEXTBOOK_PROCEDURE) return [];
  const launched = procedureFor(labId, state);
  return launched.length ? [{ title: state.title, steps: launched }] : linked;
}

/** Картын гарчиг: цэснээс энэ лабаар эхлүүлсэн бол сонгосон туршилтын нэр, үгүй бол лабын зааврын нэр */
export function cardTitle(labId: string, state: Pick<LaunchedProcedureState, 'labId' | 'title'>, labTitle: string): string {
  return SHOW_TEXTBOOK_PROCEDURE && state.labId === labId && state.title ? state.title : labTitle;
}

/** Лабын заавартай холбоогүй, цэснээс сонгосон туршилтын карт (нэр + алхам). Байхгүй бол null */
export function unlinkedCard(state: Pick<LaunchedProcedureState, 'labId' | 'steps' | 'title'>): ProcedureGroup | null {
  if (!SHOW_TEXTBOOK_PROCEDURE || state.labId !== null || !state.steps.length) return null;
  return { title: state.title, steps: state.steps };
}

/**
 * Ажлын ширээнд суухад зүүн дээд самбарт харуулах туршилтын нэр.
 * `labId` нь идэвхтэй лабын туршилт (холбоогүй туршилтад null). Цэснээс сонгосон нэр байвал тэр, үгүй бол лабын зааврын нэр.
 * Юу ч сонгоогүй бол undefined.
 */
export function benchTitle(labId: string | null, state: Pick<LaunchedProcedureState, 'labId' | 'title'>, labTitle?: string): string | undefined {
  if (labId) return cardTitle(labId, state, labTitle ?? '') || undefined;
  return SHOW_TEXTBOOK_PROCEDURE && state.labId === null && state.title ? state.title : undefined;
}

/**
 * Нэрийг үгийн заагаар мөрүүдэд хуваана: богино нэр 1 мөр, урт нэр 2 мөр, хэт урт нэр 3 мөр.
 * Хамгийн урт мөр аль болох богино байхаар тэнцүү хуваана — тэгэхгүй бол самбарын үсэг жижиг болно.
 */
function wrapTitle(title: string): string {
  const text = title.trim().replace(/\s+/g, ' ');
  if (text.length <= 28) return text;
  const words = text.split(' ');
  const count = Math.min(text.length > 52 ? 3 : 2, words.length);
  let best: string[] = [text];
  let bestWidest = Infinity;
  // Үгсийг дараалсан `count` бүлэгт хуваах бүх аргыг туршиж, хамгийн урт мөр нь хамгийн богино байхыг сонгоно
  const split = (start: number, left: number, lines: string[]): void => {
    if (left === 1) {
      const all = [...lines, words.slice(start).join(' ')];
      const widest = Math.max(...all.map((line) => line.length));
      if (widest < bestWidest) {
        best = all;
        bestWidest = widest;
      }
      return;
    }
    for (let end = start + 1; end <= words.length - (left - 1); end++) split(end, left - 1, [...lines, words.slice(start, end).join(' ')]);
  };
  split(0, count, []);
  return best.join('\n');
}

/**
 * Ажлын ширээн дээрх 3D самбарын бичиг: "Ажлын ширээ" + сонгосон туршилтын нэр.
 * Цэснээс сонгосон бол тэр нэр (лабын заавартай холбоогүй ч), үгүй бол лабын зааврын нэр.
 */
export function benchSignText(labId: string | null, state: Pick<LaunchedProcedureState, 'labId' | 'title'>, labTitle?: string): string {
  const title = benchTitle(labId, state, labTitle);
  if (title) return `Ажлын ширээ\n${wrapTitle(title)}`;
  return labId ? 'Ажлын ширээ\nТуршилт олдсонгүй' : 'Ажлын ширээ\nТуршилт сонгоогүй байна';
}

/** Ажлын ширээний самбарын "Хэрхэн хийх" бүлгүүд: лабтай холбоотой бол groupsToShow, холбоогүй бол unlinkedCard (ExperimentCard-тай ижил) */
export function benchGroups(labId: string | null, state: Pick<LaunchedProcedureState, 'labId' | 'steps' | 'title'>, linked: ProcedureGroup[]): ProcedureGroup[] {
  if (labId) return groupsToShow(labId, state, linked);
  const card = unlinkedCard(state);
  return card ? [card] : [];
}
