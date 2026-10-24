import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors, Radius } from '@/constants/theme';
import type { IconName } from '@/types';
import { useRevision } from '@/context/revision';
import type { Flashcard, MCQ, StructuredQuestion } from '@/data/revision-hub/types';
import { shuffled } from '@/lib/revision-progress';
import { RichText } from './rich-text';
import { StudyCard, StudyChoice, StudyLink, ui } from './study-ui';

export function Flashcards({ cards }: { cards: Flashcard[] }) {
  const { progress, update } = useRevision();
  const [deck, setDeck] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [list, setList] = useState(false);
  const card = deck[index];
  const go = (i: number) => { setIndex(i); setFlipped(false); };
  if (!card) return <StudyCard><AppText>Давтах карт алга. Сэдвийн картуудыг «Дахин» гэж тэмдэглэвэл энд гарна.</AppText></StudyCard>;
  return <View style={flashStyles.deck}>
    <View style={flashStyles.header}>
      <AppText variant="heading">Флэшкарт</AppText>
      <AppText variant="bodyStrong">{index + 1} / {deck.length}</AppText>
    </View>
    <View style={flashStyles.track}><View style={[flashStyles.fill, { width: `${(index + 1) / deck.length * 100}%` }]}/></View>
    <FlippingCard key={card.id} card={card} flipped={flipped} onFlip={() => setFlipped(!flipped)}/>
    {flipped ? <View style={flashStyles.controls}>
      {(['again', 'known'] as const).map((rating) => <FlashControl
        key={rating}
        title={rating === 'known' ? 'Мэднэ' : 'Дахин'}
        icon={rating === 'known' ? 'check' : 'close'}
        color={rating === 'known' ? Colors.success : Colors.gold}
        grow
        onPress={() => {
          update((p) => ({ ...p, cards: { ...p.cards, [card.id]: rating } }));
          go((index + 1) % deck.length);
        }}/>) }
    </View> : <AppText variant="caption" align="center">Эхлээд хариултаа санаад, картаа эргүүлээрэй.</AppText>}
    <View style={flashStyles.navigation}>
      <FlashControl title="Өмнөх карт" icon="chevron-left" iconOnly disabled={index === 0} onPress={() => go(index - 1)}/>
      <AppText variant="caption">Мэднэ: {cards.filter((c) => progress.cards[c.id] === 'known').length} / {cards.length}</AppText>
      <FlashControl title="Дараах карт" icon="chevron-right" iconOnly disabled={index === deck.length - 1} onPress={() => go(index + 1)}/>
    </View>
    <View style={flashStyles.controls}>
      <FlashControl title="Холих" icon="shuffle-variant" grow onPress={() => { setDeck(shuffled(deck)); go(0); }}/>
      <FlashControl title={list ? 'Жагсаалт хураах' : 'Картын жагсаалт'} icon="format-list-bulleted" grow onPress={() => setList(!list)}/>
    </View>
    {list && deck.map((item, i) => <StudyLink key={item.id} title={`${i + 1}. ${item.front}`} onPress={() => { go(i); setList(false); }}/>) }
  </View>;
}

export function FlippingCard({ card, flipped, onFlip }: { card: Flashcard; flipped: boolean; onFlip: () => void }) {
  const transition = useSharedValue(flipped ? 1 : 0);
  const [height, setHeight] = useState(310);
  useEffect(() => {
    transition.set(withTiming(flipped ? 1 : 0, {
      duration: 320,
      easing: Easing.inOut(Easing.quad),
      reduceMotion: ReduceMotion.System,
    }));
  }, [flipped, transition]);
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${transition.get() * -0.6}deg` }],
    opacity: Math.max(0, 1 - transition.get() * 2),
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(1 - transition.get()) * 0.6}deg` }],
    opacity: Math.max(0, transition.get() * 2 - 1),
  }));
  return <Pressable accessibilityRole="button" accessibilityLabel={flipped ? 'Асуулт харах' : 'Карт эргүүлэх'}
    accessibilityHint="Картын нөгөө талыг харуулна" onPress={onFlip} style={{ height, backgroundColor: Colors.silver, borderRadius: Radius.lg }}>
    {([false, true] as const).map((back) => <Animated.View key={String(back)} pointerEvents="none"
      aria-hidden={back !== flipped} accessibilityElementsHidden={back !== flipped}
      importantForAccessibility={back !== flipped ? 'no-hide-descendants' : 'auto'}
      style={[flashStyles.card, flashStyles.face, back && flashStyles.answer, back ? backStyle : frontStyle]}>
      <View style={[flashStyles.cardInside, { minHeight: height - 4 }]}
        onLayout={({ nativeEvent }) => setHeight((current) => Math.max(current, Math.ceil(nativeEvent.layout.height) + 4))}>
        <AppText variant="label" color={Colors.indigo600} align="center">{back ? 'Хариулт' : 'Асуулт'}</AppText>
        <View style={flashStyles.cardText}>
          <RichText color={Colors.indigo900} align="center" fontSize={22}>{back ? card.back : card.front}</RichText>
        </View>
        <View style={flashStyles.flipHint}>
          <MaterialCommunityIcons name="rotate-3d-variant" size={18} color={Colors.indigo600}/>
          <AppText variant="caption" color={Colors.indigo600}>Дарж эргүүлээрэй</AppText>
        </View>
      </View>
    </Animated.View>)}
  </Pressable>;
}

export function Quiz({ questions, topicId }: { questions: MCQ[]; topicId?: string }) {
  const { update } = useRevision();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  const question = questions[index];
  if (!question) return <StudyCard><AppText>Давтах тест алга. Сэдвийн тестүүдээ эхлээд ажиллаарай.</AppText></StudyCard>;
  const picked = answers[question.id];
  const score = questions.filter((q) => answers[q.id] === q.answer).length;
  if (done) return <StudyCard><AppText variant="heading">Тестийн дүн: {score} / {questions.length}</AppText><AppText>{Math.round(score / questions.length * 100)}%</AppText>
    {questions.filter((q) => answers[q.id] !== q.answer).map((q) => <StudyCard key={q.id}><RichText>{q.question}</RichText><RichText>{q.explanation}</RichText></StudyCard>)}
    <GameButton title="Дахин тест өгөх" size="md" onPress={() => { setDone(false); setIndex(0); setAnswers({}); }}/>
  </StudyCard>;
  return <StudyCard><AppText variant="heading">Тест {index + 1} / {questions.length}</AppText><RichText>{question.question}</RichText>
    {question.options.map((option, i) => picked === undefined ? <StudyChoice key={i} text={option} selected={false} onPress={() => {
      setAnswers({ ...answers, [question.id]: i });
      update((p) => ({ ...p, wrong: i === question.answer ? p.wrong.filter((id) => id !== question.id) : [...new Set([...p.wrong, question.id])] }));
    }}/> : <View key={i} style={[ui.choice, i === question.answer && { borderColor: Colors.success }, i === picked && i !== question.answer && { borderColor: Colors.danger }]}><RichText>{`${i === question.answer ? '✓ ' : i === picked ? '✗ ' : ''}${option}`}</RichText></View>)}
    {picked !== undefined && <><AppText color={picked === question.answer ? Colors.success : Colors.gold}>{picked === question.answer ? 'Зөв!' : 'Зөв хариултыг харьцуулаарай.'}</AppText><RichText>{question.explanation}</RichText>
      <GameButton title={index === questions.length - 1 ? 'Тест дуусгах' : 'Дараагийн асуулт'} size="md" onPress={() => {
        if (index < questions.length - 1) setIndex(index + 1);
        else {
          if (topicId) update((p) => ({ ...p, quizBest: { ...p.quizBest, [topicId]: Math.max(p.quizBest[topicId] ?? 0, Math.round(score / questions.length * 100)) } }));
          setDone(true);
        }
      }}/>
    </>}
  </StudyCard>;
}

export function StructuredQuestions({ questions }: { questions: StructuredQuestion[] }) {
  return <>{questions.map((question) => <StructuredQuestionCard key={question.id} question={question}/>)}</>;
}
function StructuredQuestionCard({ question }: { question: StructuredQuestion }) {
  const { progress, update } = useRevision();
  const [revealed, setRevealed] = useState(false);
  const [marks, setMarks] = useState<string[]>([]);
  return <StudyCard><AppText variant="heading">{question.id} · {question.totalMarks} оноо</AppText><RichText>{question.stem}</RichText>
    {question.parts.map((part) => <View key={part.label} style={{ gap: 12 }}><AppText variant="bodyStrong">{part.label} · {part.marks} оноо</AppText><RichText>{part.prompt}</RichText>
      {revealed && <><RichText>{part.model}</RichText>{part.scheme.map((point, i) => {
        const key = `${part.label}:${i}`;
        return <StudyChoice key={key} checkbox text={point} selected={marks.includes(key)} onPress={() => {
          const next = marks.includes(key) ? marks.filter((m) => m !== key) : [...marks, key];
          setMarks(next);
          update((p) => ({ ...p, questionBest: { ...p.questionBest, [question.id]: Math.max(p.questionBest[question.id] ?? 0, next.length) } }));
        }}/>;
      })}</>}
    </View>)}
    <GameButton title={revealed ? 'Хариулт хураах' : 'Загвар хариулт, схем харах'} size="md" variant="secondary" onPress={() => setRevealed(!revealed)}/>
    <AppText variant="caption">Өөрийн үнэлгээ: {marks.length} / {question.totalMarks} · Шилдэг: {progress.questionBest[question.id] ?? 0}</AppText>
  </StudyCard>;
}


function FlashControl({ title, icon, onPress, disabled = false, color = Colors.textMuted, grow = false, iconOnly = false }: {
  title: string; icon: IconName; onPress: () => void; disabled?: boolean; color?: string; grow?: boolean; iconOnly?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [flashStyles.control, grow && { flex: 1 }, disabled && { opacity: 0.35 }, pressed && { backgroundColor: Colors.panelRaised }]}>
    <MaterialCommunityIcons name={icon} size={22} color={color}/>
    {!iconOnly && <AppText variant="caption" color={color} style={{ flexShrink: 1 }} align="center">{title}</AppText>}
  </Pressable>;
}
const flashStyles = StyleSheet.create({
  deck: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: Colors.border },
  fill: { height: '100%', backgroundColor: Colors.cyan },
  card: { minHeight: 310, backgroundColor: Colors.silver, borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.silver },
  face: { position: 'absolute', top: 0, left: 0, right: 0, backfaceVisibility: 'hidden' },
  answer: { borderColor: Colors.cyan },
  cardInside: { minHeight: 306, padding: 24, gap: 24 },
  cardText: { flexGrow: 1, minHeight: 155, justifyContent: 'center', width: '100%' },
  flipHint: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  navigation: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  controls: { flexDirection: 'row', gap: 12 },
  control: { minHeight: 46, minWidth: 46, paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
