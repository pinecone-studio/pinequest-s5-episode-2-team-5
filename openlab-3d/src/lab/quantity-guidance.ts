/** Paraphrased quantity notes from Хими VIII (08_khimi.pdf), printed pp. 22, 102.
 * The PDF stays outside the repository. KI solution is an explicitly calculated adaptation. */
import { REAGENTS } from '../chemistry/reagents';
export const KI_MOLAR_MASS = 166.0028;
export function kiEquivalentMl(grams: number, molarity: number): number | null {
  return Number.isFinite(grams) && grams > 0 && Number.isFinite(molarity) && molarity > 0
    ? grams / KI_MOLAR_MASS / molarity * 1000 : null;
}
export const KI_DOSE_ML = kiEquivalentMl(.1, REAGENTS.ki.solution?.solutes.I ?? 0);
export function amountFeedback(added: number, min: number, max: number): string {
  if (!Number.isFinite(added) || added < 0) return 'Хэмжилт алга';
  if (added < min - .05) return 'Бага багаар нэмж хэмж';
  if (added > max + .05) return 'Зорилтот хэмжээнээс их — үр дүнг харьцуулж тэмдэглэ';
  return 'Зорилтот хэмжээнд хүрлээ';
}
export const ELEPHANT_AMOUNTS = [
  { reagent: 'h2o2' as const, step: 'h2o2', label: 'H₂O₂ · апп дахь 3% уусмал', target: '20–30 мл', min: 20, max: 30,
    note: '100 мл-ийн цилиндрт хэмжинэ. Номонд хэт ислийн концентрацыг энэ хэсэгт заагаагүй; 3% нь аппын уусмал.' },
  { reagent: 'soap' as const, step: 'soap', label: 'Угаалгын шингэн', target: 'Бага хэмжээ', min: null, max: null,
    note: 'Номонд тогтмол мл заагаагүй. Бага багаар нэмээд өөрийн хэрэглэсэн хэмжээг тэмдэглэ.' },
  { reagent: 'ki' as const, step: 'cat', label: 'KI · апп дахь 0.5 М уусмал', target: KI_DOSE_ML === null ? 'Концентрацыг шалга' : `≈${KI_DOSE_ML.toFixed(1)} мл`,
    min: KI_DOSE_ML === null ? null : Math.floor(KI_DOSE_ML * 10) / 10,
    max: KI_DOSE_ML === null ? null : Math.ceil(KI_DOSE_ML * 10) / 10,
    note: 'Ном: ойролцоогоор 0.1 г KI эсвэл MnO₂. Аппын KI уусмалд агуулагдах KI-ийн массыг тааруулсан тооцоо; номын шууд мл заалт биш.' },
];
