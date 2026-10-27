import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LessonComplete } from '@/components/lessons/lesson-complete';
import { InfoCard, QuizCard, QuizFeedback } from '@/components/lessons/lesson-steps';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { IconButton } from '@/components/ui/icon-button';
import { LabBackground } from '@/components/ui/lab-background';
import { ProgressBar } from '@/components/ui/progress-bar';
import { XpChip } from '@/components/ui/xp-chip';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import { findLesson, getClass } from '@/data/classes';
import { haptics } from '@/lib/haptics';
import { saveLessonAttempt, type LessonAttempt } from '@/lib/lesson-attempts';
import { lessonStatuses, starsForMistakes, type CompletionResult } from '@/lib/progress';
import { randomId } from '@/lib/random';
import type { Lesson } from '@/types';

const leave = () => (router.canGoBack() ? router.back() : router.replace('/lessons'));

export default function LessonScreen() {
  const { user } = useSession();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const lesson = findLesson(lessonId);
  if (!user) return null;
  if (!lesson) return <Blocked title="Lesson not found" message="This lesson doesn't exist (anymore)." />;

  const chemClass = getClass(lesson.classId);
  const status = lessonStatuses(user, chemClass)[chemClass.lessons.indexOf(lesson)];
  if (status === 'locked') {
    return <Blocked title="Not unlocked yet" message="Finish the earlier lessons in the Lessons Hall to open this one." />;
  }
  return <LessonPlayer key={lesson.id} lesson={lesson} />;
}

function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const insets = useSafeAreaInsets();
  const { user, completeLesson } = useSession();
  const { color } = getClass(lesson.classId);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [answers, setAnswers] = useState<LessonAttempt['answers']>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CompletionResult | null>(null);

  if (result) return <LessonComplete lesson={lesson} result={result} onDone={leave} />;

  const step = lesson.steps[index];
  const isLast = index === lesson.steps.length - 1;
  const correct = step.type === 'quiz' && picked === step.answer;
  const progress = (index + (step.type === 'info' || checked ? 1 : 0)) / lesson.steps.length;

  const advance = async () => {
    if (!isLast) {
      setIndex(index + 1);
      setPicked(null);
      setChecked(false);
      return;
    }
    setSaving(true);
    try {
      const stars = starsForMistakes(mistakes);
      setResult(await completeLesson(lesson.id, stars));
      haptics.success();
      // Which answers were picked goes to Supabase in the background; offline it waits on the device.
      if (user) void saveLessonAttempt(user.id, { id: randomId(), lessonId: lesson.id, stars, mistakes, answers, finishedAt: new Date().toISOString() }).catch(() => undefined);
    } catch {
      haptics.error();
      setSaving(false);
    }
  };

  const check = () => {
    if (step.type !== 'quiz' || picked === null) return;
    setChecked(true);
    setAnswers([...answers, { step: index, picked, correct: picked === step.answer }]);
    if (picked === step.answer) {
      haptics.success();
    } else {
      haptics.error();
      setMistakes(mistakes + 1);
    }
  };

  const awaitingCheck = step.type === 'quiz' && !checked;
  const buttonColors = awaitingCheck
    ? { face: color.main, edge: color.dark, ink: color.ink }
    : step.type === 'quiz' && !correct
      ? { face: Colors.danger, edge: Colors.dangerDark, ink: '#FFFFFF' }
      : { face: Colors.lime, edge: Colors.limeDark, ink: Colors.limeInk };

  return (
    <LabBackground bubbles={4}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <IconButton icon="close" accessibilityLabel="Quit lesson" onPress={leave} />
        <ProgressBar progress={progress} height={14} colors={[color.main, color.light]} style={styles.progress} />
        <XpChip xp={lesson.xp} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View key={index} entering={FadeInRight.duration(280)} exiting={FadeOutLeft.duration(180)}>
          {step.type === 'info' ? (
            <InfoCard step={step} color={color} />
          ) : (
            <QuizCard step={step} color={color} picked={picked} checked={checked} onPick={setPicked} />
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {step.type === 'quiz' && checked && <QuizFeedback correct={correct} explanation={step.explanation} />}
        <GameButton
          title={awaitingCheck ? 'Check answer' : isLast ? 'Finish lesson' : 'Continue'}
          icon={awaitingCheck ? 'check-bold' : isLast ? 'flag-checkered' : undefined}
          iconRight={!awaitingCheck && !isLast ? 'arrow-right-bold' : undefined}
          colors={buttonColors}
          disabled={awaitingCheck && picked === null}
          loading={saving}
          onPress={awaitingCheck ? check : advance}
        />
      </View>
    </LabBackground>
  );
}

function Blocked({ title, message }: { title: string; message: string }) {
  const insets = useSafeAreaInsets();
  return (
    <LabBackground bubbles={4}>
      <View style={[styles.blocked, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.blockedBody}>
          <MaterialCommunityIcons name="lock" size={72} color={Colors.textDim} />
          <AppText variant="title" align="center">
            {title}
          </AppText>
          <AppText variant="body" align="center">
            {message}
          </AppText>
        </View>
        <GameButton title="Back to Lessons Hall" icon="arrow-left" variant="secondary" onPress={leave} />
      </View>
    </LabBackground>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  progress: { flex: 1 },
  content: { padding: 20, paddingTop: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  footer: { gap: 12, paddingHorizontal: 20, paddingTop: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  blocked: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24 },
  blockedBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});
