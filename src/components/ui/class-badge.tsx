import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { getClass } from '@/data/classes';
import type { ClassId } from '@/types';

import { AppText } from './app-text';

interface ClassBadgeProps {
  classId: ClassId;
  size?: 'sm' | 'md';
}

export function ClassBadge({ classId, size = 'md' }: ClassBadgeProps) {
  const chemClass = getClass(classId);
  const small = size === 'sm';
  return (
    <View
      style={[
        styles.badge,
        small && styles.small,
        { backgroundColor: `${chemClass.color.main}26`, borderColor: `${chemClass.color.main}99` },
      ]}>
      <MaterialCommunityIcons name={chemClass.icon} size={small ? 11 : 14} color={chemClass.color.main} />
      <AppText variant="caption" color={chemClass.color.main} style={small ? styles.smallText : styles.text}>
        {chemClass.name}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  small: { paddingHorizontal: 6, paddingVertical: 1, gap: 3 },
  text: { fontSize: 13 },
  smallText: { fontSize: 11, lineHeight: 15 },
});
