import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { Walker } from '@/components/world/walker';
import { AppText } from '@/components/ui/app-text';
import { Colors, Fonts } from '@/constants/theme';
import { BUILDINGS, PATHS, PLAZA, POND, WORLD, type Point } from '@/components/world/world-config';

const MAP_WIDTH = 168;
const MAP_HEIGHT = 98;
const PLAYER_DOT_SIZE = 8;

function toPath(points: Point[]) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
}

export function MiniMap({ player }: { player: Walker }) {
  const insets = useSafeAreaInsets();
  const playerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (player.y.get() / WORLD.height) * MAP_WIDTH - PLAYER_DOT_SIZE / 2 },
      { translateY: ((WORLD.width - player.x.get()) / WORLD.width) * MAP_HEIGHT - PLAYER_DOT_SIZE / 2 },
    ],
  }));

  return (
    <View
      pointerEvents="box-only"
      accessibilityLabel="Campus mini map showing your position"
      style={[styles.frame, { top: insets.top + 54 }]}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <MaterialCommunityIcons name="map-outline" size={13} color={Colors.cyan} />
          <AppText style={styles.title}>CAMPUS MAP</AppText>
        </View>
        <View style={styles.northBadge}>
          <MaterialCommunityIcons name="arrow-left" size={9} color={Colors.cyan} />
          <AppText style={styles.northText}>N</AppText>
        </View>
        <View style={styles.youBadge}>
          <View style={styles.youDot} />
          <AppText style={styles.youText}>YOU</AppText>
        </View>
      </View>
      <View style={styles.viewport}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${WORLD.height} ${WORLD.width}`} preserveAspectRatio="none">
          <G transform={`matrix(0 -1 1 0 0 ${WORLD.width})`}>
            <Defs>
              <LinearGradient id="miniMapGrass" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#A3E66C" />
                <Stop offset="1" stopColor="#79C54D" />
              </LinearGradient>
              <LinearGradient id="miniMapWater" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#92E7FB" />
                <Stop offset="1" stopColor="#38A5D7" />
              </LinearGradient>
            </Defs>
            <Rect width={WORLD.width} height={WORLD.height} fill="url(#miniMapGrass)" />
            <Ellipse cx={174} cy={580} rx={150} ry={210} fill="#D2F397" opacity={0.18} />
            <Ellipse cx={494} cy={420} rx={126} ry={180} fill="#D2F397" opacity={0.14} />
            {PATHS.map((path, index) => (
              <Path
                key={`path-edge-${index}`}
                d={toPath(path)}
                stroke="#B58B57"
                strokeWidth={72}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
            {PATHS.map((path, index) => (
              <Path
                key={`path-${index}`}
                d={toPath(path)}
                stroke="#F8E7B8"
                strokeWidth={46}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
            <Circle cx={PLAZA.x} cy={PLAZA.y} r={PLAZA.r + 8} fill="#C6A36B" />
            <Circle cx={PLAZA.x} cy={PLAZA.y} r={PLAZA.r} fill="#F0DFAF" stroke="#FFF1C8" strokeWidth={8} />
            <Circle cx={PLAZA.x} cy={PLAZA.y} r={PLAZA.r - 25} fill="#E7D29B" stroke="#D4BA82" strokeWidth={5} />
            <Ellipse cx={POND.x} cy={POND.y} rx={POND.rx} ry={POND.ry} fill="url(#miniMapWater)" stroke="#2D86B7" strokeWidth={9} />
            <Path d={`M${POND.x - 54} ${POND.y - 15} q28 -12 56 0 M${POND.x + 5} ${POND.y + 18} q24 -10 48 0`} stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={8} fill="none" strokeLinecap="round" />
            <Circle cx={300} cy={640} r={39} fill="#7C4DFF" stroke="#2A1B5C" strokeWidth={9} />
            <Circle cx={300} cy={640} r={18} fill="#A6E8F6" stroke="#FFFFFF" strokeWidth={5} />
            {BUILDINGS.map((building) => (
              <G key={building.id}>
                <Rect
                  x={building.rect.x}
                  y={building.rect.y}
                  width={building.rect.w}
                  height={building.rect.h}
                  rx={24}
                  fill={building.color}
                  stroke="#2A1B5C"
                  strokeWidth={13}
                />
                <Rect
                  x={building.rect.x + 18}
                  y={building.rect.y + 18}
                  width={building.rect.w - 36}
                  height={building.rect.h - 36}
                  rx={17}
                  fill="#FFFFFF"
                  opacity={0.17}
                />
              </G>
            ))}
          </G>
        </Svg>
        {BUILDINGS.map((building) => {
          const centerX = building.rect.x + building.rect.w / 2;
          const centerY = building.rect.y + building.rect.h / 2;
          const x = (centerY / WORLD.height) * MAP_WIDTH;
          const y = ((WORLD.width - centerX) / WORLD.width) * MAP_HEIGHT;
          const label = {
            lessons: 'LESS',
            ranking: 'RANK',
            versus: 'VS',
            friendly: 'FRIEND',
            openlab: 'LAB',
          }[building.id];
          return (
            <View
              key={`${building.id}-label`}
              style={[styles.placeLabel, { left: x - 15, top: y - 6, borderColor: building.color }]}>
              <AppText style={styles.placeLabelText} numberOfLines={1}>
                {label}
              </AppText>
            </View>
          );
        })}
        <Animated.View style={[styles.playerDot, playerStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    right: 12,
    zIndex: 20,
    width: 184,
    height: 138,
    padding: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(61,224,245,0.62)',
    backgroundColor: 'rgba(18,12,51,0.91)',
    shadowColor: '#120C33',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 7,
  },
  header: {
    height: 20,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontFamily: Fonts.bold, fontSize: 9, lineHeight: 12, letterSpacing: 0.7, color: Colors.text },
  northBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(61,224,245,0.12)',
  },
  northText: { fontFamily: Fonts.bold, fontSize: 7.5, lineHeight: 10, color: Colors.cyan },
  youBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(181,242,61,0.16)',
  },
  youDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.lime },
  youText: { fontFamily: Fonts.bold, fontSize: 7.5, lineHeight: 10, color: Colors.lime },
  viewport: {
    position: 'relative',
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    overflow: 'hidden',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  placeLabel: {
    position: 'absolute',
    width: 30,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(18,12,51,0.84)',
  },
  placeLabelText: { fontFamily: Fonts.bold, fontSize: 5.5, lineHeight: 7, color: Colors.text },
  playerDot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PLAYER_DOT_SIZE,
    height: PLAYER_DOT_SIZE,
    borderRadius: PLAYER_DOT_SIZE / 2,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#B5F23D',
    shadowColor: '#17243B',
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
});
