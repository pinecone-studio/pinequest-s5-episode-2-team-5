import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors, Radius } from '@/constants/theme';
import {
  dependentSchools,
  dependentSoums,
  validateLocation,
  type LocationDraft,
  type LocationOptions,
  type LocationProfile,
  type RegionType,
} from '@/data/location';
import { fetchLocationOptions } from '@/services/location';

interface LocationSchoolFormProps {
  initial?: LocationProfile | null;
  onSave: (draft: LocationDraft) => void;
  saving?: boolean;
  saveLabel?: string;
}

export function LocationSchoolForm({
  initial,
  onSave,
  saving = false,
  saveLabel = 'Хадгалах',
}: LocationSchoolFormProps) {
  const [options, setOptions] = useState<LocationOptions | null>(null);
  const [region, setRegion] = useState<RegionType | null>(initial?.region_type ?? null);
  const [district, setDistrict] = useState(initial?.district_id ?? null);
  const [aimag, setAimag] = useState(initial?.aimag_id ?? null);
  const [soum, setSoum] = useState(initial?.soum_id ?? null);
  const [school, setSchool] = useState(initial?.school_id ?? null);
  const [other, setOther] = useState(initial?.school_other ?? '');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    void fetchLocationOptions()
      .then((value) => { if (live) setOptions(value); })
      .catch((cause: unknown) => { if (live) setError(cause instanceof Error ? cause.message : 'Байршлын жагсаалтыг ачаалж чадсангүй.'); });
    return () => { live = false; };
  }, []);

  const soums = useMemo(() => dependentSoums(options?.soums ?? [], aimag), [options, aimag]);
  const schools = useMemo(() => dependentSchools(options?.schools ?? [], region ?? 'ulaanbaatar', aimag, soum, district)
    .filter((item) => !search || item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())),
  [options, region, aimag, soum, district, search]);

  const chooseRegion = (value: RegionType) => {
    setRegion(value);
    setDistrict(null);
    setAimag(null);
    setSoum(null);
    setSchool(null);
    setOther('');
    setSearch('');
    setError('');
  };

  const submit = () => {
    if (!region) { setError('Байршлын төрлөө сонгоно уу.'); return; }
    const draft: LocationDraft = {
      region_type: region,
      district_id: region === 'ulaanbaatar' ? district : null,
      aimag_id: region === 'rural' ? aimag : null,
      soum_id: region === 'rural' ? soum : null,
      school_id: other.trim() ? null : school,
      school_other: other.trim() || null,
    };
    const message = validateLocation(draft);
    if (message) { setError(message); return; }
    setError('');
    onSave(draft);
  };

  return (
    <View style={styles.form}>
      <AppText variant="label">Байршлын төрөл *</AppText>
      <View style={styles.row} accessibilityRole="radiogroup">
        {(['ulaanbaatar', 'rural'] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ selected: region === value }}
            onPress={() => chooseRegion(value)}
            style={[styles.choice, region === value && styles.selected]}>
            <AppText variant="bodyStrong">{value === 'ulaanbaatar' ? 'Улаанбаатар хот' : 'Орон нутаг'}</AppText>
          </Pressable>
        ))}
      </View>

      {region === 'ulaanbaatar' && (
        <Select
          label="Дүүрэг *"
          items={(options?.districts ?? []).map(({ id, name }) => ({ id, name }))}
          value={district}
          disabled={!options}
          onSelect={(id) => { setDistrict(id); setSchool(null); setOther(''); setSearch(''); }}
        />
      )}
      {region === 'rural' && <>
        <Select label="Аймаг *" items={(options?.aimags ?? []).map(({ id, name }) => ({ id, name }))} value={aimag} disabled={!options}
          onSelect={(id) => { setAimag(id); setSoum(null); setSchool(null); setOther(''); setSearch(''); }} />
        <Select label="Сум *" items={soums.map(({ id, name }) => ({ id, name }))} value={soum} disabled={!aimag}
          onSelect={(id) => { setSoum(id); setSchool(null); setOther(''); setSearch(''); }} />
      </>}

      <AppText variant="label">Сургууль *</AppText>
      <TextInput accessibilityLabel="Сургууль хайх" placeholder="Сургуулийн нэрээр хайх" placeholderTextColor={Colors.textDim}
        value={search} onChangeText={(value) => { setSearch(value); setSchool(null); setOther(''); }} style={styles.input} />
      {!options && <AppText variant="caption">Жагсаалт ачаалж байна…</AppText>}
      <ScrollView style={styles.options} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {schools.map((item) => (
          <Pressable key={item.id} onPress={() => { setSchool(item.id); setOther(''); }} style={[styles.option, school === item.id && styles.selected]}>
            <AppText variant="body">{item.name}{item.is_sample ? ' · жишээ өгөгдөл' : ''}</AppText>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable onPress={() => { setSchool(null); setOther(other || search); }} style={[styles.option, other !== '' && styles.selected]}>
        <AppText variant="bodyStrong">Бусад — нэрээ бичих</AppText>
      </Pressable>
      {other !== '' && <TextInput accessibilityLabel="Сургуулийн нэр" placeholder="Сургуулийн нэр" placeholderTextColor={Colors.textDim}
        value={other} onChangeText={setOther} style={styles.input} />}
      {!!error && <AppText variant="caption" color={Colors.danger}>{error}</AppText>}
      <GameButton title={saveLabel} icon="content-save" loading={saving} onPress={submit} />
    </View>
  );
}

function Select({ label, items, value, disabled, onSelect }: {
  label: string;
  items: { id: string; name: string }[];
  value: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const [shown, setShown] = useState(false);
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      <Pressable disabled={disabled} onPress={() => setShown((current) => !current)} style={[styles.option, disabled && styles.disabled]}>
        <AppText variant="body">{items.find((item) => item.id === value)?.name ?? 'Сонгоно уу'} ▾</AppText>
      </Pressable>
      {shown && <ScrollView style={styles.options} nestedScrollEnabled>{items.map((item) => (
        <Pressable key={item.id} onPress={() => { onSelect(item.id); setShown(false); }} style={styles.option}>
          <AppText variant="body">{item.name}</AppText>
        </Pressable>
      ))}</ScrollView>}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  choice: { minHeight: 52, flex: 1, justifyContent: 'center', alignItems: 'center', padding: 10, borderRadius: Radius.md, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.panel },
  selected: { borderColor: Colors.lime, backgroundColor: '#263A40' },
  field: { gap: 8 },
  option: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.panel },
  options: { maxHeight: 200, borderRadius: Radius.md },
  input: { minHeight: 52, paddingHorizontal: 14, borderRadius: Radius.md, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.input, color: Colors.text, fontSize: 16 },
  disabled: { opacity: 0.45 },
});
