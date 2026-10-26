import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { Colors, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

const tools = [
  { title: 'Хими 7', description: 'Сурах бичгийн зам', detail: '11 сэдэв · 32 судалгаа', color: Colors.cyan, route: '/hub/g7-chem/course' },
  { title: 'Хими 8', description: 'Сурах бичгийн зам', detail: '11 сэдэв · туршилт', color: Colors.lime, route: '/hub/g8-chem/course' },
  { title: 'Хими 9', description: 'Сурах бичгийн зам', detail: '17 сэдэв · 32 судалгаа', color: Colors.gold, route: '/hub/g9-chem/course' },
  { title: 'Хими 10', description: 'Сурах бичгийн зам', detail: '16 сэдэв · 45 судалгаа', color: Colors.cyan, route: '/hub/g10-chem/course' },
  { title: 'Үелэх хүснэгт', description: 'Элементүүдийг судалъя', detail: '118 элемент · атомын бүтэц', color: Colors.gold, route: '/periodic' },
] as const;

/** Quiet optional discoveries after the main lesson path. */
export function StudyTools() {
  const { width } = useWindowDimensions();
  const columns = width >= 900 ? 4 : 2;

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <AppText variant="heading">Цааш судалъя</AppText>
        <AppText variant="caption">Өөрийн хэмнэлээр нэг шинэ зүйл нээгээрэй.</AppText>
      </View>
      <View style={styles.grid}>
        {tools.map((tool, index) => (
          <Pressable
            key={tool.route}
            accessibilityRole="button"
            accessibilityLabel={tool.title}
            accessibilityHint={tool.detail}
            onPress={() => { haptics.tap(); router.push(tool.route); }}
            style={({ pressed }) => [styles.card, { width: columns === 4 ? '23%' : '48%' }, pressed && styles.pressed]}>
            <View style={[styles.illustration, { backgroundColor: `${tool.color}1A` }]}>
              <GradeIllustration variant={index} color={tool.color} />
            </View>
            <View style={styles.copy}>
              <AppText variant="bodyStrong" style={styles.title}>{tool.title}</AppText>
              <AppText variant="caption" style={styles.description}>{tool.description}</AppText>
            </View>
            <View style={styles.footer}>
              <AppText variant="caption" color={Colors.textDim} style={styles.detail}>{tool.detail}</AppText>
              <MaterialCommunityIcons name="arrow-right" size={18} color={tool.color} />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function GradeIllustration({ variant, color }: { variant: number; color: string }) {
  const ink = '#F7F4FF';
  const soft = `${color}BB`;
  return (
    <Svg width={96} height={88} viewBox="0 0 96 88" fill="none">
      <Circle cx="48" cy="44" r="39" fill={`${color}12`} />
      {variant === 0 && <>
        <Path d="M38 20h20M42 20v19L30 62a7 7 0 0 0 6 10h24a7 7 0 0 0 6-10L54 39V20" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M35 58h26l5 8a4 4 0 0 1-4 4H35a4 4 0 0 1-4-4l4-8Z" fill={soft} />
        <Circle cx="44" cy="54" r="2.5" fill={ink} /><Circle cx="52" cy="49" r="2" fill={color} />
        <Path d="m70 24 2.5 5.5L78 32l-5.5 2.5L70 40l-2.5-5.5L62 32l5.5-2.5L70 24Z" fill={Colors.gold} />
      </>}
      {variant === 1 && <>
        <Ellipse cx="48" cy="44" rx="30" ry="13" stroke={ink} strokeWidth="3" transform="rotate(-35 48 44)" />
        <Ellipse cx="48" cy="44" rx="30" ry="13" stroke={soft} strokeWidth="3" transform="rotate(35 48 44)" />
        <Circle cx="48" cy="44" r="8" fill={color} stroke={ink} strokeWidth="2" />
        <Circle cx="25" cy="28" r="4" fill={Colors.gold} /><Circle cx="72" cy="58" r="4" fill={Colors.cyan} />
      </>}
      {variant === 2 && <>
        <Path d="M31 65h37M38 65l8-16 12-8 7-13M55 28l8-8 9 6-7 9M45 49l-9-8 8-9 11 8M47 49l-4 16" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="47" cy="48" r="5" fill={color} /><Path d="M52 25h12" stroke={Colors.gold} strokeWidth="4" strokeLinecap="round" />
        <Circle cx="34" cy="68" r="3" fill={Colors.gold} /><Circle cx="66" cy="68" r="3" fill={Colors.gold} />
      </>}
      {variant === 3 && <>
        <Line x1="31" y1="55" x2="47" y2="38" stroke={ink} strokeWidth="4" strokeLinecap="round" />
        <Line x1="47" y1="38" x2="64" y2="49" stroke={ink} strokeWidth="4" strokeLinecap="round" />
        <Line x1="47" y1="38" x2="50" y2="20" stroke={ink} strokeWidth="4" strokeLinecap="round" />
        <Line x1="31" y1="55" x2="49" y2="68" stroke={ink} strokeWidth="4" strokeLinecap="round" />
        <Circle cx="31" cy="55" r="9" fill={Colors.cyan} stroke={ink} strokeWidth="2" />
        <Circle cx="47" cy="38" r="10" fill={color} stroke={ink} strokeWidth="2" />
        <Circle cx="64" cy="49" r="8" fill={Colors.lime} stroke={ink} strokeWidth="2" />
        <Circle cx="50" cy="20" r="7" fill={Colors.gold} stroke={ink} strokeWidth="2" />
        <Circle cx="49" cy="68" r="7" fill={Colors.danger} stroke={ink} strokeWidth="2" />
      </>}
      {variant === 4 && <>
        {Array.from({ length: 12 }, (_, cell) => {
          const column = cell % 4;
          const row = Math.floor(cell / 4);
          const active = cell === 5 || cell === 10;
          return <Rect key={cell} x={25 + column * 12} y={22 + row * 12} width="9" height="9" rx="2" fill={active ? color : `${ink}44`} stroke={active ? ink : 'none'} strokeWidth="1.5" />;
        })}
        <Rect x="66" y="30" width="18" height="30" rx="5" fill={`${color}33`} stroke={ink} strokeWidth="2" />
        <SvgText x="75" y="43" fill={ink} fontSize="10" fontWeight="700" textAnchor="middle">Na</SvgText>
        <SvgText x="75" y="54" fill={color} fontSize="6" textAnchor="middle">11</SvgText>
        <Path d="m50 67 2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" fill={Colors.gold} />
      </>}
      <Rect x="8" y="67" width="8" height="8" rx="2" fill={soft} opacity={0.8} />
      <Circle cx="80" cy="21" r="3" fill={Colors.gold} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 16, gap: 16 },
  heading: { gap: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: { flexGrow: 0, aspectRatio: 0.8, padding: 12, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.panel, justifyContent: 'space-between', overflow: 'hidden' },
  pressed: { backgroundColor: Colors.panelRaised, transform: [{ scale: 0.97 }] },
  illustration: { width: '100%', flex: 1, maxHeight: 118, borderRadius: 22, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  copy: { alignItems: 'center', gap: 4 },
  title: { textAlign: 'center', fontSize: 16 },
  description: { textAlign: 'center', fontSize: 11, lineHeight: 15 },
  footer: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 3 },
  detail: { fontSize: 9, lineHeight: 13, flex: 1 },
});
