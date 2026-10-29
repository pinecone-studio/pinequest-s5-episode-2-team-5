import { EXTRA_REAGENTS, type ExtraReagentId, type GasId } from '../experiments/curriculum/materials';
/**
 * Every substance the lab stocks: liquid solutions in reagent or dropper bottles and
 * solids in wide-mouth jars. Concentrations follow a typical school lab.
 */
import type { AqId, SolidId } from './species';

export type ReagentId = ExtraReagentId | 's_ice' | 's_al' | 's_p' | 's_s' | 's_si' | 's_graphite' | 's_iodine' | 's_fe2o3' | 's_pbo2' | 's_zno' | 's_gelatin' | 's_paper' | 's_sand' | 's_citric' | 's_litmus_red' | 's_litmus_blue' | 's_cocl2anh' | 's_caoh2' | 's_cuo' | 's_na2co3' | 'plastic' | 'hot_water' | 'cold_water' | 'chlorine' | 'bromine' | 'kbr' | 'dichromate' | 'cocl2' | 'cucl2' | 'inkA' | 'inkB' | 'lemon' | 'wine' | 'soda' | 'cola' | 'tomato' | 'oil' | 'paint' |
   'hcl'
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
  | 's_nh4cl' | 's_mgoh2' | 'koh'
  | 's_cuco3'
  | 's_kcl'
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
export type ReagentContainer = 'gasCylinder' | 'reagentBottle' | 'dropperBottle' | 'reagentJar' | 'paperStrip';

export interface Reagent {
  id: ReagentId;
  name: string;
  /** Short label printed on the bottle. */
  label: string;
  category: ReagentCategory;
  container: ReagentContainer;
  /** Stock amount: mL for liquids, g for solids. */
  stock: number;
  temperature?: number;
  /** Liquids: mol/L of each dissolved species; `ethanol` is the ethanol volume fraction. */
  solution?: { solutes: Partial<Record<AqId, number>>; ethanol?: number };
  /** Solids: what the jar holds. */
  solid?: SolidId;
  gas?: GasId;
  gasBlend?: Partial<Record<GasId, number>>;
  blend?: Partial<Record<SolidId, number>>;
  liquid?: AqId;
  liquidBlend?: Partial<Record<AqId, number>>;
  solvent?: AqId;
  hazards: Hazard[];
  note: string;
  stripe: string;
  /**
   * Real color of the stock liquid in its bottle. Set only where the simulation's color of the
   * undiluted stock is wrong (indicators, dyes, iodine and permanganate come out black or off-hue).
   */
  color?: string;
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
  opts: { container?: ReagentContainer; stock?: number; ethanol?: number; hazards?: Hazard[]; note: string; stripe: string; color?: string },
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
  color: opts.color,
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
  ...EXTRA_REAGENTS,
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
  L('kmno4', 'Калийн перманганат (0.02 М)', 'KMnO₄', 'special', { K: 0.02, MnO4: 0.02 }, { hazards: ['oxidizer', 'env'], note: 'Хүчтэй исэлдүүлэгч, нил ягаан. Хүчиллэг орчинд өнгөө алдана.', stripe: '#7e22ce', color: '#6d1a9c' }),
  L('h2o2', 'Устөрөгчийн хэт исэл (3%)', 'H₂O₂', 'special', { H2O2: 0.88 }, { hazards: ['oxidizer', 'irritant'], note: 'Катализаторын (KI, MnO₂) нөлөөгөөр хүчилтөрөгч ялгаруулж задарна.', stripe: '#0891b2' }),
  // Indicators.
  L('phph', 'Фенолфталеин', 'ФФ', 'indicator', { phph: 0.03 }, { container: 'dropperBottle', ethanol: 0.5, hazards: ['flammable'], note: 'Хүчил, саармаг орчинд өнгөгүй; pH > 8.2 үед ягаан.', stripe: '#db2777', color: '#e2f0fa' }),
  L('btb', 'Бромтимол цэнхэр', 'БТЦ', 'indicator', { btb: 0.004 }, { container: 'dropperBottle', note: 'Хүчилд шар, саармагт ногоон, шүлтэд цэнхэр.', stripe: '#0d9488', color: '#3fa66a' }),
  L('mo', 'Метилоранж', 'МО', 'indicator', { mo: 0.003 }, { container: 'dropperBottle', note: 'pH < 3.1 үед улаан, pH > 4.4 үед шар.', stripe: '#ea580c', color: '#f29a1a' }),
  L('ui', 'Универсаль индикатор', 'УИ', 'indicator', { ui: 0.01 }, { container: 'dropperBottle', ethanol: 0.3, hazards: ['flammable'], note: 'pH-ийг өнгөөр харуулна: улаан (1) → шар → ногоон (7) → цэнхэр → нил ягаан (14).', stripe: '#16a34a', color: '#4fb83a' }),
  L('starch', 'Цардуулын уусмал (1%)', 'Цардуул', 'indicator', { starch: 0.06 }, { note: 'Иодтой хар хөх өнгө өгнө.', stripe: '#a3a3a3' }),
  L('iodine', 'Иодын уусмал (Люголь)', 'I₂ + KI', 'indicator', { I2: 0.05, K: 0.1, I: 0.1 }, { container: 'dropperBottle', hazards: ['irritant'], note: 'Цардуулыг илрүүлнэ. Хүрэн өнгөтэй.', stripe: '#92400e', color: '#8a4a1c' }),
  // Water, ethanol, soap, dyes.
  L('water', 'Нэрмэл ус', 'H₂O', 'other', {}, { note: 'Ионгүй цэвэр ус. Уусмал шингэлэх, сав зайлахад хэрэглэнэ.', stripe: '#38bdf8' }),
  L('ethanol', 'Этанол (96%)', 'C₂H₅OH', 'other', {}, { ethanol: 0.96, hazards: ['flammable'], note: 'Маш шатамхай! Ил галаас хол байлга. Шатвал цагийн шилээр тагла эсвэл CO₂ гал унтраагуур хэрэглэ.', stripe: '#f59e0b' }),
  L('soap', 'Угаалгын шингэн', 'Саван', 'other', { soap: 0.2 }, { note: 'Хий ялгарах үед хөөс үүсгэнэ ("зааны шүдний оо").', stripe: '#22c55e' }),
  L('dyeRed', 'Хүнсний будаг (улаан)', 'Улаан', 'other', { dyeR: 0.01 }, { container: 'dropperBottle', note: 'Өнгө холих туршилтад.', stripe: '#dc2626', color: '#d4161e' }),
  L('dyeYellow', 'Хүнсний будаг (шар)', 'Шар', 'other', { dyeY: 0.01 }, { container: 'dropperBottle', note: 'Өнгө холих туршилтад.', stripe: '#eab308', color: '#f5c800' }),
  L('dyeGreen', 'Хүнсний будаг (ногоон)', 'Ногоон', 'other', { dyeG: 0.01 }, { container: 'dropperBottle', note: 'Өнгө холих туршилтад.', stripe: '#16a34a', color: '#1fa84f' }),
  L('dyeBlue', 'Хүнсний будаг (цэнхэр)', 'Цэнхэр', 'other', { dyeB: 0.01 }, { container: 'dropperBottle', note: 'Өнгө холих туршилтад.', stripe: '#2563eb', color: '#1f55d6' }),
  // Solids.
  S('s_nacl', 'Натрийн хлорид (талст)', 'NaCl', 'NaCl', { note: 'Хоолны давс. Усанд сайн уусна.', stripe: '#16a34a' }),
 {...S('s_ice','Мөс','H₂O(s)','ice',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#e0f5ff',hazards:[]}),temperature:-10},
 S('s_al','Хөнгөнцагаан','Al','Al',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#bfcbd2',hazards:[]}),
 S('s_p','Улаан фосфор','P','P',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#9c4134',hazards:[]}),
 S('s_s','Хүхэр','S','S',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#e9cd35',hazards:[]}),
 S('s_si','Цахиур','Si','Si',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#6d7085',hazards:[]}),
 S('s_graphite','Графит','C','graphite',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#222b35',hazards:[]}),
 S('s_iodine','Иодын талст','I₂','iodine',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#483852',hazards:[]}),
 S('s_fe2o3','Төмрийн (III) исэл','Fe₂O₃','Fe2O3',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#a34028',hazards:[]}),
 S('s_pbo2','Хар тугалганы (IV) исэл','PbO₂','PbO2',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#493f36',hazards:['toxic','env']}),
 S('s_zno','Цайрын исэл','ZnO','ZnO',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#f3f5eb',hazards:[]}),
 S('s_gelatin','Желатин','Желатин','gelatin',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#eed8ac',hazards:[]}),
 {...S('s_paper','Шүүлтүүрийн цаас','Целлюлоз','paper',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#f7f1db',hazards:[]}),container:'paperStrip',stock:.2},
 S('s_sand','Элс','SiO₂','sand',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#d1b98c',hazards:[]}),
 S('s_citric','Нимбэгийн хүчил','C₆H₈O₇','citric',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#f8fafb',hazards:[]}),
 {...S('s_litmus_red','Улаан лакмус','Лакмус','litmus_red',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#dd5470',hazards:[]}),container:'paperStrip',stock:.05},
 {...S('s_litmus_blue','Хөх лакмус','Лакмус','litmus_blue',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#5566d9',hazards:[]}),container:'paperStrip',stock:.05},
 S('s_cocl2anh','Усгүй кобальтын хлорид','CoCl₂','CoCl2',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#526ac6',hazards:['toxic','env']}),
 S('s_caoh2','Кальцийн гидроксид','Ca(OH)₂','CaOH2',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#edf1f3',hazards:[]}),
 S('s_cuo','CuO','CuO','CuO',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#edf1f3',hazards:[]}),
 S('s_na2co3','Na2CO3','Na2CO3','Na2CO3',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#edf1f3',hazards:[]}),
 S('plastic','Хуванцар бүрхүүл','Бүрхүүл','plastic',{note:'IX ангийн туршилтын зориулалтын бодис.',stripe:'#f1f5f9',hazards:[]}),
 {...L('hot_water','Халуун ус','H₂O · 60°C','other',{},{note:'Цайны данхнаас авсан халуун ус. Түлэгдэхээс болгоомжил — хавчаар, бээлий хэрэглэ.',stripe:'#e65f5f',hazards:['irritant']}),temperature:60},
 {...L('cold_water','Хүйтэн ус','H₂O · 10°C','other',{},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#5b9dea',hazards:[]}),temperature:10},
 L('chlorine','Хлорын ус','Cl₂ · 0.02 M','special',{Cl2:.02},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#d5e38d',hazards:['toxic','env']}),
 L('bromine','Бромын ус','Br₂ · 0.02 M','special',{Br2:.02},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#bb7639',hazards:['toxic','env']}),
 L('kbr','Калийн бромид','KBr · 0.1 M','salt',{K:.1,Br:.1},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#e4e7eb',hazards:[]}),
 L('dichromate','Калийн дихромат','K₂Cr₂O₇ · 0.02 M','salt',{K:.04,Cr2O7:.02},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#f1a12a',hazards:['toxic','env']}),
 L('cocl2','Кобальтын хлорид','CoCl₂ · 0.1 M','salt',{Co:.1,Cl:.2},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#e69ec0',hazards:['toxic','env']}),
 L('cucl2','Зэсийн хлорид','CuCl₂ · 0.1 M','salt',{Cu:.1,Cl:.2},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#3bada2',hazards:[]}),
 L('inkA','Бэх A','Бэх A','other',{dyeR:1e-5,dyeY:1e-5,dyeB:1e-5},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#4a4359',hazards:[]}),
 L('inkB','Бэх B','Бэх B','other',{dyeR:2e-5,dyeB:1e-5},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#57406b',hazards:[]}),
 L('lemon','Нимбэгийн шүүс · загвар дээж','pH сорил','other',{Cit:.05},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#e4dc73',hazards:[],color:'#efe38c'}),
 L('wine','Дарсны жишээ дээж','pH сорил','other',{Ac:.003},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#944269',hazards:[],color:'#7d2243'}),
 L('soda','Хийжүүлсэн ундааны дээж','pH сорил','other',{CO3:.01},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#bba872',hazards:[]}),
 L('cola','Кола · загвар дээж','pH сорил','other',{Ac:.03},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#593829',hazards:[],color:'#4a2a16'}),
 L('tomato','Улаан лоолийн шүүс · загвар','Хольц','other',{dyeR:3e-5},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#c54435',hazards:[]}),
 L('oil','Хамгаалах тос','Тосон бүрхүүл','other',{},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#ddc278',hazards:[],color:'#e0c050'}),
 L('paint','Хамгаалах будаг','Будаг','other',{dyeB:1e-5},{note:'IX ангийн виртуал лабораторийн дээж. Өрхийн дээжийн найрлагыг хялбаршуулсан.',stripe:'#5092a5',hazards:[]}),
  S('s_nh4cl', 'Аммонийн хлорид', 'NH₄Cl', 'NH4Cl', {hazards:['irritant'],note:'Усанд уусахад дулаан шингээнэ.',stripe:'#dce5ec'}),
  S('s_mgoh2', 'Магнийн гидроксид', 'Mg(OH)₂', 'MgOH2', {note:'Усанд муу уусдаг суурь; хүчилтэй саармагжина.',stripe:'#dce5ec'}),
  L('koh', 'Калийн гидроксид', 'KOH · 1 M', 'base', {K:1}, {hazards:['corrosive'],note:'1 моль/л виртуал уусмал.',stripe:'#818cf8'}),
  S('s_cuco3', 'Зэсийн (II) карбонат', 'CuCO₃', 'CuCO3', { hazards: ['irritant','env'], note: 'Хүчилтэй урвалдаж зэсийн давс ба CO₂ үүсгэнэ.', stripe: '#4cb39e' }),
  S('s_kcl', 'Калийн хлорид (хатуу)', 'KCl', 'KCl', { note: 'Усанд уусахад дулаан шингээж хөргөнө.', stripe: '#a855f7' }),
  S('s_cuso4', 'Зэсийн (II) сульфат (талст)', 'CuSO₄·5H₂O', 'CuSO4_5', { hazards: ['irritant', 'env'], note: 'Цэнхэр талст. Халаахад усаа алдаж цагаан болно.', stripe: '#0ea5e9' }),
  S('s_cuso4anh', 'Усгүй зэсийн (II) сульфат', 'CuSO₄', 'CuSO4', { hazards: ['irritant', 'env'], note: 'Цагаан нунтаг. Ус дуслахад цэнхэр болж дулаан ялгаруулна (ус илрүүлэх).', stripe: '#94a3b8' }),
  S('s_nahco3', 'Хүнсний сод', 'NaHCO₃', 'NaHCO3', { note: 'Натрийн гидрокарбонат. Хүчилтэй хөөсөрч CO₂ ялгаруулна.', stripe: '#38bdf8' }),
  S('s_caco3', 'Гантиг (кальцийн карбонат)', 'CaCO₃', 'marble', { note: 'Усанд уусдаггүй. Хүчилд хөөсөрч уусна.', stripe: '#a8a29e' }),
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

const oilStock=LIST.find(r=>r.id==='oil');if(oilStock){oilStock.liquid='oilFluid';oilStock.solution={solutes:{}};}
export const REAGENTS: Record<ReagentId, Reagent> = Object.fromEntries(LIST.map((r) => [r.id, r])) as Record<ReagentId, Reagent>;
export const REAGENT_LIST: Reagent[] = LIST;
