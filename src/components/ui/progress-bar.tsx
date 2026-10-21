import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';

interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  height?: number;
  colors?: readonly [string, string];
  track?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProgressBar({
  progress,
  height = 10,
  colors = [Colors.cyan, Colors.lime],
  track = 'rgba(255,255,255,0.12)',
  style,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: track }, style]}>
      {pct > 0 && (
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${pct}%`, height: '100%', borderRadius: height / 2 }}>
          <View style={[styles.shine, { borderRadius: height / 2 }]} />
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden' },
  shine: {
    position: 'absolute',
    top: 2,
    left: 4,
    right: 4,
    height: '30%',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
