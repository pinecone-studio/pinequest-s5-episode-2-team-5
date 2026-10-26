import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Colors, Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { RegionSelection } from '@/components/ranking/region-picker';

interface SchoolOption {
  id: string;
  name: string;
}

export function SchoolPicker({
  region,
  value,
  onChange,
}: {
  region: RegionSelection | null;
  value: string | null;
  onChange: (schoolId: string) => void;
}) {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const regionType = region?.type;
  const regionName = region?.name;

  useEffect(() => {
    let active = true;
    if (!regionType || !regionName) return () => { active = false; };

    void Promise.resolve()
      .then(() => {
        if (active) {
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
        setSchools((data ?? []) as SchoolOption[]);
        setLoadError(error ? schoolLoadError(error.code) : null);
        setLoading(false);
      });

    return () => { active = false; };
  }, [regionType, regionName, retryCount]);

  return (
    <View style={styles.container}>
      <AppText variant="caption" color={Colors.textMuted}>Сургууль</AppText>
      {!region ? (
        <AppText variant="caption">Эхлээд хот эсвэл аймгаа сонгоно уу.</AppText>
      ) : loading ? (
        <AppText variant="caption">Сургуулийн жагсаалт ачаалж байна…</AppText>
      ) : loadError ? (
        <View style={styles.errorBox}>
          <AppText variant="caption" color={Colors.danger}>{loadError}</AppText>
          <Pressable accessibilityRole="button" onPress={() => setRetryCount((count) => count + 1)}>
            <AppText variant="caption" color={Colors.cyan}>Дахин ачаалах</AppText>
          </Pressable>
        </View>
      ) : schools.length === 0 ? (
        <AppText variant="caption">Энэ байршлын сургуулийн жагсаалт хараахан нэмэгдээгүй байна.</AppText>
      ) : (
        <View style={styles.options} accessibilityRole="radiogroup">
          {schools.map((school) => {
            const selected = value === school.id;
            return (
              <Pressable
                key={school.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onChange(school.id)}
                style={[styles.option, selected && styles.optionSelected]}>
                <AppText style={[styles.optionText, selected && styles.optionTextSelected]}>{school.name}</AppText>
              </Pressable>
            );
          })}
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
  container: { gap: 8, paddingHorizontal: 16, paddingTop: 4 },
  errorBox: { gap: 6 },
  options: { gap: 8 },
  option: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.panel,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },
  optionSelected: { borderColor: Colors.lime, backgroundColor: `${Colors.lime}24` },
  optionText: { color: Colors.textMuted, fontFamily: Fonts.semibold },
  optionTextSelected: { color: Colors.lime },
});
