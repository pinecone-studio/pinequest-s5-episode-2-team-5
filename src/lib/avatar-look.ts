import { getClass } from '@/data/classes';
import type { ClassId } from '@/types';

export interface AvatarLook {
  skin: string;
  hair: string;
  hairStyle: 0 | 1 | 2;
  /** Shirt under the lab coat. Matches the player's class color. */
  shirt: string;
}

const SKINS = ['#FFE0BD', '#F7C9A0', '#E8AE7E', '#C98B5A', '#9A6440', '#6E452B'];
const HAIRS = ['#2B1A12', '#4A2C17', '#8A4B22', '#D99A3B', '#1F2633', '#B23A48', '#6B46C1', '#2F6FDE'];
const NEUTRAL_SHIRT = '#94A3B8';

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Same nickname always gives the same character, on every device. */
export function lookFor(nickname: string, classId: ClassId | null): AvatarLook {
  const h = hash(nickname.trim().toLowerCase() || 'scientist');
  return {
    skin: SKINS[h % SKINS.length],
    hair: HAIRS[(h >>> 4) % HAIRS.length],
    hairStyle: ((h >>> 9) % 3) as 0 | 1 | 2,
    shirt: classId ? getClass(classId).color.main : NEUTRAL_SHIRT,
  };
}
