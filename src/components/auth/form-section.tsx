import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Colors } from '@/constants/theme';
import type { IconName } from '@/types';

export function FormSection({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <MaterialCommunityIcons name={icon} size={18} color={Colors.cyan} />
        <AppText variant="label" color={Colors.cyan}>
          {title}
        </AppText>
        <View style={styles.rule} />
      </View>
      {children}
    </View>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <MaterialCommunityIcons name="alert-circle" size={20} color={Colors.danger} />
      <AppText variant="bodyStrong" color={Colors.text} style={styles.bannerText}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rule: { flex: 1, height: 2, borderRadius: 1, backgroundColor: 'rgba(61, 224, 245, 0.2)' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.danger,
    backgroundColor: 'rgba(255, 107, 129, 0.14)',
  },
  bannerText: { flex: 1, fontSize: 15 },
});
