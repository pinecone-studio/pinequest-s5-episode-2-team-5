import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Radius } from '@/constants/theme';

const CATEGORIES = ['Бүгд', 'Атом', 'Хими', 'Байгаль'] as const;
type Category = (typeof CATEGORIES)[number];

const PROBLEMS: { category: Exclude<Category, 'Бүгд'>; question: string; choices: string[]; answer: number; explanation: string }[] = [
  { category: 'Атом', question: 'Саармаг нүүрстөрөгчийн атом 6 протонтой бол хэдэн электронтой вэ?', choices: ['6', '12', '8', '14'], answer: 0, explanation: 'Саармаг атомд протон, электроны тоо тэнцүү. Тиймээс нүүрстөрөгч 6 электронтой.' },
  { category: 'Хими', question: 'Усны химийн томьёо аль вэ?', choices: ['CO₂', 'H₂O', 'O₂', 'NaCl'], answer: 1, explanation: 'Усны нэг молекул хоёр устөрөгч, нэг хүчилтөрөгчийн атомоос бүрдэнэ.' },
  { category: 'Байгаль', question: 'Ургамал нарны гэрлийг ашиглан хоол үүсгэх үйл явцыг юу гэдэг вэ?', choices: ['Ууршилт', 'Фотосинтез', 'Хөлдөлт', 'Амьсгал'], answer: 1, explanation: 'Фотосинтезийн үед ургамал гэрлийн энергээр ус, нүүрсхүчлийн хийгээс шим бодис үүсгэдэг.' },
  { category: 'Хими', question: '25°C-д pH 7 орчим уусмал ямар шинжтэй вэ?', choices: ['Хүчиллэг', 'Суурилаг', 'Саармаг', 'Давстай'], answer: 2, explanation: '25°C-д pH 7 нь саармаг орчныг илтгэнэ.' },
  { category: 'Атом', question: 'Үелэх хүснэгтийн нэг босоо баганыг юу гэж нэрлэдэг вэ?', choices: ['Үе', 'Бүлэг', 'Мөр', 'Изотоп'], answer: 1, explanation: 'Үелэх хүснэгтийн босоо баганыг бүлэг, хэвтээ мөрийг үе гэдэг.' },
  { category: 'Байгаль', question: 'Дэлхийн агаар мандалд хамгийн их байдаг хий аль вэ?', choices: ['Хүчилтөрөгч', 'Нүүрсхүчлийн хий', 'Азот', 'Устөрөгч'], answer: 2, explanation: 'Агаар мандлын ойролцоогоор 78 хувийг азот эзэлдэг.' },
  { category: 'Хими', question: 'Хоолны давсны томьёо аль вэ?', choices: ['NaCl', 'HCl', 'K₂O', 'NH₃'], answer: 0, explanation: 'Хоолны давс нь натри, хлорын ионоос тогтсон натрийн хлорид юм.' },
  { category: 'Байгаль', question: 'Ус ердийн даралтанд хэдэн °C-д буцалдаг вэ?', choices: ['0°C', '50°C', '100°C', '150°C'], answer: 2, explanation: 'Далайн түвшний ердийн атмосферийн даралтанд ус 100°C-д буцална.' },
];

export function FriendlyHub() {
  const { width, height } = useWindowDimensions();
  const [category, setCategory] = useState<Category>('Бүгд');
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const filtered = useMemo(() => PROBLEMS.filter((problem) => category === 'Бүгд' || problem.category === category), [category]);
  const problem = filtered[index];
  const changeCategory = (next: Category) => { setCategory(next); setIndex(0); setPicked(null); };
  const move = (direction: number) => { setIndex((current) => (current + direction + filtered.length) % filtered.length); setPicked(null); };

  return (
    <View style={styles.background}>
      <Image source={require('../../../assets/images/friendly-hub-background.jpg')} resizeMode="cover" style={[styles.backgroundImage, { width, height }]} accessibilityIgnoresInvertColors />
      <View pointerEvents="none" style={styles.scrim} />
      <ScreenHeader title="Friendly Hub" subtitle="Тайван хэмнэлээрээ бодоорой" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcome}>
          <View style={styles.iconWrap}><MaterialCommunityIcons name="weather-night" size={25} color="#B8F2F0" /></View>
          <View style={styles.welcomeCopy}>
            <AppText variant="heading">Chill горим</AppText>
            <AppText variant="caption">Цагийн хязгааргүй. Оноо, өрсөлдөөнгүй. Өөрийн хурдаар сонирхоорой.</AppText>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <AppText variant="heading">Өнөөдөр юу сонирхох вэ?</AppText>
          <AppText variant="caption">{filtered.length} бодлого</AppText>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
          {CATEGORIES.map((item) => {
            const active = item === category;
            return <Pressable key={item} onPress={() => changeCategory(item)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.category, active && styles.categoryActive]}>
              <AppText variant="button" style={[styles.categoryText, active && styles.categoryTextActive]}>{item}</AppText>
            </Pressable>;
          })}
        </ScrollView>

        <View style={styles.card}>
          <View style={styles.meta}>
            <View style={styles.topicPill}><MaterialCommunityIcons name="flask-outline" size={15} color="#B8F2F0" /><AppText variant="caption" color="#D4F7F3">{problem.category}</AppText></View>
            <AppText variant="caption">{index + 1} / {filtered.length}</AppText>
          </View>
          <AppText variant="title" style={styles.question}>{problem.question}</AppText>
          <View style={styles.options}>
            {problem.choices.map((choice, choiceIndex) => {
              const selected = picked === choiceIndex;
              const correct = picked !== null && choiceIndex === problem.answer;
              return <Pressable key={choice} disabled={picked !== null} onPress={() => setPicked(choiceIndex)} accessibilityRole="button" style={[styles.option, correct && styles.correct, selected && !correct && styles.incorrect]}>
                <View style={[styles.letter, correct && styles.letterCorrect]}><AppText variant="label" color={correct ? '#073A32' : '#D4F7F3'}>{String.fromCharCode(65 + choiceIndex)}</AppText></View>
                <AppText variant="bodyStrong" style={styles.optionText}>{choice}</AppText>
                {correct && <MaterialCommunityIcons name="check-circle" size={21} color="#65E6AE" />}
                {selected && !correct && <MaterialCommunityIcons name="close-circle" size={21} color="#FFA1A8" />}
              </Pressable>;
            })}
          </View>
          {picked !== null && <View style={styles.explanation}>
            <AppText variant="bodyStrong" color={picked === problem.answer ? '#65E6AE' : '#FFD58A'}>{picked === problem.answer ? 'Зөв хариулт 🌿' : 'Зүгээр ээ, хамтдаа ойлгоё'}</AppText>
            <AppText variant="caption" style={styles.explanationText}>{problem.explanation}</AppText>
          </View>}
          <View style={styles.navigation}>
            <Pressable onPress={() => move(-1)} accessibilityRole="button" accessibilityLabel="Өмнөх бодлого" style={styles.navButton}><MaterialCommunityIcons name="arrow-left" size={18} color="#C5EFEB" /><AppText variant="button" style={styles.navText}>Өмнөх</AppText></Pressable>
            {picked === null ? <AppText variant="caption" style={styles.hint}>Хариултаа тайван сонгоорой</AppText> : <Pressable onPress={() => move(1)} accessibilityRole="button" style={[styles.navButton, styles.nextButton]}><AppText variant="button" style={styles.navText}>Дараагийнх</AppText><MaterialCommunityIcons name="arrow-right" size={18} color="#C5EFEB" /></Pressable>}
          </View>
        </View>
        <View style={styles.note}><MaterialCommunityIcons name="leaf" size={17} color="#B8F2F0" /><AppText variant="caption" style={styles.noteText}>Алдаа бол суралцах нэг хэсэг. Бодлогуудыг хүссэн үедээ давтаарай.</AppText></View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#102E39' },
  backgroundImage: { position: 'absolute', top: 0, left: 0 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5, 24, 35, 0.76)' },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 40, gap: 17 },
  welcome: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderWidth: 1, borderColor: 'rgba(184,242,240,0.45)', borderRadius: Radius.lg, backgroundColor: 'rgba(8,48,59,0.86)' },
  iconWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(115,221,215,0.16)', alignItems: 'center', justifyContent: 'center' },
  welcomeCopy: { flex: 1, gap: 4 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  categories: { gap: 9, paddingRight: 18 },
  category: { paddingHorizontal: 16, minHeight: 42, justifyContent: 'center', borderRadius: Radius.pill, borderWidth: 1, borderColor: 'rgba(185,232,232,0.35)', backgroundColor: 'rgba(8,43,53,0.76)' },
  categoryActive: { backgroundColor: '#B8F2F0', borderColor: '#B8F2F0' },
  categoryText: { fontSize: 14, color: '#D4F7F3' },
  categoryTextActive: { color: '#123B42' },
  card: { borderWidth: 1, borderColor: 'rgba(191,239,236,0.45)', borderRadius: Radius.xl, padding: 18, backgroundColor: 'rgba(7,35,47,0.94)', gap: 14 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topicPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: 'rgba(104,205,198,0.16)' },
  question: { fontSize: 21, lineHeight: 29, marginTop: 2 },
  options: { gap: 9 },
  option: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(179,224,226,0.3)', borderRadius: Radius.md, backgroundColor: 'rgba(22,72,81,0.78)' },
  optionText: { flex: 1 },
  letter: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(184,242,240,0.12)', alignItems: 'center', justifyContent: 'center' },
  letterCorrect: { backgroundColor: '#65E6AE' },
  correct: { borderColor: '#65E6AE', backgroundColor: 'rgba(51,155,113,0.24)' },
  incorrect: { borderColor: '#FFA1A8', backgroundColor: 'rgba(171,75,84,0.2)' },
  explanation: { borderTopWidth: 1, borderTopColor: 'rgba(179,224,226,0.25)', paddingTop: 13, gap: 5 },
  explanationText: { lineHeight: 21 },
  navigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42, marginTop: 2 },
  navButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8 },
  nextButton: { marginLeft: 'auto' },
  navText: { fontSize: 15, color: '#C5EFEB' },
  hint: { flex: 1, textAlign: 'right', fontSize: 11 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 },
  noteText: { flex: 1, lineHeight: 20 },
});
