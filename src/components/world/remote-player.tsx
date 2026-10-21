import { useEffect, useRef, useState } from 'react';
import { withTiming } from 'react-native-reanimated';

import { HUB_CHATTER } from '@/data/players';
import { lookFor } from '@/lib/avatar-look';
import { between, pick } from '@/lib/random';
import type { PublicPlayer } from '@/types';

import { findPath, randomWalkable, type NavGrid } from './nav-grid';
import { useWalker, WalkerView } from './walker';
import { BUILDINGS, type Point } from './world-config';

export interface RemoteHandle {
  player: PublicPlayer;
  position: () => Point;
  isVisible: () => boolean;
  say: (text: string) => void;
}

interface RemotePlayerProps {
  player: PublicPlayer;
  grid: NavGrid;
  start: Point;
  scale: number;
  /** True while the hub is covered by another screen; the avatar stops picking new moves. */
  paused: boolean;
  /** Lets the hub hit-test and talk to this avatar. */
  register: (handle: RemoteHandle | null) => void;
}

/**
 * Another player in the hub. For now a simple wander/visit-a-building loop drives it;
 * with a realtime backend, call `walker.walk(findPath(...))` with positions from the server instead.
 */
export function RemotePlayer({ player, grid, start, scale, paused, register }: RemotePlayerProps) {
  // Slight speed differences keep the crowd from moving in lockstep.
  const walker = useWalker(start, 105 + ((player.nickname.length * 7) % 30));
  const [bubble, setBubble] = useState<string | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    let alive = true;
    let inside = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (alive) fn();
      }, ms);
      timers.add(id);
    };
    const say = (text: string) => {
      setBubble(text);
      later(() => setBubble(null), 2800);
    };

    const step = () => {
      if (pausedRef.current) {
        later(step, 1000);
        return;
      }
      if (Math.random() < 0.18) {
        // Pop into a building for a while, like a real player taking a lesson.
        const building = pick(BUILDINGS);
        walker.walk(findPath(grid, walker.position(), building.door), () => {
          inside = true;
          walker.opacity.set(withTiming(0, { duration: 350 }));
          later(() => {
            inside = false;
            walker.opacity.set(withTiming(1, { duration: 350 }));
            if (Math.random() < 0.35) say(pick(HUB_CHATTER));
            later(step, between(1500, 3000));
          }, between(4000, 9000));
        });
        return;
      }
      const target = randomWalkable(grid, walker.position(), 240);
      walker.walk(findPath(grid, walker.position(), target), () => {
        if (Math.random() < 0.12) say(pick(HUB_CHATTER));
        later(step, between(1200, 4500));
      });
    };

    register({ player, position: walker.position, isVisible: () => !inside, say });
    later(step, between(300, 4000));

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      walker.stop();
      register(null);
    };
    // The loop is set up once per mounted player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WalkerView
      walker={walker}
      look={lookFor(player.nickname, player.classId)}
      nickname={player.nickname}
      scale={scale}
      bubble={bubble}
    />
  );
}
