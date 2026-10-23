import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Radius } from '@/constants/theme';

export default function LessonsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <LabBackground bubbles={3}>
      <ScreenHeader title="Хичээлийн танхим" subtitle="Суралцах хэлбэрээ сонгоорой" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={[styles.card, styles.primary]}>
          <AppText variant="label" color={Colors.lime}>Хими 8 • Давтлагын төв</AppText>
          <AppText variant="title">Сэдвээр давтаж, мэдлэгээ шалгаарай</AppText>
          <AppText>Бүлэг, сэдвээр ангилсан тэмдэглэл, флэшкарт, тест, онооны схемтэй асуултууд.</AppText>
          <View style={styles.badges}>
            {['11 сэдэв', '40 тэмдэглэл', '106 карт', '79 тест'].map((text) => (
              <View key={text} style={styles.badge}><AppText variant="caption">{text}</AppText></View>
            ))}
          </View>
          <GameButton title="Давтлагын төв нээх" icon="book-open-variant" onPress={() => router.push('/hub/g8-chem')} />
        </View>
        <View style={styles.card}>
          <AppText variant="label" color={Colors.cyan}>Элементүүдийг нүдээр тогтооё</AppText>
          <AppText variant="heading">Үелэх хүснэгтийн ертөнц</AppText>
          <AppText>118 элемент, бүлэг ба үе, электроны цагираг, зурагтай санах холбоос. Эхний 20-оос эхэлж өөрийгөө шалгаарай.</AppText>
          <GameButton title="Үелэх хүснэгт судлах" variant="secondary" size="md" icon="periodic-table" onPress={() => router.push('/periodic')} />
        </View>
        <View style={styles.card}>
          <AppText variant="heading">Туршилтаар суралцах</AppText>
          <AppText>Катализаторын нөлөө: таамаглах, ажиглах, тайлбарлах 5 алхамт хичээл.</AppText>
          <GameButton title="Туршилтын хичээл нээх" variant="secondary" size="md" icon="flask-outline" onPress={() => router.push('/lessons/catalyst')} />
        </View>
        <View style={styles.card}>
          <AppText variant="heading">Суурь хичээлүүд</AppText>
          <AppText>Анхан, дунд, ахисан түвшний өмнөх хичээлийн зам. Од, XP, түвшний ахицаа үргэлжлүүлээрэй.</AppText>
          <GameButton title="Суурь хичээлүүд нээх" variant="secondary" size="md" icon="stairs" onPress={() => router.push('/lessons/basics')} />
        </View>
      </ScrollView>
    </LabBackground>
  );
}
const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 16, gap: 18 },
  card: { padding: 20, gap: 16, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, backgroundColor: Colors.panel },
  primary: { borderColor: Colors.lime },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.input },
});
