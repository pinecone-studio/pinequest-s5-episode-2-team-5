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
  show: (labId, steps, title = '', prep = null) => set({ labId, steps, title, prep, checked: [] }),
  showUnlinked: (title, steps, prep = null) => set({ labId: null, steps, title, prep, checked: [] }),
  toggleChecked: (item) => set((s) => ({ checked: s.checked.includes(item) ? s.checked.filter((c) => c !== item) : [...s.checked, item] })),
  finishPrep: () => set({ prep: null, checked: [] }),
  clear: () => set({ labId: null, steps: [], title: '', prep: null, checked: [] }),
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
