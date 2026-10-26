import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';

const palette = [Colors.cyan, Colors.lime, Colors.gold, '#C49BFF', '#FF789B'];

function hashText(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

export function ChemistryDoodle({ seed, color }: { seed: string; color?: string }) {
  const random = (salt: number) => hashText(`${seed}:${salt}`) / 4294967295;
  const base = color ?? palette[hashText(seed) % palette.length];
  const count = 4 + (hashText(`${seed}:atoms`) % 4);
  const rotation = random(1) * Math.PI * 2;
  const nodes = Array.from({ length: count }, (_, i) => {
    const angle = rotation + (Math.PI * 2 * i) / count;
    const radiusX = 15 + random(10 + i * 3) * 9;
    const radiusY = 12 + random(11 + i * 3) * 9;
    return {
      x: 60 + Math.cos(angle) * radiusX,
      y: 45 + Math.sin(angle) * radiusY,
      r: 4 + Math.round(random(12 + i * 3) * 3),
      color: palette[Math.floor(random(13 + i * 3) * palette.length)],
    };
  });
  const orbitRx = 28 + random(100) * 8;
  const orbitRy = 18 + random(101) * 7;
  const orbitAngle = Math.round(random(102) * 70 - 35);
  const sparkles = Array.from({ length: 3 }, (_, i) => ({ x: 20 + random(200 + i * 2) * 80, y: 12 + random(201 + i * 2) * 66, size: 2 + random(202 + i * 2) * 3 }));

  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 92" fill="none">
      <Circle cx="60" cy="46" r="39" fill={`${base}18`} />
      <Ellipse cx="60" cy="45" rx={orbitRx} ry={orbitRy} stroke={`${base}88`} strokeWidth="2" transform={`rotate(${orbitAngle} 60 45)`} />
      {nodes.map((node, index) => {
        const next = nodes[(index + 1) % nodes.length];
        return <Line key={`bond-${index}`} x1={node.x} y1={node.y} x2={next.x} y2={next.y} stroke="#F7F4FF" strokeWidth="2.5" strokeLinecap="round" />;
      })}
      {nodes.map((node, index) => <Line key={`spoke-${index}`} x1="60" y1="45" x2={node.x} y2={node.y} stroke={`${base}99`} strokeWidth="1.5" />)}
      {nodes.map((node, index) => <Circle key={`atom-${index}`} cx={node.x} cy={node.y} r={node.r} fill={node.color} stroke="#F7F4FF" strokeWidth="2" />)}
      <Circle cx="60" cy="45" r="7" fill={base} stroke="#F7F4FF" strokeWidth="2.5" />
      {sparkles.map((sparkle, index) => <Path key={`sparkle-${index}`} d={`M${sparkle.x} ${sparkle.y - sparkle.size}v${sparkle.size * 2}M${sparkle.x - sparkle.size} ${sparkle.y}h${sparkle.size * 2}`} stroke={index === 0 ? Colors.gold : '#F7F4FF'} strokeWidth="1.5" strokeLinecap="round" />)}
      <Rect x="14" y="68" width="7" height="7" rx="2" fill={base} opacity={0.75} />
    </Svg>
  );
}
