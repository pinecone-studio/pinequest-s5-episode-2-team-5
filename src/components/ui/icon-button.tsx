import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { IconName } from '@/types';

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  face?: string;
  edge?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const EDGE = 4;

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  size = 44,
  face = Colors.indigo700,
  edge = Colors.night,
  color = Colors.text,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={style}>
      {({ pressed }) => (
        <View style={{ width: size, height: size + EDGE }}>
          <View style={[styles.circle, { top: EDGE, width: size, height: size, backgroundColor: edge }]} />
          <View
            style={[
              styles.circle,
              styles.face,
              {
                width: size,
                height: size,
                backgroundColor: face,
                transform: [{ translateY: pressed ? EDGE - 1 : 0 }],
              },
            ]}>
            <MaterialCommunityIcons name={icon} size={size * 0.55} color={color} />
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'absolute',
    left: 0,
    borderRadius: 999,
  },
  face: {
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.14)',
  },
});
