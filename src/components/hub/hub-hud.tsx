import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlayerPortrait } from '@/components/avatar/player-portrait';
import { AppText } from '@/components/ui/app-text';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { levelProgress } from '@/lib/progress';
import type { User } from '@/types';

export function HudTop({
  user,
  online,
  nightMode,
  onNightModePress,
  onProfilePress,
}: {
  user: User;
  online: number;
  nightMode: boolean;
  onNightModePress: () => void;
  onProfilePress: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { level, into, needed, ratio } = levelProgress(user.xp);
  return (
    <View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Pressable
        onPress={onProfilePress}
        accessibilityRole="button"
        accessibilityLabel={`Your profile: ${user.nickname}, level ${level}`}
        style={styles.chip}>
        <PlayerPortrait nickname={user.nickname} classId={user.classId} size={44} />
        <View style={styles.chipBody}>
          <View style={styles.chipRow}>
            <AppText style={styles.nickname} numberOfLines={1}>
              {user.nickname}
            </AppText>
            <View style={styles.levelBadge}>
              <AppText style={styles.levelText}>Lv {level}</AppText>
            </View>
          </View>
          <ProgressBar progress={ratio} height={7} />
          <AppText style={styles.xpText}>
            {into} / {needed} XP
          </AppText>
        </View>
      </Pressable>
      <View style={styles.rightControls}>
        <Pressable
          onPress={onNightModePress}
          accessibilityRole="button"
          accessibilityLabel={nightMode ? 'Switch to day mode' : 'Switch to night mode'}
          style={styles.modeButton}>
          <MaterialCommunityIcons
            name={nightMode ? 'weather-sunny' : 'weather-night'}
            size={18}
            color={nightMode ? Colors.gold : Colors.cyan}
          />
        </Pressable>
        <OnlinePill count={online} />
      </View>
    </View>
  );
}

function OnlinePill({ count }: { count: number }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 1100 }), -1, true));
  }, [pulse]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: 0.45 + pulse.get() * 0.55 }));
  return (
    <View style={styles.pill} accessibilityLabel={`${count} players online`}>
      <Animated.View style={[styles.onlineDot, dotStyle]} />
      <AppText style={styles.pillText}>{count} online</AppText>
    </View>
  );
}

export function HintCard({ nickname }: { nickname: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeInDown.delay(400).springify().damping(16)}
      exiting={FadeOutDown.duration(200)}
      pointerEvents="none"
      style={[styles.floating, styles.hint, { bottom: insets.bottom + 92 }]}>
      <MaterialCommunityIcons name="gesture-tap" size={26} color={Colors.cyan} />
      <View style={styles.hintBody}>
        <AppText variant="bodyStrong" style={styles.hintTitle}>
          Welcome to campus, {nickname}!
        </AppText>
        <AppText variant="caption">Tap anywhere to walk. Tap a building to go inside.</AppText>
      </View>
    </Animated.View>
  );
}

const panel = {
  backgroundColor: 'rgba(18, 12, 51, 0.86)',
  borderWidth: 2,
  borderColor: 'rgba(255,255,255,0.12)',
} as const;

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  chip: {
    ...panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: Radius.lg,
    flexShrink: 1,
  },
  chipBody: { width: 128, gap: 3 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nickname: { flexShrink: 1, fontFamily: Fonts.bold, fontSize: 15, lineHeight: 19 },
  levelBadge: { paddingHorizontal: 6, borderRadius: 6, backgroundColor: Colors.gold },
  levelText: { fontFamily: Fonts.bold, fontSize: 11, lineHeight: 16, color: Colors.goldInk },
  xpText: { fontFamily: Fonts.medium, fontSize: 10.5, lineHeight: 13, color: Colors.textMuted },
  rightControls: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  modeButton: {
    ...panel,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  pill: {
    ...panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  onlineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: Colors.success },
  pillText: { fontFamily: Fonts.semibold, fontSize: 13, lineHeight: 17 },
  floating: { position: 'absolute', left: 16, right: 16 },
  hint: {
    ...panel,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.lg,
  },
  hintBody: { flex: 1, gap: 2 },
  hintTitle: { fontSize: 15 },
});
