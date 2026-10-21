import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { FOUNTAIN, type TreeKind } from './world-config';

const LEAF_OUTLINE = '#24451F';
const WOOD_OUTLINE = '#4A3018';
const STONE_OUTLINE = '#2A1B5C';

interface AnchoredProps {
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  /** Distance from the sprite's top to the point that sits at (x, y). Defaults to the bottom. */
  anchorY?: number;
  /** Depth used for sorting against avatars. Defaults to y. */
  depth?: number;
  children: ReactNode;
}

/** Places a sprite so its anchor (bottom-center by default) sits on a world point. */
export function Anchored({ x, y, width, height, scale = 1, anchorY = height, depth = y, children }: AnchoredProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.anchored,
        {
          left: x - width / 2,
          top: y - scale * anchorY - ((1 - scale) * height) / 2,
          width,
          height,
          transform: [{ scale }],
          zIndex: Math.round(depth),
        },
      ]}>
      {children}
    </View>
  );
}

export function Tree({ x, y, kind, scale }: { x: number; y: number; kind: TreeKind; scale: number }) {
  const w = (kind === 'round' ? 80 : 70) * scale;
  const h = (kind === 'round' ? 96 : 100) * scale;
  return (
    <Anchored x={x} y={y} width={w} height={h} anchorY={h - 6 * scale}>
      {kind === 'round' ? <RoundTree width={w} height={h} /> : <PineTree width={w} height={h} />}
    </Anchored>
  );
}

function RoundTree({ width, height }: { width: number; height: number }) {
  const blobs = [
    { cx: 24, cy: 50, r: 18, fill: '#3E9A3B' },
    { cx: 56, cy: 50, r: 18, fill: '#3E9A3B' },
    { cx: 40, cy: 36, r: 29, fill: '#4FB548' },
  ];
  return (
    <Svg width={width} height={height} viewBox="0 0 80 96">
      <Ellipse cx={40} cy={90} rx={27} ry={6} fill="#14320A" opacity={0.22} />
      <Path d="M35 90 L36.5 60 L43.5 60 L45 90 Z" fill="#8B5A2B" stroke={WOOD_OUTLINE} strokeWidth={2.5} strokeLinejoin="round" />
      {blobs.map((b, i) => (
        <Circle key={`o${i}`} cx={b.cx} cy={b.cy} r={b.r + 2.5} fill={LEAF_OUTLINE} />
      ))}
      {blobs.map((b, i) => (
        <Circle key={`f${i}`} cx={b.cx} cy={b.cy} r={b.r} fill={b.fill} />
      ))}
      <Circle cx={32} cy={27} r={11} fill="#7DD86A" />
      <Circle cx={48} cy={20} r={5} fill="#9BE584" />
      <Circle cx={22} cy={52} r={2.6} fill="#FF6B6B" />
      <Circle cx={55} cy={44} r={2.6} fill="#FF6B6B" />
    </Svg>
  );
}

function PineTree({ width, height }: { width: number; height: number }) {
  const layers = [
    { d: 'M8 82 L35 40 L62 82 Z', fill: '#2F8F4E' },
    { d: 'M13 61 L35 22 L57 61 Z', fill: '#38A35A' },
    { d: 'M18 41 L35 4 L52 41 Z', fill: '#45B86A' },
  ];
  return (
    <Svg width={width} height={height} viewBox="0 0 70 100">
      <Ellipse cx={35} cy={94} rx={22} ry={5} fill="#14320A" opacity={0.22} />
      <Rect x={31} y={78} width={8} height={16} fill="#8B5A2B" stroke={WOOD_OUTLINE} strokeWidth={2.5} />
      {layers.map((l, i) => (
        <Path key={i} d={l.d} fill={l.fill} stroke="#1C4D2E" strokeWidth={2.5} strokeLinejoin="round" />
      ))}
      <Path d="M30 30 L35 14 M24 54 L31 38 M20 76 L28 60" stroke="#7FD68F" strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function Lamp({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <Anchored x={x} y={y} width={40} height={78} scale={scale} anchorY={74}>
      <Svg width={40} height={78} viewBox="0 0 40 78">
        <Defs>
          <RadialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFF3A0" stopOpacity={0.75} />
            <Stop offset="1" stopColor="#FFF3A0" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={20} cy={14} r={18} fill="url(#lampGlow)" />
        <Ellipse cx={20} cy={74} rx={9} ry={3} fill="#14320A" opacity={0.22} />
        <Rect x={18} y={18} width={4} height={54} fill="#3B3366" />
        <Rect x={13} y={66} width={14} height={7} rx={2} fill="#2A2550" />
        <Path d="M13 20 L27 20 L25 8 L15 8 Z" fill="#FFF3B0" stroke="#2A2550" strokeWidth={2} strokeLinejoin="round" />
        <Path d="M11 9 L29 9 L20 2 Z" fill="#3B3366" stroke="#2A2550" strokeWidth={1.5} strokeLinejoin="round" />
      </Svg>
    </Anchored>
  );
}

export function Bench({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <Anchored x={x} y={y} width={52} height={32} scale={scale} anchorY={28}>
      <Svg width={52} height={32} viewBox="0 0 52 32">
        <Ellipse cx={26} cy={28} rx={23} ry={3.5} fill="#14320A" opacity={0.22} />
        <Rect x={8} y={15} width={4} height={12} fill="#4A3424" />
        <Rect x={40} y={15} width={4} height={12} fill="#4A3424" />
        <Rect x={10} y={4} width={3} height={11} fill="#4A3424" />
        <Rect x={39} y={4} width={3} height={11} fill="#4A3424" />
        <Rect x={3} y={2} width={46} height={5} rx={2} fill="#D9955A" stroke={WOOD_OUTLINE} strokeWidth={1.8} />
        <Rect x={3} y={8} width={46} height={4} rx={2} fill="#D9955A" stroke={WOOD_OUTLINE} strokeWidth={1.8} />
        <Rect x={2} y={14} width={48} height={6} rx={2} fill="#C7834A" stroke={WOOD_OUTLINE} strokeWidth={1.8} />
      </Svg>
    </Anchored>
  );
}

export function Signpost({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <Anchored x={x} y={y} width={84} height={82} scale={scale} anchorY={78}>
      <Svg width={84} height={82} viewBox="0 0 84 82">
        <Ellipse cx={42} cy={78} rx={12} ry={3} fill="#14320A" opacity={0.22} />
        <Rect x={39} y={12} width={6} height={66} rx={1.5} fill="#9C6B3E" stroke={WOOD_OUTLINE} strokeWidth={2} />
        <Path d="M16 14 L64 14 L64 32 L16 32 L7 23 Z" fill="#F0C987" stroke={WOOD_OUTLINE} strokeWidth={2.5} strokeLinejoin="round" />
        <Path d="M20 38 L68 38 L77 47 L68 56 L20 56 Z" fill="#F0C987" stroke={WOOD_OUTLINE} strokeWidth={2.5} strokeLinejoin="round" />
      </Svg>
      <View style={[styles.signIcon, { left: 30, top: 15 }]}>
        <MaterialCommunityIcons name="flask" size={14} color="#6B3FD9" />
      </View>
      <View style={[styles.signIcon, { left: 38, top: 39 }]}>
        <MaterialCommunityIcons name="trophy" size={14} color="#C77A00" />
      </View>
    </Anchored>
  );
}

const FOUNTAIN_W = 140;
const FOUNTAIN_H = 140;
/** Basin center inside the sprite. */
const BASIN = { x: 70, y: 100 };

export function Fountain({ scale = 1 }: { scale?: number }) {
  const clock = useSharedValue(0);
  useEffect(() => {
    clock.set(withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false));
  }, [clock]);

  return (
    <Anchored
      x={FOUNTAIN.x}
      y={FOUNTAIN.y}
      width={FOUNTAIN_W}
      height={FOUNTAIN_H}
      scale={scale}
      anchorY={BASIN.y}
      depth={FOUNTAIN.y + FOUNTAIN.r * 0.8}>
      <Svg width={FOUNTAIN_W} height={FOUNTAIN_H} viewBox={`0 0 ${FOUNTAIN_W} ${FOUNTAIN_H}`}>
        <Defs>
          <RadialGradient id="fountainWater" cx="50%" cy="40%" r="60%">
            <Stop offset="0" stopColor="#A6ECFF" />
            <Stop offset="1" stopColor="#3FA7DC" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={70} cy={114} rx={68} ry={24} fill="#14320A" opacity={0.18} />
        <Ellipse cx={70} cy={108} rx={62} ry={28} fill="#A99FD0" stroke={STONE_OUTLINE} strokeWidth={2.5} />
        <Rect x={8} y={98} width={124} height={10} fill="#A99FD0" />
        <Ellipse cx={70} cy={98} rx={62} ry={28} fill="#DCD5F2" stroke={STONE_OUTLINE} strokeWidth={2.5} />
        <Ellipse cx={70} cy={98} rx={51} ry={21} fill="url(#fountainWater)" stroke="#2E8FC4" strokeWidth={2} />
        <Path d="M38 96 q10 -5 20 0 M80 104 q9 -4 18 0" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2} fill="none" strokeLinecap="round" />

        <Rect x={62} y={62} width={16} height={36} rx={4} fill="#DCD5F2" stroke={STONE_OUTLINE} strokeWidth={2} />
        <Ellipse cx={70} cy={62} rx={20} ry={7} fill="#DCD5F2" stroke={STONE_OUTLINE} strokeWidth={2} />
        <Ellipse cx={70} cy={61} rx={15} ry={4.5} fill="#7FD8F5" />

        {/* round-bottom flask statue */}
        <G>
          <Rect x={65.5} y={26} width={9} height={14} fill="#E2F7FF" stroke={STONE_OUTLINE} strokeWidth={2} />
          <Circle cx={70} cy={47} r={11} fill="#E2F7FF" stroke={STONE_OUTLINE} strokeWidth={2} />
          <Path d="M59.4 49.5 A11 11 0 0 0 80.6 49.5 Z" fill="#FF7AC6" />
          <Path d="M64 42 Q65 38 68 37" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" fill="none" />
          <Rect x={63.5} y={24} width={13} height={4} rx={1.5} fill="#FFFFFF" stroke={STONE_OUTLINE} strokeWidth={1.5} />
        </G>
      </Svg>
      {Array.from({ length: 8 }, (_, i) => (
        <Droplet key={i} clock={clock} index={i} />
      ))}
      <Ripple clock={clock} x={30} y={100} offset={0} />
      <Ripple clock={clock} x={110} y={100} offset={0.5} />
    </Anchored>
  );
}

function Droplet({ clock, index }: { clock: SharedValue<number>; index: number }) {
  const dir = index % 2 === 0 ? 1 : -1;
  const style = useAnimatedStyle(() => {
    const p = (clock.get() + index / 8) % 1;
    return {
      opacity: p > 0.85 ? (1 - p) / 0.15 : 1,
      transform: [
        { translateX: 70 - 3 + dir * 40 * p },
        { translateY: 24 - 62 * p + 128 * p * p },
      ],
    };
  });
  return <Animated.View style={[styles.droplet, style]} />;
}

function Ripple({ clock, x, y, offset }: { clock: SharedValue<number>; x: number; y: number; offset: number }) {
  const style = useAnimatedStyle(() => {
    const p = (clock.get() + offset) % 1;
    return {
      opacity: 0.8 * (1 - p),
      transform: [{ translateX: x - 12 }, { translateY: y - 5 }, { scale: 0.4 + p }],
    };
  });
  return <Animated.View style={[styles.ripple, style]} />;
}

const styles = StyleSheet.create({
  anchored: { position: 'absolute' },
  signIcon: { position: 'absolute' },
  droplet: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C9F3FF',
    borderWidth: 1,
    borderColor: '#3FA7DC',
  },
  ripple: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 24,
    height: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
