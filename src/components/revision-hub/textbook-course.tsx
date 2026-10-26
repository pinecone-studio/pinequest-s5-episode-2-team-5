import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { ChemistryDoodle } from '@/components/revision-hub/chemistry-doodle';
import { StudyPage, openTopic } from '@/components/revision-hub/study-ui';
import { Colors, Radius } from '@/constants/theme';
import { getPack } from '@/data/revision-hub';
import { useRevision } from '@/context/revision';
import { haptics } from '@/lib/haptics';

export default function CourseScreen() {
  const { packId } = useRevision();
  const { width } = useWindowDimensions();
  const pack = getPack(packId);
  const columns = width >= 900 ? 4 : 2;

  return (
    <StudyPage title={`Хими ${pack.meta.grade} · Сурах бичгийн зам`} subtitle={`${pack.topics.length} сэдэв`} showTopicLinks={false}>
      <View style={styles.groups}>
        {pack.chapters.map((chapter) => {
          const topics = chapter.topicIds
            .map((topicId) => pack.topics.find((topic) => topic.id === topicId))
            .filter((topic) => topic !== undefined);

          return (
            <View key={chapter.id} style={styles.group}>
              <AppText variant="heading">{chapter.num}. {chapter.title}</AppText>
              <View style={styles.grid}>
                {topics.map((topic) => {
                  return (
                    <Pressable
                      key={topic.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${topic.id}. ${topic.title}`}
                      onPress={() => { haptics.tap(); openTopic(topic.id, 'notes', packId); }}
                      style={({ pressed }) => [styles.topic, columns === 4 ? styles.topicWide : styles.topicNarrow, pressed && styles.pressed]}>
                      <View style={styles.art}>
                        <ChemistryDoodle seed={`${packId}:${topic.id}:${topic.title}`} />
                      </View>
                      <AppText variant="bodyStrong" style={styles.topicTitle}>{topic.id}. {topic.title}</AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </StudyPage>
  );
}

const styles = StyleSheet.create({
  groups: { gap: 24 },
  group: { gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', columnGap: 12, rowGap: 12 },
  topic: { flexGrow: 1, flexShrink: 1, minHeight: 200, padding: 12, gap: 10, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.panel },
  topicWide: { flexBasis: '22%', maxWidth: '22%' },
  topicNarrow: { flexBasis: '47%', maxWidth: '47%' },
  pressed: { backgroundColor: Colors.panelRaised, borderColor: Colors.lime, transform: [{ scale: 0.98 }] },
  art: { height: 112, width: '100%', overflow: 'hidden', borderRadius: Radius.md, backgroundColor: Colors.input, alignItems: 'center', justifyContent: 'center' },
  topicTitle: { textAlign: 'center', flex: 1 },
});
