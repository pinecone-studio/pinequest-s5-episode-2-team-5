import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PeriodicStudy } from '@/components/revision-hub/periodic-study';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';

export default function PeriodicScreen() {
  const insets = useSafeAreaInsets();
  return <LabBackground bubbles={0}>
    <ScreenHeader title="Үелэх хүснэгт" subtitle="Судлах • Ойлгох • Цээжлэх" onBack={() => router.canGoBack() ? router.back() : router.replace('/lessons')}/>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}><PeriodicStudy/></ScrollView>
  </LabBackground>;
}
const styles = StyleSheet.create({ content: { width: '100%', maxWidth: 1100, alignSelf: 'center', padding: 16, gap: 18 } });
