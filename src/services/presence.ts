import { useMemo } from 'react';

import { MOCK_PLAYERS } from '@/data/players';
import type { PublicPlayer, User } from '@/types';

const CROWD_IDS = ['bot-anu', 'bot-bea', 'bot-pete', 'bot-ivy', 'bot-erdene', 'bot-temuujin', 'bot-nomin', 'bot-saraa'];

/**
 * Who else is walking around the hub right now.
 * Mock: a fixed crowd. A realtime backend (Socket.IO, Supabase Realtime, Firebase…)
 * would stream this list plus each player's position.
 */
export function useHubPresence(user: User): PublicPlayer[] {
  return useMemo(
    () => MOCK_PLAYERS.filter((p) => CROWD_IDS.includes(p.id) && p.id !== user.id),
    [user.id],
  );
}
