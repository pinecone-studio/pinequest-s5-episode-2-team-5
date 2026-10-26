import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ChemistryDoodle } from '@/components/revision-hub/chemistry-doodle';
import { PracticalInvestigation } from '@/components/revision-hub/practical-investigation';
import { StudyCard, StudyPage } from '@/components/revision-hub/study-ui';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors, Radius } from '@/constants/theme';
import { useRevision } from '@/context/revision';
import { haptics } from '@/lib/haptics';
import { investigationById, INVESTIGATIONS, type InvestigationDefinition } from '@/lib/textbook-investigations';

export default function InvestigationsScreen() {
  const { packId } = useRevision();
  const grade = packId === 'g7-chem' ? 7 : packId === 'g10-chem' ? 10 : packId === 'g9-chem' ? 9 : 8;
  const { width } = useWindowDimensions();
  const columns = width >= 900 ? 4 : 2;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const selected = typeof id === 'string' && investigationById(id)?.grade === grade ? investigationById(id) : undefined;
  const studies = INVESTIGATIONS.filter((item) => item.grade === grade);

  return (
    <StudyPage title={selected?.title ?? 'Сурах бичгийн судалгаанууд'} subtitle={selected ? undefined : `${studies.length} судалгаа`} showTopicLinks={false} onBack={selected ? () => router.setParams({ id: '' }) : undefined}>
      {selected ? (
        <StudyCard>
          <AppText variant="caption">Хими {grade} · х.{selected.bookPages}</AppText>
          {!!selected.method?.length && <AppText>{selected.method.map((step, index) => `${index + 1}. ${step}`).join('\n')}</AppText>}
          <PracticalInvestigation key={selected.id} id={selected.id} />
          <GameButton title="Бүх судалгааг харах" size="md" variant="secondary" onPress={() => router.setParams({ id: '' })} />
        </StudyCard>
      ) : (
        <View style={styles.grid}>
          {studies.map((study, index) => (
                <Pressable
                  key={study.id}
                  accessibilityRole="button"
                  accessibilityLabel={study.title}
                  accessibilityHint={`Хими ${grade} дугаар ангийн судалгааг нээх`}
                  onPress={() => { haptics.tap(); router.setParams({ id: study.id }); }}
                  style={({ pressed }) => [styles.study, columns === 4 ? styles.studyWide : styles.studyNarrow, pressed && styles.pressed]}>
                  <View style={styles.art}>
                    <ChemistryDoodle seed={study.id} color={investigationColor(study, index)} />
                  </View>
                  <AppText variant="bodyStrong" style={styles.title}>{study.title}</AppText>
                </Pressable>
          ))}
        </View>
      )}
    </StudyPage>
  );
}

function investigationColor(study: InvestigationDefinition, index: number) {
  const text = `${study.model} ${study.title}`.toLowerCase();
  const kind = /atom|element|periodic|electron|cards/.test(text) ? 0
    : /air|water|plant|growth|treatment|photosynthesis|tobacco/.test(text) ? 1
      : /melting|heating|temperature|diffusion|gas|convection/.test(text) ? 2
        : /salt|crystal|solution|dissolv|filter|chromatography/.test(text) ? 3
          : index % 4;
  return [Colors.cyan, Colors.lime, Colors.gold, '#C49BFF'][kind];
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', columnGap: 12, rowGap: 12 },
  study: { flexGrow: 1, flexShrink: 1, minHeight: 200, padding: 12, gap: 10, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.panel },
  studyWide: { flexBasis: '22%', maxWidth: '22%' },
  studyNarrow: { flexBasis: '47%', maxWidth: '47%' },
  pressed: { backgroundColor: Colors.panelRaised, borderColor: Colors.lime, transform: [{ scale: 0.98 }] },
  art: { height: 112, width: '100%', overflow: 'hidden', borderRadius: Radius.md, backgroundColor: Colors.input, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', flex: 1 },
});
