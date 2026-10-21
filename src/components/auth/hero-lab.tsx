import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Scientist } from '@/components/avatar/scientist';
import { ClassMedallion } from '@/components/ui/class-medallion';
import { CLASSES } from '@/data/classes';
import { lookFor } from '@/lib/avatar-look';

const OUTLINE = '#1B1740';
const SIZE = 300;

/** Welcome-screen illustration: a bubbling flask, two scientists and the three class badges. */
export function HeroLab() {
  const clock = useSharedValue(0);
  useEffect(() => {
    clock.set(withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false));
  }, [clock]);

  return (
    <View style={styles.stage}>
      <Svg width={SIZE} height={SIZE} viewBox="0 0 300 300" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="heroGlow" cx="50%" cy="55%" r="50%">
            <Stop offset="0" stopColor="#B5F23D" stopOpacity={0.38} />
            <Stop offset="1" stopColor="#B5F23D" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="heroLiquid" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#C9FF6B" />
            <Stop offset="1" stopColor="#5FD36B" />
          </LinearGradient>
        </Defs>
        <Circle cx={150} cy={165} r={140} fill="url(#heroGlow)" />
        <Ellipse cx={150} cy={262} rx={110} ry={16} fill="#000000" opacity={0.28} />
        <Path
          d="M128 70 L172 70 L172 128 L222 228 Q230 250 208 250 L92 250 Q70 250 78 228 L128 128 Z"
          fill="#E2F7FF"
          fillOpacity={0.92}
          stroke={OUTLINE}
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <Path d="M104 176 L196 176 L218 226 Q224 242 206 242 L94 242 Q76 242 82 226 Z" fill="url(#heroLiquid)" />
        <Path d="M108 184 Q150 196 192 184" stroke="#E6FFC2" strokeWidth={4} strokeLinecap="round" fill="none" />
        <Circle cx={124} cy={214} r={7} fill="#FFFFFF" opacity={0.7} />
        <Circle cx={170} cy={204} r={5} fill="#FFFFFF" opacity={0.7} />
        <Circle cx={188} cy={226} r={6} fill="#FFFFFF" opacity={0.7} />
        <Path d="M141 84 L141 132 L112 192" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" fill="none" opacity={0.8} />
        <Rect x={118} y={56} width={64} height={18} rx={7} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={5} />
      </Svg>

      {[0, 1, 2, 3, 4].map((i) => (
        <HeroBubble key={i} clock={clock} index={i} />
      ))}

      {CLASSES.map((c, i) => (
        <Floating key={c.id} clock={clock} index={i} style={MEDALLION_SPOTS[i]}>
          <ClassMedallion icon={c.icon} color={c.color} size={54} />
        </Floating>
      ))}

      <View style={[styles.scientist, { left: 4 }]}>
        <Scientist look={lookFor('Saraa_Chem', 'medium')} height={104} />
      </View>
      <View style={[styles.scientist, { right: 4, transform: [{ scaleX: -1 }] }]}>
        <Scientist look={lookFor('ProtonPete', 'beginner')} height={104} />
      </View>
    </View>
  );
}

const MEDALLION_SPOTS = [
  { left: 18, top: 70 },
  { left: SIZE / 2 - 27, top: -6 },
  { right: 18, top: 70 },
] as const;

function HeroBubble({ clock, index }: { clock: SharedValue<number>; index: number }) {
  const style = useAnimatedStyle(() => {
    const p = (clock.get() * 2 + index / 5) % 1;
    return {
      opacity: p < 0.15 ? p / 0.15 : 1 - p,
      transform: [
        { translateX: 150 - 8 + Math.sin(p * Math.PI * 2 + index * 1.7) * 12 },
        { translateY: 58 - p * 70 },
        { scale: 0.5 + p * 0.9 },
      ],
    };
  });
  return <Animated.View style={[styles.bubble, style]} />;
}

function Floating({
  clock,
  index,
  style,
  children,
}: {
  clock: SharedValue<number>;
  index: number;
  style: object;
  children: ReactNode;
}) {
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.sin((clock.get() + index / 3) * Math.PI * 2) * 6 }],
  }));
  return <Animated.View style={[styles.floating, style, animated]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  stage: { width: SIZE, height: SIZE, alignSelf: 'center' },
  bubble: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: OUTLINE,
    backgroundColor: '#C9FF6B',
  },
  floating: { position: 'absolute' },
  scientist: { position: 'absolute', bottom: 30 },
});
