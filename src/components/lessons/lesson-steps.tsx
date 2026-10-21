import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { ClassPalette, LessonStep } from '@/types';

type InfoStep = Extract<LessonStep, { type: 'info' }>;
type QuizStep = Extract<LessonStep, { type: 'quiz' }>;

export function InfoCard({ step, color }: { step: InfoStep; color: ClassPalette }) {
  return (
    <View style={styles.info}>
      <View style={[styles.halo, { backgroundColor: `${color.main}22`, borderColor: `${color.main}55` }]}>
        <View style={[styles.haloInner, { backgroundColor: color.main }]}>
          <MaterialCommunityIcons name={step.icon} size={56} color={color.ink} />
        </View>
        <View style={[styles.dot, { top: 14, right: 18, backgroundColor: color.main }]} />
        <View style={[styles.dot, styles.dotSmall, { bottom: 22, left: 12, backgroundColor: Colors.cyan }]} />
      </View>
      <AppText variant="label" color={color.main}>
        Lab notes
      </AppText>
      <AppText variant="title">{step.title}</AppText>
      <AppText variant="body" style={styles.body}>
        {step.body}
      </AppText>
    </View>
  );
}

interface QuizCardProps {
  step: QuizStep;
  color: ClassPalette;
  picked: number | null;
  checked: boolean;
  onPick: (index: number) => void;
}

export function QuizCard({ step, color, picked, checked, onPick }: QuizCardProps) {
  return (
    <View style={styles.quiz}>
      <View style={styles.quizTag}>
        <MaterialCommunityIcons name="head-question-outline" size={16} color={color.main} />
        <AppText variant="label" color={color.main}>
          Quick check
        </AppText>
      </View>
      <AppText variant="title">{step.question}</AppText>
      <View style={styles.options} accessibilityRole="radiogroup">
        {step.options.map((option, i) => {
          const isPicked = picked === i;
          const isAnswer = i === step.answer;
          const state = checked ? (isAnswer ? 'correct' : isPicked ? 'wrong' : 'dim') : isPicked ? 'picked' : 'idle';
          const tone = OPTION_TONES[state];
          return (
            <Pressable
              key={option}
              disabled={checked}
              onPress={() => {
                haptics.select();
                onPick(i);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: isPicked, disabled: checked }}
              style={[
                styles.option,
                { borderColor: tone.border ?? color.main, backgroundColor: tone.background ?? `${color.main}22` },
                state === 'dim' && styles.dim,
              ]}>
              <View style={[styles.letter, { backgroundColor: tone.letter ?? color.main }]}>
                <AppText style={[styles.letterText, { color: tone.letterInk ?? color.ink }]}>
                  {String.fromCharCode(65 + i)}
                </AppText>
              </View>
              <AppText variant="bodyStrong" style={styles.optionText}>
                {option}
              </AppText>
              {state === 'correct' && <MaterialCommunityIcons name="check-circle" size={24} color={Colors.success} />}
              {state === 'wrong' && <MaterialCommunityIcons name="close-circle" size={24} color={Colors.danger} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** `undefined` entries fall back to the class color. */
const OPTION_TONES: Record<
  'idle' | 'picked' | 'correct' | 'wrong' | 'dim',
  { border?: string; background?: string; letter?: string; letterInk?: string }
> = {
  idle: { border: Colors.border, background: Colors.panel, letter: Colors.indigo700, letterInk: Colors.text },
  picked: {},
  correct: { border: Colors.success, background: 'rgba(74, 222, 128, 0.16)', letter: Colors.success, letterInk: '#063B1C' },
  wrong: { border: Colors.danger, background: 'rgba(255, 107, 129, 0.16)', letter: Colors.danger, letterInk: '#FFFFFF' },
  dim: { border: Colors.border, background: Colors.panel, letter: Colors.indigo700, letterInk: Colors.textDim },
};

export function QuizFeedback({ correct, explanation }: { correct: boolean; explanation: string }) {
  const tint = correct ? Colors.success : Colors.danger;
  return (
    <View style={[styles.feedback, { borderColor: tint, backgroundColor: correct ? '#123E2B' : '#45152A' }]} accessibilityLiveRegion="polite">
      <MaterialCommunityIcons name={correct ? 'check-decagram' : 'lightbulb-on-outline'} size={28} color={tint} />
      <View style={styles.feedbackBody}>
        <AppText style={[styles.feedbackTitle, { color: tint }]}>{correct ? 'Correct!' : 'Not quite'}</AppText>
        <AppText variant="caption" color={Colors.text}>
          {explanation}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  info: { gap: 10 },
  halo: {
    alignSelf: 'center',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  haloInner: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  dot: { position: 'absolute', width: 18, height: 18, borderRadius: 9 },
  dotSmall: { width: 11, height: 11 },
  body: { fontSize: 17.5, lineHeight: 27, color: Colors.text },
  quiz: { gap: 16 },
  quizTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  options: { gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 2.5,
    borderBottomWidth: 5,
  },
  dim: { opacity: 0.55 },
  letter: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  letterText: { fontFamily: Fonts.bold, fontSize: 16 },
  optionText: { flex: 1, fontSize: 16.5, lineHeight: 22 },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 2,
  },
  feedbackBody: { flex: 1, gap: 2 },
  feedbackTitle: { fontFamily: Fonts.bold, fontSize: 18 },
});
