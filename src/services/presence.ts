import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MOCK_PLAYERS } from '@/data/players';
import { supabase } from '@/lib/supabase';
import type { PublicPlayer, User } from '@/types';

export interface Point {
  x: number;
  y: number;
}

/** A real player who is in the hub right now, with where they were when we last heard. */
export interface HubPeer extends PublicPlayer, Point {}

export type MoveHandler = (path: Point[]) => void;

export interface HubPresence {
  peers: HubPeer[];
  /** Tell everyone else that you are walking along `path`. */
  announce: (path: Point[]) => void;
  /** Receive the walks of one peer. Returns an unsubscribe function. */
  onMove: (id: string, handler: MoveHandler) => () => void;
}

const CROWD_IDS = ['bot-anu', 'bot-bea', 'bot-pete', 'bot-ivy', 'bot-erdene', 'bot-temuujin', 'bot-nomin', 'bot-saraa'];

/** Fake players that only feed the local demo chat. They never appear in the hub. */
export function useDemoChatCrowd(userId: string): PublicPlayer[] {
  return useMemo(() => MOCK_PLAYERS.filter((p) => CROWD_IDS.includes(p.id) && p.id !== userId), [userId]);
}

/**
 * Who else is in the hub right now, over Supabase Realtime.
 * Presence says who is here and where they stand; a `move` broadcast carries each walk
 * as a few waypoints, so every client animates the same path instead of streaming positions.
 */
export function useHubPresence(user: User, spawn: Point): HubPresence {
  const [peers, setPeers] = useState<HubPeer[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const handlers = useRef(new Map<string, MoveHandler>());
  const spawnRef = useRef(spawn);

  const profile = useMemo<PublicPlayer>(
    () => ({ id: user.id, nickname: user.nickname, classId: user.classId, xp: user.xp }),
    [user.id, user.nickname, user.classId, user.xp],
  );
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    const channel = supabase.channel('hub:main', { config: { presence: { key: user.id } } });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<HubPeer>();
        const others = Object.entries(state)
          .filter(([key]) => key !== user.id)
          .map(([, metas]) => metas[metas.length - 1])
          .filter(Boolean);
        setPeers(others);
      })
      .on('broadcast', { event: 'move' }, ({ payload }) => {
        const { id, path } = payload as { id: string; path: Point[] };
        if (id !== user.id) handlers.current.get(id)?.(path);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({ ...profileRef.current, ...spawnRef.current });
      });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
      setPeers([]);
    };
  }, [user.id]);

  const announce = useCallback((path: Point[]) => {
    const channel = channelRef.current;
    if (!channel || path.length === 0) return;
    void channel.send({ type: 'broadcast', event: 'move', payload: { id: profileRef.current.id, path } });
    // Late joiners start from where this walk ends.
    void channel.track({ ...profileRef.current, ...path[path.length - 1] });
  }, []);

  const onMove = useCallback((id: string, handler: MoveHandler) => {
    handlers.current.set(id, handler);
    return () => {
      if (handlers.current.get(id) === handler) handlers.current.delete(id);
    };
  }, []);

  return { peers, announce, onMove };
}
