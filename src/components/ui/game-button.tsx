import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { IconName } from '@/types';

import { AppText } from './app-text';

export interface ButtonColors {
  face: string;
  edge: string;
  ink: string;
}

const VARIANTS = {
  primary: { face: Colors.lime, edge: Colors.limeDark, ink: Colors.limeInk },
  secondary: { face: Colors.indigo600, edge: Colors.indigo800, ink: Colors.text },
  gold: { face: Colors.gold, edge: Colors.goldDark, ink: Colors.goldInk },
  danger: { face: Colors.danger, edge: Colors.dangerDark, ink: Colors.text },
} satisfies Record<string, ButtonColors>;

const DISABLED: ButtonColors = { face: Colors.locked, edge: Colors.lockedDark, ink: Colors.textDim };

const SIZES = {
  lg: { height: 58, edge: 6, font: 19, icon: 22, padding: 22 },
  md: { height: 48, edge: 5, font: 17, icon: 20, padding: 18 },
  sm: { height: 38, edge: 4, font: 15, icon: 17, padding: 14 },
};

interface GameButtonProps {
  title: string;
  onPress?: () => void;
  variant?: keyof typeof VARIANTS;
  /** Overrides `variant`, e.g. to paint a button in a class color. */
  colors?: ButtonColors;
  icon?: IconName;
  iconRight?: IconName;
  size?: keyof typeof SIZES;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Chunky "candy" button with a 3D edge that sinks when pressed. */
export function GameButton({
  title,
  onPress,
  variant = 'primary',
  colors,
  icon,
  iconRight,
  size = 'lg',
  disabled = false,
  loading = false,
  style,
}: GameButtonProps) {
  const palette = disabled ? DISABLED : (colors ?? VARIANTS[variant]);
  const s = SIZES[size];

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled, busy: loading }}
      style={style}>
      {({ pressed }) => (
        <View style={{ height: s.height + s.edge }}>
          <View style={[styles.edge, { top: s.edge, backgroundColor: palette.edge }]} />
          <View
            style={[
              styles.face,
              {
                height: s.height,
                paddingHorizontal: s.padding,
                backgroundColor: palette.face,
                transform: [{ translateY: pressed ? s.edge - 1 : 0 }],
              },
            ]}>
            <View style={styles.shine} />
            {loading ? (
              <ActivityIndicator color={palette.ink} />
            ) : (
              <>
                {icon && <MaterialCommunityIcons name={icon} size={s.icon} color={palette.ink} />}
                <AppText variant="button" color={palette.ink} style={{ fontSize: s.font }} numberOfLines={1}>
                  {title}
                </AppText>
                {iconRight && <MaterialCommunityIcons name={iconRight} size={s.icon} color={palette.ink} />}
              </>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.md,
  },
  face: {
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: 4,
    left: 10,
    right: 10,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
});
