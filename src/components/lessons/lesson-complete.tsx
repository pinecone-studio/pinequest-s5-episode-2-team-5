import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { LabBackground } from '@/components/ui/lab-background';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { getClass } from '@/data/classes';
import type { CompletionResult } from '@/lib/progress';
import { seededRandom } from '@/lib/random';
import type { Lesson } from '@/types';

const CONFETTI_COLORS = ['#4ADE80', '#FFB938', '#FF5C7A', '#3DE0F5', '#B5F23D', '#FF7AC6'];
const TITLES = { 1: 'Lesson complete!', 2: 'Great job!', 3: 'Perfect run!' } as const;

interface LessonCompleteProps {
  lesson: Lesson;
  result: CompletionResult;
  onDone: () => void;
}

export function LessonComplete({ lesson, result, onDone }: LessonCompleteProps) {
  const insets = useSafeAreaInsets();
  const unlocked = result.unlockedClass ? getClass(result.unlockedClass) : null;

  return (
    <LabBackground bubbles={8}>
      <Confetti />
      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.center}>
          <View style={styles.stars}>
            {[1, 2, 3].map((s) => (
              <Animated.View key={s} entering={ZoomIn.delay(250 + s * 220).springify().damping(9)}>
                <MaterialCommunityIcons
                  name="star"
                  size={s === 2 ? 96 : 72}
                  color={s <= result.stars ? Colors.gold : 'rgba(255,255,255,0.18)'}
                  style={s === 2 ? styles.middleStar : undefined}
                />
              </Animated.View>
            ))}
          </View>
          <Animated.View entering={FadeInDown.delay(900)} style={styles.titles}>
            <AppText variant="display" align="center">
              {TITLES[result.stars]}
            </AppText>
            <AppText variant="body" align="center">
              {lesson.title}
            </AppText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(1050)} style={styles.xpPill}>
            <MaterialCommunityIcons name="lightning-bolt" size={24} color={Colors.goldInk} />
            <AppText style={styles.xpText}>
              {result.xpGained > 0 ? `+${result.xpGained} XP` : 'Best score kept'}
            </AppText>
          </Animated.View>

          {result.leveledUp && (
            <Animated.View entering={FadeInDown.delay(1200)} style={[styles.banner, { borderColor: Colors.gold }]}>
              <MaterialCommunityIcons name="arrow-up-bold-circle" size={28} color={Colors.gold} />
              <AppText variant="bodyStrong" style={styles.bannerText}>
                Level up! You are now level {result.level}.
              </AppText>
            </Animated.View>
          )}

          {unlocked && (
            <Animated.View entering={FadeInDown.delay(1350)} style={[styles.banner, { borderColor: unlocked.color.main }]}>
              <MaterialCommunityIcons name="lock-open-variant" size={28} color={unlocked.color.main} />
              <AppText variant="bodyStrong" style={styles.bannerText}>
                New class unlocked: {unlocked.name} · {unlocked.title}
              </AppText>
            </Animated.View>
          )}
        </View>

        <Animated.View entering={FadeInDown.delay(1300)}>
          <GameButton title="Back to Lessons Hall" icon="arrow-left" onPress={onDone} />
        </Animated.View>
      </View>
    </LabBackground>
  );
}

function Confetti() {
  const { width, height } = useWindowDimensions();
  const rand = seededRandom(3);
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    key: i,
    x: rand() * width,
    delay: rand() * 600,
    duration: 1800 + rand() * 1400,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    spin: (rand() - 0.5) * 900,
    drift: (rand() - 0.5) * 80,
  }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map(({ key, ...p }) => (
        <ConfettiPiece key={key} {...p} fall={height + 40} />
      ))}
    </View>
  );
}

function ConfettiPiece({
  x,
  delay,
  duration,
  color,
  spin,
  drift,
  fall,
}: {
  x: number;
  delay: number;
  duration: number;
  color: string;
  spin: number;
  drift: number;
  fall: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration, easing: Easing.in(Easing.quad) })));
  }, [delay, duration, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.get() > 0.9 ? (1 - t.get()) * 10 : 1,
    transform: [
      { translateX: x + drift * t.get() },
      { translateY: -30 + fall * t.get() },
      { rotate: `${spin * t.get()}deg` },
    ],
  }));
  return <Animated.View style={[styles.confetti, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18 },
  stars: { flexDirection: 'row', alignItems: 'flex-end' },
  middleStar: { marginBottom: 18 },
  titles: { gap: 4 },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.gold,
    borderBottomWidth: 5,
    borderBottomColor: Colors.goldDark,
  },
  xpText: { fontFamily: Fonts.bold, fontSize: 22, color: Colors.goldInk },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'stretch',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 2,
    backgroundColor: Colors.panel,
  },
  bannerText: { flex: 1 },
  confetti: { position: 'absolute', left: 0, top: 0, width: 9, height: 14, borderRadius: 2 },
});
