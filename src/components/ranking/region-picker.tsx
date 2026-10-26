import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Colors, Fonts } from '@/constants/theme';
import { REGIONS_BY_TYPE } from '@/data/regions';
import { haptics } from '@/lib/haptics';
import type { RegionType } from '@/types';

export interface RegionSelection {
  type: RegionType;
  name: string;
}

export function RegionPicker({
  value,
  onChange,
}: {
  value: RegionSelection | null;
  onChange: (selection: RegionSelection) => void;
}) {
  const type: RegionType = value?.type ?? 'city';
  const regions = REGIONS_BY_TYPE[type];
  const scrollView = useRef<ScrollViewInstance | null>(null);
  const [scroll, setScroll] = useState({ offset: 0, viewport: 0, content: 0 });
  const maxOffset = Math.max(0, scroll.content - scroll.viewport);
  const canScrollBack = scroll.offset > 1;
  const canScrollForward = scroll.offset < maxOffset - 1;

  const scrollBy = (direction: -1 | 1) => {
    scrollView.current?.scrollTo({
      x: Math.max(0, Math.min(maxOffset, scroll.offset + direction * Math.max(160, scroll.viewport * 0.7))),
      animated: true,
    });
  };

  const updateOffset = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.x;
    setScroll((current) => (Math.abs(current.offset - offset) > 2 ? { ...current, offset } : current));
  };

  return (
    <View style={styles.container}>
      <View style={styles.types} accessibilityRole="tablist">
        {([
          { id: 'city', label: 'Хот' },
          { id: 'province', label: 'Аймаг' },
        ] as const).map((option) => {
          const active = type === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                haptics.select();
                scrollView.current?.scrollTo({ x: 0, animated: false });
                setScroll((current) => ({ ...current, offset: 0 }));
                onChange({ type: option.id, name: REGIONS_BY_TYPE[option.id][0] });
              }}
              style={[styles.type, active && styles.typeActive]}>
              <AppText style={[styles.typeText, active && styles.typeTextActive]}>{option.label}</AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.regionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Өмнөх хот, аймаг"
          accessibilityState={{ disabled: !canScrollBack }}
          disabled={!canScrollBack}
          onPress={() => scrollBy(-1)}
          style={[styles.arrow, !canScrollBack && styles.arrowDisabled]}>
          <MaterialCommunityIcons name="chevron-left" size={21} color={canScrollBack ? Colors.cyan : Colors.textDim} />
        </Pressable>
        <ScrollView
          ref={scrollView}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.regions}
          style={styles.regionScroll}
          onLayout={(event) => setScroll((current) => ({ ...current, viewport: event.nativeEvent.layout.width }))}
          onContentSizeChange={(content) => setScroll((current) => ({ ...current, content }))}
          onScroll={updateOffset}
          scrollEventThrottle={64}>
          {regions.map((name) => {
            const active = value?.type === type && value.name === name;
            return (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  haptics.select();
                  onChange({ type, name });
                }}
                style={[styles.region, active && styles.regionActive]}>
                <AppText style={[styles.regionText, active && styles.regionTextActive]}>{name}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Дараагийн хот, аймаг"
          accessibilityState={{ disabled: !canScrollForward }}
          disabled={!canScrollForward}
          onPress={() => scrollBy(1)}
          style={[styles.arrow, !canScrollForward && styles.arrowDisabled]}>
          <MaterialCommunityIcons name="chevron-right" size={21} color={canScrollForward ? Colors.cyan : Colors.textDim} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  types: { flexDirection: 'row', gap: 8 },
  type: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.panel,
  },
  typeActive: { backgroundColor: Colors.cyan, borderColor: Colors.cyan },
  typeText: { fontFamily: Fonts.bold, color: Colors.textMuted },
  typeTextActive: { color: Colors.night },
  regions: { gap: 8, paddingRight: 16 },
  regionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  regionScroll: { flex: 1, minWidth: 0 },
  arrow: {
    width: 30,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.panel,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  arrowDisabled: { opacity: 0.45 },
  region: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.panel,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  regionActive: { borderColor: Colors.lime, backgroundColor: `${Colors.lime}24` },
  regionText: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.textMuted },
  regionTextActive: { color: Colors.lime },
});
