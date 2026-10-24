import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClassBanner } from '@/components/lessons/class-banner';
import { ClassTabs } from '@/components/lessons/class-tabs';
import { LessonPath } from '@/components/lessons/lesson-path';
import { StudyTools } from '@/components/lessons/study-tools';
import { LessonSheet } from '@/components/lessons/lesson-sheet';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { XpChip } from '@/components/ui/xp-chip';
import { useSession } from '@/context/session';
import { getClass } from '@/data/classes';
import { classProgress, isClassUnlocked, lessonStatuses, previousClass } from '@/lib/progress';
import type { ClassId, Lesson, User } from '@/types';

export function LessonHall({ showStudyTools = false }: { showStudyTools?: boolean }) {
  const { user } = useSession();
  return user ? <LessonsHall user={user} showStudyTools={showStudyTools} /> : null;
}

function LessonsHall({ user, showStudyTools }: { user: User; showStudyTools: boolean }) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<ClassId>(user.classId);
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);

  // Finishing a class unlocks the next one: show it when we come back from the lesson.
  const [seenClassId, setSeenClassId] = useState(user.classId);
  if (seenClassId !== user.classId) {
    setSeenClassId(user.classId);
    setSelected(user.classId);
  }

  const chemClass = getClass(selected);
  const statuses = lessonStatuses(user, chemClass);
  const locked = !isClassUnlocked(user, selected);
  const { done } = classProgress(user, chemClass);
  const openStatus = openLesson ? statuses[chemClass.lessons.indexOf(openLesson)] : 'locked';

  return (
    <LabBackground bubbles={2}>
      <ScreenHeader title="Хичээлийн танхим" subtitle="Хичээлээ үргэлжлүүлж, дараагийн алхмаа нээгээрэй" right={<XpChip xp={user.xp} />} />
      <ClassTabs user={user} selected={selected} onSelect={setSelected} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}>
        <Animated.View key={selected} entering={FadeIn.duration(250)} style={styles.classBody}>
          <ClassBanner
            chemClass={chemClass}
            done={done}
            locked={locked}
            unlockAfter={previousClass(selected)?.name}
          />
          <View>
            <LessonPath chemClass={chemClass} statuses={statuses} user={user} onOpen={setOpenLesson} />
          </View>
        </Animated.View>
        {showStudyTools && <StudyTools />}
      </ScrollView>

      <LessonSheet
        lesson={openLesson}
        status={openStatus}
        result={openLesson ? user.completed[openLesson.id] : undefined}
        lockReason={locked ? `Finish ${previousClass(selected)?.name ?? 'the previous'} class first` : 'Finish the lesson before it'}
        onClose={() => setOpenLesson(null)}
        onStart={() => {
          if (!openLesson) return;
          setOpenLesson(null);
          router.push({ pathname: '/lessons/[lessonId]', params: { lessonId: openLesson.id } });
        }}
      />
    </LabBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  classBody: { gap: 18 },
});
