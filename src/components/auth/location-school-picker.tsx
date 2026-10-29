import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { SelectField, type SelectOption } from '@/components/ui/select-field';
import { Colors } from '@/constants/theme';
import { CITY_REGIONS, PROVINCE_REGIONS } from '@/data/regions';
import { districtOf, schoolNumbers } from '@/lib/school-district';
import { supabase } from '@/lib/supabase';
import type { RegionSelection, RegionType } from '@/types';

interface School {
  id: string;
  name: string;
  /** "Батцэнгэл сум", "Сүхбаатар дүүрэг" … when the name carries one. */
  district: string | null;
  /** Its number in digits, so "25" finds "хорин тав дугаар". */
  numbers: string;
}

const ALL = 'all';
const OTHER = 'other';

const REGION_OPTIONS: SelectOption[] = [
  ...CITY_REGIONS.map((name) => ({ value: `city:${name}`, label: name, section: 'Хот' })),
  ...PROVINCE_REGIONS.map((name) => ({ value: `province:${name}`, label: name, section: 'Аймаг' })),
];

/**
 * Sign-up location as three dropdowns: хот / аймаг, an optional сум / дүүрэг filter (read
 * from the school names, shown only when the region has several), and the school.
 */
export function LocationSchoolPicker({
  region,
  schoolId,
  onRegionChange,
  onSchoolChange,
  regionError,
  schoolError,
}: {
  region: RegionSelection | null;
  schoolId: string | null;
  onRegionChange: (selection: RegionSelection) => void;
  onSchoolChange: (schoolId: string | null) => void;
  regionError?: string | null;
  schoolError?: string | null;
}) {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [district, setDistrict] = useState(ALL);
  const regionType = region?.type;
  const regionName = region?.name;

  useEffect(() => {
    let active = true;
    if (!regionType || !regionName) return () => { active = false; };

    void Promise.resolve()
      .then(() => {
        if (active) {
          setSchools([]);
          setLoading(true);
          setLoadError(null);
        }
        return supabase
          .from('schools')
          .select('id, name')
          .eq('region_type', regionType)
          .eq('region_name', regionName)
          .eq('is_active', true)
          .order('name');
      })
      .then(({ data, error }) => {
        if (!active) return;
        const rows = (data ?? []) as { id: string; name: string }[];
        setSchools(rows.map((s) => ({ ...s, district: districtOf(s.name), numbers: schoolNumbers(s.name).join(' ') })));
        setLoadError(error ? schoolLoadError(error.code) : null);
        setLoading(false);
      });

    return () => { active = false; };
  }, [regionType, regionName, retryCount]);

  const districtOptions = useMemo(() => {
    const counts = new Map<string, number>();
    let other = 0;
    for (const school of schools) {
      if (school.district) counts.set(school.district, (counts.get(school.district) ?? 0) + 1);
      else other++;
    }
    if (counts.size < 2) return null;
    const options: SelectOption[] = [
      { value: ALL, label: 'Бүгд', detail: `${schools.length} сургууль` },
      ...[...counts]
        .sort(([a], [b]) => a.localeCompare(b, 'mn'))
        .map(([name, count]) => ({ value: name, label: name, detail: `${count} сургууль` })),
    ];
    if (other) options.push({ value: OTHER, label: 'Бусад', detail: `${other} сургууль · нэрэндээ сум, дүүрэггүй` });
    return options;
  }, [schools]);

  const visibleSchools = useMemo(
    () => schools.filter((s) => district === ALL || (district === OTHER ? !s.district : s.district === district)),
    [schools, district],
  );
  const schoolOptions = useMemo<SelectOption[]>(
    () => visibleSchools.map((s) => ({ value: s.id, label: s.name, detail: district === ALL ? s.district ?? undefined : undefined, keywords: s.numbers })),
    [visibleSchools, district],
  );

  const chooseDistrict = (value: string) => {
    setDistrict(value);
    const stillListed = value === ALL || schools.some((s) => s.id === schoolId && (value === OTHER ? !s.district : s.district === value));
    if (schoolId && !stillListed) onSchoolChange(null);
  };

  const schoolPlaceholder = !region
    ? 'Эхлээд хот эсвэл аймгаа сонгоно уу'
    : !loading && !loadError && schools.length === 0
      ? 'Энэ байршилд сургууль бүртгэгдээгүй байна'
      : 'Сургуулиа сонгоно уу';

  return (
    <View style={styles.container}>
      <SelectField
        label="Хот / Аймаг"
        icon="map-marker"
        placeholder="Хот эсвэл аймгаа сонгоно уу"
        options={REGION_OPTIONS}
        value={region ? `${region.type}:${region.name}` : null}
        onChange={(value) => {
          const [type, ...rest] = value.split(':');
          setDistrict(ALL);
          onRegionChange({ type: type as RegionType, name: rest.join(':') });
        }}
        searchPlaceholder="Хот, аймгийн нэрээр хайх…"
        error={regionError}
        hint="Чансааг хот, аймгаар ангилахад ашиглана."
      />
      {districtOptions && (
        <SelectField
          label="Сум / Дүүрэг"
          icon="map-marker-radius"
          placeholder="Бүгд"
          options={districtOptions}
          value={district}
          onChange={chooseDistrict}
          searchPlaceholder="Сум, дүүргийн нэрээр хайх…"
          hint="Заавал биш: сургуулийн жагсаалтыг богиносгоно."
        />
      )}
      <SelectField
        label="Сургууль"
        icon="school"
        placeholder={schoolPlaceholder}
        options={schoolOptions}
        value={schoolId}
        onChange={(id) => onSchoolChange(id)}
        disabled={!region || schools.length === 0}
        loadingText={loading ? 'Сургуулийн жагсаалт ачаалж байна…' : undefined}
        searchPlaceholder="Нэр эсвэл дугаараар хайх (жишээ нь 25)…"
        error={schoolError}
        hint={region && schools.length ? `${visibleSchools.length} сургууль · нэр эсвэл дугаараар нь хайж болно` : undefined}
      />
      {loadError && (
        <View style={styles.errorBox}>
          <AppText variant="caption" color={Colors.danger}>{loadError}</AppText>
          <Pressable accessibilityRole="button" onPress={() => setRetryCount((count) => count + 1)}>
            <AppText variant="caption" color={Colors.cyan}>Дахин ачаалах</AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function schoolLoadError(code?: string) {
  if (code === '42P01' || code === 'PGRST205') {
    return "Supabase API public.schools хүснэгтийг харахгүй байна. 202610260002_schools.sql амжилттай ажилласныг шалгаад, SQL Editor дээр NOTIFY pgrst, 'reload schema'; ажиллуулаарай.";
  }
  if (code === '42501' || code === 'PGRST301') {
    return 'Сургуулийн жагсаалтыг унших эрх олгогдоогүй байна. schools хүснэгтийн RLS болон SELECT эрхийг шалгана уу.';
  }
  return 'Сургуулийн жагсаалтыг ачаалж чадсангүй. Холболтоо шалгаад дахин оролдоно уу.';
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  errorBox: { gap: 6 },
});
