import { create } from 'zustand';

export type SkillId = 'burner' | 'tare' | 'hood';

/** Bench skills tracked for the menu, the robot's hints and the lab report. */
export const SKILLS: { id: SkillId; label: string }[] = [
  { id: 'burner', label: 'Бунзены горелк асаах' },
  { id: 'tare', label: 'Аналитик жинг тэглэх' },
  { id: 'hood', label: 'Татах шүүгээний хаалтыг өргөх' },
];

const initialSkills: Record<SkillId, boolean> = { burner: false, tare: false, hood: false };

/** State of the lab stations: Bunsen burner flames, the fume-hood sash, the balance tare. */
interface ExperimentState {
  toggles: Record<string, boolean>;
  values: Record<string, number>;
  skills: Record<SkillId, boolean>;
  toggle: (key: string) => boolean;
  setValue: (key: string, value: number) => void;
  markSkill: (id: SkillId) => void;
  reset: () => void;
}

export const useExperimentStore = create<ExperimentState>()((set, get) => ({
  toggles: {},
  values: {},
  skills: { ...initialSkills },
  toggle: (key) => {
    const next = !get().toggles[key];
    set((s) => ({ toggles: { ...s.toggles, [key]: next } }));
    return next;
  },
  setValue: (key, value) => set((s) => ({ values: { ...s.values, [key]: value } })),
  markSkill: (id) => {
    if (!get().skills[id]) set((s) => ({ skills: { ...s.skills, [id]: true } }));
  },
  reset: () => set({ toggles: {}, values: {}, skills: { ...initialSkills } }),
}));
