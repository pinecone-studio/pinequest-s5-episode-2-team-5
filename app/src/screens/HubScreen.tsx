import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Avatar } from '../components/Avatar';
import { RIVALS } from '../constants/lessons';
import { colors, levelOf, XP_PER_LEVEL } from '../constants/theme';
import { useGame } from '../services/GameContext';
import { TIERS } from '../types';

const COLS = 16;
const ROWS = 10;
const DOOR_ROW = 1;

export type Destination =
  | { kind: 'lesson'; id: string }
  | { kind: 'table' }
  | { kind: 'ranking' };

interface Door {
  x: number;
  label: string;
  done?: boolean;
  dest: Destination;
}

interface Wanderer {
  nickname: string;
  color: string;
  x: number;
  y: number;
}

// Remembered between visits so the player comes back to where they left.
let lastPos = { x: 8, y: 5 };

export function HubScreen({ onEnter }: { onEnter: (d: Destination) => void }) {
  const { user, activeTier, setActiveTier, isUnlocked, lessonsOf, logout } = useGame();
  const { width } = useWindowDimensions();
  const tile = Math.floor(Math.min(width - 16, 640) / COLS);

  const [pos, setPos] = useState(lastPos);
  const [wanderers, setWanderers] = useState<Wanderer[]>(() =>
    RIVALS.slice(0, 6).map((r, i) => ({
      nickname: r.nickname,
      color: r.color,
      x: 2 + ((i * 3) % (COLS - 3)),
      y: 3 + ((i * 2) % (ROWS - 4)),
    })),
  );

  const lessons = lessonsOf(activeTier);
  const doors: Door[] = [
    ...lessons.map((l, i) => ({
      x: 1 + i * 3,
      label: `Lesson ${i + 1}`,
      done: user?.completed.includes(l.id),
      dest: { kind: 'lesson', id: l.id } as Destination,
    })),
    { x: 11, label: 'Table', dest: { kind: 'table' } },
    { x: 14, label: 'Ranking', dest: { kind: 'ranking' } },
  ];

  const walkable = useCallback(
    (x: number, y: number) =>
      x >= 0 && x < COLS && y < ROWS && (y >= DOOR_ROW + 1 || (y === DOOR_ROW && doors.some((d) => d.x === x))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lessons.length],
  );

  const move = useCallback(
    (dx: number, dy: number) => {
      setPos((p) => (walkable(p.x + dx, p.y + dy) ? { x: p.x + dx, y: p.y + dy } : p));
    },
    [walkable],
  );

  // Enter a building when stepping on its door.
  useEffect(() => {
    if (pos.y !== DOOR_ROW) return;
    const door = doors.find((d) => d.x === pos.x);
    if (!door) return;
    lastPos = { x: pos.x, y: DOOR_ROW + 2 };
    onEnter(door.dest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);

  // Other players wander randomly.
  useEffect(() => {
    const id = setInterval(() => {
      setWanderers((ws) =>
        ws.map((w) => {
          if (Math.random() < 0.4) return w;
          const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
          const x = w.x + dir[0];
          const y = w.y + dir[1];
          return x < 0 || x >= COLS || y < DOOR_ROW + 1 || y >= ROWS ? w : { ...w, x, y };
        }),
      );
    }, 700);
    return () => clearInterval(id);
  }, []);

  // Keyboard controls on web.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0], a: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0],
        ArrowUp: [0, -1], w: [0, -1],
        ArrowDown: [0, 1], s: [0, 1],
      };
      const m = map[e.key];
      if (m) {
        e.preventDefault();
        move(m[0], m[1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move]);

  if (!user) return null;
  const xpInLevel = user.xp % XP_PER_LEVEL;

  return (
    <View style={styles.screen}>
      <View style={styles.hud}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nick}>{user.nickname}  Lv {levelOf(user.xp)}</Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${xpInLevel}%` }]} />
          </View>
          <Text style={styles.meta}>{xpInLevel} / {XP_PER_LEVEL} XP</Text>
        </View>
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <View style={styles.tiers}>
        {TIERS.map((t) => {
          const open = isUnlocked(t);
          return (
            <Pressable
              key={t}
              disabled={!open}
              onPress={() => setActiveTier(t)}
              style={[styles.chip, activeTier === t && styles.chipOn, !open && { opacity: 0.4 }]}
            >
              <Text style={styles.chipText}>{open ? t : `${t} (locked)`}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.world, { width: tile * COLS, height: tile * ROWS }]}>
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const x = i % COLS;
          const y = Math.floor(i / COLS);
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: x * tile,
                top: y * tile,
                width: tile,
                height: tile,
                backgroundColor: y < DOOR_ROW + 1 ? colors.roof : (x + y) % 2 ? colors.floor : colors.floorAlt,
              }}
            />
          );
        })}

        {doors.map((d) => (
          <View key={d.label} style={{ position: 'absolute', left: d.x * tile, top: 0, width: tile, height: tile * 2 }}>
            <Text style={[styles.sign, { width: tile * 3, left: -tile }]}>
              {d.done ? `${d.label} ✓` : d.label}
            </Text>
            <View style={[styles.door, { top: tile, height: tile }]} />
          </View>
        ))}

        {wanderers.map((w) => (
          <View key={w.nickname} style={{ position: 'absolute', left: w.x * tile, top: w.y * tile }}>
            <Avatar size={tile} color={w.color} name={w.nickname} />
          </View>
        ))}

        <View style={{ position: 'absolute', left: pos.x * tile, top: pos.y * tile }}>
          <Avatar size={tile} color={user.color} name={user.nickname} isMe />
        </View>
      </View>

      <Text style={styles.hint}>Walk into a door to enter. Arrow keys / WASD or the pad below.</Text>
      <DPad onMove={move} />
    </View>
  );
}

function DPad({ onMove }: { onMove: (dx: number, dy: number) => void }) {
  const [timer, setTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  const start = (dx: number, dy: number) => {
    onMove(dx, dy);
    setTimer(setInterval(() => onMove(dx, dy), 140));
  };
  const stop = () => {
    if (timer) clearInterval(timer);
    setTimer(null);
  };
  useEffect(() => stop, [timer]);

  const btn = (label: string, dx: number, dy: number) => (
    <Pressable onPressIn={() => start(dx, dy)} onPressOut={stop} style={styles.pad}>
      <Text style={styles.padText}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      {btn('▲', 0, -1)}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {btn('◀', -1, 0)}
        {btn('▼', 0, 1)}
        {btn('▶', 1, 0)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', paddingTop: 36, gap: 8 },
  hud: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, width: '100%', maxWidth: 640 },
  nick: { color: colors.text, fontWeight: '800', fontSize: 16 },
  barBg: { height: 8, backgroundColor: colors.panel, borderRadius: 4, marginVertical: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: colors.accent },
  meta: { color: colors.muted, fontSize: 11 },
  logout: { color: colors.danger, fontWeight: '700' },
  tiers: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  chip: { backgroundColor: colors.panel, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14 },
  chipOn: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  world: { overflow: 'visible', backgroundColor: colors.floor },
  sign: { position: 'absolute', top: 2, textAlign: 'center', color: '#fff', fontSize: 10, fontWeight: '800' },
  door: { position: 'absolute', left: 2, right: 2, backgroundColor: '#fbbf24', borderRadius: 3 },
  hint: { color: colors.muted, fontSize: 11 },
  pad: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.panelLight, alignItems: 'center', justifyContent: 'center' },
  padText: { color: colors.text, fontSize: 22 },
});
