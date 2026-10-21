import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { Colors, Fonts } from '@/constants/theme';

import type { BuildingDef } from './world-config';

export const PLATE_OFFSET = 42;

/** Floating sign above a building. */
export function NamePlate({ building }: { building: BuildingDef }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.set(withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [bob]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -bob.get() * 4 }] }));

  const { rect } = building;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.plateWrap, { left: rect.x, top: rect.y - PLATE_OFFSET, width: rect.w }, style]}>
      <View style={[styles.plate, { borderColor: building.color }]}>
        <View style={[styles.plateIcon, { backgroundColor: building.color }]}>
          <MaterialCommunityIcons name={building.icon} size={15} color="#FFFFFF" />
        </View>
        <AppText style={styles.plateText}>{building.label}</AppText>
      </View>
      <View style={[styles.plateTail, { borderTopColor: building.color }]} />
    </Animated.View>
  );
}

/** Expanding ring where the player was sent. Remount (new key) to replay. */
export function TapMarker({ x, y }: { x: number; y: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) }));
  }, [progress]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.get(),
    transform: [{ translateX: x - 22 }, { translateY: y - 9 }, { scale: 0.4 + progress.get() * 0.9 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.marker, style]} />;
}

const styles = StyleSheet.create({
  plateWrap: { position: 'absolute', alignItems: 'center', zIndex: 5000 },
  plate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2.5,
    backgroundColor: Colors.night,
  },
  plateIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  plateText: { fontFamily: Fonts.bold, fontSize: 14, lineHeight: 18, color: Colors.text },
  plateTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  marker: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 44,
    height: 18,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 1,
  },
});
