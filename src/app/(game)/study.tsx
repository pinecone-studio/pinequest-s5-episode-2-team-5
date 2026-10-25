import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Radius } from '@/constants/theme';
import { useSession } from '@/context/session';
import { getClass } from '@/data/classes';

type Section = 'theory' | 'practice';

export default function StudyHubScreen() {
  const { user } = useSession();
  const [section, setSection] = useState<Section>('theory');
  if (!user) return null;

  const chemClass = getClass(user.classId);
  return (
    <LabBackground bubbles={4}>
      <ScreenHeader
        title="Study Hub"
        subtitle="Онол, бодлогоо нэг дороос"
        right={(
          <Pressable onPress={() => router.push('/ranking')} accessibilityRole="button" accessibilityLabel="Global Rank" style={styles.rankButton}>
            <MaterialCommunityIcons name="trophy" size={18} color={Colors.gold} />
            <AppText style={styles.rankText}>Global Rank</AppText>
          </Pressable>
        )}
      />
      <View style={styles.tabs} accessibilityRole="tablist">
        <SectionTab label="Онол" icon="book-open-variant" active={section === 'theory'} onPress={() => setSection('theory')} />
        <SectionTab label="Бодлого" icon="flask-outline" active={section === 'practice'} onPress={() => setSection('practice')} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {section === 'theory' ? (
          <>
            <View style={styles.intro}>
              <MaterialCommunityIcons name="lightbulb-on-outline" size={26} color={Colors.gold} />
              <View style={styles.copy}>
                <AppText variant="heading">{chemClass.name} хичээлүүд</AppText>
                <AppText variant="caption">Онолоо үзээд, дараа нь бодлогоор бататгаарай.</AppText>
              </View>
            </View>
            {chemClass.lessons.map((lesson, index) => (
              <View key={lesson.id} style={styles.lessonCard}>
                <View style={styles.lessonIcon}><AppText variant="label" color={Colors.lime}>{index + 1}</AppText></View>
                <View style={styles.copy}>
                  <AppText variant="bodyStrong">{lesson.title}</AppText>
                  <AppText variant="caption">{lesson.summary}</AppText>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textMuted} />
              </View>
            ))}
            <ActionButton icon="school-outline" title="Хичээлээ нээх" detail="Онол болон хичээлийн дасгалууд" onPress={() => router.push('/lessons')} />
          </>
        ) : (
          <>
            <View style={styles.intro}>
              <MaterialCommunityIcons name="target" size={26} color={Colors.cyan} />
              <View style={styles.copy}>
                <AppText variant="heading">Дасгалаа сонгоорой</AppText>
                <AppText variant="caption">Тайван давтах эсвэл хурд хүчээ сорих боломжтой.</AppText>
              </View>
            </View>
            <ActionButton icon="heart-multiple" title="Тайван бодлого" detail="Өөрийн хурдаар бодож, тайлбарыг үз" onPress={() => router.push('/friendly')} />
            <ActionButton icon="sword-cross" title="Хурдан сорил" detail="AI өрсөлдөгчтэй бодлогоор тулалд" onPress={() => router.push('/versus')} />
          </>
        )}
      </ScrollView>
    </LabBackground>
  );
}

function SectionTab({ label, icon, active, onPress }: { label: string; icon: 'book-open-variant' | 'flask-outline'; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.tab, active && styles.activeTab]}>
      <MaterialCommunityIcons name={icon} size={18} color={active ? Colors.night : Colors.textMuted} />
      <AppText variant="button" color={active ? Colors.night : Colors.textMuted}>{label}</AppText>
    </Pressable>
  );
}

function ActionButton({ icon, title, detail, onPress }: { icon: 'school-outline' | 'heart-multiple' | 'sword-cross'; title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.actionCard}>
      <View style={styles.actionIcon}><MaterialCommunityIcons name={icon} size={24} color={Colors.lime} /></View>
      <View style={styles.copy}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption">{detail}</AppText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={23} color={Colors.lime} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rankButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, minHeight: 38, borderRadius: Radius.pill, backgroundColor: Colors.indigo900, borderWidth: 1, borderColor: Colors.gold },
  rankText: { color: Colors.gold, fontSize: 11, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, padding: 4, borderRadius: Radius.pill, backgroundColor: Colors.indigo900, gap: 4 },
  tab: { flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: Radius.pill },
  activeTab: { backgroundColor: Colors.lime },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 38, gap: 12 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginBottom: 4, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(26,19,80,0.92)' },
  copy: { flex: 1, gap: 4 },
  lessonCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(26,19,80,0.88)' },
  lessonIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(181,242,61,0.14)' },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, minHeight: 84, borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.border, backgroundColor: 'rgba(26,19,80,0.94)' },
  actionIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(181,242,61,0.14)' },
});
