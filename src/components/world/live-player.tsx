import { useEffect, useState } from 'react';

import { lookFor } from '@/lib/avatar-look';
import { WALK_SPEED, useWalker, WalkerView } from './walker';
import type { HubPeer, MoveHandler } from '@/services/presence';

import type { RemoteHandle } from './remote-player';

/** World units. Beyond this a peer is teleported to the newest position. */
const SNAP_DISTANCE = 220;

interface LivePlayerProps {
  peer: HubPeer;
  /** Subscribes to this player's walks; returns an unsubscribe function. */
  onMove: (id: string, handler: MoveHandler) => () => void;
  scale?: number;
  /** Lets the hub hit-test and talk to this avatar. */
  register: (handle: RemoteHandle | null) => void;
}

/** A real player in the hub. It chases the latest position they broadcast, so it moves as they do. */
export function LivePlayer({ peer, onMove, register, scale = 1 }: LivePlayerProps) {
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
    const unsubscribe = onMove(peer.id, (to) => {
      const from = walker.position();
      // Far behind (just joined, or a tab was asleep): jump instead of sliding across the map.
      if (Math.hypot(to.x - from.x, to.y - from.y) > SNAP_DISTANCE) {
        walker.stop();
        walker.x.set(to.x);
        walker.y.set(to.y);
      } else {
        walker.walk([to]);
      }
    });
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
    <WalkerView
      walker={walker}
      look={lookFor(peer.nickname, peer.classId)}
      nickname={peer.nickname}
      scale={scale}
      bubble={bubble}
    />
  );
}
