/**
 * Цэснээс "Туршилтыг эхлэх" дарсан сурах бичгийн туршилтын "Хэрхэн хийх" алхмуудыг
 * лабын доторх "Туршилт" самбар (LabHud → ExperimentCard) дээр харуулахын тулд хадгална.
 * Лабын өөрийн алхам (x.steps), ✓ явц, зөвлөгөөнд огт хөндөхгүй.
 */
import { create } from 'zustand';

/** false болговол лабын самбар дээр "Хэрхэн хийх" хэсэг гарахгүй (бусад бүх зүйл хэвээр) */
export const SHOW_TEXTBOOK_PROCEDURE: boolean = true;

interface LaunchedProcedureState {
  /** Алхмууд аль лабын туршилтад хамаарахыг заана */
  labId: string | null;
  steps: string[];
  show: (labId: string, steps: string[]) => void;
  clear: () => void;
}

export const useLaunchedProcedure = create<LaunchedProcedureState>()((set) => ({
  labId: null,
  steps: [],
  show: (labId, steps) => set({ labId, steps }),
  clear: () => set({ labId: null, steps: [] }),
}));

/** Тухайн лабын туршилтад харуулах алхмууд. Өөр туршилтынх эсвэл флаг унтраалттай бол хоосон */
export function procedureFor(labId: string, state: Pick<LaunchedProcedureState, 'labId' | 'steps'>): string[] {
  if (!SHOW_TEXTBOOK_PROCEDURE) return [];
  return state.labId === labId ? state.steps : [];
}
