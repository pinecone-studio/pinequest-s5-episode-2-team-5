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

interface LaunchedProcedureState {
  /** Алхмууд аль лабын туршилтад хамаарахыг заана. Лабын заавартай холбоогүй туршилтад null */
  labId: string | null;
  /** Цэснээс сонгосон сурах бичгийн туршилтын нэр (картын гарчигт харуулна) */
  title: string;
  steps: string[];
  /** Лабын заавартай холбоотой туршилт эхлүүлэхэд */
  show: (labId: string, steps: string[], title?: string) => void;
  /** Лабын заавартай холбоогүй туршилт эхлүүлэхэд (labId байхгүй, карт нэр + алхмаараа гарна) */
  showUnlinked: (title: string, steps: string[]) => void;
  clear: () => void;
}

export const useLaunchedProcedure = create<LaunchedProcedureState>()((set) => ({
  labId: null,
  title: '',
  steps: [],
  show: (labId, steps, title = '') => set({ labId, steps, title }),
  showUnlinked: (title, steps) => set({ labId: null, steps, title }),
  clear: () => set({ labId: null, steps: [], title: '' }),
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
