import { useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors, Fonts } from '@/constants/theme';
import { useSession } from '@/context/session';
import { getPack } from '@/data/revision-hub';
import { ELEMENT_CATEGORIES, GROUP_GUIDES } from '@/lib/periodic-learning';
import { CategoryLegend, PeriodicGrid } from '@/components/periodic/periodic-grid';
import { ElementDetails } from '@/components/periodic/element-details';
import { PeriodicUnderstand } from '@/components/periodic/periodic-understand';
import { PeriodicMemory } from '@/components/periodic/periodic-memory';
import { StudyCard, StudyLink, ui } from './study-ui';

const elements = getPack('g8-chem').elements;
export function PeriodicStudy() {
  const { user } = useSession();
  const [mode, setMode] = useState<'table' | 'understand' | 'memory'>('table');
  const [z, setZ] = useState(11);
  const [query, setQuery] = useState('');
  const [firstTwenty, setFirstTwenty] = useState(true);
  const [group, setGroup] = useState<number | null>(null);
  const selector = useRef<ComponentRef<typeof ScrollView>>(null);
  const element = elements[z - 1];
  const select = (value: number) => {
    setZ(value); setQuery('');
    selector.current?.scrollTo({ x: Math.max(0, (value - 3) * 70), animated: true });
  };
  const matches = query.trim() ? elements.filter((e) => `${e.z} ${e.symbol} ${e.name}`.toLocaleLowerCase('mn').includes(query.trim().toLocaleLowerCase('mn'))) : [];
  const selectedGuide = GROUP_GUIDES.find((g) => g.group === group);
  return <>
    <StudyCard><AppText variant="label" color={Colors.lime}>Харах → Ойлгох → Тогтоох</AppText><AppText variant="title">Элемент бүрийг байрлал, атом, дүрстэй нь холбоё</AppText><AppText>118 элемент · 18 бүлэг · 7 үе</AppText><AppText>Эхний 20-оос эхлээд бүлгийн зүй тогтлыг олж хар. Гаднах электронуудыг тодруулж, зурагтай холбоод, өөрийгөө шалгаарай.</AppText></StudyCard>
    <View style={ui.row}>{([['table', 'Судлах'], ['understand', 'Бүлэг ба үе'], ['memory', 'Цээжлэх']] as const).map(([id, label]) => <GameButton key={id} title={label} size="md" variant={id === mode ? 'primary' : 'secondary'} onPress={() => setMode(id)}/>)}</View>
    {mode === 'table' && <>
      <StudyCard>
        <AppText variant="heading">Нүд сонгоод атомыг нь нээ</AppText>
        <TextInput value={query} onChangeText={setQuery} accessibilityLabel="Элемент хайх" placeholder="Нэр, тэмдэг, дэс дугаар…" placeholderTextColor={Colors.textDim} style={styles.search}/>
        {query.trim() !== '' && (matches.length ? matches.map((e) => <StudyLink key={e.z} title={`${e.z}. ${e.symbol} · ${e.name}`} onPress={() => { setGroup(null); setFirstTwenty(e.z <= 20); select(e.z); }}/>) : <AppText>Тохирох элемент олдсонгүй.</AppText>)}
        <View style={ui.row}><GameButton title={firstTwenty ? 'Бүх 118-ыг тодруулах' : 'Эхний 20-ийг тодруулах'} size="sm" variant="secondary" onPress={() => setFirstTwenty(!firstTwenty)}/>{group !== null && <GameButton title="Бүлгийн шүүлтүүр арилгах" size="sm" variant="secondary" onPress={() => setGroup(null)}/>}</View>
        <AppText variant="caption">Босоо багана = бүлэг · Хэвтээ мөр = үе. Бүлгийн дугаарыг дарж баганыг тодруулна. Утсан дээр хүснэгтийг хөндлөн гүйлгэнэ.</AppText>
        <PeriodicGrid selected={element} onSelect={select} firstTwenty={firstTwenty} group={group} onGroup={(value) => { setGroup(group === value ? null : value); setFirstTwenty(false); }}/>
        <CategoryLegend/>
        {group !== null && <View style={styles.group}><AppText variant="heading">{group}-р бүлэг · {selectedGuide?.title ?? 'd-блокийн элементүүд'}</AppText><AppText>{selectedGuide?.text ?? '3–12-р бүлэгт d-блокийн элементүүд байрлана. Эдгээрийн электроны бүтэц, химийн шинжийг гаднах давхрааны нэг тоогоор дангаар тайлбарлахгүй.'}</AppText></View>}
      </StudyCard>
      <StudyCard><AppText variant="heading">Элементийг хурдан сонгох</AppText><ScrollView ref={selector} horizontal contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>{elements.map((e) => <GameButton key={e.z} title={`${e.z} ${e.symbol}`} size="sm" variant={e.z === z ? 'primary' : 'secondary'} onPress={() => select(e.z)}/>)}</ScrollView><AppText variant="caption">Сонгосон: {element.symbol} · {ELEMENT_CATEGORIES[element.category]}</AppText></StudyCard>
      <ElementDetails key={z} element={element}/>
      <View style={ui.row}><GameButton title="Өмнөх элемент" size="sm" variant="secondary" disabled={z === 1} onPress={() => select(z - 1)}/><GameButton title="Дараах элемент" size="sm" variant="secondary" disabled={z === 118} onPress={() => select(z + 1)}/></View>
    </>}
    {mode === 'understand' && <PeriodicUnderstand/>}
    {mode === 'memory' && user && <PeriodicMemory key={user.id} userId={user.id}/>}
  </>;
}
const styles = StyleSheet.create({
  search: { backgroundColor: Colors.input, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 16, fontFamily: Fonts.regular },
  group: { padding: 16, backgroundColor: Colors.input, borderRadius: 12, gap: 10 },
});
