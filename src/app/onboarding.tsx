import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { LocationSchoolForm } from '@/components/profile/location-school-form';
import { AppText } from '@/components/ui/app-text';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors } from '@/constants/theme';
import { useSession } from '@/context/session';
import type { LocationDraft } from '@/data/location';

export default function OnboardingScreen() {
  const { user, updateLocation } = useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const save = async (draft: LocationDraft) => {
    setSaving(true);
    setError('');
    try {
      await updateLocation(draft);
      router.replace('/');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Мэдээлэл хадгалж чадсангүй.');
      setSaving(false);
    }
  };

  return (
    <LabBackground bubbles={3}>
      <ScreenHeader title="Бүртгэлээ гүйцээх" subtitle="Байршил, сургуулиа оруулна уу" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.notice}>
          <AppText variant="body">Энэ мэдээлэл зөвхөн танд харагдана.</AppText>
        </View>
        {!!error && <AppText variant="caption" color={Colors.danger}>{error}</AppText>}
        <LocationSchoolForm
          initial={user.location}
          onSave={save}
          saving={saving}
          saveLabel="Үргэлжлүүлэх"
        />
      </ScrollView>
    </LabBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 18,
    paddingBottom: 40,
    gap: 12,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  notice: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.panel,
  },
});
