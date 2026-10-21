import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Colors, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { ChemClass } from '@/types';

import { AppText } from './app-text';
import { ClassMedallion } from './class-medallion';

interface ClassCardProps {
  chemClass: ChemClass;
  selected: boolean;
  onSelect: () => void;
}

/** Selectable class option on the sign-up screen. */
export function ClassCard({ chemClass, selected, onSelect }: ClassCardProps) {
  const { color } = chemClass;
  const scale = useSharedValue(1);
  const maxXp = chemClass.lessons.reduce((sum, l) => sum + l.xp, 0);

  useEffect(() => {
    scale.set(withSpring(selected ? 1.02 : 1, { damping: 14, stiffness: 220 }));
  }, [selected, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onSelect();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${chemClass.name}: ${chemClass.title}. ${chemClass.description}`}>
      <Animated.View
        style={[
          styles.card,
          animatedStyle,
          selected && { borderColor: color.main, backgroundColor: `${color.main}1F` },
        ]}>
        <ClassMedallion icon={chemClass.icon} color={color} size={58} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText variant="heading">{chemClass.name}</AppText>
            <View style={[styles.pill, { backgroundColor: `${color.main}2E` }]}>
              <AppText variant="caption" color={color.main} style={styles.pillText}>
                {chemClass.title}
              </AppText>
            </View>
          </View>
          <AppText variant="caption">{chemClass.description}</AppText>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="book-open-variant" size={14} color={Colors.textDim} />
            <AppText variant="caption" color={Colors.textDim}>
              {chemClass.lessons.length} lessons
            </AppText>
            <MaterialCommunityIcons name="star-four-points" size={13} color={Colors.textDim} />
            <AppText variant="caption" color={Colors.textDim}>
              up to {maxXp} XP
            </AppText>
          </View>
        </View>
        <View style={[styles.radio, selected && { borderColor: color.main, backgroundColor: color.main }]}>
          {selected && <MaterialCommunityIcons name="check-bold" size={14} color={color.ink} />}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 2.5,
    borderColor: Colors.border,
    backgroundColor: Colors.panel,
  },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 8, paddingVertical: 1, borderRadius: 999 },
  pillText: { fontSize: 12, lineHeight: 17 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
