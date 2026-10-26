import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Radius } from '@/constants/theme';
import { useRevision } from '@/context/revision';
import { getPack } from '@/data/revision-hub';
import { chemistryText } from '@/lib/chemistry-text';
import { RichText } from './rich-text';

export const STUDY_TABS = [
  ['notes', 'Тэмдэглэл'], ['cards', 'Флэшкарт'], ['quiz', 'Тест'],
  ['questions', 'Асуулт'], ['prac', 'Практик'],
] as const;
export type StudyTab = typeof STUDY_TABS[number][0];
export function openTopic(topicId: string, tab: StudyTab = 'notes', packId: 'g7-chem' | 'g8-chem' | 'g9-chem' | 'g10-chem' = 'g8-chem') {
  router.push({ pathname: packId === 'g7-chem' ? '/hub/g7-chem/topic/[topicId]/[tab]' : packId === 'g10-chem' ? '/hub/g10-chem/topic/[topicId]/[tab]' : packId === 'g9-chem' ? '/hub/g9-chem/topic/[topicId]/[tab]' : '/hub/g8-chem/topic/[topicId]/[tab]', params: { topicId, tab } });
}
export function openReference(reference: string) {
  if (reference === 'periodic') { router.push('/periodic'); return; }
  router.push({ pathname: '/hub/g8-chem/[reference]', params: { reference } });
}

export function StudyPage({ title, subtitle, children, home = false }: { title: string; subtitle?: string; children: ReactNode; home?: boolean }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [menu, setMenu] = useState<boolean | null>(null);
  const [focus, setFocus] = useState(false);
  const { saved, error, retry, packId } = useRevision();
  const showRail = !focus && (menu ?? width >= 1100);
  return <LabBackground bubbles={0}>
    {!focus && <ScreenHeader title={title} subtitle={subtitle} onBack={() => home ? router.replace('/lessons') : router.replace(packId === 'g7-chem' ? '/hub/g7-chem' : packId === 'g10-chem' ? '/hub/g10-chem' : packId === 'g9-chem' ? '/hub/g9-chem' : '/hub/g8-chem')}/>}
    <View style={[ui.toolbar, focus && { paddingTop: insets.top + 8 }]}>
      {!focus && <GameButton title={showRail ? 'Цэс хураах' : 'Сэдвийн цэс'} size="sm" variant="secondary" onPress={() => setMenu(!showRail)}/>}
      <GameButton title={focus ? 'Бүтэн харагдац' : 'Төвлөрөх'} size="sm" variant="secondary" onPress={() => setFocus(!focus)}/>
      <AppText variant="caption">{error ? 'Хадгалалт амжилтгүй' : saved ? 'Төхөөрөмжид хадгалсан' : 'Хадгалж байна…'}</AppText>
      {error && <GameButton title="Дахин хадгалах" size="sm" variant="danger" onPress={retry}/>}
    </View>
    <View style={{ flex: 1, flexDirection: width >= 1100 ? 'row' : 'column' }}>
      {showRail && <ScrollView style={[ui.rail, width < 1100 && { maxHeight: 260, width: '100%' }]} contentContainerStyle={{ padding: 16, gap: 10 }}>
        <View style={ui.row}><GameButton title="7-р анги" size="sm" variant={packId==='g7-chem'?'primary':'secondary'} onPress={()=>router.replace('/hub/g7-chem/course')}/><GameButton title="8-р анги" size="sm" variant={packId==='g8-chem'?'primary':'secondary'} onPress={()=>router.replace('/hub/g8-chem/course')}/><GameButton title="9-р анги" size="sm" variant={packId==='g9-chem'?'primary':'secondary'} onPress={()=>router.replace('/hub/g9-chem/course')}/><GameButton title="10-р анги" size="sm" variant={packId==='g10-chem'?'primary':'secondary'} onPress={()=>router.replace('/hub/g10-chem/course')}/></View>
        <StudyLink title="Сурах бичгийн зам" onPress={() => { setMenu(false); router.push(packId === 'g7-chem' ? '/hub/g7-chem/course' : packId === 'g10-chem' ? '/hub/g10-chem/course' : packId === 'g9-chem' ? '/hub/g9-chem/course' : '/hub/g8-chem/course'); }}/>
        <StudyLink title="Судалгааны багажууд" onPress={() => { setMenu(false); router.push(packId === 'g7-chem' ? '/hub/g7-chem/investigations' : packId === 'g10-chem' ? '/hub/g10-chem/investigations' : packId === 'g9-chem' ? '/hub/g9-chem/investigations' : '/hub/g8-chem/investigations'); }}/>
        <StudyLink title="Давтлагын нүүр" onPress={() => { setMenu(false); router.replace(packId === 'g7-chem' ? '/hub/g7-chem' : packId === 'g10-chem' ? '/hub/g10-chem' : packId === 'g9-chem' ? '/hub/g9-chem' : '/hub/g8-chem'); }}/>
        {getPack(packId).topics.map((topic) => <StudyLink key={topic.id} title={`${topic.id} ${topic.title}`} onPress={() => { setMenu(false); openTopic(topic.id, 'notes', packId); }}/>) }
        {packId === 'g8-chem' && <StudyLink title="Лавлах ба явц" onPress={() => { setMenu(false); openReference('progress'); }}/>}
      </ScrollView>}
      <ScrollView key={title} style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={[ui.content, { paddingBottom: insets.bottom + 32 }]}>
        {children}
        <AppText variant="caption">Давтлагын явц энэ төхөөрөмжид хадгалагдана.</AppText>
      </ScrollView>
    </View>
  </LabBackground>;
}
export function StudyCard({ children }: { children: ReactNode }) { return <View style={ui.card}>{children}</View>; }
export function StudyLink({ title, onPress, detail }: { title: string; onPress: () => void; detail?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [ui.link, pressed && { borderColor: Colors.lime }]}>
    <AppText variant="bodyStrong">{title}</AppText>{detail && <AppText variant="caption">{detail}</AppText>}
  </Pressable>;
}
export function StudyChoice({ text, selected, onPress, checkbox = false }: { text: string; selected: boolean; onPress: () => void; checkbox?: boolean }) {
  return <Pressable accessibilityRole={checkbox ? 'checkbox' : 'radio'} accessibilityLabel={chemistryText(text).map((t) => t.text).join('')} accessibilityState={{ checked: selected }} onPress={onPress} style={[ui.choice, selected && { borderColor: Colors.lime }]}>
    <AppText color={selected ? Colors.lime : Colors.textDim}>{selected ? '●' : '○'}</AppText><View style={{ flex: 1 }}><RichText>{text}</RichText></View>
  </Pressable>;
}
export const ui = StyleSheet.create({
  content: { width: '100%', maxWidth: 900, alignSelf: 'center', padding: 16, gap: 18 },
  card: { padding: 20, gap: 14, backgroundColor: Colors.panel, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg },
  link: { padding: 14, gap: 6, minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, backgroundColor: Colors.input },
  choice: { padding: 14, gap: 12, flexDirection: 'row', alignItems: 'center', minHeight: 48, backgroundColor: Colors.input, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm },
  toolbar: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingBottom: 10 },
  rail: { width: 250, flexGrow: 0, flexShrink: 0, maxWidth: '100%', borderRightWidth: 1, borderColor: Colors.border, backgroundColor: Colors.indigo900 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
