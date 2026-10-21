import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import type { BuildingDef } from '@/components/world/world-config';
import { Colors } from '@/constants/theme';

/** Full-screen fade in the building's color while we navigate inside. */
export function DoorTransition({ progress, building }: { progress: SharedValue<number>; building: BuildingDef | null }) {
  const overlayStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.6 + progress.get() * 0.4 }] }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}>
      {building && (
        <>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: building.color, opacity: 0.35 }]} />
          <Animated.View style={[styles.badge, { backgroundColor: building.color }, badgeStyle]}>
            <MaterialCommunityIcons name={building.icon} size={48} color="#FFFFFF" />
          </Animated.View>
          <AppText variant="title">{building.label}</AppText>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: Colors.night,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  badge: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});
