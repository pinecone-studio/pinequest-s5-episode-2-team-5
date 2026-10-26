import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Radius } from '@/constants/theme';

export default function StudyHubScreen() {
  return (
    <LabBackground bubbles={4}>
      <ScreenHeader title="Study Hub" subtitle="Нэг холимог сорилоор мэдлэгээ шалга" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <View style={styles.icon}><MaterialCommunityIcons name="sword-cross" size={30} color={Colors.lime} /></View>
          <AppText variant="heading" align="center">Онол + Бодлого</AppText>
          <AppText variant="caption" align="center">Хичээлийн онолын асуултууд болон бодлогууд Versus Hub-ийн тулаанд хольж гарна.</AppText>
        </View>
        <Pressable onPress={() => router.push('/versus')} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
          <View style={styles.actionIcon}><MaterialCommunityIcons name="sword-cross" size={25} color={Colors.night} /></View>
          <View style={styles.actionCopy}>
            <AppText variant="bodyStrong" color={Colors.night}>Versus Hub нээх</AppText>
            <AppText variant="caption" color={Colors.night}>Хольсон бодлогуудтай тулаанаа эхлүүл</AppText>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={25} color={Colors.night} />
        </Pressable>
      </ScrollView>
    </LabBackground>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center', justifyContent: 'center', padding: 18, paddingBottom: 38, gap: 16 },
  intro: { alignItems: 'center', gap: 12, padding: 22, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'rgba(26,19,80,0.92)' },
  icon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(181,242,61,0.14)' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, minHeight: 84, borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.lime, backgroundColor: Colors.lime },
  actionPressed: { opacity: 0.82 },
  actionIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,18,37,0.12)' },
  actionCopy: { flex: 1, gap: 4 },
});
