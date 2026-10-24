/**
 * Content for the NaCl bench experiment (textbook Туршилт 1, fig. 1.2.8, steps а–з):
 * step titles, what is inside each vessel, apparatus names and uses. All in Mongolian.
 */
import { CLEAR_LIQUID } from '../../chemistry/real-color';
import { SOLIDS } from '../../chemistry/species';

/** Colorless solution with a little suspended solid, as the bench draws it. */
const MILKY_LIQUID = '#e9eef1';

export interface StepDef {
  k: string;
  title: string;
}

export const STEPS: StepDef[] = [
  { k: 'а', title: 'Хүчил хэмжих' },
  { k: 'б', title: 'Натрийн карбонат нэмэх' },
  { k: 'в', title: 'Холимгийг шүүх' },
  { k: 'г', title: 'Ууршуулах' },
  { k: 'д', title: 'Хөргөж талстжуулах' },
  { k: 'е', title: 'Талстыг шүүх' },
  { k: 'ж', title: 'Талстыг хатаах' },
  { k: 'з', title: 'Талстыг шинжлэх' },
];

export type SubstanceId =
  | 'hcl'
  | 'mixAcid'
  | 'mix'
  | 'nacl'
  | 'naclConc'
  | 'liquor'
  | 'crystals'
  | 'na2co3'
  | 'residue'
  | 'ethanol';

export interface Substance {
  short: string;
  name: string;
  formula: string;
  look: string;
  info: string;
  hazard: string;
  role: string;
  color: string;
}

export const SUBSTANCES: Record<SubstanceId, Substance> = {
  hcl: { short: 'HCl уусмал', name: 'Давсны хүчил (устөрөгчийн хлоридын уусмал)', formula: 'HCl (у)', look: 'Өнгөгүй, тунгалаг шингэн', info: '1.0 моль/дм³, шингэрүүлсэн', hazard: 'Цочроогч: арьс, нүдийг цочроодог', role: 'Карбонаттай урвалд орж натрийн хлорид үүсгэнэ.', color: CLEAR_LIQUID },
  mixAcid: { short: 'HCl + NaCl (урвал явагдаж байна)', name: 'Урвалын холимог', formula: 'HCl (у) + NaCl (у)', look: 'Хий ялгаран бужигнана', info: 'Хүчил хараахан дуусаагүй', hazard: 'Хүчил байгаа тул цочроогч', role: 'Хий ялгарахаа болих хүртэл карбонат нэмнэ.', color: CLEAR_LIQUID },
  mix: { short: 'NaCl уусмал + Na₂CO₃ илүүдэл', name: 'Урвалын холимог', formula: 'NaCl (у) + Na₂CO₃', look: 'Бага зэрэг булингартай, ёроолд цагаан үлдэгдэл', info: 'Хүчил бүрэн урвалд орсон', hazard: 'Бага', role: 'Уусаагүй хэсгийг шүүж ялгана.', color: MILKY_LIQUID },
  nacl: { short: 'NaCl уусмал', name: 'Натрийн хлоридын уусмал (шүүгдэс)', formula: 'NaCl (у)', look: 'Тунгалаг, өнгөгүй', info: '≈2.9 г давс уусмал хэлбэрээр', hazard: 'Аюулгүй', role: 'Ууршуулж талст гарган авна.', color: CLEAR_LIQUID },
  naclConc: { short: 'Ханасан NaCl + талст', name: 'Ханасан натрийн хлоридын уусмал', formula: 'NaCl (у) + NaCl (т)', look: 'Ирмэг ба ёроолд цагаан куб талст', info: 'Ус хангалтгүй болсон тул давс талстжиж байна', hazard: 'Халуун байж болно: түлэгдэх аюултай', role: 'Хөрөхөд илүү олон талст ургана.', color: CLEAR_LIQUID },
  liquor: { short: 'Эх уусмал', name: 'Эх уусмал (талст ялгасны дараах уусмал)', formula: 'NaCl (у)', look: 'Тунгалаг', info: '≈0.95 г давс уусмал хэлбэрээр үлддэг', hazard: 'Аюулгүй', role: 'Гарц 100%-иас бага байх шалтгаан.', color: CLEAR_LIQUID },
  crystals: { short: 'NaCl талст', name: 'Натрийн хлоридын талст', formula: 'NaCl (т)', look: 'Цагаан, тунгалаг куб талст', info: 'Хайлах цэг 801 °C · 25 °C-д 100 г усанд ≈36 г уусна', hazard: 'Аюулгүй (лабораторид амсахгүй)', role: 'Туршилтын бүтээгдэхүүн.', color: SOLIDS.NaCl.color },
  na2co3: { short: 'Na₂CO₃ нунтаг', name: 'Натрийн карбонат (угаалгын сод)', formula: 'Na₂CO₃ (т)', look: 'Цагаан нунтаг', info: 'M = 106 г/моль · нэг халбага ≈ 0.5 г', hazard: 'Нүд цочроогч', role: 'Хүчлийг саармагжуулж, CO₂ ялгаруулна.', color: SOLIDS.Na2CO3.color },
  residue: { short: 'Уусаагүй үлдэгдэл', name: 'Уусаагүй үлдэгдэл', formula: 'Na₂CO₃ (т)', look: 'Цаасан дээрх цагаан ширхэг', info: 'Илүүдэл карбонатын уусаагүй хэсэг', hazard: 'Бага', role: 'Шүүлтүүрээр ялгагдана.', color: SOLIDS.Na2CO3.color },
  ethanol: { short: 'Спирт (түлш)', name: 'Этилийн спирт (этанол)', formula: 'C₂H₅OH (ш)', look: 'Өнгөгүй шингэн', info: 'Дэнгийн түлш', hazard: 'Шатамхай! Асаалттай дэнг орхиж болохгүй', role: 'Ууршуулах дулааныг өгнө.', color: CLEAR_LIQUID },
};

export type PartKey =
  | 'bottle'
  | 'cyl'
  | 'beaker'
  | 'jar'
  | 'spat'
  | 'rod'
  | 'stack'
  | 'paper'
  | 'funnel'
  | 'flask'
  | 'dish'
  | 'lamp'
  | 'tripod'
  | 'waste'
  | 'watch'
  | 'crystals'
  | 'slide'
  | 'scope';

export const NAMES: Record<PartKey, string> = {
  bottle: 'Давсны хүчлийн шил',
  cyl: 'Хэмжээст цилиндр, 100 см³',
  beaker: 'Шилэн аяга, 150 см³',
  jar: 'Натрийн карбонатын сав',
  spat: 'Халбага',
  rod: 'Шилэн савх',
  stack: 'Шүүлтүүрийн цаас',
  paper: 'Шүүлтүүрийн цаас',
  funnel: 'Юүлүүр',
  flask: 'Конус колба, 250 см³',
  dish: 'Ууршуулагч аяга',
  lamp: 'Спиртийн дэн',
  tripod: 'Гурван хөлт суурь, тор',
  waste: 'Хаягдлын сав',
  watch: 'Цагны шил',
  crystals: 'Цагны шил дээрх талст',
  slide: 'Микроскопын шилэн хавтас',
  scope: 'Микроскоп',
};

export const USES: Record<PartKey, string> = {
  bottle: 'Шингэрүүлсэн давсны хүчил хадгална.',
  cyl: 'Шингэний эзэлхүүнийг нарийн хэмжинэ (1 см³ хуваарь).',
  beaker: 'Урвал явуулах сав. Хуваарь нь ойролцоо.',
  jar: 'Натрийн карбонатын нунтаг хадгална.',
  spat: 'Хатуу бодисыг бага хэмжээгээр авна.',
  rod: 'Уусмалыг хутгана.',
  stack: 'Юүлүүрт хийхийн өмнө конус хэлбэрээр нугална.',
  paper: 'Хатуу бодисыг барьж, шингэнийг нэвтрүүлнэ.',
  funnel: 'Шүүлтүүрийн цаастай хамт хатуу бодисыг шингэнээс ялгана.',
  flask: 'Шүүгдэсийг цуглуулна.',
  dish: 'Уусмалыг ууршуулах шаазан аяга.',
  lamp: 'Ууршуулах дулааныг өгнө.',
  tripod: 'Аягыг дөлний дээр барина; тор дулааныг жигд тараана.',
  waste: 'Хэрэглэсэн шүүлтүүрийн цаас, хаягдал.',
  watch: 'Талстыг дэлгэж хатаах хотгор шил.',
  crystals: 'Талстыг дэлгэж хатаах хотгор шил.',
  slide: 'Микроскопоор харах бэлдмэлийн шил.',
  scope: 'Талстын хэлбэрийг томруулж харна.',
};

/** Vessels that can hold something; the info card says "empty" for these. */
export const VESSELS = new Set<PartKey>(['cyl', 'beaker', 'funnel', 'paper', 'flask', 'dish', 'watch', 'crystals', 'slide', 'waste']);

/** Labels drawn over the bench (paper and crystals are covered by the funnel / watch glass labels). */
export const LABEL_KEYS: PartKey[] = ['bottle', 'cyl', 'beaker', 'jar', 'spat', 'rod', 'stack', 'funnel', 'flask', 'dish', 'lamp', 'tripod', 'waste', 'watch', 'slide', 'scope'];

/** Chemistry constants used by the bench (1.0 mol/dm³ HCl is an assumption; the textbook gives none). */
export const CHEM = {
  molarCarbonate: 105.99,
  molarSalt: 58.44,
  portionGrams: 0.5,
  molarVolume: 24.0,
  /** NaCl that stays dissolved in the last filtrate (g). */
  motherLiquorSalt: 0.95,
} as const;
