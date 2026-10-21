import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

import { AppText } from './app-text';

/** Compact "⚡ 340 XP" pill. */
export function XpChip({ xp, prefix = '' }: { xp: number; prefix?: string }) {
  return (
    <View style={styles.chip} accessibilityLabel={`${prefix}${xp} XP`}>
      <MaterialCommunityIcons name="lightning-bolt" size={15} color={Colors.gold} />
      <AppText style={styles.text}>
        {prefix}
        {xp}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 7,
    paddingRight: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255, 201, 60, 0.45)',
    backgroundColor: 'rgba(255, 201, 60, 0.14)',
  },
  text: { fontFamily: Fonts.bold, fontSize: 14, lineHeight: 18, color: Colors.gold },
});
