import type { Element } from '../data/revision-hub/types';

export const ELEMENT_CATEGORIES: Record<Element['category'], string> = {
  am: 'Шүлтийн металл', ae: 'Газрын шүлтийн металл', tm: 'Шилжилтийн металл', pt: 'Бусад металл',
  md: 'Металлоид', nm: 'Металл биш', hl: 'Галоген', ng: 'Инерт хий', ln: 'Лантаноид', an: 'Актиноид',
};
export const GROUP_GUIDES = [
  { group: 1, title: 'Шүлтийн металлууд', text: 'Li, Na, K нь гаднах давхраандаа 1 электронтой. Энэ төстэй бүтэц нь төстэй химийн шинжтэй холбоотой. Устөрөгч 1-р бүлэгт байдаг ч шүлтийн металл биш.', examples: [3, 11, 19] },
  { group: 2, title: 'Газрын шүлтийн металлууд', text: 'Be, Mg, Ca нь гаднах давхраандаа 2 электронтой. Бүлгээр доошлоход электроны давхрааны тоо нэмэгдэнэ.', examples: [4, 12, 20] },
  { group: 13, title: 'Борын бүлэг', text: 'B, Al-ийн гаднах давхраанд 3 электрон байна. Бүлгийн бүх элемент ижил төрлийн бодис биш: бор металлоид, хөнгөнцагаан металл.', examples: [5, 13] },
  { group: 14, title: 'Нүүрстөрөгчийн бүлэг', text: 'C, Si-ийн гаднах давхраанд 4 электрон байна. Нүүрстөрөгч металл биш, цахиур металлоид.', examples: [6, 14] },
  { group: 15, title: 'Азотын бүлэг', text: 'N, P-ийн гаднах давхраанд 5 электрон байна. Гаднах давхрааны электрон химийн холбоонд чухал үүрэгтэй.', examples: [7, 15] },
  { group: 16, title: 'Хүчилтөрөгчийн бүлэг', text: 'O, S-ийн гаднах давхраанд 6 электрон байна. Үелэх хүснэгтэд нэг баганад байрлана.', examples: [8, 16] },
  { group: 17, title: 'Галогенууд', text: 'F, Cl-ийн гаднах давхраанд 7 электрон байна. Найман электронтой гаднах давхраанд хүрэхэд нэг электрон дутна.', examples: [9, 17] },
  { group: 18, title: 'Инерт хийнүүд', text: 'Ne, Ar-ийн гаднах давхраанд 8 электрон байна. He зөвхөн эхний давхраатай тул 2 электроноор дүүрнэ. Эдгээр элемент ерөнхийдөө урвалд орох идэвх багатай.', examples: [2, 10, 18] },
] as const;

export function outerElectrons(element: Element) { return element.shells.at(-1) ?? 0; }
export function valenceExplanation(element: Element) {
  if (element.z === 1) return '1-р бүлэгт байрлах металл биш. Шүлтийн металл гэж ангилахгүй.';
  if (element.z === 2) return 'Эхний давхраа 2 электроноор дүүрсэн. 18-р бүлгийн онцгой жишээ.';
  if (element.group !== null && (element.group <= 2 || element.group >= 13) && element.z <= 20)
    return `Гаднах давхраанд ${outerElectrons(element)} электрон. Энэ тоог бүлгийн төстэй бүтэцтэй холбоорой.`;
  return 'Шилжилтийн болон хүнд элементүүдийн химийн шинжийг зөвхөн хамгийн гаднах давхрааны тоогоор тайлбарлахгүй. Дэлгэрэнгүй электроны бүтцийг харна уу.';
}
export type ElementQuestionKind = 'name' | 'number' | 'shells' | 'group' | 'position';
export interface ElementQuestion { id: string; z: number; kind: ElementQuestionKind; prompt: string; options: string[]; answer: string; explanation: string }
function shuffle<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeElementQuiz(pool: Element[], universe: Element[], limit = 10): ElementQuestion[] {
  return shuffle(pool).slice(0, limit).map((element, index) => {
    const kinds: ElementQuestionKind[] = ['name', 'number', 'shells', 'group', 'position'];
    let kind = kinds[index % kinds.length];
    if (kind === 'group' && element.group === null) kind = 'name';
    const value = (e: Element) => kind === 'name' ? e.name : kind === 'number' ? String(e.z) : kind === 'shells' ? e.shells.join(', ') : String(e.group);
    const answer = kind === 'position' ? String(element.z) : value(element);
    const distractors = [...new Set(universe.filter((e) => kind !== 'group' || e.group !== null).map(value))].filter((v) => v !== answer);
    const options = kind === 'position' ? [] : shuffle([answer, ...shuffle(distractors).slice(0, 3)]);
    const prompt = kind === 'name' ? `${element.symbol} тэмдэгтэй элементийн нэр?` : kind === 'number' ? `${element.name} (${element.symbol}) хэдэн протонтой вэ?` : kind === 'shells' ? `${element.symbol}-ийн саармаг атомын электронууд давхраанд хэрхэн хуваарилагдах вэ?` : kind === 'group' ? `${element.symbol} хэддүгээр бүлэгт байрладаг вэ?` : `${element.name} (${element.symbol})-ийн нүдийг хүснэгтээс олоорой.`;
    return { id: `${element.z}:${kind}`, z: element.z, kind, prompt, options, answer,
      explanation: `${element.symbol} — ${element.name}. Z = ${element.z}; саармаг атом ${element.z} протон, ${element.z} электронтой. Давхраа: ${element.shells.join(', ')}. ${element.group === null ? 'f-блок' : `${element.group}-р бүлэг`}, ${element.period}-р үе.` };
  });
}
export interface ElementMemory { version: 1; known: number[]; attempts: Record<string, { correct: number; total: number }> }
export const emptyElementMemory = (): ElementMemory => ({ version: 1, known: [], attempts: {} });
export function restoreElementMemory(raw: unknown): ElementMemory {
  if (!raw || typeof raw !== 'object' || (raw as ElementMemory).version !== 1) return emptyElementMemory();
  const p = raw as ElementMemory;
  const known = Array.isArray(p.known) ? [...new Set(p.known.filter((z) => Number.isInteger(z) && z >= 1 && z <= 118))] : [];
  const attempts: ElementMemory['attempts'] = {};
  if (p.attempts && typeof p.attempts === 'object') for (const [z, entry] of Object.entries(p.attempts)) {
    if (+z >= 1 && +z <= 118 && Number.isInteger(+z) && entry && Number.isInteger(entry.correct) && Number.isInteger(entry.total) && entry.correct >= 0 && entry.correct <= entry.total) attempts[z] = entry;
  }
  return { version: 1, known, attempts };
}
