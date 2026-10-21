import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { AvatarLook } from '@/lib/avatar-look';

const OUTLINE = '#1B1740';
const COAT = '#F4F7FF';
const COAT_LINE = '#C9D2E8';

interface ScientistProps {
  look: AvatarLook;
  /** Rendered height in dp. */
  height?: number;
  /** Crop to head and shoulders, for portraits. */
  portrait?: boolean;
}

/** Chibi scientist in a lab coat, goggles pushed up, holding a flask of their class color. */
export function Scientist({ look, height = 60, portrait = false }: ScientistProps) {
  const width = portrait ? height : height * 0.8;
  return (
    <Svg width={width} height={height} viewBox={portrait ? '9 3 46 46' : '0 0 64 80'}>
      <Body look={look} />
      <BackHair look={look} />
      <Circle cx={32} cy={24} r={16} fill={look.skin} stroke={OUTLINE} strokeWidth={2} />
      <FrontHair look={look} />
      <Goggles />
      <Face />
    </Svg>
  );
}

function Body({ look }: { look: AvatarLook }) {
  return (
    <G>
      {/* legs + shoes */}
      <Rect x={23} y={60} width={7.5} height={14} rx={3} fill="#2E2A5C" />
      <Rect x={33.5} y={60} width={7.5} height={14} rx={3} fill="#2E2A5C" />
      <Path d="M20 76 Q20 71.5 25.5 71.5 Q31 71.5 31 76 Z" fill={OUTLINE} />
      <Path d="M33 76 Q33 71.5 38.5 71.5 Q44 71.5 44 76 Z" fill={OUTLINE} />

      {/* back arm */}
      <Path d="M19 44 Q12 50 13.5 58" stroke={OUTLINE} strokeWidth={9.5} strokeLinecap="round" fill="none" />
      <Path d="M19 44 Q12 50 13.5 58" stroke={COAT} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Circle cx={13.8} cy={60} r={3.6} fill={look.skin} stroke={OUTLINE} strokeWidth={1.6} />

      {/* lab coat */}
      <Path
        d="M18 47 Q18 39.5 26 38.5 L38 38.5 Q46 39.5 46 47 L47.5 64 Q32 68.5 16.5 64 Z"
        fill={COAT}
        stroke={OUTLINE}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path d="M26.5 38.8 L32 50 L37.5 38.8 Z" fill={look.shirt} />
      <Path d="M26.5 38.8 L32 50 L37.5 38.8" fill="none" stroke={OUTLINE} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M32 50 L32 65.5" stroke={COAT_LINE} strokeWidth={1.5} />
      <Circle cx={34.6} cy={54} r={1.1} fill="#AEB8D3" />
      <Circle cx={34.6} cy={59} r={1.1} fill="#AEB8D3" />
      <Path d="M22.5 52 L22.5 48.5" stroke={look.shirt} strokeWidth={1.6} strokeLinecap="round" />
      <Rect x={20.3} y={51.5} width={7} height={5} rx={1.5} fill={COAT} stroke={COAT_LINE} strokeWidth={1.4} />

      {/* front arm holding a flask */}
      <Path d="M45 44 Q51.5 48.5 51.5 54" stroke={OUTLINE} strokeWidth={9.5} strokeLinecap="round" fill="none" />
      <Path d="M45 44 Q51.5 48.5 51.5 54" stroke={COAT} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Path
        d="M49.5 50 L54.5 50 L54.5 54 L58.5 61.5 Q59 63.5 57 63.5 L47 63.5 Q45 63.5 45.5 61.5 L49.5 54 Z"
        fill="#E2F7FF"
        stroke={OUTLINE}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M47.4 58.3 L56.6 58.3 L58.2 61.6 Q58.4 62.7 57.3 62.7 L46.7 62.7 Q45.6 62.7 45.8 61.6 Z" fill={look.shirt} />
      <Circle cx={51.8} cy={54.5} r={3.6} fill={look.skin} stroke={OUTLINE} strokeWidth={1.6} />
    </G>
  );
}

function BackHair({ look }: { look: AvatarLook }) {
  if (look.hairStyle === 1) {
    return (
      <Path
        d="M14.5 24 Q14 7 32 7 Q50 7 49.5 24 L50 36 Q47 39 44.5 35 L19.5 35 Q17 39 14 36 Z"
        fill={look.hair}
        stroke={OUTLINE}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    );
  }
  if (look.hairStyle === 2) {
    return <Circle cx={32} cy={7} r={6.5} fill={look.hair} stroke={OUTLINE} strokeWidth={2} />;
  }
  return null;
}

function FrontHair({ look }: { look: AvatarLook }) {
  const d =
    look.hairStyle === 0
      ? 'M16.5 25 Q15 10 30 8.5 Q44 7.5 47.5 21 Q48 25 47 27 Q44 18 37 17.5 Q33 14.5 27 17.5 Q20 18 17.5 27 Z'
      : look.hairStyle === 1
        ? 'M16.5 24 Q17 10 32 9.5 Q47 10 47.5 24 Q40 15 30 18 Q22 19 16.5 24 Z'
        : 'M16.5 23 Q17 9 32 9 Q47 9 47.5 23 Q42 16 32 16 Q22 16 16.5 23 Z';
  return <Path d={d} fill={look.hair} stroke={OUTLINE} strokeWidth={2} strokeLinejoin="round" />;
}

function Goggles() {
  return (
    <G>
      <Path d="M16.5 18.8 Q32 14.5 47.5 18.8" stroke="#3B3366" strokeWidth={3.2} fill="none" />
      <Circle cx={25.5} cy={17.5} r={5.4} fill="#BFF4FF" stroke={OUTLINE} strokeWidth={1.8} />
      <Circle cx={38.5} cy={17.5} r={5.4} fill="#BFF4FF" stroke={OUTLINE} strokeWidth={1.8} />
      <Rect x={30.2} y={16.3} width={3.6} height={2.4} rx={1} fill={OUTLINE} />
      <Circle cx={24} cy={16} r={1.5} fill="#FFFFFF" />
      <Circle cx={37} cy={16} r={1.5} fill="#FFFFFF" />
    </G>
  );
}

function Face() {
  return (
    <G>
      <Ellipse cx={26} cy={27.5} rx={2.1} ry={2.7} fill={OUTLINE} />
      <Ellipse cx={38} cy={27.5} rx={2.1} ry={2.7} fill={OUTLINE} />
      <Circle cx={26.7} cy={26.6} r={0.8} fill="#FFFFFF" />
      <Circle cx={38.7} cy={26.6} r={0.8} fill="#FFFFFF" />
      <Ellipse cx={21.8} cy={31.6} rx={2.6} ry={1.5} fill="#FF7E9D" opacity={0.55} />
      <Ellipse cx={42.2} cy={31.6} rx={2.6} ry={1.5} fill="#FF7E9D" opacity={0.55} />
      <Path d="M28.8 32.4 Q32 35.4 35.2 32.4" stroke={OUTLINE} strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </G>
  );
}
