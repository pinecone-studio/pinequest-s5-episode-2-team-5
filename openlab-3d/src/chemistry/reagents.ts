/**
 * Every substance the lab stocks: liquid solutions in reagent or dropper bottles and
 * solids in wide-mouth jars. Concentrations follow a typical school lab.
 */
import type { AqId, SolidId } from './species';

export type ReagentId =
  | 'hcl'
  | 'h2so4'
  | 'acetic'
  | 'naoh'
  | 'nh3'
  | 'limewater'
  | 'na2co3'
  | 'nacl'
  | 'kcl'
  | 'licl'
  | 'cacl2'
  | 'bacl2'
  | 'cuso4'
  | 'fecl3'
  | 'feso4'
  | 'znso4'
  | 'na2so4'
  | 'ki'
  | 'agno3'
  | 'pbno3'
  | 'kscn'
  | 'kmno4'
  | 'h2o2'
  | 'phph'
  | 'btb'
  | 'mo'
  | 'ui'
  | 'starch'
  | 'iodine'
  | 'water'
  | 'ethanol'
  | 'soap'
  | 'dyeRed'
  | 'dyeYellow'
  | 'dyeGreen'
  | 'dyeBlue'
  | 's_nacl'
  | 's_cuso4'
  | 's_cuso4anh'
  | 's_nahco3'
  | 's_caco3'
  | 's_zn'
  | 's_mg'
  | 's_fe'
  | 's_cu'
  | 's_naoh'
  | 's_nh4no3'
  | 's_mno2'
  | 's_kmno4'
  | 's_sugar';

export type ReagentCategory = 'acid' | 'base' | 'salt' | 'indicator' | 'special' | 'solid' | 'other';
export type Hazard = 'corrosive' | 'toxic' | 'flammable' | 'oxidizer' | 'irritant' | 'env';
export type ReagentContainer = 'reagentBottle' | 'dropperBottle' | 'reagentJar';

export interface Reagent {
  id: ReagentId;
  name: string;
  /** Short label printed on the bottle. */
  label: string;
  category: ReagentCategory;
  container: ReagentContainer;
  /** Stock amount: mL for liquids, g for solids. */
  stock: number;
  /** Liquids: mol/L of each dissolved species; `ethanol` is the ethanol volume fraction. */
  solution?: { solutes: Partial<Record<AqId, number>>; ethanol?: number };
  /** Solids: what the jar holds. */
  solid?: SolidId;
  hazards: Hazard[];
  note: string;
  stripe: string;
}

export const CATEGORY_LABELS: Record<ReagentCategory, string> = {
  acid: 'Хүчил',
  base: 'Шүлт',
  salt: 'Давсны уусмал',
  indicator: 'Заагч',
  special: 'Тусгай урвалж',
  solid: 'Хатуу бодис',
  other: 'Ус, спирт, будаг',
};

export const HAZARD_LABELS: Record<Hazard, { label: string; icon: string }> = {
  corrosive: { label: 'Идэмхий', icon: '⚠' },
  toxic: { label: 'Хортой', icon: '☠' },
  flammable: { label: 'Шатамхай', icon: '🔥' },
  oxidizer: { label: 'Исэлдүүлэгч', icon: '◎' },
  irritant: { label: 'Цочроогч', icon: '!' },
  env: { label: 'Байгаль орчинд хортой', icon: '🐟' },
};

const L = (
  id: ReagentId,
  name: string,
  label: string,
  category: ReagentCategory,
  solutes: Partial<Record<AqId, number>>,
  opts: { container?: ReagentContainer; stock?: number; ethanol?: number; hazards?: Hazard[]; note: string; stripe: string },
): Reagent => ({
  id,
  name,
  label,
  category,
  container: opts.container ?? 'reagentBottle',
  stock: opts.stock ?? (opts.container === 'dropperBottle' ? 30 : 250),
  solution: { solutes, ethanol: opts.ethanol },
  hazards: opts.hazards ?? [],
  note: opts.note,
  stripe: opts.stripe,
});

const S = (id: ReagentId, name: string, label: string, solid: SolidId, opts: { hazards?: Hazard[]; note: string; stripe: string; stock?: number }): Reagent => ({
  id,
  name,
  label,
  category: 'solid',
  container: 'reagentJar',
  stock: opts.stock ?? 100,
  solid,
  hazards: opts.hazards ?? [],
  note: opts.note,
  stripe: opts.stripe,
});

const LIST: Reagent[] = [
  // Acids.
  L('hcl', 'Давсны хүчил (1 М)', 'HCl', 'acid', { Cl: 1 }, { hazards: ['corrosive'], note: 'Хүчтэй хүчил. Металл, карбонаттай урвалд орж хий ялгаруулна.', stripe: '#dc2626' }),
  L('h2so4', 'Хүхрийн хүчил (0.5 М)', 'H₂SO₄', 'acid', { SO4: 0.5 }, { hazards: ['corrosive'], note: 'Хоёр протонт хүчтэй хүчил. Барийн ионтой цагаан тунадас өгнө.', stripe: '#b91c1c' }),
  L('acetic', 'Цууны хүчил (1 М)', 'CH₃COOH', 'acid', { Ac: 1 }, { hazards: ['irritant'], note: 'Сул хүчил (хүнсний цуу). Хүнсний содтой хөөсөрнө.', stripe: '#f97316' }),
  // Bases.
  L('naoh', 'Натрийн гидроксид (1 М)', 'NaOH', 'base', { Na: 1 }, { hazards: ['corrosive'], note: 'Хүчтэй шүлт. Металлын ионтой гидроксидын тунадас үүсгэнэ.', stripe: '#2563eb' }),
  L('nh3', 'Аммиакийн ус (2 М)', 'NH₃', 'base', { NH3: 2 }, { hazards: ['corrosive', 'irritant'], note: 'Сул шүлт, хурц үнэртэй. Зэсийн ионтой хар хөх комплекс үүсгэнэ.', stripe: '#3b82f6' }),
  L('limewater', 'Шохойн ус', 'Ca(OH)₂', 'base', { Ca: 0.01 }, { hazards: ['irritant'], note: 'Кальцийн гидроксидын тунгалаг уусмал. CO₂ эсвэл карбонаттай цайвар булингар болно.', stripe: '#60a5fa' }),
  L('na2co3', 'Натрийн карбонат (0.5 М)', 'Na₂CO₃', 'base', { Na: 1, CO3: 0.5 }, { hazards: ['irritant'], note: 'Шүлтлэг давс (угаалгын сод). Хүчилтэй CO₂ ялгаруулна.', stripe: '#0284c7' }),
  // Salt solutions.
  L('nacl', 'Натрийн хлорид (1 М)', 'NaCl', 'salt', { Na: 1, Cl: 1 }, { note: 'Хоолны давсны уусмал. Дөлийг шар улбар өнгөтэй болгоно.', stripe: '#16a34a' }),
  L('kcl', 'Калийн хлорид (1 М)', 'KCl', 'salt', { K: 1, Cl: 1 }, { note: 'Дөлийн сорилд ягаан нил өнгө өгнө.', stripe: '#a855f7' }),
  L('licl', 'Литийн хлорид (0.5 М)', 'LiCl', 'salt', { Li: 0.5, Cl: 0.5 }, { hazards: ['irritant'], note: 'Дөлийн сорилд час улаан өнгө өгнө.', stripe: '#e11d48' }),
  L('cacl2', 'Кальцийн хлорид (0.5 М)', 'CaCl₂', 'salt', { Ca: 0.5, Cl: 1 }, { hazards: ['irritant'], note: 'Дөлийг тоосгон улаан болгоно. Карбонаттай цагаан тунадас өгнө.', stripe: '#ea580c' }),
  L('bacl2', 'Барийн хлорид (0.1 М)', 'BaCl₂', 'salt', { Ba: 0.1, Cl: 0.2 }, { hazards: ['toxic'], note: 'Сульфат ионыг илрүүлнэ (цагаан BaSO₄ тунадас). Хортой — бүү залгь.', stripe: '#65a30d' }),
  L('cuso4', 'Зэсийн (II) сульфат (0.5 М)', 'CuSO₄', 'salt', { Cu: 0.5, SO4: 0.5 }, { hazards: ['irritant', 'env'], note: 'Цэнхэр уусмал. Шүлттэй цэнхэр тунадас, төмөртэй зэс ялгаруулна.', stripe: '#0ea5e9' }),
  L('fecl3', 'Төмрийн (III) хлорид (0.1 М)', 'FeCl₃', 'salt', { Fe3: 0.1, Cl: 0.3 }, { hazards: ['corrosive'], note: 'Шар хүрэн, хүчиллэг уусмал. Тиоцианаттай цусан улаан өнгө өгнө.', stripe: '#b45309' }),
  L('feso4', 'Төмрийн (II) сульфат (0.1 М)', 'FeSO₄', 'salt', { Fe2: 0.1, SO4: 0.1 }, { hazards: ['irritant'], note: 'Цайвар ногоон уусмал. Шүлттэй ногоон тунадас өгч, агаарт хүрэнтэнэ.', stripe: '#4d7c0f' }),
  L('znso4', 'Цайрын сульфат (0.5 М)', 'ZnSO₄', 'salt', { Zn: 0.5, SO4: 0.5 }, { hazards: ['irritant', 'env'], note: 'Өнгөгүй уусмал. Металлын идэвхийг шалгахад хэрэглэнэ.', stripe: '#64748b' }),
  L('na2so4', 'Натрийн сульфат (0.5 М)', 'Na₂SO₄', 'salt', { Na: 1, SO4: 0.5 }, { note: 'Сульфат ион агуулсан саармаг давс.', stripe: '#14b8a6' }),
  L('ki', 'Калийн иодид (0.5 М)', 'KI', 'salt', { K: 0.5, I: 0.5 }, { note: 'Мөнгө, хар тугалгын ионтой шар тунадас өгнө. H₂O₂-ийн задралыг хурдасгана.', stripe: '#facc15' }),
  // Special reagents.
  L('agno3', 'Мөнгөний нитрат (0.1 М)', 'AgNO₃', 'special', { Ag: 0.1, NO3: 0.1 }, { container: 'dropperBottle', hazards: ['corrosive', 'env'], note: 'Хлорид ионыг илрүүлнэ (цагаан AgCl). Арьсыг харлуулна — бээлий өмс.', stripe: '#94a3b8' }),
  L('pbno3', 'Хар тугалганы (II) нитрат (0.1 М)', 'Pb(NO₃)₂', 'special', { Pb: 0.1, NO3: 0.2 }, { container: 'dropperBottle', hazards: ['toxic', 'env'], note: 'Иодидтой тод шар PbI₂ тунадас өгнө. Маш хортой — хаягдлын саванд хий.', stripe: '#475569' }),
  L('kscn', 'Калийн тиоцианат (0.1 М)', 'KSCN', 'special', { K: 0.1, SCN: 0.1 }, { container: 'dropperBottle', hazards: ['irritant'], note: 'Fe³⁺ ионыг илрүүлнэ: цусан улаан өнгө.', stripe: '#be123c' }),
  L('kmno4', 'Калийн перманганат (0.02 М)', 'KMnO₄', 'special', { K: 0.02, MnO4: 0.02 }, { hazards: ['oxidizer', 'env'], note: 'Хүчтэй исэлдүүлэгч, нил ягаан. Хүчиллэг орчинд өнгөө алдана.', stripe: '#7e22ce' }),
  L('h2o2', 'Устөрөгчийн хэт исэл (3%)', 'H₂O₂', 'special', { H2O2: 0.88 }, { hazards: ['oxidizer', 'irritant'], note: 'Катализаторын (KI, MnO₂) нөлөөгөөр хүчилтөрөгч ялгаруулж задарна.', stripe: '#0891b2' }),
  // Indicators.
  L('phph', 'Фенолфталеин', 'ФФ', 'indicator', { phph: 0.03 }, { container: 'dropperBottle', ethanol: 0.5, hazards: ['flammable'], note: 'Хүчил, саармаг орчинд өнгөгүй; pH > 8.2 үед ягаан.', stripe: '#db2777' }),
  L('btb', 'Бромтимол цэнхэр', 'БТЦ', 'indicator', { btb: 0.004 }, { container: 'dropperBottle', note: 'Хүчилд шар, саармагт ногоон, шүлтэд цэнхэр.', stripe: '#0d9488' }),
  L('mo', 'Метилоранж', 'МО', 'indicator', { mo: 0.003 }, { container: 'dropperBottle', note: 'pH < 3.1 үед улаан, pH > 4.4 үед шар.', stripe: '#ea580c' }),
  L('ui', 'Универсаль индикатор', 'УИ', 'indicator', { ui: 0.01 }, { container: 'dropperBottle', ethanol: 0.3, hazards: ['flammable'], note: 'pH-ийг өнгөөр харуулна: улаан (1) → шар → ногоон (7) → цэнхэр → нил ягаан (14).', stripe: '#16a34a' }),
  L('starch', 'Цардуулын уусмал (1%)', 'Цардуул', 'indicator', { starch: 0.06 }, { note: 'Иодтой хар хөх өнгө өгнө.', stripe: '#a3a3a3' }),
  L('iodine', 'Иодын уусмал (Люголь)', 'I₂ + KI', 'indicator', { I2: 0.05, K: 0.1, I: 0.1 }, { container: 'dropperBottle', hazards: ['irritant'], note: 'Цардуулыг илрүүлнэ. Хүрэн өнгөтэй.', stripe: '#92400e' }),
  // Water, ethanol, soap, dyes.
  L('water', 'Нэрмэл ус', 'H₂O', 'other', {}, { note: 'Ионгүй цэвэр ус. Уусмал шингэлэх, сав зайлахад хэрэглэнэ.', stripe: '#38bdf8' }),
  L('ethanol', 'Этанол (96%)', 'C₂H₅OH', 'other', {}, { ethanol: 0.96, hazards: ['flammable'], note: 'Маш шатамхай! Ил галаас хол байлга. Шатвал цагийн шилээр тагла эсвэл CO₂ гал унтраагуур хэрэглэ.', stripe: '#f59e0b' }),
  L('soap', 'Угаалгын шингэн', 'Саван', 'other', { soap: 0.2 }, { note: 'Хий ялгарах үед хөөс үүсгэнэ ("зааны шүдний оо").', stripe: '#22c55e' }),
  L('dyeRed', 'Хүнсний будаг (улаан)', 'Улаан', 'other', { dyeR: 0.01 }, { container: 'dropperBottle', note: 'Өнгө холих туршилтад.', stripe: '#dc2626' }),
  L('dyeYellow', 'Хүнсний будаг (шар)', 'Шар', 'other', { dyeY: 0.01 }, { container: 'dropperBottle', note: 'Өнгө холих туршилтад.', stripe: '#eab308' }),
  L('dyeGreen', 'Хүнсний будаг (ногоон)', 'Ногоон', 'other', { dyeG: 0.01 }, { container: 'dropperBottle', note: 'Өнгө холих туршилтад.', stripe: '#16a34a' }),
  L('dyeBlue', 'Хүнсний будаг (цэнхэр)', 'Цэнхэр', 'other', { dyeB: 0.01 }, { container: 'dropperBottle', note: 'Өнгө холих туршилтад.', stripe: '#2563eb' }),
  // Solids.
  S('s_nacl', 'Натрийн хлорид (талст)', 'NaCl', 'NaCl', { note: 'Хоолны давс. Усанд сайн уусна.', stripe: '#16a34a' }),
  S('s_cuso4', 'Зэсийн (II) сульфат (талст)', 'CuSO₄·5H₂O', 'CuSO4_5', { hazards: ['irritant', 'env'], note: 'Цэнхэр талст. Халаахад усаа алдаж цагаан болно.', stripe: '#0ea5e9' }),
  S('s_cuso4anh', 'Усгүй зэсийн (II) сульфат', 'CuSO₄', 'CuSO4', { hazards: ['irritant', 'env'], note: 'Цагаан нунтаг. Ус дуслахад цэнхэр болж дулаан ялгаруулна (ус илрүүлэх).', stripe: '#94a3b8' }),
  S('s_nahco3', 'Хүнсний сод', 'NaHCO₃', 'NaHCO3', { note: 'Натрийн гидрокарбонат. Хүчилтэй хөөсөрч CO₂ ялгаруулна.', stripe: '#38bdf8' }),
  S('s_caco3', 'Гантиг (кальцийн карбонат)', 'CaCO₃', 'CaCO3', { note: 'Усанд уусдаггүй. Хүчилд хөөсөрч уусна.', stripe: '#a8a29e' }),
  S('s_zn', 'Цайр (мөхлөг)', 'Zn', 'Zn', { note: 'Хүчилтэй устөрөгч ялгаруулна. Зэсийн ионыг ялгаруулна.', stripe: '#64748b' }),
  S('s_mg', 'Магни (тууз)', 'Mg', 'Mg', { hazards: ['flammable'], note: 'Идэвхтэй металл. Хүчилд хүчтэй хөөсөрч халуу оргино.', stripe: '#9ca3af' }),
  S('s_fe', 'Төмрийн үртэс', 'Fe', 'Fe', { note: 'Зэсийн сульфатын уусмалаас зэс ялгаруулна.', stripe: '#52525b' }),
  S('s_cu', 'Зэсийн үртэс', 'Cu', 'Cu', { note: 'Сул идэвхтэй металл. Мөнгөний нитратаас мөнгө ялгаруулна.', stripe: '#c2410c' }),
  S('s_naoh', 'Натрийн гидроксид (мөхлөг)', 'NaOH', 'NaOH', { hazards: ['corrosive'], note: 'Усанд уусахдаа их дулаан ялгаруулна. Гараар бүү хүр!', stripe: '#2563eb' }),
  S('s_nh4no3', 'Аммонийн нитрат', 'NH₄NO₃', 'NH4NO3', { hazards: ['oxidizer'], note: 'Усанд уусахдаа дулаан шингээж, уусмалыг хөргөнө.', stripe: '#0f766e' }),
  S('s_mno2', 'Манганы (IV) исэл', 'MnO₂', 'MnO2', { hazards: ['irritant'], note: 'Хар нунтаг катализатор. H₂O₂-ийг задална.', stripe: '#1f2937' }),
  S('s_kmno4', 'Калийн перманганат (талст)', 'KMnO₄', 'KMnO4', { hazards: ['oxidizer', 'env'], note: 'Хар нил талст. Усанд уусахад нил ягаан өнгө тархана.', stripe: '#7e22ce' }),
  S('s_sugar', 'Элсэн чихэр', 'C₁₂H₂₂O₁₁', 'sucrose', { note: 'Халаахад хайлж карамель, цаашлаад нүүрс болно.', stripe: '#d6d3d1' }),
];

export const REAGENTS: Record<ReagentId, Reagent> = Object.fromEntries(LIST.map((r) => [r.id, r])) as Record<ReagentId, Reagent>;
export const REAGENT_LIST: Reagent[] = LIST;
