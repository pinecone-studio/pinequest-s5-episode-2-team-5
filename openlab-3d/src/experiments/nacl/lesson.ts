import type { Experiment } from '../../lab/experiment-schema';
import { LABEL_KEYS, NAMES, STEPS } from './data';

/** The built-in physical station is independent of the remotely editable guide catalog. */
export const NACL_LESSON: Experiment = {
  id: 'nacl', title: 'Карбонатаас натрийн хлорид гарган авах', level: 'Дунд',
  goal: 'Хүчил, карбонатын урвалаар давс гарган авч шүүх, ууршуулах, талстжуулах.',
  materials: LABEL_KEYS.map((key) => NAMES[key]),
  safety: 'Нүдний шил зүү. Хүчлийг бага багаар цутга. Халуун савыг болгоомжтой барь; хуурай болтол бүү халаа.',
  steps: STEPS.map((step, i) => ({ id: `step-${i + 1}`, text: step.title, hint: step.title, completion: { events: [`nacl:${step.k}`] } })),
  explain: 'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑. Усыг ууршуулахад NaCl талстжина.',
};
