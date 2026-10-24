import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Colors } from '@/constants/theme';
import { getPack } from '@/data/revision-hub';
import type { Element } from '@/data/revision-hub/types';
import { periodicPosition } from '@/lib/revision-progress';
import { ELEMENT_CATEGORIES } from '@/lib/periodic-learning';

export const CATEGORY_COLORS: Record<Element['category'], string> = {
  am: Colors.gold, ae: Colors.bronze, tm: Colors.cyan, pt: Colors.silver, md: Colors.lime,
  nm: Colors.success, hl: Colors.danger, ng: Colors.textMuted, ln: Colors.cyanDark, an: Colors.indigo600,
};
export function PeriodicGrid({ selected, onSelect, group, onGroup, firstTwenty = false, mini = false, blank = false, eligible }: {
  selected?: Element; onSelect?: (z: number) => void; group?: number | null; onGroup?: (group: number) => void;
  firstTwenty?: boolean; mini?: boolean; blank?: boolean; eligible?: number[];
}) {
  const elements = getPack('g8-chem').elements;
  const size = mini ? 16 : 48;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const [viewport, setViewport] = useState(0);
  useEffect(() => {
    if (!selected || !viewport) return;
    const position = periodicPosition(selected);
    scroll.current?.scrollTo({ x: Math.max(0, Math.min(size * 19 - viewport, position.col * size - viewport / 2)), animated: false });
  }, [selected, size, viewport]);
  return <ScrollView ref={scroll} horizontal onLayout={({ nativeEvent }) => setViewport(nativeEvent.layout.width)} accessibilityLabel="Үелэх хүснэгтийг хөндлөн гүйлгэнэ" contentContainerStyle={{ paddingBottom: 8 }}>
    <View style={{ width: size * 19, height: size * 11 }}>
      {!mini && Array.from({ length: 18 }, (_, i) => <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${i + 1}-р бүлгийг тодруулах`} onPress={() => onGroup?.(i + 1)} disabled={!onGroup} style={{ position: 'absolute', top: 0, left: (i + 1) * size, width: size - 2, height: size - 2, alignItems: 'center', justifyContent: 'center', borderRadius: 6, backgroundColor: group === i + 1 ? Colors.indigo600 : 'transparent' }}><AppText color={group === i + 1 ? Colors.lime : Colors.textMuted}>{i + 1}</AppText></Pressable>)}
      {!mini && Array.from({ length: 7 }, (_, i) => <AppText key={i} align="center" color={selected?.period === i + 1 ? Colors.lime : Colors.textDim} style={{ position: 'absolute', left: 0, top: (i + 1) * size + 12, width: size }}>{i + 1}</AppText>)}
      {elements.map((element) => {
        const position = periodicPosition(element);
        const chosen = selected?.z === element.z;
        const sharedGroup = group != null ? group === element.group : selected?.group != null && selected.group === element.group;
        const sharedPeriod = selected?.period === element.period;
        const dim = firstTwenty && element.z > 20 || group != null && group !== element.group;
        const allowed = !eligible || eligible.includes(element.z);
        const label = blank ? `${position.row <= 7 ? `${element.period}-р үе, ${element.group}-р бүлэг` : `${element.fRow === 'ln' ? 'Лантаноид' : 'Актиноид'}, ${position.col - 3}-р нүд`}` : `${element.z} ${element.name}`;
        return <Pressable key={element.z} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: chosen, disabled: !allowed }} disabled={!allowed || !onSelect} onPress={() => onSelect?.(element.z)} style={{ position: 'absolute', left: position.col * size, top: position.row * size, width: size - 2, height: size - 2, borderRadius: mini ? 2 : 6, alignItems: 'center', justifyContent: 'center', backgroundColor: chosen ? Colors.lime : blank ? Colors.input : sharedGroup || sharedPeriod ? Colors.indigo700 : Colors.input, borderWidth: chosen ? 2 : 1, borderColor: chosen ? Colors.text : blank ? Colors.border : CATEGORY_COLORS[element.category], opacity: !allowed ? 0.2 : dim ? 0.35 : 1 }}>
          {!mini && (blank ? <AppText color={Colors.textDim}>?</AppText> : <><AppText variant="caption" color={chosen ? Colors.limeInk : Colors.textDim} style={{ fontSize: 9, lineHeight: 11 }}>{element.z}</AppText><AppText variant="bodyStrong" color={chosen ? Colors.limeInk : Colors.text}>{element.symbol}</AppText></>)}
        </Pressable>;
      })}
      {!mini && <><AppText variant="caption" style={{ position: 'absolute', left: size * 3, top: size * 6 }}>57–71 ↓</AppText><AppText variant="caption" style={{ position: 'absolute', left: size * 3, top: size * 7 }}>89–103 ↓</AppText><AppText variant="caption" style={{ position: 'absolute', top: size * 9 }}>Ln</AppText><AppText variant="caption" style={{ position: 'absolute', top: size * 10 }}>An</AppText></>}
    </View>
  </ScrollView>;
}
export function CategoryLegend() {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{Object.entries(ELEMENT_CATEGORIES).map(([category, label]) => <View key={category} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: CATEGORY_COLORS[category as Element['category']] }}/><AppText variant="caption">{label}</AppText></View>)}</View>;
}
