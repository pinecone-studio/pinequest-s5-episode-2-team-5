import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ClassMedallion } from '@/components/ui/class-medallion';
import { GameButton } from '@/components/ui/game-button';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { getClass } from '@/data/classes';
import type { LessonStatus } from '@/lib/progress';
import type { IconName, Lesson, LessonResult } from '@/types';

interface LessonSheetProps {
  lesson: Lesson | null;
  status: LessonStatus;
  result?: LessonResult;
  lockReason: string;
  onClose: () => void;
  onStart: () => void;
}

export function LessonSheet({ lesson, status, result, lockReason, onClose, onStart }: LessonSheetProps) {
  return (
    <BottomSheet visible={lesson !== null} onClose={onClose}>
      {lesson && (
        <SheetBody lesson={lesson} status={status} result={result} lockReason={lockReason} onStart={onStart} />
      )}
    </BottomSheet>
  );
}

function SheetBody({ lesson, status, result, lockReason, onStart }: Omit<LessonSheetProps, 'lesson' | 'onClose'> & { lesson: Lesson }) {
  const chemClass = getClass(lesson.classId);
  const { color } = chemClass;
  const locked = status === 'locked';
  const number = chemClass.lessons.indexOf(lesson) + 1;
  const quizCount = lesson.steps.filter((s) => s.type === 'quiz').length;

  return (
    <>
      <View style={styles.header}>
        <ClassMedallion icon={locked ? 'lock' : lesson.icon} color={color} size={66} dimmed={locked} />
        <View style={styles.titles}>
          <AppText variant="label" color={color.main}>
            Lesson {number} · {chemClass.name}
          </AppText>
          <AppText variant="title">{lesson.title}</AppText>
        </View>
      </View>
      <AppText variant="body">{lesson.summary}</AppText>

      <View style={styles.chips}>
        <Chip icon="timer-outline" text={`${lesson.minutes} min`} />
        <Chip icon="lightning-bolt" text={`Up to ${lesson.xp} XP`} />
        <Chip icon="head-question-outline" text={`${quizCount} questions`} />
      </View>

      <View style={styles.steps}>
        {lesson.steps.map((step, i) => (
          <View key={i} style={styles.step}>
            <View style={[styles.stepIcon, { backgroundColor: `${color.main}26` }]}>
              <MaterialCommunityIcons
                name={step.type === 'info' ? step.icon : 'head-question-outline'}
                size={16}
                color={color.main}
              />
            </View>
            <AppText variant="bodyStrong" style={styles.stepText} numberOfLines={1}>
              {step.type === 'info' ? step.title : 'Quick check'}
            </AppText>
          </View>
        ))}
      </View>

      {result && (
        <View style={styles.best}>
          <AppText variant="caption">Your best</AppText>
          <View style={styles.bestStars}>
            {[1, 2, 3].map((s) => (
              <MaterialCommunityIcons key={s} name="star" size={18} color={s <= result.stars ? Colors.gold : Colors.border} />
            ))}
          </View>
          <AppText style={styles.bestXp}>{result.xp} XP</AppText>
        </View>
      )}

      {locked ? (
        <GameButton title={lockReason} icon="lock" disabled />
      ) : (
        <GameButton
          title={status === 'completed' ? 'Play again' : 'Start lesson'}
          icon={status === 'completed' ? 'replay' : 'play'}
          colors={{ face: color.main, edge: color.dark, ink: color.ink }}
          onPress={onStart}
        />
      )}
    </>
  );
}

function Chip({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.chip}>
      <MaterialCommunityIcons name={icon} size={15} color={Colors.textMuted} />
      <AppText variant="caption">{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  titles: { flex: 1, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.panel,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  steps: {
    gap: 8,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  stepText: { flex: 1, fontSize: 15 },
  best: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bestStars: { flexDirection: 'row' },
  bestXp: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.gold },
});
