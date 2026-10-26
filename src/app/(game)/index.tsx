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
import { HintCard, HudTop } from '@/components/hub/hub-hud';
import { PlayerCard } from '@/components/hub/player-card';
import { ProfileSheet } from '@/components/hub/profile-sheet';
import { BuildingSprite, BuildingWindowLights } from '@/components/world/buildings';
import { Ground } from '@/components/world/ground';
import { buildNavGrid, findPath, nearestWalkable } from '@/components/world/nav-grid';
import { LivePlayer } from '@/components/world/live-player';
import type { RemoteHandle } from '@/components/world/remote-player';
import { Bench, Fountain, Lamp, Tree } from '@/components/world/scenery';
import { useWalker, WalkerView } from '@/components/world/walker';
import {
  BENCHES,
  BUILDINGS,
  LAMPS,
  SPAWN,
  TREES,
  WORLD,
  worldObstacles,
  type BuildingDef,
  type Point,
} from '@/components/world/world-config';
import { NamePlate, TapMarker } from '@/components/world/world-markers';
import { useSession } from '@/context/session';
import { lookFor } from '@/lib/avatar-look';
import { haptics } from '@/lib/haptics';
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

const MAP_SPRITE_SCALE = 0.65;

function isNightTime(date: Date) {
  const hour = date.getHours();
  return hour >= 20 || hour < 6;
}

const HUB_HOUSE_HIT_SHAPE = [
  { x: 100, y: 37 }, { x: 192, y: 105 }, { x: 195, y: 100 }, { x: 195, y: 113 },
  { x: 173, y: 113 }, { x: 173, y: 227 }, { x: 187, y: 223 }, { x: 187, y: 248 },
  { x: 13, y: 248 }, { x: 13, y: 223 }, { x: 27, y: 227 }, { x: 27, y: 113 },
  { x: 5, y: 113 }, { x: 5, y: 100 }, { x: 8, y: 105 },
];

const BUILDING_HIT_SHAPES: Record<BuildingDef['sprite'], readonly (readonly Point[])[]> = {
  hall: [[
    { x: 150, y: 50 }, { x: 278, y: 116 }, { x: 278, y: 130 }, { x: 262, y: 130 },
    { x: 262, y: 240 }, { x: 274, y: 240 }, { x: 274, y: 266 }, { x: 26, y: 266 },
    { x: 26, y: 240 }, { x: 38, y: 240 }, { x: 38, y: 130 }, { x: 22, y: 130 }, { x: 22, y: 116 },
  ]],
  tower: [
    [
      { x: 12, y: 308 }, { x: 178, y: 308 }, { x: 178, y: 280 }, { x: 150, y: 284 },
      { x: 142, y: 120 }, { x: 158, y: 122 }, { x: 158, y: 104 }, { x: 136, y: 104 },
      { x: 136, y: 96 }, { x: 132, y: 74 }, { x: 126, y: 60 }, { x: 114, y: 50 },
      { x: 95, y: 44 }, { x: 76, y: 50 }, { x: 64, y: 60 }, { x: 58, y: 74 },
      { x: 54, y: 96 }, { x: 54, y: 104 }, { x: 32, y: 104 }, { x: 32, y: 122 },
      { x: 48, y: 120 }, { x: 40, y: 284 }, { x: 12, y: 280 },
    ],
    [
      { x: 66, y: 7 }, { x: 124, y: 7 }, { x: 124, y: 24 }, { x: 120, y: 31 },
      { x: 108, y: 37 }, { x: 108, y: 47 }, { x: 82, y: 47 }, { x: 82, y: 37 },
      { x: 70, y: 31 }, { x: 66, y: 24 },
    ],
  ],
  house: [HUB_HOUSE_HIT_SHAPE],
};

/** Keeps the target centered, clamped so the camera never shows past the map edge. */
function cameraOffset(target: number, viewport: number, world: number) {
  'worklet';
  if (world <= viewport) return (viewport - world) / 2;
  return Math.min(0, Math.max(viewport - world, viewport / 2 - target));
}

function pointInPolygon(point: Point, polygon: readonly Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const current = polygon[i];
    const previous = polygon[j];
    const onEdge =
      Math.abs((point.y - previous.y) * (current.x - previous.x) - (point.x - previous.x) * (current.y - previous.y)) < 0.001 &&
      point.x >= Math.min(previous.x, current.x) && point.x <= Math.max(previous.x, current.x) &&
      point.y >= Math.min(previous.y, current.y) && point.y <= Math.max(previous.y, current.y);
    if (onEdge) return true;

    const crosses =
      (current.y > point.y) !== (previous.y > point.y) &&
      point.x < ((previous.x - current.x) * (point.y - current.y)) / (previous.y - current.y) + current.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function isOnBuilding(building: BuildingDef, point: Point) {
  const { rect } = building;
  const localPoint = {
    x: (point.x - rect.x - (rect.w * (1 - MAP_SPRITE_SCALE)) / 2) / MAP_SPRITE_SCALE,
    y: (point.y - rect.y - rect.h * (1 - MAP_SPRITE_SCALE)) / MAP_SPRITE_SCALE,
  };
  return BUILDING_HIT_SHAPES[building.sprite].some((shape) => pointInPolygon(localPoint, shape));
}

export default function HubScreen() {
  const { user } = useSession();
  return user ? <Hub user={user} /> : null;
}

function Hub({ user }: { user: User }) {
  const { signOut, updateRegion } = useSession();
  const { width, height } = useWindowDimensions();
  const mapZoom = width / WORLD.width;
  const mapOriginX = (WORLD.width / 2) * (1 - mapZoom);
  const mapOriginY = (WORLD.height / 2) * (1 - mapZoom);
  const player = useWalker(SPAWN);
  const { peers, announce, onMove } = useHubPresence(user, SPAWN);
  const remotes = useRef(new Map<string, RemoteHandle>());

  const [marker, setMarker] = useState<(Point & { key: number }) | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [selected, setSelected] = useState<RemoteHandle | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [localNight, setLocalNight] = useState(() => isNightTime(new Date()));
  const [nightModeOverride, setNightModeOverride] = useState<boolean | null>(null);
  const nightMode = nightModeOverride ?? localNight;
  const [entering, setEntering] = useState<BuildingDef | null>(null);
  const [board, setBoard] = useState<PublicPlayer[]>([]);
  const transition = useSharedValue(0);

  useEffect(() => {
    const updateLocalTime = () => setLocalNight(isNightTime(new Date()));
    const interval = setInterval(updateLocalTime, 60_000);
    return () => clearInterval(interval);
  }, []);

  const camX = useDerivedValue(
    () => cameraOffset(player.x.get() * mapZoom, width, WORLD.width * mapZoom) - mapOriginX,
  );
  const camY = useDerivedValue(
    () => cameraOffset((player.y.get() - 40) * mapZoom, height, WORLD.height * mapZoom) - mapOriginY,
  );
  const worldStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: camX.get() }, { translateY: camY.get() }],
  }));

  // Stream where we are while walking; one extra update lands the final resting spot.
  useEffect(() => {
    let last = player.position();
    const id = setInterval(() => {
      const at = player.position();
      if (Math.hypot(at.x - last.x, at.y - last.y) < 0.5) return;
      last = at;
      announce(at);
    }, 100);
    return () => clearInterval(id);
  }, [player, announce]);

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
    const p = {
      x: ((locationX ?? pageX) - camX.get() - mapOriginX) / mapZoom,
      y: ((locationY ?? pageY) - camY.get() - mapOriginY) / mapZoom,
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

    const building = BUILDINGS.find((b) => isOnBuilding(b, p));
    if (building) {
      walkTo(building.door, () => enter(building));
      return;
    }

    walkTo(nearestWalkable(GRID, p));
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.world, worldStyle]}>
        <View style={[styles.zoomedWorld, { transform: [{ scale: mapZoom }] }]}>
          <Ground />
          {marker && <TapMarker key={marker.key} x={marker.x} y={marker.y} />}
          {TREES.map((t) => (
            <Tree key={`${t.x},${t.y}`} {...t} spriteScale={MAP_SPRITE_SCALE} />
          ))}
          {LAMPS.map((l) => (
            <Lamp key={`${l.x},${l.y}`} {...l} spriteScale={MAP_SPRITE_SCALE} />
          ))}
          {BENCHES.map((b) => (
            <Bench key={`${b.x},${b.y}`} {...b} spriteScale={MAP_SPRITE_SCALE} />
          ))}
          <Fountain spriteScale={MAP_SPRITE_SCALE} />
          {BUILDINGS.map((b) => (
            <BuildingSprite key={b.id} building={b} scale={MAP_SPRITE_SCALE} />
          ))}
          {peers.map((p) => (
            <LivePlayer
              key={p.id}
              peer={p}
              onMove={onMove}
              scale={MAP_SPRITE_SCALE}
              register={(handle) => {
                if (handle) remotes.current.set(p.id, handle);
                else remotes.current.delete(p.id);
              }}
            />
          ))}
          <WalkerView
            walker={player}
            look={lookFor(user.nickname, user.classId)}
            nickname={user.nickname}
            scale={MAP_SPRITE_SCALE}
            isPlayer
          />
          {BUILDINGS.map((b) => (
            <NamePlate key={b.id} building={b} scale={MAP_SPRITE_SCALE} />
          ))}
          {nightMode && <View pointerEvents="none" style={styles.nightOverlay} />}
          {nightMode && BUILDINGS.map((b) => (
            <BuildingWindowLights key={`night-${b.id}`} building={b} scale={MAP_SPRITE_SCALE} />
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

      <HudTop
        user={user}
        online={peers.length + 1}
        nightMode={nightMode}
        onNightModePress={() => setNightModeOverride(!nightMode)}
        onProfilePress={() => setProfileOpen(true)}
      />
      {showHint && <HintCard nickname={user.nickname} />}
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
        onUpdateRegion={updateRegion}
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
  },
  nightOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: WORLD.width,
    height: WORLD.height,
    backgroundColor: 'rgba(14, 17, 56, 0.58)',
  },
  topScrim: { position: 'absolute', left: 0, right: 0, top: 0, height: 120 },
});
