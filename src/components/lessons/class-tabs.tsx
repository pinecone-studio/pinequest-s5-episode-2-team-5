import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { CLASSES } from '@/data/classes';
import { haptics } from '@/lib/haptics';
import { classProgress, isClassUnlocked } from '@/lib/progress';
import type { ClassId, User } from '@/types';

interface ClassTabsProps {
  user: User;
  selected: ClassId;
  onSelect: (id: ClassId) => void;
}

export function ClassTabs({ user, selected, onSelect }: ClassTabsProps) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {CLASSES.map((c) => {
        const active = c.id === selected;
        const locked = !isClassUnlocked(user, c.id);
        const { done, total } = classProgress(user, c);
        const ink = active ? c.color.ink : locked ? Colors.textDim : Colors.text;
        return (
          <Pressable
            key={c.id}
            onPress={() => {
              haptics.select();
              onSelect(c.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${c.name} class${locked ? ', locked' : `, ${done} of ${total} done`}`}
            style={[
              styles.tab,
              active && { backgroundColor: c.color.main, borderColor: c.color.dark, borderBottomColor: c.color.dark },
            ]}>
            <View style={styles.tabTop}>
              <MaterialCommunityIcons
                name={locked ? 'lock' : c.icon}
                size={16}
                color={active ? c.color.ink : locked ? Colors.textDim : c.color.main}
              />
              <AppText style={[styles.label, { color: ink }]}>{c.name}</AppText>
            </View>
            <AppText style={[styles.count, { color: active ? c.color.ink : Colors.textDim }]}>
              {locked ? 'Locked' : `${done}/${total}`}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: Colors.border,
    borderBottomColor: Colors.night,
    backgroundColor: Colors.panel,
  },
  tabTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontFamily: Fonts.bold, fontSize: 15, lineHeight: 20 },
  count: { fontFamily: Fonts.semibold, fontSize: 12, lineHeight: 16 },
});
