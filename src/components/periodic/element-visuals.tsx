import { useId, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, Path, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';
import { Colors } from '@/constants/theme';
import type { Element } from '@/data/revision-hub/types';
import type { IconName } from '@/types';
import { outerElectrons } from '@/lib/periodic-learning';

export const MEMORY_ICONS: IconName[] = ['atom', 'rocket-launch-outline', 'balloon', 'battery-charging', 'rocket', 'glass-flute', 'pencil', 'sprout', 'weather-windy', 'tooth', 'sign-text', 'shaker-outline', 'firework', 'airplane', 'chip', 'fire', 'tire', 'water-check', 'lightbulb-outline', 'leaf', 'bone'];
export function ShellDiagram({ element, light = false }: { element: Element; light?: boolean }) {
  const [selected, setSelected] = useState(element.shells.length - 1);
  const ink = light ? Colors.indigo900 : Colors.text;
  const line = light ? Colors.indigo600 : Colors.textDim;
  const outer = element.shells.length - 1;
  return <View style={{ gap: 12 }}>
    <Svg width="100%" height={290} viewBox="0 0 330 290" accessibilityRole="image" accessibilityLabel={`${element.name}, ${element.z} протон, ${element.z} электрон. Давхраа тус бүр: ${element.shells.join(', ')}`}>
      <Circle cx={165} cy={143} r={22} fill={Colors.gold}/>
      <SvgText x={165} y={140} textAnchor="middle" fill={Colors.goldInk} fontSize={12} fontWeight="bold">{element.z} p⁺</SvgText>
      <SvgText x={165} y={154} textAnchor="middle" fill={Colors.goldInk} fontSize={10}>Цөм</SvgText>
      {element.shells.map((count, i) => {
        const radius = 39 + i * (82 / Math.max(1, outer));
        const color = i === outer ? (light ? Colors.goldDark : Colors.lime) : (light ? Colors.cyanDark : Colors.cyan);
        return <SvgShell key={i} count={count} radius={radius} color={color} line={line} selected={i === selected}/>;
      })}
    </Svg>
    <View style={styles.shells}>{element.shells.map((count, i) => <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${i + 1}-р давхраа: ${count} электрон`} accessibilityState={{ selected: selected === i }} onPress={() => setSelected(i)} style={[styles.shell, selected === i && { borderColor: Colors.lime }]}>
      <AppText variant="caption" color={ink}>{i + 1}-р давхраа</AppText><AppText variant="heading" color={i === outer ? (light ? Colors.goldDark : Colors.lime) : ink}>{count} e⁻</AppText>
    </Pressable>)}</View>
    <AppText variant="caption" color={ink}>Гаднах давхраа: {outerElectrons(element)} электрон. Тодруулсан цагираг: {selected + 1}-р давхраа.</AppText>
    <AppText variant="caption" color={light ? Colors.indigo600 : Colors.textDim}>Давхрааг ойлгуулах Борын загвар. Электронууд бодит байдалд эдгээр тойргоор замнан эргэдэггүй.</AppText>
  </View>;
}
function SvgShell({ count, radius, color, line, selected }: { count: number; radius: number; color: string; line: string; selected: boolean }) {
  return <><Circle cx={165} cy={143} r={radius} stroke={selected ? color : line} strokeWidth={selected ? 2.5 : 1} fill="none" strokeDasharray={selected ? undefined : '3 4'}/>
    {Array.from({ length: count }, (_, i) => {
      const angle = -Math.PI / 2 + i * Math.PI * 2 / count;
      return <Circle key={i} cx={165 + radius * Math.cos(angle)} cy={143 + radius * Math.sin(angle)} r={count > 18 ? 2.8 : 4.2} fill={color}/>;
    })}</>;
}
export function ElementSample({ element }: { element: Element }) {
  const id = `sample${useId().replace(/\W/g, '')}`;
  const gas = ['gas', 'glow', 'radgas'].includes(element.look);
  const unknown = element.look === 'synth' || element.state === 'u' || element.z >= 104;
  return <View style={{ gap: 10 }}>
    <Svg width="100%" height={165} viewBox="0 0 320 165" accessibilityRole="image" accessibilityLabel={`${element.name}-ийн жишиг дүрслэл`}>
      <Defs><LinearGradient id={id} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={Colors.silver}/><Stop offset="0.45" stopColor={element.color}/><Stop offset="1" stopColor={Colors.indigo900}/></LinearGradient></Defs>
      <Ellipse cx={160} cy={146} rx={85} ry={9} fill={Colors.input}/>
      {unknown ? <><Rect x={105} y={30} width={110} height={105} rx={15} fill="none" stroke={Colors.textDim} strokeDasharray="5 5"/><SvgText x={160} y={95} textAnchor="middle" fontSize={38} fill={Colors.textMuted}>?</SvgText></> :
        gas ? <><Rect x={110} y={18} width={100} height={126} rx={25} fill={Colors.input} stroke={Colors.textDim}/><Rect x={138} y={8} width={44} height={14} rx={4} fill={Colors.silver}/>
          {element.look === 'glow' ? <Path d="M135 115 V48 H185 V115 H153 V70" stroke={element.color} strokeWidth={8} fill="none"/> : Array.from({ length: 16 }, (_, i) => <Circle key={i} cx={124 + i * 31 % 73} cy={35 + i * 23 % 90} r={4} fill={element.color} opacity={0.55 + i % 3 * 0.1}/>)}</> :
        element.look === 'oil' ? <><Path d="M100 22 H220 L210 140 H110 Z" fill={Colors.goldDark} opacity={0.35} stroke={Colors.silver}/><Polygon points="130,89 178,76 199,105 146,120" fill={`url(#${id})`}/><Line x1={106} y1={65} x2={214} y2={65} stroke={Colors.gold}/></> :
        element.look === 'liquid' ? <><Path d="M105 15 H215 L205 140 H115 Z" fill="none" stroke={Colors.textMuted} strokeWidth={2}/><Path d="M111 83 Q160 68 209 83 L204 139 H116 Z" fill={`url(#${id})`}/></> :
        element.look === 'powder' ? <>{Array.from({ length: 75 }, (_, i) => <Circle key={i} cx={93 + i * 31 % 132} cy={100 + i * 13 % 38 - Math.max(0, 25 - Math.abs(159 - (93 + i * 31 % 132)))} r={3 + i % 3} fill={element.color}/>)}</> :
        element.look === 'crystal' ? <><Polygon points="115,110 137,33 177,19 203,105 160,141" fill={`url(#${id})`} stroke={Colors.silver}/><Path d="M137 33 L160 141 L177 19 M115 110 L203 105" stroke={Colors.textDim} fill="none"/></> :
        <><Polygon points="96,103 125,39 186,30 226,90 199,135 126,141" fill={`url(#${id})`} stroke={Colors.textDim}/><Path d="M125 39 L150 96 L96 103 M150 96 L199 135 M150 96 L226 90" stroke={Colors.silver} opacity={0.5} fill="none"/></>}
    </Svg>
    <AppText variant="caption">{unknown ? 'Үзэгдэх сорьцын өнгө, хэлбэрийг баттай гэж үзүүлэхгүй.' : element.look === 'oil' ? 'Тосон дорх сорьцын сургалтын зураг.' : 'Цэвэр элементийн өнгө, хэлбэрийн жишиг зураг; гэрэл зураг биш.'}</AppText>
    <View style={styles.reference}>
      <MaterialCommunityIcons name={MEMORY_ICONS[element.z] ?? 'flask-outline'} size={42} color={Colors.cyan}/>
      <View style={{ flex: 1, gap: 4 }}><AppText variant="label" color={Colors.cyan}>Санах холбоос</AppText><AppText>{element.use}</AppText></View>
    </View>
    <AppText variant="caption">Хэрэглээний зураг нь элементийг санах холбоос. Давс, шүдний оо, яс зэрэгт элемент нь нэгдлийн найрлагад байдаг; цэвэр бодистой адил биш.</AppText>
  </View>;
}
const styles = StyleSheet.create({
  shells: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shell: { paddingHorizontal: 12, paddingVertical: 8, gap: 4, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, minHeight: 52 },
  reference: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14, backgroundColor: Colors.input, borderRadius: 14 },
});
