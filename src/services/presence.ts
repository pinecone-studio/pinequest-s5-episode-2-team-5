import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { PublicPlayer, User } from '@/types';

export interface Point {
  x: number;
  y: number;
}

/** A real player who is in the hub right now, with where they were when we last heard. */
export interface HubPeer extends PublicPlayer, Point {}

export type MoveHandler = (position: Point) => void;

export interface HubPresence {
  peers: HubPeer[];
  /** Tell everyone else where you are standing right now. */
  announce: (position: Point) => void;
  /** Receive the positions of one peer. Returns an unsubscribe function. */
  onMove: (id: string, handler: MoveHandler) => () => void;
}

/**
 * Who else is in the hub right now, over Supabase Realtime.
 * Presence says who is here and where they last stopped. While walking, each client
 * broadcasts its position a few times a second and the others chase the latest point.
 */
export function useHubPresence(user: User, spawn: Point): HubPresence {
  const [peers, setPeers] = useState<HubPeer[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const handlers = useRef(new Map<string, MoveHandler>());
  const spawnRef = useRef(spawn);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
        const { id, x, y } = payload as { id: string } & Point;
        if (id !== user.id) handlers.current.get(id)?.({ x, y });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({ ...profileRef.current, ...spawnRef.current });
      });

    return () => {
      clearTimeout(settleTimer.current);
      channelRef.current = null;
      void supabase.removeChannel(channel);
      setPeers([]);
    };
  }, [user.id]);

  const announce = useCallback((position: Point) => {
    const channel = channelRef.current;
    if (!channel) return;
    void channel.send({ type: 'broadcast', event: 'move', payload: { id: profileRef.current.id, ...position } });
    // Presence is only updated once movement stops, so late joiners find you where you ended up.
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      void channel.track({ ...profileRef.current, ...position });
    }, 600);
  }, []);

  const onMove = useCallback((id: string, handler: MoveHandler) => {
    handlers.current.set(id, handler);
    return () => {
      if (handlers.current.get(id) === handler) handlers.current.delete(id);
    };
  }, []);

  return { peers, announce, onMove };
}
