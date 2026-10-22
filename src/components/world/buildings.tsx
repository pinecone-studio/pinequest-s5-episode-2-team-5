import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { BuildingDef } from './world-config';

const OUTLINE = '#2A1B5C';
const GOLD = '#FFC93C';
const CLASS_FLAGS = ['#4ADE80', '#FFB938', '#FF5C7A'];

/** A 0→1 clock that loops forever, shared by a sprite's ambient animations. */
function useLoop(duration: number) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
  }, [duration, t]);
  return t;
}

export function BuildingSprite({ building, scale = 1 }: { building: BuildingDef; scale?: number }) {
  const { rect } = building;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.sprite,
        {
          left: rect.x,
          top: rect.y + (rect.h * (1 - scale)) / 2,
          width: rect.w,
          height: rect.h,
          transform: [{ scale }],
          zIndex: rect.y + rect.h,
        },
      ]}>
      {building.id === 'lessons' ? <LessonsHall /> : building.id === 'ranking' ? <RankingTower /> : <HubHouse building={building} />}
    </View>
  );
}

export function BuildingWindowLights({ building, scale = 1 }: { building: BuildingDef; scale?: number }) {
  if (building.id === 'ranking') return null;

  const isLessonsHall = building.id === 'lessons';
  const { rect } = building;
  const width = isLessonsHall ? 300 : 200;
  const height = isLessonsHall ? 280 : 260;
  const windows = isLessonsHall
    ? [{ x: 54, y: 146, width: 40, height: 58 }, { x: 206, y: 146, width: 40, height: 58 }]
    : [{ x: 39, y: 130, width: 34, height: 42 }, { x: 127, y: 130, width: 34, height: 42 }];

  return (
    <View
      pointerEvents="none"
      style={[
        styles.sprite,
        {
          left: rect.x,
          top: rect.y + (rect.h * (1 - scale)) / 2,
          width: rect.w,
          height: rect.h,
          transform: [{ scale }],
          zIndex: rect.y + rect.h + 1,
        },
      ]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {windows.map((window) => (
          <G key={`${window.x}-${window.y}`}>
            <Rect
              x={window.x - 7}
              y={window.y - 7}
              width={window.width + 14}
              height={window.height + 14}
              rx={10}
              fill="#FFC95B"
              opacity={0.3}
            />
            <Rect
              x={window.x}
              y={window.y}
              width={window.width}
              height={window.height}
              rx={isLessonsHall ? 8 : 7}
              fill="#FFE7A6"
              stroke={OUTLINE}
              strokeWidth={2.5}
            />
            <Line
              x1={window.x + window.width / 2}
              y1={window.y + 1}
              x2={window.x + window.width / 2}
              y2={window.y + window.height - 1}
              stroke="#FFF8DB"
              strokeWidth={isLessonsHall ? 3 : 2.5}
            />
            <Line
              x1={window.x + 1}
              y1={window.y + window.height / 2}
              x2={window.x + window.width - 1}
              y2={window.y + window.height / 2}
              stroke="#FFF8DB"
              strokeWidth={isLessonsHall ? 3 : 2.5}
            />
          </G>
        ))}
      </Svg>
    </View>
  );
}

function HubHouse({ building }: { building: BuildingDef }) {
  const color = building.color;
  const friendly = building.id === 'friendly';
  const openlab = building.id === 'openlab';
  return (
    <Svg width={200} height={260} viewBox="0 0 200 260">
      <Ellipse cx={100} cy={249} rx={94} ry={9} fill="#14320A" opacity={0.22} />
      <Rect x={13} y={223} width={174} height={25} rx={7} fill="#E9E4F8" stroke={OUTLINE} strokeWidth={3} />
      <Rect x={27} y={102} width={146} height={125} rx={7} fill={friendly ? '#DDFBFF' : openlab ? '#F1FFE1' : '#FFF0F3'} stroke={OUTLINE} strokeWidth={3} />
      <Rect x={31} y={205} width={138} height={16} fill={color} opacity={0.32} />
      <Rect x={39} y={130} width={34} height={42} rx={7} fill="#9BE8FF" stroke={OUTLINE} strokeWidth={2.5} />
      <Line x1={56} y1={131} x2={56} y2={171} stroke="#FFFFFF" strokeWidth={2.5} />
      <Line x1={40} y1={151} x2={72} y2={151} stroke="#FFFFFF" strokeWidth={2.5} />
      <Rect x={127} y={130} width={34} height={42} rx={7} fill="#9BE8FF" stroke={OUTLINE} strokeWidth={2.5} />
      <Line x1={144} y1={131} x2={144} y2={171} stroke="#FFFFFF" strokeWidth={2.5} />
      <Line x1={128} y1={151} x2={160} y2={151} stroke="#FFFFFF" strokeWidth={2.5} />
      <Path d="M78 227 L78 186 Q78 165 100 165 Q122 165 122 186 L122 227 Z" fill={color} stroke={OUTLINE} strokeWidth={3} />
      <Circle cx={114} cy={204} r={2.5} fill={GOLD} />
      <Path d="M8 105 L100 37 L192 105 Z" fill={color} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M34 99 L100 51 L166 99 Z" fill="#FFFFFF" opacity={0.22} />
      <Rect x={5} y={100} width={190} height={13} rx={5} fill={color} stroke={OUTLINE} strokeWidth={3} />
      {friendly ? <Path d="M100 69 C88 57 74 72 100 91 C126 72 112 57 100 69Z" fill="#FFFFFF" stroke={OUTLINE} strokeWidth={2} /> : null}
      {openlab ? <><Path d="M92 59 L108 59 L108 70 L120 87 Q123 91 118 91 L82 91 Q77 91 80 87 L92 70Z" fill="#E2F7FF" stroke={OUTLINE} strokeWidth={2.5} /><Path d="M84 81 L116 81 L120 88 L80 88Z" fill="#7CFF6B" /></> : null}
      {!friendly && !openlab ? <><Path d="M84 72 L96 60 L108 72 L96 84 Z" fill="#FFFFFF" stroke={OUTLINE} strokeWidth={2.5} /><Path d="M98 84 L112 69" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" /></> : null}
      <Circle cx={100} cy={35} r={8} fill={GOLD} stroke={OUTLINE} strokeWidth={2.5} />
      <Bush x={20} y={222} />
      <Bush x={180} y={222} />
    </Svg>
  );
}

function LessonsHall() {
  const clock = useLoop(2600);
  return (
    <>
      <Svg width={300} height={280} viewBox="0 0 300 280">
        <Defs>
          <LinearGradient id="hallWall" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FBF8FF" />
            <Stop offset="1" stopColor="#E2D9FA" />
          </LinearGradient>
        </Defs>
        <Ellipse cx={150} cy={266} rx={142} ry={12} fill="#14320A" opacity={0.22} />

        {/* platform + steps */}
        <Rect x={26} y={240} width={248} height={26} rx={8} fill="#E9E4F8" stroke={OUTLINE} strokeWidth={3} />
        <Rect x={112} y={248} width={76} height={18} rx={3} fill="#D9D1F0" stroke={OUTLINE} strokeWidth={2} />
        <Line x1={112} y1={257} x2={188} y2={257} stroke={OUTLINE} strokeWidth={1.5} />

        {/* walls */}
        <Rect x={38} y={122} width={224} height={124} rx={6} fill="url(#hallWall)" stroke={OUTLINE} strokeWidth={3} />
        <Rect x={41} y={222} width={218} height={21} fill="#D3C8F5" />

        <HallWindow x={54} />
        <HallWindow x={206} />
        <Column x={102} />
        <Column x={184} />

        {/* door */}
        <Path
          d="M126 246 L126 186 Q126 162 150 162 Q174 162 174 186 L174 246 Z"
          fill="#5B2FD6"
          stroke={OUTLINE}
          strokeWidth={3}
        />
        <Path d="M134 186 Q134 170 150 170 Q166 170 166 186 Z" fill="#9BE8FF" stroke={OUTLINE} strokeWidth={2} />
        <Line x1={150} y1={186} x2={150} y2={246} stroke="#3F1DA6" strokeWidth={2.5} />
        <Circle cx={143} cy={216} r={2.6} fill={GOLD} />
        <Circle cx={157} cy={216} r={2.6} fill={GOLD} />

        {/* bunting in the three class colors */}
        <Path d="M42 134 Q150 152 258 134" stroke={OUTLINE} strokeWidth={1.5} fill="none" />
        {Array.from({ length: 11 }, (_, i) => {
          const x = 52 + i * 19.6;
          const t = (x - 42) / 216;
          const y = 134 + 4 * 18 * t * (1 - t);
          return (
            <Path
              key={i}
              d={`M${x - 6} ${y} L${x + 6} ${y} L${x} ${y + 11} Z`}
              fill={CLASS_FLAGS[i % 3]}
              stroke={OUTLINE}
              strokeWidth={1.2}
              strokeLinejoin="round"
            />
          );
        })}

        {/* roof */}
        <Path d="M28 122 L150 50 L272 122 Z" fill="#7C4DFF" stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
        <Path d="M60 114 L150 62 L240 114 Z" fill="#9775FF" />
        <Rect x={22} y={116} width={256} height={14} rx={5} fill="#5B2FD6" stroke={OUTLINE} strokeWidth={3} />
        <Circle cx={150} cy={92} r={17} fill="#C9F6FF" stroke={OUTLINE} strokeWidth={3} />
        {[0, 60, 120].map((angle) => (
          <Ellipse
            key={angle}
            cx={150}
            cy={92}
            rx={11}
            ry={4.2}
            stroke="#5B2FD6"
            strokeWidth={1.8}
            fill="none"
            transform={`rotate(${angle} 150 92)`}
          />
        ))}
        <Circle cx={150} cy={92} r={2.8} fill="#FF5C7A" />

        {/* giant flask on the roof */}
        <Path
          d="M140 6 L160 6 L160 26 L183 58 Q186 64 179 64 L121 64 Q114 64 117 58 L140 26 Z"
          fill="#E2F7FF"
          stroke={OUTLINE}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <Path d="M129 44 L171 44 L181 59 Q182 61.5 179 61.5 L121 61.5 Q118 61.5 119 59 Z" fill="#7CFF6B" />
        <Line x1={131} y1={46} x2={169} y2={46} stroke="#C8FFB8" strokeWidth={2} />
        <Circle cx={140} cy={54} r={2.5} fill="#FFFFFF" opacity={0.75} />
        <Circle cx={158} cy={50} r={1.8} fill="#FFFFFF" opacity={0.75} />
        <Circle cx={166} cy={57} r={2.2} fill="#FFFFFF" opacity={0.75} />
        <Path d="M146 12 L146 27 L133 45" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Rect x={136} y={1} width={28} height={8} rx={3} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={2.5} />

        <Bush x={30} y={240} />
        <Bush x={270} y={240} />
      </Svg>
      {[0, 1, 2, 3].map((i) => (
        <RisingBubble key={i} clock={clock} index={i} count={4} x={150} y={2} />
      ))}
    </>
  );
}

function HallWindow({ x }: { x: number }) {
  return (
    <G>
      <Rect x={x} y={146} width={40} height={58} rx={8} fill="#9BE8FF" stroke={OUTLINE} strokeWidth={2.5} />
      <Path d={`M${x + 7} ${196} L${x + 30} ${154}`} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={5} strokeLinecap="round" />
      <Line x1={x + 20} y1={147} x2={x + 20} y2={203} stroke="#FFFFFF" strokeWidth={3} />
      <Line x1={x + 1} y1={172} x2={x + 39} y2={172} stroke="#FFFFFF" strokeWidth={3} />
      <Rect x={x - 4} y={204} width={48} height={7} rx={3} fill="#D3C8F5" stroke={OUTLINE} strokeWidth={2} />
    </G>
  );
}

function Column({ x }: { x: number }) {
  return (
    <G>
      <Rect x={x} y={144} width={14} height={96} fill="#FFFFFF" stroke={OUTLINE} strokeWidth={2.5} />
      <Line x1={x + 7} y1={150} x2={x + 7} y2={234} stroke="#E2D9FA" strokeWidth={3} />
      <Rect x={x - 5} y={136} width={24} height={10} rx={3} fill="#F1ECFF" stroke={OUTLINE} strokeWidth={2.5} />
      <Rect x={x - 4} y={236} width={22} height={8} rx={2} fill="#F1ECFF" stroke={OUTLINE} strokeWidth={2.5} />
    </G>
  );
}

function Bush({ x, y }: { x: number; y: number }) {
  const blobs = [
    { dx: -10, dy: -6, r: 11 },
    { dx: 9, dy: -7, r: 10 },
    { dx: 0, dy: -14, r: 12 },
  ];
  return (
    <G>
      {blobs.map((b, i) => (
        <Circle key={`o${i}`} cx={x + b.dx} cy={y + b.dy} r={b.r + 2.5} fill="#24451F" />
      ))}
      {blobs.map((b, i) => (
        <Circle key={`f${i}`} cx={x + b.dx} cy={y + b.dy} r={b.r} fill="#4FB548" />
      ))}
      <Circle cx={x - 3} cy={y - 18} r={4.5} fill="#7DD86A" />
    </G>
  );
}

function RankingTower() {
  const clock = useLoop(2200);
  return (
    <>
      <Svg width={190} height={320} viewBox="0 0 190 320">
        <Defs>
          <LinearGradient id="towerStone" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFF6E0" />
            <Stop offset="1" stopColor="#F2D59A" />
          </LinearGradient>
          <LinearGradient id="towerGold" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFE58A" />
            <Stop offset="1" stopColor="#F5A623" />
          </LinearGradient>
        </Defs>
        <Ellipse cx={95} cy={308} rx={90} ry={11} fill="#14320A" opacity={0.22} />

        <Rect x={12} y={280} width={166} height={28} rx={8} fill="#F3E3C0" stroke={OUTLINE} strokeWidth={3} />
        <Rect x={70} y={288} width={50} height={20} rx={3} fill="#E8D2A2" stroke={OUTLINE} strokeWidth={2} />
        <Line x1={70} y1={298} x2={120} y2={298} stroke={OUTLINE} strokeWidth={1.5} />

        {/* tower body */}
        <Path
          d="M40 284 L48 120 L142 120 L150 284 Z"
          fill="url(#towerStone)"
          stroke={OUTLINE}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <Path d="M45.3 176 L144.7 176 L145.1 184 L44.9 184 Z" fill="#EBC883" />
        <Path d="M42.5 232 L147.5 232 L147.9 240 L42.1 240 Z" fill="#EBC883" />

        <Banner x={54} />
        <Banner x={118} />

        {/* medal window */}
        <Circle cx={95} cy={152} r={16} fill="#9BE8FF" stroke={OUTLINE} strokeWidth={3} />
        <Path d={starPath(95, 152, 10, 4.4)} fill={GOLD} stroke={OUTLINE} strokeWidth={1.5} strokeLinejoin="round" />
        <Path d="M84 216 L84 202 Q84 191 95 191 Q106 191 106 202 L106 216 Z" fill="#9BE8FF" stroke={OUTLINE} strokeWidth={2.5} />
        <Line x1={95} y1={192} x2={95} y2={215} stroke="#FFFFFF" strokeWidth={2.5} />

        {/* door */}
        <Path d="M76 284 L76 246 Q76 226 95 226 Q114 226 114 246 L114 284 Z" fill="#E53950" stroke={OUTLINE} strokeWidth={3} />
        <Path d="M81 284 L81 247 Q81 231 95 231 Q109 231 109 247 L109 284" fill="none" stroke={GOLD} strokeWidth={2.5} />
        <Circle cx={104} cy={262} r={2.6} fill={GOLD} />

        {/* battlements + dome */}
        {[36, 60, 84, 108, 132].map((x) => (
          <Rect key={x} x={x} y={96} width={22} height={14} rx={3} fill="#FFB938" stroke={OUTLINE} strokeWidth={2.5} />
        ))}
        <Path d="M54 106 Q54 50 95 44 Q136 50 136 106 Z" fill="url(#towerGold)" stroke={OUTLINE} strokeWidth={3} />
        <Path d="M95 46 L95 104 M95 46 Q76 62 74 104 M95 46 Q114 62 116 104" stroke="#E0920F" strokeWidth={2} fill="none" />
        <Path d="M64 94 Q64 66 84 55" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={4} strokeLinecap="round" fill="none" />
        <Rect x={32} y={104} width={126} height={18} rx={5} fill="#FFB938" stroke={OUTLINE} strokeWidth={3} />

        {/* trophy */}
        <Path d="M80 13 Q66 13 68 24 Q70 31 82 30" stroke={OUTLINE} strokeWidth={6.5} strokeLinecap="round" fill="none" />
        <Path d="M110 13 Q124 13 122 24 Q120 31 108 30" stroke={OUTLINE} strokeWidth={6.5} strokeLinecap="round" fill="none" />
        <Path d="M80 13 Q66 13 68 24 Q70 31 82 30" stroke="#FFD43B" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path d="M110 13 Q124 13 122 24 Q120 31 108 30" stroke="#FFD43B" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path d="M78 7 L112 7 Q113 33 95 38 Q77 33 78 7 Z" fill="url(#towerGold)" stroke={OUTLINE} strokeWidth={2.5} strokeLinejoin="round" />
        <Path d={starPath(95, 19, 7, 3)} fill="#FFFFFF" />
        <Rect x={91} y={37} width={8} height={5} fill="#F5A623" stroke={OUTLINE} strokeWidth={2} />
        <Rect x={82} y={41} width={26} height={6} rx={2} fill="#F5A623" stroke={OUTLINE} strokeWidth={2.5} />
      </Svg>
      <Sparkle clock={clock} index={0} x={54} y={4} />
      <Sparkle clock={clock} index={1} x={128} y={18} />
      <Sparkle clock={clock} index={2} x={96} y={-18} />
    </>
  );
}

function Banner({ x }: { x: number }) {
  return (
    <G>
      <Path
        d={`M${x} 124 L${x + 18} 124 L${x + 18} 172 L${x + 9} 164 L${x} 172 Z`}
        fill="#E53950"
        stroke={OUTLINE}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <Path d={starPath(x + 9, 142, 6, 2.6)} fill={GOLD} />
    </G>
  );
}

function starPath(cx: number, cy: number, outer: number, inner: number) {
  return (
    Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      return `${i === 0 ? 'M' : 'L'}${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
    }).join(' ') + ' Z'
  );
}

interface LoopProps {
  clock: SharedValue<number>;
  index: number;
  x: number;
  y: number;
}

function RisingBubble({ clock, index, count, x, y }: LoopProps & { count: number }) {
  const style = useAnimatedStyle(() => {
    const p = (clock.get() + index / count) % 1;
    return {
      opacity: p < 0.15 ? p / 0.15 : 1 - p,
      transform: [
        { translateX: x - 5 + Math.sin(p * Math.PI * 2 + index) * 7 },
        { translateY: y - p * 52 },
        { scale: 0.5 + p * 0.8 },
      ],
    };
  });
  return <Animated.View style={[styles.bubble, style]} />;
}

function Sparkle({ clock, index, x, y }: LoopProps) {
  const style = useAnimatedStyle(() => {
    const p = (clock.get() + index / 3) % 1;
    const s = Math.sin(p * Math.PI);
    return {
      opacity: s,
      transform: [{ translateX: x - 9 }, { translateY: y }, { scale: 0.4 + s * 0.8 }, { rotate: `${p * 90}deg` }],
    };
  });
  return (
    <Animated.View style={[styles.sparkle, style]}>
      <MaterialCommunityIcons name="star-four-points" size={18} color="#FFF6C2" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sprite: { position: 'absolute' },
  bubble: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#2A1B5C',
    backgroundColor: '#B8FFAA',
  },
  sparkle: { position: 'absolute', left: 0, top: 0 },
});
