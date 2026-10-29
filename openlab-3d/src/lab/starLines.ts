/**
 * What Star (the lab's star-shaped helper) says about a lab event, and in which tone: "Stop!"
 * for real danger, comfort after a harmless mistake, cheering and a fact when things go well.
 * Pure (no stores), so the wording and the AI budget rules are tested in Node.
 */
import type { LabEvent } from './events';
import type { EquipmentKind } from '../equipment/equipmentCatalog';

export type StarTone = 'danger' | 'oops' | 'good';
export type StarMood = 'idle' | 'wave' | 'happy' | 'think' | 'oops' | 'danger';

export interface StarLine {
  /** Cooldown key: the same line is not repeated within cooldownMs. */
  key: string;
  tone: StarTone;
  mood: StarMood;
  text: string;
  cooldownMs: number;
  /** Worth asking the AI for a fresher wording (only when the budget allows; text is the fallback). */
  ai: boolean;
  /** What happened, plainly, for the AI to comment on. */
  about?: string;
}

/**
 * How much of Star's commentary the AI writes. Raise these (and the 'star' cap in the
 * use_ai_quota migration) to make Star chattier; lower them to spend less.
 */
export const STAR_AI = {
  /** Shortest time between two AI-written comments. */
  minGapMs: 90_000,
  /** AI-written comments per lab visit. */
  perSession: 12,
  /** How long a comment waits for the AI before Star says its own line. */
  waitMs: 4_000,
  /** Failed AI comments in a row before Star stops asking for this visit. */
  maxFailures: 2,
};

/** Danger: always fixed text, shown at once, never waits for the AI. */
const DANGER: Record<string, string> = {
  'safety:goggles': 'Зогс! ✋ Энэ бодис нүдэнд маш аюултай. Эхлээд хамгаалалтын шилээ зүүгээрэй: баруун хананы ширээн дээр болон «Хамгаалалт» шургуулганд бий.',
  'safety:gloves': 'Зогс! ✋ Энэ бодис арьсанд хортой. Нитрилэн бээлийгээ өмсөөд дараа нь үргэлжлүүлээрэй.',
  'safety:grip': 'Зогс! ✋ Халааж буй шилийг гараараа бүү бариарай. Хуруу шил барих хавчаар эсвэл тигель хавчаар аваад, сав дээр E дарж хавчаарай.',
  'safety:hot': 'Зогс! ✋ Сав халуун байна, түлэгдэнэ. Тигель хавчаараа бариад сав дээр E дараарай.',
};

const COMFORT = ['Зүгээр дээ, ийм юм болдог!', 'Санаа зоволтгүй!', 'Айхгүй ээ, жинхэнэ химичид ч алдаанаасаа суралцдаг!'];
const CHEER = ['Хөөх, гайхалтай!', 'Ёстой сайн байна!', 'Харсан уу? Ямар гоё юм бэ!'];
const PEP = ['Гайхалтай явж байна! 🌟', 'Чи жинхэнэ химич шиг ажиллаж байна!', 'Сайн байна, ингээд л үргэлжлүүлээрэй!', 'Чи чадаж байна! Нэг алхам ахилаа.'];

/** Rotates through a list so the same words are not said twice in a row. */
const turns = new Map<string[], number>();
function next(list: string[]): string {
  const i = turns.get(list) ?? 0;
  turns.set(list, i + 1);
  return list[i % list.length];
}

const sentence = (text: string): string => (/[!.?…]$/.test(text.trim()) ? text.trim() : `${text.trim()}!`);

/** Star's line for one lab event, or null when Star stays quiet. */
export function starLineFor(e: LabEvent, firstTime: boolean): StarLine | null {
  if (DANGER[e.key]) return { key: e.key, tone: 'danger', mood: 'danger', text: DANGER[e.key], cooldownMs: 45_000, ai: false };
  if (e.key === 'spill') {
    return { key: e.key, tone: 'oops', mood: 'oops', cooldownMs: 30_000, ai: false, text: `${next(COMFORT)} Сав хальчихлаа. Дараагийн удаа савны ⅔ хүртэл л хийгээд, R-ээ арай эрт суллаарай. Асгарсан газар руу хараад E дарж арчаарай.` };
  }
  if (e.key === 'break') {
    return { key: e.key, tone: 'oops', mood: 'oops', cooldownMs: 20_000, ai: false, text: `${next(COMFORT)} ${e.detail ?? 'Шил хагарчихлаа.'} Хэлтэрхийг гараараа бүү түүгээрэй.` };
  }
  if (e.key === 'waste:sink') {
    return { key: e.key, tone: 'oops', mood: 'oops', cooldownMs: 20_000, ai: false, text: `Өө, энэ хаягдлыг угаалтуурт асгаж болохгүй байсан юм. ${e.detail ?? ''} Дараагийн удаа санаарай!`.replace(/\s+/g, ' ').trim() };
  }
  // A reaction or observation seen for the first time: cheer, then the fact behind it.
  if (e.title && !e.quiet && firstTime && e.detail && !e.key.startsWith('wear:')) {
    return { key: e.key, tone: 'good', mood: 'happy', cooldownMs: 6_000, ai: true, about: `${sentence(e.title)} ${e.detail}`, text: `${next(CHEER)} ${sentence(e.title)} ${e.detail}` };
  }
  return null;
}

/** A short pep talk after a finished step, with what to do next. */
export function pepTalk(nextStep?: string): StarLine {
  return { key: 'pep', tone: 'good', mood: 'happy', cooldownMs: 45_000, ai: false, text: nextStep ? `${next(PEP)} Дараагийнх нь: ${nextStep}` : next(PEP) };
}

/** Cheering for a finished experiment, with what it showed. */
export function experimentDoneLine(id: string, title: string, explain: string): StarLine {
  return { key: `done:${id}`, tone: 'good', mood: 'happy', cooldownMs: 0, ai: true, about: `«${title}» туршилт бүхэлдээ дууслаа. ${explain}`.trim(), text: `Хөөх, «${title}» туршилт дууслаа! Чи үнэхээр сайн ажиллалаа. ${explain}`.trim() };
}

export interface StarBudget {
  used: number;
  lastAt: number;
  failures: number;
}

/** Whether this line may be written by the AI now, given what Star has already spent. */
export function canAskAi(line: StarLine, budget: StarBudget, now: number, limits = STAR_AI): boolean {
  return line.ai
    && line.tone !== 'danger'
    && budget.used < limits.perSession
    && budget.failures < limits.maxFailures
    && now - budget.lastAt >= limits.minGapMs;
}

/** What hands can hold hot glass with. */
export const GRIP_KINDS: readonly EquipmentKind[] = ['tongs', 'testTubeHolder'];

/**
 * Where Star flies and points when something goes wrong: the nearest item of these kinds, a fixed
 * spot in the room, or the newest puddle. `done` is what fixes it (goggles on, gloves on, tongs in
 * hand); without one, the guide ends once the student is close or the puddle is wiped.
 */
export interface StarPointsAt {
  kinds?: readonly EquipmentKind[];
  spot?: string;
  puddle?: boolean;
  done?: 'goggles' | 'gloves' | 'grip';
}

export const STAR_POINTS_AT: Record<string, StarPointsAt> = {
  'safety:goggles': { kinds: ['goggles'], done: 'goggles' },
  'safety:gloves': { kinds: ['gloves'], done: 'gloves' },
  'safety:grip': { kinds: GRIP_KINDS, done: 'grip' },
  'safety:hot': { kinds: GRIP_KINDS, done: 'grip' },
  spill: { puddle: true },
  'waste:sink': { spot: 'chem-waste' },
};

/** Added to Star's line when it flies off to show the way. */
export const GUIDE_HINT = 'Над руу хараарай, би зааж өгье! ⭐';

/** The candidate closest to (x, z) on the floor plan, or null when there is none. */
export function nearest<T extends { x: number; z: number }>(candidates: readonly T[], x: number, z: number): T | null {
  let best: T | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = (c.x - x) ** 2 + (c.z - z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
