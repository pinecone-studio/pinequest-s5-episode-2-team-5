import type { ClassId, PublicPlayer } from '@/types';

import { listPlayers } from './auth';

export interface RankedPlayer extends PublicPlayer {
  rank: number;
}

/** Global ranking contains only profiles belonging to registered accounts. */
export async function fetchLeaderboard(): Promise<PublicPlayer[]> {
  const players = await listPlayers();
  return players.sort((a, b) => b.xp - a.xp || a.nickname.localeCompare(b.nickname));
}

/** Ranks are recomputed per filter, so "#1 in Beginner" is meaningful. */
export function rankPlayers(players: PublicPlayer[], classId: ClassId | 'all'): RankedPlayer[] {
  const filtered = classId === 'all' ? players : players.filter((p) => p.classId === classId);
  return filtered.map((player, index) => ({ ...player, rank: index + 1 }));
}
