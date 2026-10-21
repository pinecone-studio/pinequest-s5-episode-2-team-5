import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useIsFocused, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { DoorTransition } from '@/components/hub/door-transition';
import { EnterPrompt, HintCard, HubDock, HudTop } from '@/components/hub/hub-hud';
import { PlayerCard } from '@/components/hub/player-card';
import { ProfileSheet } from '@/components/hub/profile-sheet';
import { BuildingSprite } from '@/components/world/buildings';
import { Ground } from '@/components/world/ground';
import { buildNavGrid, findPath, nearestWalkable, randomWalkable } from '@/components/world/nav-grid';
import { RemotePlayer, type RemoteHandle } from '@/components/world/remote-player';
import { Bench, Fountain, Lamp, Signpost, Tree } from '@/components/world/scenery';
import { useWalker, WalkerView } from '@/components/world/walker';
import {
  BENCHES,
  BUILDINGS,
  LAMPS,
  PLAZA,
  SIGNPOST,
  SPAWN,
  TREES,
  WORLD,
  worldObstacles,
  type BuildingDef,
  type BuildingId,
  type Point,
  type Rect,
} from '@/components/world/world-config';
import { NamePlate, PLATE_OFFSET, TapMarker } from '@/components/world/world-markers';
import { useSession } from '@/context/session';
import { lookFor } from '@/lib/avatar-look';
import { haptics } from '@/lib/haptics';
import { seededRandom } from '@/lib/random';
import { fetchLeaderboard } from '@/services/leaderboard';
import { useHubPresence } from '@/services/presence';
import type { PublicPlayer, User } from '@/types';

const GRID = buildNavGrid(worldObstacles(), {
  width: WORLD.width,
  height: WORLD.height,
  cell: 12,
  padding: 12,
  margin: 14,
  reachableFrom: SPAWN,
});

const crowdRandom = seededRandom(11);
const CROWD_STARTS = Array.from({ length: 12 }, () =>
  randomWalkable(GRID, { x: PLAZA.x, y: PLAZA.y + 60 }, 300, crowdRandom),
);

const DOOR_RADIUS = 56;

/** Keeps the target centered, clamped so the camera never shows past the map edge. */
function cameraOffset(target: number, viewport: number, world: number) {
  'worklet';
  if (world <= viewport) return (viewport - world) / 2;
  return Math.min(0, Math.max(viewport - world, viewport / 2 - target));
}

function doorNear(x: number, y: number): string {
  'worklet';
  for (const b of BUILDINGS) {
    if (Math.hypot(b.door.x - x, b.door.y - y) < DOOR_RADIUS) return b.id;
  }
  return '';
}

function buildingById(id: BuildingId): BuildingDef {
  return BUILDINGS.find((b) => b.id === id)!;
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
  const crowd = useHubPresence(user);
  const focused = useIsFocused();
  const remotes = useRef(new Map<string, RemoteHandle>());

  const [marker, setMarker] = useState<(Point & { key: number }) | null>(null);
  const [nearDoor, setNearDoor] = useState<BuildingId | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [selected, setSelected] = useState<RemoteHandle | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [entering, setEntering] = useState<BuildingDef | null>(null);
  const [board, setBoard] = useState<PublicPlayer[]>([]);
  const transition = useSharedValue(0);
  const lastDoor = useSharedValue('');

  const camX = useDerivedValue(() => cameraOffset(player.x.get(), width, WORLD.width));
  const camY = useDerivedValue(() => cameraOffset(player.y.get() - 40, height, WORLD.height));
  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: camX.get() }, { translateY: camY.get() }],
  }));

  useAnimatedReaction(
    () => doorNear(player.x.get(), player.y.get()),
    (id) => {
      if (id === lastDoor.get()) return;
      lastDoor.set(id);
      scheduleOnRN(setNearDoor, id === '' ? null : (id as BuildingId));
    },
  );

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
    player.walk(findPath(GRID, player.position(), target), onArrive);
  };

  const onMapPress = (e: GestureResponderEvent) => {
    if (entering) return;
    setShowHint(false);
    // The map layer fills the screen from (0, 0); web press events only carry page coordinates.
    const { locationX, locationY, pageX, pageY } = e.nativeEvent;
    const p = { x: (locationX ?? pageX) - camX.get(), y: (locationY ?? pageY) - camY.get() };
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

  const doorBuilding = BUILDINGS.find((b) => b.id === nearDoor) ?? null;

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.world, worldStyle]}>
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
        {crowd.map((p, i) => (
          <RemotePlayer
            key={p.id}
            player={p}
            grid={GRID}
            start={CROWD_STARTS[i % CROWD_STARTS.length]}
            paused={!focused}
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

      <HudTop user={user} online={crowd.length + 1} onProfilePress={() => setProfileOpen(true)} />
      {showHint && !doorBuilding && <HintCard nickname={user.nickname} />}
      {doorBuilding && !entering && <EnterPrompt building={doorBuilding} onEnter={() => enter(doorBuilding)} />}
      <HubDock onLessons={() => enter(buildingById('lessons'))} onRanking={() => enter(buildingById('ranking'))} />

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
  topScrim: { position: 'absolute', left: 0, right: 0, top: 0, height: 120 },
});
