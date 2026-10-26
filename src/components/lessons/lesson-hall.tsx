import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StudyTools } from '@/components/lessons/study-tools';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { XpChip } from '@/components/ui/xp-chip';
import { useSession } from '@/context/session';
import type { User } from '@/types';

export function LessonHall({ showStudyTools = false }: { showStudyTools?: boolean }) {
  const { user } = useSession();
  return user ? <LessonsHall user={user} showStudyTools={showStudyTools} /> : null;
}

function LessonsHall({ user, showStudyTools }: { user: User; showStudyTools: boolean }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <LabBackground bubbles={2}>
      <ScreenHeader
        title="Хичээлийн танхим"
        subtitle="Хичээлээ үргэлжлүүлж, дараагийн алхмаа нээгээрэй"
        right={<XpChip xp={user.xp} />}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { maxWidth: width >= 900 ? 1120 : 560, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>
        {showStudyTools && <StudyTools />}
      </ScrollView>
    </LabBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
  },
});
