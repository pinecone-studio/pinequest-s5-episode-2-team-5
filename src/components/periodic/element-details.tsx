import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors } from '@/constants/theme';
import type { Element } from '@/data/revision-hub/types';
import { ELEMENT_CATEGORIES, outerElectrons, valenceExplanation } from '@/lib/periodic-learning';
import { StudyCard, ui } from '@/components/revision-hub/study-ui';
import { ElementSample, ShellDiagram } from './element-visuals';

const isotopes: Record<number, number[]> = { 6: [12, 13, 14], 11: [23], 17: [35, 37] };
export function ElementDetails({ element }: { element: Element }) {
  const [advanced, setAdvanced] = useState(false);
  const [massNumber, setMassNumber] = useState<number | null>(null);
  return <StudyCard>
    <View style={styles.heading}><View style={styles.symbol}><AppText variant="caption" color={Colors.limeInk}>{element.z}</AppText><AppText color={Colors.limeInk} style={{ fontSize: 48, lineHeight: 58 }}>{element.symbol}</AppText></View><View style={{ flex: 1, gap: 6 }}><AppText variant="title">{element.name}</AppText><AppText>{ELEMENT_CATEGORIES[element.category]}</AppText><AppText variant="caption">{({ s: 'Хатуу', l: 'Шингэн', g: 'Хий', u: 'Төлөв баттай тогтоогдоогүй' })[element.state]} · 20 °C орчим</AppText></View></View>
    <View style={styles.stats}>{[
      ['Дэс дугаар', `${element.z}`], ['Протон / электрон', `${element.z} / ${element.z}`],
      ['Бүлэг / үе', `${element.group ?? 'f'} / ${element.period}`], ['Харьцангуй масс', element.mass],
    ].map(([label, value]) => <View key={label} style={styles.stat}><AppText variant="caption">{label}</AppText><AppText variant="heading">{value}</AppText></View>)}</View>
    <AppText variant="caption">Протон, электроны тоо нь саармаг атомд хамаарна. [ ] доторх масс нь тухайн элементийн нэг изотопын массын тоо.</AppText>
    <View style={styles.visuals}>
      <View style={styles.visual}><AppText variant="heading">Атомын дотор</AppText><ShellDiagram key={element.z} element={element}/></View>
      <View style={styles.visual}><AppText variant="heading">Харагдах байдал ба санах холбоос</AppText><ElementSample element={element}/></View>
    </View>
    <View style={styles.explanation}><AppText variant="heading">Байрлал ↔ электрон</AppText><AppText>{element.period}-р үе: энэ саармаг атом {element.shells.length} эзлэгдсэн давхраатай.</AppText>{element.shells.length !== element.period && <AppText>Энэ нь энгийн үе–давхрааны дүрмийн онцгой тохиолдол. Жишээлбэл Pd-ийн үндсэн төлөвт 5s давхраа хоосон байдаг.</AppText>}<AppText>{valenceExplanation(element)}</AppText><AppText>Гаднах давхрааны электрон: {outerElectrons(element)}.</AppText></View>
    <GameButton title={advanced ? 'Ахисан мэдээлэл хураах' : 'Ахисан мэдээлэл'} size="md" variant="secondary" onPress={() => setAdvanced(!advanced)}/>
    {advanced && <>
      <AppText>Блок: {element.block}</AppText><AppText>Электроны бүтэц: {element.config.map(([orbital, count]) => `${orbital}${String(count).replace(/\d/g, (digit) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)])}`).join(' ')}</AppText>
      <AppText>Харьцангуй атом масс нь байгалийн изотопуудын жинлэсэн дундаж байж болно. Үүнийг тоймлоод нейтроны тоог шууд олохгүй. Тодорхой изотопын хувьд n = A − Z.</AppText>
      {isotopes[element.z] && <><AppText variant="heading">Изотопоор харьцуулъя</AppText><View style={ui.row}>{isotopes[element.z].map((a) => <GameButton key={a} title={`${element.symbol}-${a}`} size="sm" variant={massNumber === a ? 'primary' : 'secondary'} onPress={() => setMassNumber(a)}/>)}</View>{massNumber !== null && <AppText>{element.symbol}-{massNumber}: {element.z} протон, {massNumber - element.z} нейтрон, саармаг үед {element.z} электрон.</AppText>}</>}
      {element.z >= 104 && <AppText variant="caption">Хэт хүнд элементүүдийн зарим шинж, электроны бүтэц нь тооцоолсон загварт тулгуурладаг.</AppText>}
    </>}
    <GameButton title="RSC лавлах нээх" size="sm" variant="secondary" onPress={() => { void Linking.openURL(`https://periodic-table.rsc.org/element/${element.z}`).catch(() => undefined); }}/>
  </StudyCard>;
}
const styles = StyleSheet.create({
  heading: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  symbol: { backgroundColor: Colors.lime, borderRadius: 16, padding: 14, minWidth: 90, alignItems: 'center' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { flexGrow: 1, flexBasis: 120, backgroundColor: Colors.input, borderRadius: 12, padding: 12, gap: 6 },
  visuals: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  visual: { flexGrow: 1, flexBasis: 270, minWidth: 0, gap: 12 },
  explanation: { backgroundColor: Colors.input, padding: 16, borderRadius: 14, gap: 10 },
});
