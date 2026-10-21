import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Colors, Fonts, Radius } from '@/constants/theme';
import type { IconName } from '@/types';

import { AppText } from './app-text';

interface StatTileProps {
  icon: IconName;
  label: string;
  value: string | number;
  color?: string;
}

export function StatTile({ icon, label, value, color = Colors.cyan }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <AppText style={styles.value}>{value}</AppText>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 12,
    borderRadius: Radius.md,
    backgroundColor: Colors.panel,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  value: { fontFamily: Fonts.bold, fontSize: 20, lineHeight: 25 },
  label: { fontSize: 12 },
});
