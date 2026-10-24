import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { getPack } from '@/data/revision-hub';
import { useCatalystJourney } from '@/hooks/use-catalyst-journey';
import { canContinue, JOURNEY_STEPS, newJourney, QUIZ_IDS, quizScore } from '@/lib/catalyst-journey';
import { chemistryText } from '@/lib/chemistry-text';
import { CatalystFigure } from './catalyst-figure';
import { RichText } from './rich-text';

const topic = getPack('g8-chem').topics.find((item) => item.id === '3.2')!;
const catalyst = topic.notes.flatMap((note) => note.blocks).find((block) => block.t === 'key' && block.term === 'Катализатор')!;
const questions = QUIZ_IDS.map((id) => topic.quiz.find((question) => question.id === id)!);
const predictions = ['Хүчилтөрөгч илүү хурдан ялгарна', 'Урвал бүрэн зогсоно', 'Катализатор бүхэлдээ зарцуулагдана'];
const scheme = ['Катализатор бага энерги шаардсан өөр зам бий болгоно.', 'Хүчилтөрөгч хурдан ялгарч, савангийн хөөс үүснэ.', 'Катализатор урвалын эцэст зарцуулагдахгүй үлдэнэ.'];

export function CatalystJourney({ userId }: { userId: string }) {
  const { progress: p, ready, loadError, saveStatus, update, retryLoad, retrySave } = useCatalystJourney(userId);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const insets = useSafeAreaInsets();
  const [retryWrong, setRetryWrong] = useState(false);
  const patch = (change: Partial<typeof p>) => update({ ...p, ...change });
  const go = (step: number) => { patch({ step }); scroll.current?.scrollTo({ y: 0, animated: false }); };
  const score = quizScore(p.answers, questions);
  const activeQuestion = questions.find((question) => !(question.id in p.answers));
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const feedback = questions.find((question) => question.id === feedbackId);

  if (!ready) return <LabBackground><ScreenHeader title="Катализаторын нөлөө" />
    <View style={styles.body}>{loadError ? <><AppText>Хадгалсан явцыг уншиж чадсангүй.</AppText><GameButton title="Дахин ачаалах" onPress={retryLoad}/></> : <ActivityIndicator color={Colors.lime}/>}</View>
  </LabBackground>;

  return <LabBackground bubbles={3}>
    <ScreenHeader title="Катализаторын нөлөө" subtitle="Хими 8 • Урвалын хурд" onBack={() => router.replace('/lessons')} />
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.status}>
        <AppText variant="caption">{p.completed ? 'Дууссан' : `Алхам ${p.step + 1} / 5`}</AppText>
        <AppText variant="caption">{saveStatus === 'saved' ? 'Энэ төхөөрөмжид хадгалсан' : saveStatus === 'saving' ? 'Хадгалж байна…' : 'Хадгалалт амжилтгүй'}</AppText>
      </View>
      {saveStatus === 'error' && <GameButton title="Хадгалалтыг дахин оролдох" size="sm" variant="danger" onPress={retrySave}/>}
      <View style={styles.steps}>{JOURNEY_STEPS.map((label, i) => <View key={label} style={[styles.step, i <= p.step && styles.stepActive]}><AppText variant="caption" color={i === p.step ? Colors.lime : Colors.textMuted}>{i + 1}. {label}</AppText></View>)}</View>
      {p.step === 0 && <>
        <View style={styles.card}>
          <AppText variant="label" color={Colors.lime}>Суралцах → Турших → Тайлбарлах</AppText>
          <AppText variant="title">Хөөс яагаад огцом үүсдэг вэ?</AppText>
          <AppText>Устөрөгчийн хэт исэл ус ба хүчилтөрөгч болж задарна. Катализатор нэмэхэд юу өөрчлөгдөхийг таамаглаж, ажиглалтаар тайлбарлаарай.</AppText>
          <RichText>2H_2O_2 → 2H_2O + O_2↑</RichText>
        </View>
        <View style={styles.card}><AppText variant="heading">Катализатор гэж юу вэ?</AppText>
          {'x' in catalyst && <RichText>{catalyst.x}</RichText>}
          <RichText>Катализатор **бага энерги шаардсан өөр зам** бий болгоно. Мөргөлдөлтийн нийт тоо биш, **ашигтай мөргөлдөлтийн хувь** нэмэгдэнэ.</RichText>
          <AppText variant="caption">Сурах бичгийн холбоос: х. {topic.bookPages} • Туршилт 6, х.102</AppText>
        </View>
        <View style={styles.card}><AppText variant="heading">Энэ хичээлээр</AppText><AppText>• Урвалын хурд хэрхэн өөрчлөгдөхийг таамаглана.{ '\n' }• Хүчилтөрөгч ялгарахыг ажиглана.{ '\n' }• Катализаторын үүргийг тайлбарлана.</AppText></View>
      </>}
      {p.step === 1 && <View style={styles.card}>
        <AppText variant="label" color={Colors.lime}>Эхлээд өөрөө бодоорой</AppText>
        <AppText variant="heading">H₂O₂ ба савангийн холимогт катализатор нэмбэл юу болох вэ?</AppText>
        {predictions.map((option, index) => <Choice key={option} text={option} selected={p.prediction === index} onPress={() => patch({ prediction: index })}/>)}
        <AppText variant="caption">Таамаглалыг оноогоор үнэлэхгүй. Ажигласныхаа дараа эргэн харна.</AppText>
      </View>}
      {p.step === 2 && <>
        <View style={styles.card}><AppText variant="heading">Ажиглах аргаа сонгоорой</AppText>
          <AppText>3D лабораторид турших эсвэл доорх бүдүүвчийг харьцуулж ажиглалтаа бичээрэй.</AppText>
          {Platform.OS === 'web' ? <>
            <AppText>OpenLab-ийн туршилтын цэснээс «Зааны шүдний оо»-г сонгоно. H₂O₂, саван, KI ашиглана. Буцаж ирээд энд үргэлжлүүлээрэй.</AppText>
            <GameButton title="3D лаборатори нээх" size="md" variant="secondary" onPress={() => router.push('/openlab')}/>
            <Choice text="3D лабораторид ажигласан" selected={p.source === 'lab'} onPress={() => patch({ source: 'lab' })}/>
          </> : <AppText>3D лаборатори вэб хувилбарт ажиллана. Утсан дээр доорх бүдүүвчээр хичээлээ бүрэн үргэлжлүүлж болно.</AppText>}
          <AppText variant="caption">Сурах бичгийн жишээ MnO₂, 3D туршилт KI хэрэглэдэг. Эдгээр нь H₂O₂-ийн задралыг хурдасгах өөр катализаторууд.</AppText>
          <View style={styles.notice}><AppText>Аюулгүй ажиллагаа: энэ бол виртуал хичээл. Бодит туршилтыг багшийн хяналтгүй бүү хий. Урвал дулаан ялгаруулна; хамгаалалтын шил хэрэглэж, хөөсөнд хүрэхгүй.</AppText></View>
        </View>
        <View style={styles.card}><CatalystFigure onCompare={() => patch({ source: 'illustration' })}/></View>
        <View style={styles.card}>
          <AppText variant="heading">Юу ажигласан бэ?</AppText>
          <AppText variant="caption">{p.source === 'lab' ? 'Эх сурвалж: өөрийн 3D ажиглалт' : p.source === 'illustration' ? 'Эх сурвалж: сургалтын бүдүүвч' : 'Эхлээд бүдүүвчийг харьцуулах эсвэл 3D ажиглалтаа сонгоно уу.'}</AppText>
          <Answer label="Ажиглалт" placeholder="Катализатор нэмэхийн өмнө ба дараах ялгааг бич…" value={p.observation} onChangeText={(observation) => patch({ observation })}/>
          <AppText variant="caption">Дор хаяж 10 тэмдэгт. Хийн бөмбөлөг, хөөс, урвалын хурдыг анхаараарай.</AppText>
        </View>
      </>}
      {p.step === 3 && <>
        <View style={styles.card}><AppText variant="heading">Таамаглалаа ажиглалттай харьцуулъя</AppText>
          <AppText>Таны таамаг: {predictions[p.prediction ?? 0]}</AppText>
          <AppText>Таны ажиглалт: {p.observation}</AppText>
          <AppText color={p.prediction === 0 ? Colors.success : Colors.gold}>{p.prediction === 0 ? 'Ажиглалт таамаглалыг дэмжиж байна.' : 'Таамаглалаа шинэчилье: катализатор задралыг хурдасгаж, хүчилтөрөгч хурдан ялгаруулдаг.'}</AppText>
          <Answer label="Яагаад хөөс хурдан үүссэн бэ? Катализаторын үүргийг тайлбарла." placeholder="Өөрийн үгээр тайлбарла…" value={p.reflection} onChangeText={(reflection) => patch({ reflection })}/>
          {!p.revealed && <GameButton title="Тайлбарын шалгуур харах" size="md" disabled={p.reflection.trim().length < 10} onPress={() => patch({ revealed: true })}/>}
          {p.revealed && <><RichText>Катализатор бага энерги шаардсан өөр зам бий болгож H_2O_2-ийн задралыг хурдасгана. Ялгарсан O_2 савангийн бөмбөлөгт баригдаж хөөс үүсгэнэ. Катализатор урвалын эцэст зарцуулагдахгүй.</RichText>
            <AppText variant="caption">Өөрийн тайлбарт орсон санаануудыг тэмдэглээрэй. Энэ нь өөрийн үнэлгээ.</AppText>
            {scheme.map((point, i) => <Choice key={point} checkbox text={point} selected={p.marks.includes(i)} onPress={() => patch({ marks: p.marks.includes(i) ? p.marks.filter((mark) => mark !== i) : [...p.marks, i] })}/>)}
            <AppText>Өөрийн үнэлгээ: {p.marks.length} / 3</AppText></>}
        </View>
      </>}
      {p.step === 4 && <>
        <View style={styles.card}><AppText variant="heading">Мэдлэгээ шалгая</AppText><AppText>3 асуулт • Хамгийн сайн дүн: {p.best} / 3</AppText>
          {feedback ? <>
            <RichText>{feedback.question}</RichText>
            <AppText color={p.answers[feedback.id] === feedback.answer ? Colors.success : Colors.gold}>{p.answers[feedback.id] === feedback.answer ? 'Зөв!' : 'Дахин бодоорой.'}</AppText>
            <RichText>{`Зөв хариулт: **${feedback.options[feedback.answer]}**`}</RichText><RichText>{feedback.explanation}</RichText>
            <GameButton title={activeQuestion ? 'Дараагийн асуулт' : 'Дүнгээ харах'} size="md" onPress={() => setFeedbackId(null)}/>
          </> : activeQuestion ? <>
            <AppText variant="caption">Асуулт {Object.keys(p.answers).length + 1} / 3</AppText>
            <RichText>{activeQuestion.question}</RichText>
            {activeQuestion.options.map((option, i) => <Choice key={option} text={option} selected={false} onPress={() => {
              patch({ answers: { ...p.answers, [activeQuestion.id]: i } }); setFeedbackId(activeQuestion.id);
            }}/>) }
          </> : <>
            <AppText variant="title">{score} / 3</AppText>
            <AppText>{score === 3 ? 'Катализаторын үүргийг сайн ойлгожээ!' : 'Доорх тайлбаруудыг давтаад дахин оролдоорой.'}</AppText>
            {questions.filter((question) => p.answers[question.id] !== question.answer).map((question) => <View key={question.id} style={styles.notice}><RichText>{question.question}</RichText><RichText>{question.explanation}</RichText></View>)}
            {!p.completed && <GameButton title="Хичээлээ дуусгах" onPress={() => patch({ completed: true, best: Math.max(p.best, score) })}/>}
            {p.completed && <><AppText color={Colors.success}>Хичээл дууссан • Явц хадгалагдсан</AppText><GameButton title="Хичээлийн танхим руу" size="md" onPress={() => router.replace('/lessons')}/></>}
            <GameButton title="Асуултуудыг дахин оролдох" variant="secondary" size="md" onPress={() => {
              patch({ answers: {}, best: Math.max(p.best, score), completed: false }); setFeedbackId(null);
            }}/>
          </>}
        </View>
      </>}
      <View style={styles.navigation}>
        {p.step > 0 && <GameButton title="Өмнөх" size="md" variant="secondary" style={styles.flex} onPress={() => { setFeedbackId(null); go(p.step - 1); }}/>} 
        {p.step < 4 && <GameButton title="Үргэлжлүүлэх" size="md" style={styles.flex} disabled={!canContinue(p)} onPress={() => go(p.step + 1)}/>}
      </View>
      <AppText variant="caption">Явц зөвхөн энэ төхөөрөмжид, таны бүртгэлээр хадгалагдана. Энэ хичээлийн оноо ерөнхий XP-д нэмэгдэхгүй.</AppText>
      {retryWrong ? <View style={styles.card}><AppText>Энэ хичээлийн хадгалсан хариултуудыг шинээр эхлэх үү?</AppText><GameButton title="Шинээр эхлэх" size="md" variant="danger" onPress={() => { update({ ...newJourney(), best: p.best }); setFeedbackId(null); setRetryWrong(false); scroll.current?.scrollTo({ y: 0 }); }}/><GameButton title="Болих" size="md" variant="secondary" onPress={() => setRetryWrong(false)}/></View> : <Pressable accessibilityRole="button" onPress={() => setRetryWrong(true)} style={styles.reset}><AppText variant="caption">Хичээлийг шинээр эхлэх</AppText></Pressable>}
    </ScrollView>
  </LabBackground>;
}

function Answer({ label, ...props }: { label: string; placeholder: string; value: string; onChangeText: (value: string) => void }) {
  return <View style={{ gap: 8 }}><AppText variant="bodyStrong">{label}</AppText><TextInput {...props} multiline maxLength={3000} accessibilityLabel={label} placeholderTextColor={Colors.textDim} style={styles.answer} textAlignVertical="top"/></View>;
}
function Choice({ text, selected, onPress, checkbox = false }: { text: string; selected: boolean; onPress: () => void; checkbox?: boolean }) {
  return <Pressable accessibilityRole={checkbox ? 'checkbox' : 'radio'} accessibilityLabel={chemistryText(text).map((token) => token.text).join('')} accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.choice, selected && styles.selected]}>
    <AppText color={selected ? Colors.lime : Colors.textMuted}>{selected ? '●' : '○'}</AppText><View style={styles.flex}><RichText>{text}</RichText></View>
  </Pressable>;
}
const styles = StyleSheet.create({
  body: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 16, gap: 16 },
  card: { padding: 20, backgroundColor: Colors.panel, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, gap: 16 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  step: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: Radius.sm, backgroundColor: Colors.input },
  stepActive: { borderBottomWidth: 2, borderBottomColor: Colors.lime },
  status: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  choice: { minHeight: 52, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.input, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  selected: { borderColor: Colors.lime },
  answer: { color: Colors.text, backgroundColor: Colors.input, padding: 14, minHeight: 112, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, fontSize: 16, fontFamily: Fonts.regular, lineHeight: 24 },
  notice: { backgroundColor: Colors.input, padding: 14, borderRadius: Radius.sm, gap: 8 },
  navigation: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  reset: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
});
