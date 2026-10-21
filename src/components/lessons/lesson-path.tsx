import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { LessonStatus } from '@/lib/progress';
import type { ChemClass, Lesson, User } from '@/types';

const NODE = 76;
const ROW = 124;
const SWING = 62;
const EDGE = 6;

interface LessonPathProps {
  chemClass: ChemClass;
  statuses: LessonStatus[];
  user: User;
  onOpen: (lesson: Lesson) => void;
}

/** Zig-zag trail of lesson nodes, like a level map. */
export function LessonPath({ chemClass, statuses, user, onOpen }: LessonPathProps) {
  const [width, setWidth] = useState(0);
  const { lessons, color } = chemClass;

  const centers = lessons.map((_, i) => ({
    x: width / 2 + (i % 2 === 0 ? -SWING : SWING),
    y: i * ROW + NODE / 2 + 30,
  }));

  return (
    <View style={{ height: lessons.length * ROW + 20 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <>
          <Svg width={width} height={lessons.length * ROW + 20} style={StyleSheet.absoluteFill}>
            {centers.slice(1).map((c, i) => {
              const a = centers[i];
              const done = statuses[i] === 'completed';
              return (
                <Path
                  key={i}
                  d={`M${a.x} ${a.y} C${a.x} ${a.y + ROW * 0.55} ${c.x} ${c.y - ROW * 0.55} ${c.x} ${c.y}`}
                  stroke={done ? color.main : 'rgba(255,255,255,0.16)'}
                  strokeWidth={8}
                  strokeDasharray="1 15"
                  strokeLinecap="round"
                  fill="none"
                />
              );
            })}
          </Svg>
          {lessons.map((lesson, i) => {
            const c = centers[i];
            const onLeft = i % 2 === 0;
            const result = user.completed[lesson.id];
            return (
              <View key={lesson.id}>
                <View style={[styles.nodeSlot, { left: c.x - NODE / 2, top: c.y - NODE / 2 }]}>
                  <LessonNode
                    lesson={lesson}
                    status={statuses[i]}
                    chemClass={chemClass}
                    stars={result?.stars ?? 0}
                    onPress={() => onOpen(lesson)}
                  />
                </View>
                <Pressable
                  onPress={() => onOpen(lesson)}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={[
                    styles.label,
                    onLeft ? { left: c.x + NODE / 2 + 14, right: 4 } : { left: 4, right: width - (c.x - NODE / 2) + 14 },
                    { top: c.y - 34 },
                    statuses[i] === 'locked' && styles.labelLocked,
                  ]}>
                  <AppText variant="label" color={statuses[i] === 'locked' ? Colors.textDim : color.main}>
                    Lesson {i + 1}
                  </AppText>
                  <AppText style={styles.labelTitle} numberOfLines={2}>
                    {lesson.title}
                  </AppText>
                  <AppText variant="caption" style={styles.labelMeta}>
                    {lesson.minutes} min · {lesson.xp} XP
                  </AppText>
                </Pressable>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

interface LessonNodeProps {
  lesson: Lesson;
  status: LessonStatus;
  chemClass: ChemClass;
  stars: number;
  onPress: () => void;
}

function LessonNode({ lesson, status, chemClass, stars, onPress }: LessonNodeProps) {
  const { color } = chemClass;
  const locked = status === 'locked';
  const face = locked ? Colors.locked : color.main;
  const edge = locked ? Colors.lockedDark : color.dark;

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${lesson.title}, ${status === 'current' ? 'up next' : status}`}>
      {({ pressed }) => (
        <View style={styles.nodeBox}>
          {status === 'current' && <PulseRing color={color.main} />}
          <View style={[styles.coin, { top: EDGE, backgroundColor: edge }]} />
          <View
            style={[
              styles.coin,
              styles.coinFace,
              { backgroundColor: face, transform: [{ translateY: pressed ? EDGE - 1 : 0 }] },
            ]}>
            <View style={styles.coinShine} />
            <MaterialCommunityIcons
              name={locked ? 'lock' : lesson.icon}
              size={34}
              color={locked ? Colors.textDim : color.ink}
            />
          </View>
          {status === 'completed' && (
            <View style={styles.stars}>
              {[1, 2, 3].map((s) => (
                <MaterialCommunityIcons
                  key={s}
                  name="star"
                  size={s === 2 ? 22 : 18}
                  color={s <= stars ? Colors.gold : 'rgba(255,255,255,0.25)'}
                  style={s === 2 ? styles.middleStar : undefined}
                />
              ))}
            </View>
          )}
          {status === 'current' && <StartBubble color={color.main} ink={color.ink} />}
        </View>
      )}
    </Pressable>
  );
}

function PulseRing({ color }: { color: string }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.7 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 0.45 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: color }, style]} />;
}

function StartBubble({ color, ink }: { color: string; ink: string }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.set(withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [bob]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -bob.get() * 5 }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.startWrap, style]}>
      <View style={[styles.startBubble, { backgroundColor: color }]}>
        <AppText style={[styles.startText, { color: ink }]}>START</AppText>
      </View>
      <View style={[styles.startTail, { borderTopColor: color }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  nodeSlot: { position: 'absolute', width: NODE, height: NODE + EDGE },
  nodeBox: { width: NODE, height: NODE + EDGE, alignItems: 'center' },
  coin: { position: 'absolute', left: 0, width: NODE, height: NODE, borderRadius: NODE / 2 },
  coinFace: {
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  coinShine: {
    position: 'absolute',
    top: 8,
    width: NODE * 0.5,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  ring: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: NODE + 12,
    height: NODE + 12,
    borderRadius: (NODE + 12) / 2,
    borderWidth: 4,
  },
  stars: { position: 'absolute', bottom: -22, flexDirection: 'row', alignItems: 'flex-end' },
  middleStar: { marginBottom: 3 },
  startWrap: { position: 'absolute', top: -40, alignItems: 'center' },
  startBubble: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  startText: { fontFamily: Fonts.bold, fontSize: 13, letterSpacing: 1.5 },
  startTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  label: {
    position: 'absolute',
    gap: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(34, 26, 94, 0.85)',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  labelLocked: { opacity: 0.6 },
  labelTitle: { fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 19, color: Colors.text },
  labelMeta: { fontSize: 12 },
});
