import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { DoorTransition } from '@/components/hub/door-transition';
import { HubChatOverlay } from '@/components/hub/chat-overlay';
import { HintCard, HudTop } from '@/components/hub/hub-hud';
import { PlayerCard } from '@/components/hub/player-card';
import { ProfileSheet } from '@/components/hub/profile-sheet';
import { BuildingSprite } from '@/components/world/buildings';
import { Ground } from '@/components/world/ground';
import { buildNavGrid, findPath, nearestWalkable } from '@/components/world/nav-grid';
import { LivePlayer } from '@/components/world/live-player';
import type { RemoteHandle } from '@/components/world/remote-player';
import { Bench, Fountain, Lamp, Signpost, Tree } from '@/components/world/scenery';
import { useWalker, WalkerView } from '@/components/world/walker';
import {
  BENCHES,
  BUILDINGS,
  LAMPS,
  SIGNPOST,
  SPAWN,
  TREES,
  WORLD,
  worldObstacles,
  type BuildingDef,
  type Point,
  type Rect,
} from '@/components/world/world-config';
import { NamePlate, PLATE_OFFSET, TapMarker } from '@/components/world/world-markers';
import { useSession } from '@/context/session';
import { lookFor } from '@/lib/avatar-look';
import { haptics } from '@/lib/haptics';
import { fetchLeaderboard } from '@/services/leaderboard';
import { useDemoChatCrowd, useHubPresence } from '@/services/presence';
import type { PublicPlayer, User } from '@/types';

const GRID = buildNavGrid(worldObstacles(), {
  width: WORLD.width,
  height: WORLD.height,
  cell: 12,
  padding: 12,
  margin: 14,
  reachableFrom: SPAWN,
});

const MAP_ZOOM = 1.35;
const MAP_ORIGIN_X = (WORLD.width / 2) * (1 - MAP_ZOOM);
const MAP_ORIGIN_Y = (WORLD.height / 2) * (1 - MAP_ZOOM);

/** Keeps the target centered, clamped so the camera never shows past the map edge. */
function cameraOffset(target: number, viewport: number, world: number) {
  'worklet';
  if (world <= viewport) return (viewport - world) / 2;
  return Math.min(0, Math.max(viewport - world, viewport / 2 - target));
}

function inRect(p: Point, r: Rect) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

export default function HubScreen() {
  const { user } = useSession();
  return user ? <Hub user={user} /> : null;
}

function Hub({ user }: { user: User }) {
  const { signOut } = useSession();
  const { width, height } = useWindowDimensions();
  const player = useWalker(SPAWN);
  const { peers, announce, onMove } = useHubPresence(user, SPAWN);
  const demoChatCrowd = useDemoChatCrowd(user.id);
  const remotes = useRef(new Map<string, RemoteHandle>());

  const [marker, setMarker] = useState<(Point & { key: number }) | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [selected, setSelected] = useState<RemoteHandle | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [entering, setEntering] = useState<BuildingDef | null>(null);
  const [board, setBoard] = useState<PublicPlayer[]>([]);
  const transition = useSharedValue(0);

  const camX = useDerivedValue(
    () => cameraOffset(player.x.get() * MAP_ZOOM, width, WORLD.width * MAP_ZOOM) - MAP_ORIGIN_X,
  );
  const camY = useDerivedValue(
    () => cameraOffset((player.y.get() - 40) * MAP_ZOOM, height, WORLD.height * MAP_ZOOM) - MAP_ORIGIN_Y,
  );
  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: camX.get() }, { translateY: camY.get() }],
  }));

  useEffect(() => {
    const id = setTimeout(() => setShowHint(false), 8000);
    return () => clearTimeout(id);
  }, []);

  // Coming back out of a building: fade the door transition away and refresh ranks.
  useFocusEffect(
    useCallback(() => {
      transition.set(withTiming(0, { duration: 350 }));
      setEntering(null);
      fetchLeaderboard().then(setBoard);
    }, [transition]),
  );

  const goTo = (href: Href) => router.push(href);

  const enter = (building: BuildingDef) => {
    if (entering) return;
    // Cancels any walk in progress, so its arrival can't trigger a second entry.
    player.stop();
    setEntering(building);
    setShowHint(false);
    haptics.tap();
    transition.set(
      withTiming(1, { duration: 320 }, (finished) => {
        if (finished) scheduleOnRN(goTo, building.route);
      }),
    );
  };

  const walkTo = (target: Point, onArrive?: () => void) => {
    setMarker((previous) => ({ ...target, key: (previous?.key ?? 0) + 1 }));
    const path = findPath(GRID, player.position(), target);
    announce(path);
    player.walk(path, onArrive);
  };

  const onMapPress = (e: GestureResponderEvent) => {
    if (entering) return;
    setShowHint(false);
    // The map layer fills the screen from (0, 0); web press events only carry page coordinates.
    const { locationX, locationY, pageX, pageY } = e.nativeEvent;
    const p = {
      x: ((locationX ?? pageX) - camX.get() - MAP_ORIGIN_X) / MAP_ZOOM,
      y: ((locationY ?? pageY) - camY.get() - MAP_ORIGIN_Y) / MAP_ZOOM,
    };
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return;

    for (const handle of remotes.current.values()) {
      const at = handle.position();
      if (handle.isVisible() && Math.abs(p.x - at.x) < 24 && p.y > at.y - 80 && p.y < at.y + 8) {
        haptics.select();
        setSelected(handle);
        return;
      }
    }

    const building = BUILDINGS.find(
      (b) =>
        inRect(p, b.rect) ||
        inRect(p, { x: b.rect.x + b.rect.w / 2 - 80, y: b.rect.y - PLATE_OFFSET, w: 160, h: PLATE_OFFSET }),
    );
    if (building) {
      walkTo(building.door, () => enter(building));
      return;
    }

    walkTo(nearestWalkable(GRID, p));
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.world, worldStyle]}>
        <View style={styles.zoomedWorld}>
          <Ground />
          {marker && <TapMarker key={marker.key} x={marker.x} y={marker.y} />}
          {TREES.map((t) => (
            <Tree key={`${t.x},${t.y}`} {...t} />
          ))}
          {LAMPS.map((l) => (
            <Lamp key={`${l.x},${l.y}`} {...l} />
          ))}
          {BENCHES.map((b) => (
            <Bench key={`${b.x},${b.y}`} {...b} />
          ))}
          <Signpost {...SIGNPOST} />
          <Fountain />
          {BUILDINGS.map((b) => (
            <BuildingSprite key={b.id} building={b} />
          ))}
          {peers.map((p) => (
            <LivePlayer
              key={p.id}
              peer={p}
              onMove={onMove}
              register={(handle) => {
                if (handle) remotes.current.set(p.id, handle);
                else remotes.current.delete(p.id);
              }}
            />
          ))}
          <WalkerView walker={player} look={lookFor(user.nickname, user.classId)} nickname={user.nickname} isPlayer />
          {BUILDINGS.map((b) => (
            <NamePlate key={b.id} building={b} />
          ))}
        </View>
      </Animated.View>

      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onMapPress}
        accessibilityLabel="Campus map. Tap to walk, tap a building to enter."
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(18,12,51,0.55)', 'rgba(18,12,51,0)']}
        style={styles.topScrim}
      />

      <HudTop user={user} online={peers.length + 1} onProfilePress={() => setProfileOpen(true)} />
      {showHint && <HintCard nickname={user.nickname} />}
      <HubChatOverlay user={user} players={demoChatCrowd} />

      <DoorTransition progress={transition} building={entering} />

      <PlayerCard
        player={selected?.player ?? null}
        rank={selected ? board.findIndex((p) => p.id === selected.player.id) + 1 || undefined : undefined}
        onClose={() => setSelected(null)}
        onWave={() => {
          selected?.say(`Hi ${user.nickname}! 👋`);
          setSelected(null);
        }}
      />
      <ProfileSheet
        user={user}
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSignOut={() => {
          setProfileOpen(false);
          signOut();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#5E9E3F', overflow: 'hidden' },
  world: { position: 'absolute', left: 0, top: 0, width: WORLD.width, height: WORLD.height },
  zoomedWorld: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: WORLD.width,
    height: WORLD.height,
    transform: [{ scale: MAP_ZOOM }],
  },
  topScrim: { position: 'absolute', left: 0, right: 0, top: 0, height: 120 },
});
