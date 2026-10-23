import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Colors, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

const tools = [
  { title: 'Давтлагын төв', description: 'Нэг сэдэв сонгоод, мэдлэгээ бататгая.', detail: 'Тэмдэглэл · Карт · Тест', icon: 'book-open-variant', color: Colors.lime, route: '/hub/g8-chem' },
  { title: 'Үелэх хүснэгт', description: 'Элементүүдийн холбоог олж, нүдээр тогтооё.', detail: '118 элемент · Электроны бүтэц', icon: 'periodic-table', color: Colors.cyan, route: '/periodic' },
  { title: 'Туршилтаар суралцах', description: 'Таамагла. Ажигла. Учрыг нь нээ.', detail: 'Катализатор · 5 алхам', icon: 'flask-outline', color: Colors.gold, route: '/lessons/catalyst' },
] as const;

/** Quiet optional discoveries after the main lesson path. */
export function StudyTools() {
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <AppText variant="heading">Цааш судалъя</AppText>
        <AppText variant="caption">Өөрийн хэмнэлээр нэг шинэ зүйл нээгээрэй.</AppText>
      </View>
      <View style={styles.list}>
        {tools.map((tool, index) => (
          <Pressable
            key={tool.route}
            accessibilityRole="button"
            accessibilityLabel={`${tool.title}. ${tool.description}`}
            accessibilityHint={tool.detail}
            onPress={() => { haptics.tap(); router.push(tool.route); }}
            style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && styles.pressed]}>
            <View style={styles.node}>
              <MaterialCommunityIcons name={tool.icon} size={25} color={tool.color} />
            </View>
            <View style={styles.copy}>
              <AppText variant="bodyStrong">{tool.title}</AppText>
              <AppText variant="caption" style={styles.description}>{tool.description}</AppText>
              <AppText variant="caption" color={Colors.textDim} style={styles.detail}>{tool.detail}</AppText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={21} color={Colors.textDim} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: Colors.border, gap: 16 },
  heading: { gap: 5 },
  list: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, backgroundColor: Colors.panel, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 18, minHeight: 96 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.border },
  pressed: { backgroundColor: Colors.panelRaised },
  node: { width: 46, height: 46, borderRadius: Radius.pill, backgroundColor: Colors.input, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  description: { fontSize: 12, lineHeight: 17 },
  detail: { fontSize: 11, lineHeight: 16 },
});
