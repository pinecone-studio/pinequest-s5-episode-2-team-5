import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Scientist } from '@/components/avatar/scientist';
import { AppText } from '@/components/ui/app-text';
import { Colors, Fonts } from '@/constants/theme';
import type { AvatarLook } from '@/lib/avatar-look';

import type { Point } from './world-config';

/** World units per second. */
export const WALK_SPEED = 140;

const SPRITE_HEIGHT = 58;
const BOX_WIDTH = 120;
const BOX_HEIGHT = 92;

export interface Walker {
  x: SharedValue<number>;
  y: SharedValue<number>;
  moving: SharedValue<number>;
  facing: SharedValue<number>;
  odometer: SharedValue<number>;
  opacity: SharedValue<number>;
  /** Follows the waypoints in order; `onArrive` only fires if the walk wasn't interrupted. */
  walk: (path: Point[], onArrive?: () => void) => void;
  stop: () => void;
  position: () => Point;
}

export function useWalker(start: Point, speed = WALK_SPEED): Walker {
  const x = useSharedValue(start.x);
  const y = useSharedValue(start.y);
  const moving = useSharedValue(0);
  const facing = useSharedValue(1);
  const odometer = useSharedValue(0);
  const opacity = useSharedValue(1);

  useAnimatedReaction(
    () => ({ x: x.get(), y: y.get() }),
    (current, previous) => {
      if (!previous) return;
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      if (Math.abs(dx) > 0.05) facing.set(dx > 0 ? 1 : -1);
      odometer.set(odometer.get() + Math.sqrt(dx * dx + dy * dy));
    },
  );

  const stop = () => {
    cancelAnimation(x);
    cancelAnimation(y);
    moving.set(0);
  };

  const walk = (path: Point[], onArrive?: () => void) => {
    cancelAnimation(x);
    cancelAnimation(y);
    if (path.length === 0) {
      moving.set(0);
      onArrive?.();
      return;
    }
    const xs: number[] = [];
    const ys: number[] = [];
    let from = { x: x.get(), y: y.get() };
    path.forEach((p, i) => {
      const duration = Math.max(16, (Math.hypot(p.x - from.x, p.y - from.y) / speed) * 1000);
      const isLast = i === path.length - 1;
      xs.push(withTiming(p.x, { duration, easing: Easing.linear }));
      ys.push(
        withTiming(p.y, { duration, easing: Easing.linear }, (finished) => {
          if (!isLast || !finished) return;
          moving.set(0);
          if (onArrive) scheduleOnRN(onArrive);
        }),
      );
      from = p;
    });
    moving.set(1);
    x.set(withSequence(...xs));
    y.set(withSequence(...ys));
  };

  return { x, y, moving, facing, odometer, opacity, walk, stop, position: () => ({ x: x.get(), y: y.get() }) };
}

interface WalkerViewProps {
  walker: Walker;
  look: AvatarLook;
  nickname: string;
  isPlayer?: boolean;
  /** Short line shown in a speech bubble. */
  bubble?: string | null;
}

/** Renders an avatar at its walker's feet position, with bounce, facing and a name tag. */
export function WalkerView({ walker, look, nickname, isPlayer = false, bubble }: WalkerViewProps) {
  const { x, y, moving, facing, odometer, opacity } = walker;
  const idle = useSharedValue(0);

  useEffect(() => {
    idle.set(withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [idle]);

  const boxStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    zIndex: Math.round(y.get()),
    transform: [{ translateX: x.get() - BOX_WIDTH / 2 }, { translateY: y.get() - BOX_HEIGHT }],
  }));

  const bodyStyle = useAnimatedStyle(() => {
    const walking = moving.get() === 1;
    const phase = odometer.get() / 9;
    return {
      transform: [
        { translateY: walking ? -Math.abs(Math.sin(phase)) * 4.5 : 0 },
        { rotate: `${walking ? Math.sin(phase) * 6 : 0}deg` },
        { scaleX: facing.get() },
        { scaleY: walking ? 1 : 1 + idle.get() * 0.035 },
      ],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.box, boxStyle]}>
      {bubble ? (
        <View style={styles.bubble}>
          <AppText variant="caption" color={Colors.night} style={styles.bubbleText} numberOfLines={2}>
            {bubble}
          </AppText>
          <View style={styles.bubbleTail} />
        </View>
      ) : null}
      <View style={[styles.tag, isPlayer && styles.playerTag]}>
        <View style={[styles.tagDot, { backgroundColor: look.shirt }]} />
        <AppText style={[styles.tagText, isPlayer && styles.playerTagText]} numberOfLines={1}>
          {nickname}
        </AppText>
      </View>
      <View style={styles.feet}>
        {isPlayer && <View style={styles.playerRing} />}
        <View style={styles.shadow} />
      </View>
      <Animated.View style={[styles.body, bodyStyle]}>
        <Scientist look={look} height={SPRITE_HEIGHT} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    alignItems: 'center',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: BOX_WIDTH,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(18, 12, 51, 0.72)',
  },
  playerTag: { backgroundColor: Colors.lime },
  tagDot: { width: 7, height: 7, borderRadius: 4 },
  tagText: { fontFamily: Fonts.semibold, fontSize: 11.5, lineHeight: 16, color: Colors.text },
  playerTagText: { color: Colors.limeInk },
  feet: {
    position: 'absolute',
    bottom: -5,
    width: 40,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: { width: 32, height: 9, borderRadius: 16, backgroundColor: 'rgba(20, 50, 10, 0.25)' },
  playerRing: {
    position: 'absolute',
    width: 42,
    height: 15,
    borderRadius: 21,
    borderWidth: 2.5,
    borderColor: Colors.lime,
  },
  body: {
    position: 'absolute',
    bottom: 0,
    transformOrigin: 'bottom',
  },
  bubble: {
    position: 'absolute',
    bottom: BOX_HEIGHT + 2,
    maxWidth: 150,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.night,
  },
  bubbleText: { fontSize: 12, lineHeight: 15, textAlign: 'center' },
  bubbleTail: {
    position: 'absolute',
    bottom: -7,
    alignSelf: 'center',
    width: 10,
    height: 10,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.night,
    transform: [{ rotate: '45deg' }],
  },
});
