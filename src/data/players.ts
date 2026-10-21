import type { PublicPlayer } from '@/types';

/**
 * Stand-in players for the ranking and the hub until a real backend exists.
 * XP values are reachable through lessons alone (max 2,250 across all classes).
 */
export const MOCK_PLAYERS: PublicPlayer[] = [
  { id: 'bot-anu', nickname: 'AtomAnu', classId: 'hard', xp: 2180 },
  { id: 'bot-temuujin', nickname: 'Temuujin_Lab', classId: 'hard', xp: 2040 },
  { id: 'bot-neon', nickname: 'NeonNinja', classId: 'hard', xp: 1890 },
  { id: 'bot-mole', nickname: 'MoleMaster', classId: 'hard', xp: 1720 },
  { id: 'bot-cam', nickname: 'CatalystCam', classId: 'hard', xp: 1530 },
  { id: 'bot-bea', nickname: 'Bunsen_Bea', classId: 'medium', xp: 1180 },
  { id: 'bot-saraa', nickname: 'Saraa_Chem', classId: 'medium', xp: 1060 },
  { id: 'bot-ivy', nickname: 'IonicIvy', classId: 'medium', xp: 930 },
  { id: 'bot-khulan', nickname: 'Khulan_Ion', classId: 'medium', xp: 810 },
  { id: 'bot-bataa', nickname: 'Bataa_H2O', classId: 'medium', xp: 690 },
  { id: 'bot-hana', nickname: 'HelixHana', classId: 'medium', xp: 560 },
  { id: 'bot-pete', nickname: 'ProtonPete', classId: 'beginner', xp: 470 },
  { id: 'bot-tom', nickname: 'TitrationTom', classId: 'medium', xp: 420 },
  { id: 'bot-erdene', nickname: 'Erdene_Fe', classId: 'beginner', xp: 400 },
  { id: 'bot-zara', nickname: 'ZincZara', classId: 'beginner', xp: 340 },
  { id: 'bot-nomin', nickname: 'Nomin_Na', classId: 'beginner', xp: 290 },
  { id: 'bot-paul', nickname: 'PipettePaul', classId: 'beginner', xp: 220 },
  { id: 'bot-otgon', nickname: 'OxyOtgon', classId: 'beginner', xp: 160 },
  { id: 'bot-boss', nickname: 'BeakerBoss', classId: 'beginner', xp: 120 },
  { id: 'bot-quarky', nickname: 'Quarky', classId: 'beginner', xp: 80 },
  { id: 'bot-lee', nickname: 'LabRat_Lee', classId: 'beginner', xp: 60 },
];

/** Lines the simulated hub players say now and then. */
export const HUB_CHATTER = [
  'Who wants to race to Lv 5?',
  'Goggles on!',
  'Just aced Acids & Bases',
  'Moles are my thing',
  'See you on the ranking',
  'H₂O break',
  'Anyone done Stoichiometry?',
  'That quiz was tough!',
  'New class unlocked!',
];
