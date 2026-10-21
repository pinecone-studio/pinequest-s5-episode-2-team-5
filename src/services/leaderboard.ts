import { MOCK_PLAYERS } from '@/data/players';
import type { ClassId, PublicPlayer } from '@/types';

import { listPlayers } from './auth';

export interface RankedPlayer extends PublicPlayer {
  rank: number;
}

/** Global ranking, highest XP first. The demo players are mixed in so the board is never empty. */
export async function fetchLeaderboard(): Promise<PublicPlayer[]> {
  const players = [...MOCK_PLAYERS, ...(await listPlayers())];
  return players.sort((a, b) => b.xp - a.xp || a.nickname.localeCompare(b.nickname));
}

/** Ranks are recomputed per filter, so "#1 in Beginner" is meaningful. */
export function rankPlayers(players: PublicPlayer[], classId: ClassId | 'all'): RankedPlayer[] {
  const filtered = classId === 'all' ? players : players.filter((p) => p.classId === classId);
  return filtered.map((player, index) => ({ ...player, rank: index + 1 }));
}
