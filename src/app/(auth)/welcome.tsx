import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeroLab } from '@/components/auth/hero-lab';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { LabBackground } from '@/components/ui/lab-background';
import { APP_NAME, Colors } from '@/constants/theme';
import type { IconName } from '@/types';

const FEATURES: { icon: IconName; color: string; text: string }[] = [
  { icon: 'account-group', color: Colors.cyan, text: 'Олон тоглогчтой кампусаар чөлөөтэй алхаарай' },
  { icon: 'flask', color: Colors.lime, text: 'Лабораторийн хичээлээр хими сураарай' },
  { icon: 'trophy', color: Colors.gold, text: 'XP цуглуулж, нийт чансаанд дээшлээрэй' },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <LabBackground>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <HeroLab />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.titles}>
          <AppText variant="display" align="center">
            {APP_NAME}
          </AppText>
          <AppText variant="body" align="center">
            Дотор нь алхаж болох виртуал химийн лаборатори.
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).duration(500)} style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.feature}>
              <View style={[styles.featureIcon, { backgroundColor: `${f.color}24` }]}>
                <MaterialCommunityIcons name={f.icon} size={20} color={f.color} />
              </View>
              <AppText variant="bodyStrong" style={styles.featureText}>
                {f.text}
              </AppText>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(500)} style={styles.actions}>
          <GameButton title="Бүртгэл үүсгэх" icon="account-plus" onPress={() => router.push('/sign-up')} />
          <GameButton title="Би бүртгэлтэй" variant="secondary" size="md" onPress={() => router.push('/sign-in')} />
        </Animated.View>
      </ScrollView>
    </LabBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  titles: { gap: 6 },
  features: { gap: 10 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontSize: 15 },
  actions: { gap: 12 },
});
