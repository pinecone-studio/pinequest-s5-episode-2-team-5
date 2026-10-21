import { useEffect, useState } from 'react';

import { lookFor } from '@/lib/avatar-look';
import { WALK_SPEED, useWalker, WalkerView } from './walker';
import type { HubPeer, MoveHandler } from '@/services/presence';

import type { RemoteHandle } from './remote-player';

interface LivePlayerProps {
  peer: HubPeer;
  /** Subscribes to this player's walks; returns an unsubscribe function. */
  onMove: (id: string, handler: MoveHandler) => () => void;
  /** Lets the hub hit-test and talk to this avatar. */
  register: (handle: RemoteHandle | null) => void;
}

/** A real player in the hub. It replays the waypoints they broadcast, so it moves like they do. */
export function LivePlayer({ peer, onMove, register }: LivePlayerProps) {
  const walker = useWalker({ x: peer.x, y: peer.y }, WALK_SPEED);
  const [bubble, setBubble] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const say = (text: string) => {
      setBubble(text);
      clearTimeout(timer);
      timer = setTimeout(() => setBubble(null), 2800);
    };
    register({ player: peer, position: walker.position, isVisible: () => true, say });
    // Start from where we think they are, so a missed update self-corrects.
    const unsubscribe = onMove(peer.id, (path) => walker.walk(path));
    return () => {
      unsubscribe();
      clearTimeout(timer);
      walker.stop();
      register(null);
    };
    // One subscription per mounted player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peer.id]);

  return (
    <WalkerView walker={walker} look={lookFor(peer.nickname, peer.classId)} nickname={peer.nickname} bubble={bubble} />
  );
}
