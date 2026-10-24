export const JOURNEY_STEPS = ['Суралцах', 'Таамаглах', 'Ажиглах', 'Тайлбарлах', 'Шалгах'] as const;
export const QUIZ_IDS = ['3.2-mcq3', '3.2-mcq7', '3.2-mcq5'] as const;

export interface JourneyProgress {
  version: 1;
  step: number;
  prediction: number | null;
  observation: string;
  source: 'illustration' | 'lab' | null;
  reflection: string;
  revealed: boolean;
  marks: number[];
  answers: Record<string, number>;
  best: number;
  completed: boolean;
}

export function newJourney(): JourneyProgress {
  return { version: 1, step: 0, prediction: null, observation: '', source: null, reflection: '',
    revealed: false, marks: [], answers: {}, best: 0, completed: false };
}

/** Validate persisted local data before it controls navigation or scoring. */
export function restoreJourney(raw: unknown): JourneyProgress {
  const empty = newJourney();
  if (!raw || typeof raw !== 'object') return empty;
  const p = raw as Partial<JourneyProgress>;
  if (p.version !== 1) return empty;
  const text = (value: unknown) => typeof value === 'string' ? value.slice(0, 3000) : '';
  const answers: Record<string, number> = {};
  for (const id of QUIZ_IDS) {
    const answer = p.answers?.[id];
    if (Number.isInteger(answer) && answer! >= 0 && answer! < 4) answers[id] = answer!;
  }
  const state: JourneyProgress = {
    ...empty,
    prediction: Number.isInteger(p.prediction) && p.prediction! >= 0 && p.prediction! < 3 ? p.prediction! : null,
    observation: text(p.observation), reflection: text(p.reflection),
    source: p.source === 'lab' || p.source === 'illustration' ? p.source : null,
    revealed: p.revealed === true,
    marks: Array.isArray(p.marks) ? [...new Set(p.marks.filter((m) => Number.isInteger(m) && m >= 0 && m < 3))] : [],
    answers,
    best: Number.isInteger(p.best) ? Math.min(3, Math.max(0, p.best!)) : 0,
  };
  const requested = Number.isInteger(p.step) ? Math.min(4, Math.max(0, p.step!)) : 0;
  while (state.step < requested && canContinue(state)) state.step++;
  state.completed = p.completed === true && state.step === 4 && QUIZ_IDS.every((id) => id in answers);
  return state;
}

export function canContinue(p: JourneyProgress): boolean {
  switch (p.step) {
    case 0: return true;
    case 1: return p.prediction !== null;
    case 2: return p.source !== null && p.observation.trim().length >= 10;
    case 3: return p.reflection.trim().length >= 10 && p.revealed;
    default: return false;
  }
}

export function quizScore(answers: Record<string, number>, questions: { id: string; answer: number }[]) {
  return questions.reduce((score, question) => score + Number(answers[question.id] === question.answer), 0);
}
