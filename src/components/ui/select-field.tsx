import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';

import { Colors, Fonts, Radius } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { matchesSearch } from '@/lib/school-district';
import type { IconName } from '@/types';

import { AppText } from './app-text';
import { BottomSheet } from './bottom-sheet';

export interface SelectOption {
  value: string;
  label: string;
  /** Second line under the label. */
  detail?: string;
  /** Consecutive options with the same section are listed under one heading. */
  section?: string;
  /** Extra text that search also matches (e.g. a school number in digits). */
  keywords?: string;
}

interface SelectFieldProps {
  label: string;
  icon: IconName;
  placeholder: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  disabled?: boolean;
  /** Shown in the field (which is then inactive) while the options load. */
  loadingText?: string;
  searchPlaceholder?: string;
}

type Row = { kind: 'section'; title: string } | { kind: 'option'; option: SelectOption };

/** A dropdown: the field shows the current choice and opens a searchable list in a bottom sheet. */
export function SelectField({ label, icon, placeholder, options, value, onChange, error, hint, disabled, loadingText, searchPlaceholder }: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const { height } = useWindowDimensions();
  const selected = options.find((option) => option.value === value) ?? null;
  const inactive = !!disabled || !!loadingText;

  const rows = useMemo(() => {
    const out: Row[] = [];
    let section: string | undefined;
    for (const option of options) {
      if (!matchesSearch(`${option.label} ${option.detail ?? ''} ${option.keywords ?? ''}`, query)) continue;
      if (option.section && option.section !== section) {
        section = option.section;
        out.push({ kind: 'section', title: section });
      }
      out.push({ kind: 'option', option });
    }
    return out;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const borderColor = error ? Colors.danger : open ? Colors.cyan : Colors.border;
  const iconColor = error ? Colors.danger : selected ? Colors.cyan : Colors.textDim;

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" color={Colors.textMuted}>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityHint="Жагсаалтаас сонгоно"
        accessibilityState={{ disabled: inactive, expanded: open }}
        disabled={inactive}
        onPress={() => setOpen(true)}
        style={[styles.field, { borderColor }, inactive && styles.fieldInactive]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
        <AppText numberOfLines={2} style={[styles.value, (!selected || loadingText) && styles.placeholder]}>
          {loadingText ?? selected?.label ?? placeholder}
        </AppText>
        <MaterialCommunityIcons name="chevron-down" size={22} color={Colors.textDim} />
      </Pressable>
      {error ? (
        <View style={styles.messageRow}>
          <MaterialCommunityIcons name="alert-circle-outline" size={15} color={Colors.danger} />
          <AppText variant="caption" color={Colors.danger}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" color={Colors.textDim}>
          {hint}
        </AppText>
      ) : null}

      <BottomSheet visible={open} onClose={close}>
        <AppText variant="heading">{label}</AppText>
        {options.length > 8 && (
          <View style={[styles.search, searchFocused && styles.searchFocused]}>
            <MaterialCommunityIcons name="magnify" size={20} color={Colors.textDim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder ?? 'Хайх…'}
              placeholderTextColor={Colors.textDim}
              selectionColor={Colors.cyan}
              autoCorrect={false}
              accessibilityLabel={`${label} хайх`}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={styles.searchInput}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Хайлтыг цэвэрлэх">
                <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textDim} />
              </Pressable>
            ) : null}
          </View>
        )}
        <FlatList
          data={rows}
          keyExtractor={(row) => (row.kind === 'section' ? `section:${row.title}` : row.option.value)}
          style={{ maxHeight: height * 0.55 }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          ListEmptyComponent={
            <AppText variant="caption" style={styles.empty}>
              «{query}» олдсонгүй
            </AppText>
          }
          renderItem={({ item }) =>
            item.kind === 'section' ? (
              <AppText variant="label" color={Colors.cyan} style={styles.section}>
                {item.title}
              </AppText>
            ) : (
              <OptionRow
                option={item.option}
                selected={item.option.value === value}
                onPress={() => {
                  haptics.select();
                  onChange(item.option.value);
                  close();
                }}
              />
            )
          }
        />
      </BottomSheet>
    </View>
  );
}

function OptionRow({ option, selected, onPress }: { option: SelectOption; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.optionPressed]}>
      <View style={styles.optionText}>
        <AppText variant="bodyStrong" color={selected ? Colors.lime : Colors.text}>
          {option.label}
        </AppText>
        {option.detail ? <AppText variant="caption">{option.detail}</AppText> : null}
      </View>
      {selected && <MaterialCommunityIcons name="check-circle" size={20} color={Colors.lime} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 2,
    backgroundColor: Colors.input,
  },
  fieldInactive: { opacity: 0.6 },
  value: { flex: 1, color: Colors.text, fontFamily: Fonts.medium, fontSize: 16, lineHeight: 20 },
  placeholder: { color: Colors.textDim },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.input,
  },
  searchFocused: { borderColor: Colors.cyan },
  // The box's own border shows focus; no extra browser outline inside it.
  searchInput: { flex: 1, height: '100%', color: Colors.text, fontFamily: Fonts.medium, fontSize: 15, outlineWidth: 0 },
  section: { paddingTop: 12, paddingBottom: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 6,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.panel,
  },
  optionSelected: { borderColor: Colors.lime, backgroundColor: `${Colors.lime}1F` },
  optionPressed: { backgroundColor: Colors.panelRaised },
  optionText: { flex: 1, gap: 2 },
  empty: { paddingVertical: 16, textAlign: 'center' },
});
