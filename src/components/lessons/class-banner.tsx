import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { ClassMedallion } from '@/components/ui/class-medallion';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Fonts, Radius } from '@/constants/theme';
import type { ChemClass } from '@/types';

interface ClassBannerProps {
  chemClass: ChemClass;
  done: number;
  locked: boolean;
  /** Name of the class you must finish first, when locked. */
  unlockAfter?: string;
}

export function ClassBanner({ chemClass, done, locked, unlockAfter }: ClassBannerProps) {
  const { color } = chemClass;
  const total = chemClass.lessons.length;
  return (
    <LinearGradient
      colors={locked ? ['#4A4485', '#2E2963'] : [color.main, color.dark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.banner}>
      <MaterialCommunityIcons name={chemClass.icon} size={150} color="#FFFFFF" style={styles.watermark} />
      <View style={styles.row}>
        <ClassMedallion icon={locked ? 'lock' : chemClass.icon} color={color} size={64} dimmed={locked} />
        <View style={styles.titles}>
          <AppText variant="label" color={locked ? '#C9C4F0' : color.ink} style={styles.overline}>
            {chemClass.name} class
          </AppText>
          <AppText variant="title" color={locked ? '#FFFFFF' : color.ink}>
            {chemClass.title}
          </AppText>
        </View>
      </View>
      <AppText variant="bodyStrong" color={locked ? '#D9D5F5' : color.ink} style={styles.description}>
        {chemClass.description}
      </AppText>
      {locked ? (
        <View style={styles.lockRow}>
          <MaterialCommunityIcons name="lock" size={16} color="#FFFFFF" />
          <AppText style={styles.lockText}>Finish {unlockAfter ?? 'the previous class'} to unlock</AppText>
        </View>
      ) : (
        <View style={styles.progressRow}>
          <ProgressBar
            progress={done / total}
            height={12}
            colors={['#FFFFFF', '#FFFFFF']}
            track="rgba(0,0,0,0.18)"
            style={styles.flex}
          />
          <AppText style={[styles.progressText, { color: color.ink }]}>
            {done}/{total}
          </AppText>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: { gap: 12, padding: 18, borderRadius: Radius.xl, overflow: 'hidden' },
  watermark: { position: 'absolute', right: -24, top: -20, opacity: 0.14, transform: [{ rotate: '-14deg' }] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  titles: { flex: 1 },
  overline: { opacity: 0.85 },
  description: { fontSize: 15, lineHeight: 21, opacity: 0.92 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  progressText: { fontFamily: Fonts.bold, fontSize: 15 },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  lockText: { fontFamily: Fonts.semibold, fontSize: 14, color: '#FFFFFF' },
});
