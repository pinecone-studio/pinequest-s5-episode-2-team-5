import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { LESSONS } from '../constants/lessons';
import { colors } from '../constants/theme';
import { useGame } from '../services/GameContext';

export function LessonScreen({ lessonId, onExit }: { lessonId: string; onExit: () => void }) {
  const { finishLesson } = useGame();
  const lesson = LESSONS.find((l) => l.id === lessonId)!;
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [gained, setGained] = useState<number | null>(null);

  const total = lesson.questions.length;
  const question = lesson.questions[step];

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === question.answer) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (step + 1 < total) {
      setStep(step + 1);
      setPicked(null);
    } else {
      setGained(finishLesson(lesson.id, correct, total));
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title={lesson.title} onBack={onExit} />
      <ScrollView contentContainerStyle={styles.body}>
        {gained === null ? (
          <>
            <Text style={styles.progress}>Question {step + 1} / {total}</Text>
            <Text style={styles.question}>{question.q}</Text>
            {question.options.map((o, i) => {
              const done = picked !== null;
              const bg = !done ? colors.panel : i === question.answer ? '#166534' : i === picked ? '#7f1d1d' : colors.panel;
              return (
                <Pressable key={o} onPress={() => pick(i)} style={[styles.option, { backgroundColor: bg }]}>
                  <Text style={styles.optionText}>{o}</Text>
                </Pressable>
              );
            })}
            {picked !== null && (
              <Pressable onPress={next} style={styles.button}>
                <Text style={styles.buttonText}>{step + 1 < total ? 'Next' : 'Finish'}</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Text style={styles.question}>Lesson complete!</Text>
            <Text style={styles.progress}>{correct} / {total} correct</Text>
            <Text style={styles.xp}>+{gained} XP</Text>
            <Pressable onPress={onExit} style={styles.button}>
              <Text style={styles.buttonText}>Back to hub</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 20, gap: 12, maxWidth: 520, width: '100%', alignSelf: 'center' },
  progress: { color: colors.muted, textAlign: 'center' },
  question: { color: colors.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginVertical: 8 },
  option: { padding: 14, borderRadius: 8 },
  optionText: { color: colors.text, fontWeight: '600' },
  xp: { color: colors.accent, fontSize: 32, fontWeight: '900', textAlign: 'center' },
  button: { backgroundColor: colors.accent, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#06260f', fontWeight: '900' },
});
