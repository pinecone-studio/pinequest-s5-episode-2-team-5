/**
 * Substances that can be held in lab glassware, and the rules for mixing them: volume
 * weighted colors, a simple pH model (every acid/base is 0.1 M), indicator colors and
 * a handful of classroom reactions.
 */
import { Color } from 'three';

export type SubstanceId =
  | 'water'
  | 'hcl'
  | 'naoh'
  | 'nacl'
  | 'na2so4'
  | 'cuso4'
  | 'cuoh2'
  | 'cucl2'
  | 'kmno4'
  | 'phenolphthalein'
  | 'bromothymol'
  | 'methylOrange'
  | 'dyeRed'
  | 'dyeYellow'
  | 'dyeGreen'
  | 'dyeBlue';

export interface Substance {
  id: SubstanceId;
  name: string;
  formula: string;
  /** Solution color (indicators use `indicator` instead). */
  color: string;
  /** How strongly it tints a mixture: ~0 for colorless, 1 for dyes, 3 for indicators. */
  strength: number;
  /** Offered as a reagent bottle in the Tools drawer. */
  reagent: boolean;
  /** Color as a function of pH. */
  indicator?: (ph: number) => string;
}

export const SUBSTANCES: Record<SubstanceId, Substance> = {
  water: { id: 'water', name: 'Нэрмэл ус', formula: 'H₂O', color: '#b9def5', strength: 0.04, reagent: true },
  hcl: { id: 'hcl', name: 'Давсны хүчил', formula: 'HCl', color: '#dcecf6', strength: 0.04, reagent: true },
  naoh: { id: 'naoh', name: 'Натрийн гидроксид', formula: 'NaOH', color: '#dcecf6', strength: 0.04, reagent: true },
  nacl: { id: 'nacl', name: 'Натрийн хлоридын уусмал', formula: 'NaCl', color: '#dcecf6', strength: 0.04, reagent: true },
  na2so4: { id: 'na2so4', name: 'Натрийн сульфат', formula: 'Na₂SO₄', color: '#dcecf6', strength: 0.04, reagent: false },
  cuso4: { id: 'cuso4', name: 'Зэсийн (II) сульфат', formula: 'CuSO₄', color: '#2f86e0', strength: 1, reagent: true },
  cuoh2: { id: 'cuoh2', name: 'Зэсийн (II) гидроксидын тунадас', formula: 'Cu(OH)₂', color: '#6bb6f2', strength: 1, reagent: false },
  cucl2: { id: 'cucl2', name: 'Зэсийн (II) хлорид', formula: 'CuCl₂', color: '#3fb88c', strength: 1, reagent: false },
  kmno4: { id: 'kmno4', name: 'Калийн перманганат', formula: 'KMnO₄', color: '#8e2bd0', strength: 1.2, reagent: true },
  phenolphthalein: {
    id: 'phenolphthalein',
    name: 'Фенолфталеин',
    formula: 'ФФ',
    color: '#e4f0f8',
    strength: 3,
    reagent: true,
    indicator: (ph) => (ph < 8.2 ? '#e4f0f8' : ph < 10 ? '#f48fc0' : '#ec2f8c'),
  },
  bromothymol: {
    id: 'bromothymol',
    name: 'Бромтимол цэнхэр',
    formula: 'БТЦ',
    color: '#3fb6a0',
    strength: 3,
    reagent: true,
    indicator: (ph) => (ph < 6 ? '#f5d300' : ph < 7.6 ? '#3fb6a0' : '#2e5cd6'),
  },
  methylOrange: {
    id: 'methylOrange',
    name: 'Метилоранж',
    formula: 'МО',
    color: '#ff9a1a',
    strength: 3,
    reagent: true,
    indicator: (ph) => (ph < 3.1 ? '#e0322c' : ph < 4.4 ? '#ff7a1a' : '#f5b800'),
  },
  dyeRed: { id: 'dyeRed', name: 'Улаан будгийн уусмал', formula: 'Улаан', color: '#e2363c', strength: 1, reagent: true },
  dyeYellow: { id: 'dyeYellow', name: 'Шар будгийн уусмал', formula: 'Шар', color: '#f5c400', strength: 1, reagent: true },
  dyeGreen: { id: 'dyeGreen', name: 'Ногоон будгийн уусмал', formula: 'Ногоон', color: '#33c46a', strength: 1, reagent: true },
  dyeBlue: { id: 'dyeBlue', name: 'Цэнхэр будгийн уусмал', formula: 'Цэнхэр', color: '#2f5fe0', strength: 1, reagent: true },
};

export const REAGENT_IDS = (Object.keys(SUBSTANCES) as SubstanceId[]).filter((id) => SUBSTANCES[id].reagent);

export interface Content {
  id: SubstanceId;
  ml: number;
}
export type Contents = Content[];

export interface ReactionEvent {
  title: string;
  detail: string;
}

const EPS = 0.01;
const PALE = new Color('#d6ebf7');

export function totalMl(contents: Contents | undefined): number {
  return contents ? contents.reduce((sum, c) => sum + c.ml, 0) : 0;
}

function amountOf(contents: Contents, id: SubstanceId): number {
  return contents.find((c) => c.id === id)?.ml ?? 0;
}

function add(contents: Contents, id: SubstanceId, ml: number): Contents {
  const next = contents.map((c) => (c.id === id ? { ...c, ml: c.ml + ml } : c));
  return next.some((c) => c.id === id) ? next : [...next, { id, ml }];
}

function clean(contents: Contents): Contents {
  return contents.filter((c) => c.ml > EPS);
}

export function mergeContents(a: Contents, b: Contents): Contents {
  return b.reduce((acc, c) => add(acc, c.id, c.ml), a);
}

/** Splits `ml` off proportionally, as a pour from a well-mixed vessel would. */
export function takePortion(contents: Contents, ml: number): { taken: Contents; rest: Contents } {
  const total = totalMl(contents);
  if (total <= 0) return { taken: [], rest: [] };
  const k = Math.min(1, ml / total);
  return {
    taken: clean(contents.map((c) => ({ id: c.id, ml: c.ml * k }))),
    rest: clean(contents.map((c) => ({ id: c.id, ml: c.ml * (1 - k) }))),
  };
}

/** Approximate pH of the mixture from the net strong acid / base (all 0.1 M). */
export function phOf(contents: Contents): number {
  const total = totalMl(contents);
  if (total <= 0) return 7;
  const net = amountOf(contents, 'hcl') - amountOf(contents, 'naoh');
  if (Math.abs(net) < EPS) return 7;
  const c = (0.1 * Math.abs(net)) / total;
  const p = Math.min(13.5, Math.max(0.5, -Math.log10(c)));
  return net > 0 ? p : 14 - p;
}

export function contentsColor(contents: Contents): string {
  const total = totalMl(contents);
  if (total <= 0) return '#d6ebf7';
  const ph = phOf(contents);
  const sum = new Color(0, 0, 0);
  let weight = 0;
  for (const c of contents) {
    const s = SUBSTANCES[c.id];
    const w = c.ml * s.strength;
    const color = new Color(s.indicator ? s.indicator(ph) : s.color);
    sum.r += color.r * w;
    sum.g += color.g * w;
    sum.b += color.b * w;
    weight += w;
  }
  if (weight <= 0) return '#' + PALE.getHexString();
  const avg = sum.multiplyScalar(1 / weight);
  const concentration = Math.min(1, (weight / total) * 1.3);
  return '#' + PALE.clone().lerp(avg, concentration).getHexString();
}

export function describeContents(contents: Contents): string {
  return contents.map((c) => `${SUBSTANCES[c.id].name} ${Math.round(c.ml * 10) / 10} мл`).join(' + ');
}

/** Short title for prompts: the single substance, or "Холимог". */
export function summarizeContents(contents: Contents | undefined): string {
  if (!contents || totalMl(contents) <= EPS) return '';
  const ml = Math.round(totalMl(contents));
  return contents.length === 1 ? `${SUBSTANCES[contents[0].id].name} ${ml} мл` : `Холимог ${ml} мл`;
}

/** One-line properties shown in the inspect card. */
export function describeState(contents: Contents): string[] {
  if (totalMl(contents) <= EPS) return [];
  const ph = phOf(contents);
  const lines = [`pH ≈ ${ph.toFixed(1)} (${ph < 6.5 ? 'хүчиллэг' : ph > 7.5 ? 'шүлтлэг' : 'саармаг'})`];
  if (amountOf(contents, 'cuoh2') > EPS) lines.push('Цэнхэр тунадастай, булингартай');
  return lines;
}

/** Applies every reaction that can take place, in order, until the mixture is stable. */
export function react(input: Contents): { contents: Contents; events: ReactionEvent[] } {
  let contents = clean(input);
  const events: ReactionEvent[] = [];
  for (let guard = 0; guard < 6; guard++) {
    const hcl = amountOf(contents, 'hcl');
    const naoh = amountOf(contents, 'naoh');
    const cuso4 = amountOf(contents, 'cuso4');
    const cuoh2 = amountOf(contents, 'cuoh2');
    if (hcl > EPS && naoh > EPS) {
      const e = Math.min(hcl, naoh);
      contents = add(add(add(contents, 'hcl', -e), 'naoh', -e), 'nacl', 2 * e);
      events.push({ title: 'Саармагжих урвал', detail: 'HCl + NaOH → NaCl + H₂O. Хүчил ба шүлт нэгдэж давс, ус үүсэж, бага зэрэг дулаан ялгарлаа.' });
    } else if (cuso4 > EPS && naoh > EPS) {
      const e = Math.min(cuso4, naoh);
      contents = add(add(add(add(contents, 'cuso4', -e), 'naoh', -e), 'cuoh2', e), 'na2so4', e);
      events.push({ title: 'Цэнхэр тунадас үүслээ', detail: 'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄. Зэсийн (II) гидроксид усанд уусдаггүй тул тунадас болно.' });
    } else if (cuoh2 > EPS && hcl > EPS) {
      const e = Math.min(cuoh2, hcl);
      contents = add(add(add(contents, 'cuoh2', -e), 'hcl', -e), 'cucl2', e);
      events.push({ title: 'Тунадас уусав', detail: 'Cu(OH)₂ + 2HCl → CuCl₂ + 2H₂O. Хүчил тунадсыг уусгаж, ногоон өнгөтэй зэсийн хлорид үүсгэв.' });
    } else {
      break;
    }
    contents = clean(contents);
  }
  const ph = phOf(contents);
  const indicator = contents.find((c) => SUBSTANCES[c.id].indicator);
  if (indicator && events.length === 0) {
    const s = SUBSTANCES[indicator.id];
    events.push({ title: `${s.name} өнгөө өөрчиллөө`, detail: `Заагч уусмалын орчноос (pH ≈ ${ph.toFixed(1)}) хамаарч өнгө нь солигдоно.` });
  }
  return { contents, events };
}
