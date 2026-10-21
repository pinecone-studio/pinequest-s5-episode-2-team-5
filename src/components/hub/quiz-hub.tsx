import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Radius } from '@/constants/theme';

const QUESTIONS = [
  { q: 'Усны химийн томьёо аль вэ?', options: ['CO₂', 'H₂O', 'O₂', 'NaCl'], answer: 1, note: 'Усны молекул хоёр устөрөгч, нэг хүчилтөрөгчөөс тогтоно.' },
  { q: 'Үелэх хүснэгтэд O тэмдэглэгээ юу вэ?', options: ['Алт', 'Хүчилтөрөгч', 'Осми', 'Устөрөгч'], answer: 1, note: 'O нь хүчилтөрөгчийн химийн тэмдэг.' },
  { q: 'pH 7-той уусмал ямар шинжтэй вэ?', options: ['Хүчиллэг', 'Суурилаг', 'Саармаг', 'Идэмхий'], answer: 2, note: '25 °C-д pH 7 нь саармаг орчин.' },
  { q: 'Хоолны давсны томьёо аль вэ?', options: ['NaCl', 'HCl', 'K₂O', 'NH₃'], answer: 0, note: 'Натрийн хлоридын томьёо NaCl.' },
];

export function QuizHub({ versus = false }: { versus?: boolean }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const question = QUESTIONS[index % QUESTIONS.length];
  const next = () => {
    setIndex((i) => i + 1);
    setPicked(null);
  };
  return (
    <LabBackground bubbles={7}>
      <ScreenHeader
        title={versus ? 'Versus Hub' : 'Friendly Hub'}
        subtitle={versus ? 'Хурдан бодлого • 30 XP-ийн төлөө' : 'Тайван хэмнэлээр бодлогоо давтаарай'}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {versus ? (
          <View style={[styles.banner, { borderColor: '#FF5C7A' }]}>
            <MaterialCommunityIcons name="sword-cross" size={27} color="#FF8296" />
            <View style={styles.bannerCopy}>
              <AppText variant="heading">Хурдан сорил</AppText>
              <AppText variant="caption">Зөв хариултаа сонгоод цувралаа ахиул. Одоогоор өрсөлдөгч холбох сервер алга.</AppText>
            </View>
          </View>
        ) : (
          <View style={[styles.banner, { borderColor: Colors.cyan }]}>
            <MaterialCommunityIcons name="heart-multiple" size={27} color={Colors.cyan} />
            <View style={styles.bannerCopy}>
              <AppText variant="heading">Chill горим</AppText>
              <AppText variant="caption">Оноо, цагийн дарамтгүйгээр химийн жижиг бодлогууд бодоорой.</AppText>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.meta}>
            <AppText variant="label" color={versus ? '#FF8296' : Colors.cyan}>БОДЛОГО {index + 1}</AppText>
            {versus && <AppText variant="label" color={Colors.gold}>ЗӨВ: {score}</AppText>}
          </View>
          <AppText variant="title" style={styles.question}>{question.q}</AppText>
          {question.options.map((option, i) => {
            const selected = picked === i;
            const correct = picked !== null && i === question.answer;
            return (
              <Pressable
                key={option}
                disabled={picked !== null}
                onPress={() => {
                  setPicked(i);
                  if (i === question.answer) setScore((s) => s + 1);
                }}
                style={[styles.option, correct && styles.correct, selected && !correct && styles.incorrect]}>
                <AppText variant="bodyStrong">{option}</AppText>
                {correct && <MaterialCommunityIcons name="check-circle" size={21} color={Colors.success} />}
                {selected && !correct && <MaterialCommunityIcons name="close-circle" size={21} color={Colors.danger} />}
              </Pressable>
            );
          })}
          {picked !== null && (
            <View style={styles.feedback}>
              <AppText variant="bodyStrong" color={picked === question.answer ? Colors.success : Colors.gold}>
                {picked === question.answer ? 'Зөв!' : 'Дараагийнх дээр дахиад үзээрэй'}
              </AppText>
              <AppText variant="caption">{question.note}</AppText>
              <Pressable onPress={next} style={styles.next} accessibilityRole="button">
                <AppText variant="button" color={Colors.lime}>Дараагийн бодлого  →</AppText>
              </Pressable>
            </View>
          )}
        </View>
        <AppText variant="caption" align="center" style={styles.footer}>
          {versus ? '30 XP шилжүүлэлт нь бодит тоглогчтой серверийн тоглолт холбогдсоны дараа ажиллана.' : 'Буруу хариулт бүр тайлбартай — хүссэн үедээ дараагийнх руу орж болно.'}
        </AppText>
      </ScrollView>
    </LabBackground>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: 18, paddingBottom: 36, gap: 18 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderWidth: 2, borderRadius: Radius.lg, backgroundColor: 'rgba(34,26,94,0.82)' },
  bannerCopy: { flex: 1, gap: 4 },
  card: { borderWidth: 2, borderColor: Colors.border, borderRadius: Radius.xl, padding: 18, backgroundColor: 'rgba(26,19,80,0.94)', gap: 11 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  question: { marginBottom: 8 },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderWidth: 2, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.panel, gap: 8 },
  correct: { borderColor: Colors.success, backgroundColor: 'rgba(74,222,128,0.15)' },
  incorrect: { borderColor: Colors.danger, backgroundColor: 'rgba(255,107,129,0.12)' },
  feedback: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 5, paddingTop: 14, gap: 7 },
  next: { alignSelf: 'flex-end', paddingVertical: 7, paddingHorizontal: 4 },
  footer: { paddingHorizontal: 8, lineHeight: 21 },
});
