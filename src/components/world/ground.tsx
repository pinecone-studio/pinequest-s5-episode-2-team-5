import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { seededRandom } from '@/lib/random';

import { FLOWER_BEDS, PATHS, PLAZA, POND, WORLD, type Point } from './world-config';

const FLOWER_COLORS = ['#FF7AB6', '#FFD84D', '#FFFFFF', '#B78CFF', '#FF8A5C'];

function polyline(points: Point[]) {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
}

/** Static ground layer: grass, sand paths, the plaza, the pond and flower beds. */
export function Ground() {
  const rand = seededRandom(42);
  const tufts = Array.from({ length: 170 }, () => ({ x: rand() * WORLD.width, y: rand() * WORLD.height }));
  const speckles = Array.from({ length: 90 }, () => ({
    x: rand() * WORLD.width,
    y: rand() * WORLD.height,
    r: 1.2 + rand() * 1.6,
  }));
  const patches = Array.from({ length: 14 }, () => ({
    x: rand() * WORLD.width,
    y: rand() * WORLD.height,
    rx: 40 + rand() * 70,
    ry: 20 + rand() * 30,
  }));
  const pebbles = PATHS.flatMap((path) =>
    path.slice(1).flatMap((p, i) => {
      const a = path[i];
      return Array.from({ length: 5 }, () => {
        const t = rand();
        return { x: a.x + (p.x - a.x) * t + (rand() - 0.5) * 22, y: a.y + (p.y - a.y) * t + (rand() - 0.5) * 22 };
      });
    }),
  );
  const flowers = FLOWER_BEDS.flatMap((bed) =>
    Array.from({ length: Math.round(bed.rx / 3.2) }, () => {
      const angle = rand() * Math.PI * 2;
      const dist = Math.sqrt(rand()) * 0.78;
      return {
        x: bed.x + Math.cos(angle) * bed.rx * dist,
        y: bed.y + Math.sin(angle) * bed.ry * dist,
        color: FLOWER_COLORS[Math.floor(rand() * FLOWER_COLORS.length)],
      };
    }),
  );

  return (
    <Svg width={WORLD.width} height={WORLD.height} style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <LinearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#A4E06A" />
          <Stop offset="1" stopColor="#7FCB55" />
        </LinearGradient>
        <LinearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8DE2FA" />
          <Stop offset="1" stopColor="#3FA7DC" />
        </LinearGradient>
      </Defs>

      <Rect width={WORLD.width} height={WORLD.height} fill="url(#grass)" />
      {patches.map((p, i) => (
        <Ellipse key={`patch${i}`} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill="#C3EE8A" opacity={0.25} />
      ))}
      {tufts.map((t, i) => (
        <Path
          key={`tuft${i}`}
          d={`M${t.x} ${t.y} l2.5 -6 l2.5 6 M${t.x + 4} ${t.y} l2 -4.5`}
          stroke="#62AE41"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.55}
        />
      ))}
      {speckles.map((s, i) => (
        <Circle key={`speck${i}`} cx={s.x} cy={s.y} r={s.r} fill="#D8F7A8" opacity={0.6} />
      ))}

      {/* sand paths */}
      {PATHS.map((path, i) => (
        <Path
          key={`edge${i}`}
          d={polyline(path)}
          stroke="#D9B572"
          strokeWidth={46}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
      {PATHS.map((path, i) => (
        <Path
          key={`path${i}`}
          d={polyline(path)}
          stroke="#F5DEA8"
          strokeWidth={37}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
      {pebbles.map((p, i) => (
        <Ellipse key={`pebble${i}`} cx={p.x} cy={p.y} rx={2.6} ry={1.8} fill="#E3C487" />
      ))}

      {/* plaza */}
      <Circle cx={PLAZA.x} cy={PLAZA.y} r={PLAZA.r + 4} fill="#D4B57A" />
      <Circle cx={PLAZA.x} cy={PLAZA.y} r={PLAZA.r} fill="#EED9AB" />
      <Circle cx={PLAZA.x} cy={PLAZA.y} r={PLAZA.r - 28} fill="#E6CF9C" stroke="#D9BE88" strokeWidth={2} />
      <G>
        {Array.from({ length: 20 }, (_, i) => {
          const a = (i / 20) * Math.PI * 2;
          return (
            <Line
              key={`tile${i}`}
              x1={PLAZA.x + Math.cos(a) * (PLAZA.r - 28)}
              y1={PLAZA.y + Math.sin(a) * (PLAZA.r - 28)}
              x2={PLAZA.x + Math.cos(a) * (PLAZA.r - 2)}
              y2={PLAZA.y + Math.sin(a) * (PLAZA.r - 2)}
              stroke="#DCC392"
              strokeWidth={2}
            />
          );
        })}
      </G>

      {/* pond */}
      <Ellipse cx={POND.x} cy={POND.y + 3} rx={POND.rx + 12} ry={POND.ry + 10} fill="#E3CC95" />
      <Ellipse cx={POND.x} cy={POND.y} rx={POND.rx} ry={POND.ry} fill="url(#water)" stroke="#2E8FC4" strokeWidth={3} />
      <Path
        d={`M${POND.x - 50} ${POND.y - 22} q22 -10 44 0 M${POND.x + 10} ${POND.y + 16} q18 -8 36 0 M${POND.x - 60} ${POND.y + 22} q14 -6 28 0`}
        stroke="#FFFFFF"
        strokeOpacity={0.6}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
      />
      <LilyPad x={POND.x + 40} y={POND.y - 18} r={11} flower />
      <LilyPad x={POND.x - 30} y={POND.y + 30} r={9} />
      <LilyPad x={POND.x + 58} y={POND.y + 24} r={8} />
      <Reeds x={POND.x - POND.rx + 8} y={POND.y - 12} />
      <Reeds x={POND.x + POND.rx - 18} y={POND.y - 26} />

      {/* flower beds */}
      {FLOWER_BEDS.map((bed, i) => (
        <Ellipse
          key={`bed${i}`}
          cx={bed.x}
          cy={bed.y}
          rx={bed.rx}
          ry={bed.ry}
          fill="#5DAE45"
          stroke="#468F33"
          strokeWidth={2}
        />
      ))}
      {flowers.map((f, i) => (
        <G key={`flower${i}`}>
          <Circle cx={f.x} cy={f.y} r={3} fill={f.color} />
          <Circle cx={f.x} cy={f.y} r={1.1} fill="#FFB020" />
        </G>
      ))}
    </Svg>
  );
}

function LilyPad({ x, y, r, flower = false }: { x: number; y: number; r: number; flower?: boolean }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={r} fill="#4CB050" stroke="#2F7D36" strokeWidth={1.5} />
      <Path d={`M${x} ${y} L${x + r * 1.1} ${y - r * 0.35} L${x + r * 1.1} ${y + r * 0.35} Z`} fill="#5FC4EC" />
      {flower && (
        <G>
          <Circle cx={x - 2} cy={y - 2} r={4.2} fill="#FF9FCB" stroke="#E0609A" strokeWidth={1} />
          <Circle cx={x - 2} cy={y - 2} r={1.6} fill="#FFE066" />
        </G>
      )}
    </G>
  );
}

function Reeds({ x, y }: { x: number; y: number }) {
  return (
    <G>
      {[0, 6, 11].map((dx, i) => (
        <G key={i}>
          <Line x1={x + dx} y1={y + 14} x2={x + dx + (i - 1) * 2} y2={y - 6 - i * 3} stroke="#3E8E3A" strokeWidth={2} />
          <Ellipse cx={x + dx + (i - 1) * 2} cy={y - 8 - i * 3} rx={2.2} ry={5} fill="#8A5A2E" />
        </G>
      ))}
    </G>
  );
}
