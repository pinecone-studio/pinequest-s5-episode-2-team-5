import { MOCK_PLAYERS } from '@/data/players';
import type { ClassId, PublicPlayer } from '@/types';

import { listLocalPlayers } from './auth';

export interface RankedPlayer extends PublicPlayer {
  rank: number;
}

/** Global ranking, highest XP first. Replace with a server query when the backend exists. */
export async function fetchLeaderboard(): Promise<PublicPlayer[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const players = [...MOCK_PLAYERS, ...(await listLocalPlayers())];
  return players.sort((a, b) => b.xp - a.xp || a.nickname.localeCompare(b.nickname));
}

/** Ranks are recomputed per filter, so "#1 in Beginner" is meaningful. */
export function rankPlayers(players: PublicPlayer[], classId: ClassId | 'all'): RankedPlayer[] {
  const filtered = classId === 'all' ? players : players.filter((p) => p.classId === classId);
  return filtered.map((player, index) => ({ ...player, rank: index + 1 }));
}
