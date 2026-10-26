import { LinearGradient } from 'expo-linear-gradient';
import { type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { useScreenLoop } from '@/hooks/use-screen-loop';
import { seededRandom } from '@/lib/random';

interface LabBackgroundProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  bubbles?: number;
}

/** Deep-indigo gradient with drifting bubbles and faint benzene rings. */
export function LabBackground({ children, style, bubbles = 10 }: LabBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const rand = seededRandom(7);
  const bubbleSpecs = Array.from({ length: bubbles }, (_, i) => ({
    key: i,
    x: rand() * width,
    size: 8 + rand() * 22,
    duration: 9000 + rand() * 9000,
    delay: rand() * 8000,
    sway: 6 + rand() * 14,
  }));
  const hexes = Array.from({ length: 6 }, (_, i) => ({
    key: i,
    cx: rand() * width,
    cy: rand() * height,
    r: 34 + rand() * 50,
  }));

  return (
    <View style={[styles.root, style]}>
      <LinearGradient colors={['#2C1F86', '#1A1350', '#0E0A2A']} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {hexes.map((h) => (
          <Polygon
            key={h.key}
            points={hexPoints(h.cx, h.cy, h.r)}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={0.05}
            strokeWidth={3}
          />
        ))}
      </Svg>
      {bubbleSpecs.map(({ key, ...spec }) => (
        <Bubble key={key} {...spec} travel={height + 80} />
      ))}
      {children}
    </View>
  );
}

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

interface BubbleProps {
  x: number;
  size: number;
  duration: number;
  delay: number;
  sway: number;
  travel: number;
}

function Bubble({ x, size, duration, delay, sway, travel }: BubbleProps) {
  const progress = useSharedValue(0);

  useScreenLoop(progress, { duration, delay });

  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p < 0.1 ? p * 6 : 0.6 * (1 - p),
      transform: [
        { translateX: x + Math.sin(p * Math.PI * 4) * sway },
        { translateY: travel - p * (travel + 60) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.bubble, { width: size, height: size, borderRadius: size / 2 }, style]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.night, overflow: 'hidden' },
  bubble: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 2,
    borderColor: 'rgba(160, 240, 255, 0.55)',
    backgroundColor: 'rgba(160, 240, 255, 0.08)',
  },
});
