/**
 * Words for mixtures: short names for prompts, composition lists for the inspect card,
 * and "observation flags" whose appearance is announced as a lab event (with the
 * equation) and checked by the experiment guide.
 */
import { AQ, SOLIDS, type AqId, type SolidId } from './species';
import { REAGENTS } from './reagents';
import { cuAmmine, phOf, PRECIPITATES } from './equilibrium';
import { liquidMl, mainSolid, solidMassG, type Mixture } from './mixture';

export function fmtMl(ml: number): string {
  if (ml >= 10) return `${Math.round(ml)} мл`;
  if (ml >= 1) return `${Math.round(ml * 10) / 10} мл`;
  return `${Math.round(ml * 100) / 100} мл`;
}

export function fmtG(g: number): string {
  if (g >= 10) return `${Math.round(g * 10) / 10} г`;
  if (g >= 0.1) return `${Math.round(g * 100) / 100} г`;
  return `${Math.round(g * 1000)} мг`;
}

/** Short name for prompts and tags: "Давсны хүчил (1 М) · 50 мл", "Холимог · 85 мл". */
export function summarize(m: Mixture | undefined): string {
  if (!m) return '';
  const ml = liquidMl(m);
  const g = solidMassG(m);
  if (ml < 0.01 && g < 0.002) return '';
  if (ml < 0.01) {
    const main = mainSolid(m);
    return main ? `${SOLIDS[main].name} · ${fmtG(g)}` : fmtG(g);
  }
  const named = m.from.filter((id) => id !== 'water');
  if (m.from.length === 1 || (named.length === 1 && m.from.length === 2 && !hasPrecipitate(m))) {
    const r = REAGENTS[named[0] ?? m.from[0]];
    const diluted = named.length === 1 && m.from.length === 2;
    if (r) return `${r.name}${diluted ? (r.solid ? ' — уусмал' : ' (шингэрүүлсэн)') : ''} · ${fmtMl(ml)}`;
  }
  return `Холимог · ${fmtMl(ml)}`;
}

export function hasPrecipitate(m: Mixture): boolean {
  return PRECIPITATES.some((id) => (m.s[id] ?? 0) > 2e-6);
}

export interface CompositionRow {
  name: string;
  formula: string;
  value: string;
}

/** Inspect card: what is dissolved and what is solid. */
export function composition(m: Mixture): { dissolved: CompositionRow[]; solids: CompositionRow[] } {
  const ml = liquidMl(m);
  const dissolved: CompositionRow[] = [];
  const V = ml / 1000;
  for (const [id, n] of Object.entries(m.aq) as [AqId, number][]) {
    if (n < 1e-8) continue;
    const def = AQ[id];
    dissolved.push({ name: def.name, formula: def.formula, value: V > 1e-6 ? `${(n / V).toPrecision(2)} М` : `${(n * 1000).toPrecision(2)} ммоль` });
  }
  if (m.ethanol > 0.01) dissolved.push({ name: 'Этанол', formula: 'C₂H₅OH', value: fmtMl(m.ethanol) });
  const solids: CompositionRow[] = [];
  for (const [id, n] of Object.entries(m.s) as [SolidId, number][]) {
    const g = n * SOLIDS[id].molarMass;
    if (g < 0.0005) continue;
    solids.push({ name: SOLIDS[id].name, formula: SOLIDS[id].formula, value: fmtG(g) });
  }
  return { dissolved, solids };
}

export type PhBand = 'strong-acid' | 'acid' | 'neutral' | 'base' | 'strong-base';

export function phBand(ph: number): PhBand {
  if (ph < 3) return 'strong-acid';
  if (ph < 6.5) return 'acid';
  if (ph <= 7.5) return 'neutral';
  if (ph <= 11) return 'base';
  return 'strong-base';
}

export const PH_WORDS: Record<PhBand, string> = {
  'strong-acid': 'хүчтэй хүчиллэг',
  acid: 'хүчиллэг',
  neutral: 'саармаг',
  base: 'шүлтлэг',
  'strong-base': 'хүчтэй шүлтлэг',
};

/** State flags of a mixture; a flag that newly appears is announced as an event. */
export function observationFlags(m: Mixture): Set<string> {
  const flags = new Set<string>();
  const ml = liquidMl(m);
  for (const id of PRECIPITATES) if ((m.s[id] ?? 0) * SOLIDS[id].molarMass > 0.0008) flags.add(`ppt:${id}`);
  if (ml < 0.01) return flags;
  const V = ml / 1000;
  const c = (id: AqId) => (m.aq[id] ?? 0) / V;
  if (Math.min(c('Fe3'), c('SCN')) > 1.5e-4) flags.add('complex:FeSCN');
  if (c('Cu') > 0.004 && (m.aq.NH3 ?? 0) > 0 && cuAmmine(m) > 0.5) flags.add('complex:CuNH3');
  if (c('starch') > 0 && Math.min(c('I2'), c('starch') * 0.3) > 1.2e-4) flags.add('starchIodine');
  if (c('MnO4') > 4e-4) flags.add('color:MnO4');
  const ph = phOf(m) ?? 7;
  flags.add(`ph:${phBand(ph)}`);
  if (c('phph') > 5e-6) flags.add(ph > 8.6 ? 'indicator:phph:pink' : 'indicator:phph:clear');
  if (c('btb') > 2e-6) flags.add(ph < 6.2 ? 'indicator:btb:yellow' : ph > 7.8 ? 'indicator:btb:blue' : 'indicator:btb:green');
  if (c('mo') > 2e-6) flags.add(ph < 3.3 ? 'indicator:mo:red' : ph > 4.4 ? 'indicator:mo:yellow' : 'indicator:mo:orange');
  if (c('ui') > 5e-6) flags.add(`indicator:ui:${phBand(ph)}`);
  if (m.burning) flags.add('burning');
  if (m.foam > 30) flags.add('foam');
  if (m.temp >= 99) flags.add('boil');
  return flags;
}

export interface LabEventText {
  title: string;
  detail: string;
}

const PPT_TEXT: Partial<Record<SolidId, LabEventText>> = {
  CuOH2: { title: 'Цэнхэр тунадас үүслээ', detail: 'Cu²⁺ + 2OH⁻ → Cu(OH)₂↓ — зэсийн (II) гидроксид усанд уусдаггүй.' },
  FeOH3: { title: 'Улаан хүрэн тунадас', detail: 'Fe³⁺ + 3OH⁻ → Fe(OH)₃↓ — төмрийн (III) гидроксид.' },
  FeOH2: { title: 'Ногоовтор тунадас', detail: 'Fe²⁺ + 2OH⁻ → Fe(OH)₂↓ — агаарт исэлдэж аажмаар хүрэн болно.' },
  AgCl: { title: 'Цагаан тунадас (AgCl)', detail: 'Ag⁺ + Cl⁻ → AgCl↓ — хлорид ионы чанарын урвал.' },
  AgI: { title: 'Цайвар шар тунадас (AgI)', detail: 'Ag⁺ + I⁻ → AgI↓ — иодид ионы чанарын урвал.' },
  BaSO4: { title: 'Цагаан тунадас (BaSO₄)', detail: 'Ba²⁺ + SO₄²⁻ → BaSO₄↓ — сульфат ионы чанарын урвал.' },
  PbI2: { title: 'Тод шар тунадас (PbI₂)', detail: 'Pb²⁺ + 2I⁻ → PbI₂↓ — «алтан бороо».' },
  PbSO4: { title: 'Цагаан тунадас (PbSO₄)', detail: 'Pb²⁺ + SO₄²⁻ → PbSO₄↓' },
  PbCl2: { title: 'Цагаан тунадас (PbCl₂)', detail: 'Pb²⁺ + 2Cl⁻ → PbCl₂↓' },
  PbOH2: { title: 'Цагаан тунадас (Pb(OH)₂)', detail: 'Pb²⁺ + 2OH⁻ → Pb(OH)₂↓' },
  CaCO3: { title: 'Цагаан булингар (CaCO₃)', detail: 'Ca²⁺ + CO₃²⁻ → CaCO₃↓ — шохойн ус булингартах нь карбонат/CO₂-ын шинж.' },
  BaCO3: { title: 'Цагаан тунадас (BaCO₃)', detail: 'Ba²⁺ + CO₃²⁻ → BaCO₃↓' },
  CuCO3: { title: 'Цэнхэр ногоон тунадас', detail: 'Cu²⁺ + CO₃²⁻ → CuCO₃↓ — зэсийн карбонат.' },
  MgOH2: { title: 'Цагаан тунадас (Mg(OH)₂)', detail: 'Mg²⁺ + 2OH⁻ → Mg(OH)₂↓' },
  ZnOH2: { title: 'Цагаан тунадас (Zn(OH)₂)', detail: 'Zn²⁺ + 2OH⁻ → Zn(OH)₂↓' },
  CaOH2: { title: 'Цагаан тунадас (Ca(OH)₂)', detail: 'Ca²⁺ + 2OH⁻ → Ca(OH)₂↓ — кальцийн гидроксид бага уусдаг.' },
  AgOH: { title: 'Хүрэн тунадас (Ag₂O)', detail: '2Ag⁺ + 2OH⁻ → Ag₂O↓ + H₂O' },
  MnOH2: { title: 'Цайвар тунадас (Mn(OH)₂)', detail: 'Mn²⁺ + 2OH⁻ → Mn(OH)₂↓' },
  MnO2: { title: 'Хүрэн тунадас (MnO₂)', detail: 'Саармаг орчинд перманганат MnO₂ болж ангижирна.' },
};

const INDICATOR_TEXT: Record<string, LabEventText> = {
  'indicator:phph:pink': { title: 'Фенолфталеин ягаан боллоо', detail: 'Орчин шүлтлэг (pH > 8.2).' },
  'indicator:phph:clear': { title: 'Ягаан өнгө алга боллоо', detail: 'Шүлт саармагжиж, орчин саармаг эсвэл хүчиллэг болов.' },
  'indicator:btb:yellow': { title: 'Бромтимол цэнхэр шар боллоо', detail: 'Орчин хүчиллэг (pH < 6).' },
  'indicator:btb:green': { title: 'Бромтимол цэнхэр ногоон боллоо', detail: 'Орчин саармаг (pH ≈ 7).' },
  'indicator:btb:blue': { title: 'Бромтимол цэнхэр цэнхэр боллоо', detail: 'Орчин шүлтлэг (pH > 7.6).' },
  'indicator:mo:red': { title: 'Метилоранж улаан боллоо', detail: 'Орчин хүчтэй хүчиллэг (pH < 3.1).' },
  'indicator:mo:orange': { title: 'Метилоранж улбар шар боллоо', detail: 'Шилжилтийн муж (pH 3.1–4.4).' },
  'indicator:mo:yellow': { title: 'Метилоранж шар боллоо', detail: 'pH > 4.4 — сул хүчиллэг, саармаг эсвэл шүлтлэг.' },
  'indicator:ui:strong-acid': { title: 'Универсаль индикатор: улаан', detail: 'pH ≈ 1–3, хүчтэй хүчиллэг.' },
  'indicator:ui:acid': { title: 'Универсаль индикатор: шар улбар', detail: 'pH ≈ 4–6, сул хүчиллэг.' },
  'indicator:ui:neutral': { title: 'Универсаль индикатор: ногоон', detail: 'pH ≈ 7, саармаг.' },
  'indicator:ui:base': { title: 'Универсаль индикатор: цэнхэр', detail: 'pH ≈ 8–11, шүлтлэг.' },
  'indicator:ui:strong-base': { title: 'Универсаль индикатор: нил ягаан', detail: 'pH ≈ 12–14, хүчтэй шүлтлэг.' },
};

const OTHER_TEXT: Record<string, LabEventText> = {
  'complex:FeSCN': { title: 'Цусан улаан өнгө!', detail: 'Fe³⁺ + SCN⁻ → [Fe(SCN)]²⁺ — төмөр (III)-ын ионыг илрүүлэх урвал.' },
  'complex:CuNH3': { title: 'Хар хөх комплекс үүслээ', detail: 'Cu²⁺ + 4NH₃ → [Cu(NH₃)₄]²⁺ — тунадас ууссан, тод хар хөх өнгөтэй.' },
  starchIodine: { title: 'Хар хөх өнгө — цардуул илэрлээ', detail: 'Иод цардуултай хар хөх нэгдэл үүсгэв.' },
  foam: { title: 'Хөөс оргилон гарлаа!', detail: '2H₂O₂ → 2H₂O + O₂↑ — ялгарсан хүчилтөрөгч савангаар хөөс болов.' },
  boil: { title: 'Буцалж байна', detail: 'Ус 100 °C-т буцалж уур болон ууршина.' },
  'gas:CO2': { title: 'CO₂ хий ялгарч хөөсөрлөө', detail: 'CO₃²⁻ + 2H⁺ → CO₂↑ + H₂O — карбонат хүчилтэй урвалд оров.' },
  'gas:H2': { title: 'Устөрөгч ялгарлаа', detail: 'Металл + 2H⁺ → металлын ион + H₂↑' },
  'gas:O2': { title: 'Хүчилтөрөгч ялгарлаа', detail: '2H₂O₂ → 2H₂O + O₂↑ (катализатор хурдасгав).' },
  'gas:NH3': { title: 'Аммиакийн хурц үнэр', detail: 'NH₄⁺ + OH⁻ → NH₃↑ + H₂O' },
  'displace:Cu': { title: 'Зэс ялгарлаа', detail: 'Идэвхтэй металл Cu²⁺ ионыг ангижруулав: Fe + Cu²⁺ → Fe²⁺ + Cu.' },
  'displace:Ag': { title: 'Мөнгөн талст ургалаа', detail: 'Cu + 2Ag⁺ → Cu²⁺ + 2Ag — зэс мөнгөнөөс идэвхтэй.' },
  'displace:Fe': { title: 'Төмөр ялгарлаа', detail: 'Идэвхтэй металл Fe²⁺ ионыг ангижруулав.' },
  'displace:Zn': { title: 'Цайр ялгарлаа', detail: 'Mg + Zn²⁺ → Mg²⁺ + Zn' },
  'decompose:CuOH2': { title: 'Хар өнгөтэй CuO үүслээ', detail: 'Cu(OH)₂ → CuO + H₂O (халаахад задарна).' },
  'hydrate:CuSO4': { title: 'Цагаан нунтаг цэнхэр боллоо', detail: 'CuSO₄ + 5H₂O → CuSO₄·5H₂O — ус илрүүлэх урвал, дулаан ялгарна.' },
  'decompose:CuSO4_5': { title: 'Талст усаа алдаж цайрлаа', detail: 'CuSO₄·5H₂O → CuSO₄ + 5H₂O↑ — усгүй зэсийн сульфат цагаан.' },
  'decompose:NaHCO3': { title: 'Сод задарлаа', detail: '2NaHCO₃ → Na₂CO₃ + H₂O + CO₂↑' },
  'decompose:sucrose': { title: 'Элсэн чихэр карамель боллоо', detail: 'Халахад элсэн чихэр хайлж бор өнгөтэй болно.' },
  'decompose:caramel': { title: 'Нүүрсжлээ', detail: 'Хэт халахад сахар задарч хар нүүрс, утаа үүснэ.' },
  'crystal:NaCl': { title: 'Давсны талст үүслээ', detail: 'Ус ууршихад натрийн хлорид талсжив.' },
  'crystal:CuSO4_5': { title: 'Цэнхэр талст үүслээ', detail: 'Ус ууршихад зэсийн сульфатын талст ургав.' },
  'crystal:KMnO4': { title: 'Нил ягаан талст үүслээ', detail: 'Калийн перманганат талсжив.' },
  dry: { title: 'Уусмал ууршиж дууслаа', detail: 'Саванд хатуу үлдэгдэл (талст) үлдлээ.' },
  ignite: { title: 'Этанол асаж шатлаа!', detail: 'Шатамхай уур дөлөнд хүрэв. Цагийн шилээр тагла эсвэл CO₂ гал унтраагуур ашигла.' },
  smother: { title: 'Гал унтарлаа', detail: 'Таглаад хүчилтөрөгчийг тасалснаар гал унтарлаа. Горелкоо унтраахаа мартуузай!' },
  extinguish: { title: 'Гал унтарлаа', detail: 'CO₂ хий хүчилтөрөгчийг түлхэж, галыг унтраав. Горелкоо унтраахаа мартуузай!' },
  burnout: { title: 'Гал өөрөө унтарлаа', detail: 'Шатах бодис дуусав эсвэл хэт шингэрэв.' },
  filter: { title: 'Шүүж байна', detail: 'Тунадас шүүлтүүрийн цаасан дээр үлдэж, тунгалаг шүүгдэс доорх саванд урсаж байна.' },
  neutralization: { title: 'Саармагжих урвал', detail: 'H⁺ + OH⁻ → H₂O — хүчил ба шүлт нэгдэж давс, ус үүсгэн дулаан ялгаруулав.' },
  'dissolve:cold': { title: 'Уусмал хөрлөө', detail: 'Уусахдаа дулаан шингээв (эндотерм уусалт).' },
  'dissolve:hot': { title: 'Уусмал халлаа', detail: 'Уусахдаа дулаан ялгаруулав (экзотерм уусалт).' },
  'decolorize:MnO4': { title: 'Перманганат өнгөө алдлаа', detail: 'MnO₄⁻ (нил ягаан) → Mn²⁺ (бараг өнгөгүй) — исэлдэн ангижрах урвал.' },
};

/** Text for an event key, or null for silent state flags. */
export function eventText(key: string): LabEventText | null {
  if (key.startsWith('ppt:')) return PPT_TEXT[key.slice(4) as SolidId] ?? null;
  return INDICATOR_TEXT[key] ?? OTHER_TEXT[key] ?? null;
}
