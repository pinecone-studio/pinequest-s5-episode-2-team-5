import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
  type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvatarPreview } from '@/components/auth/avatar-preview';
import { FormError, FormSection } from '@/components/auth/form-section';
import { LocationSchoolPicker } from '@/components/auth/location-school-picker';
import type { RegionSelection } from '@/components/ranking/region-picker';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Colors, Fonts } from '@/constants/theme';
import { useSession } from '@/context/session';
import { haptics } from '@/lib/haptics';
import {
  NICKNAME_MAX,
  passwordStrength,
  validateEmail,
  validateNickname,
  validatePassword,
} from '@/lib/validation';
import { AuthError, isNicknameAvailable, type AuthField } from '@/services/auth';
import type { ClassId } from '@/types';

type Field = AuthField | 'region' | 'school';

const STRENGTH = [
  { label: '', color: Colors.border },
  { label: 'Сул', color: Colors.danger },
  { label: 'Дунд', color: Colors.gold },
  { label: 'Хүчтэй', color: Colors.success },
];

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useSession();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const nicknameRef = useRef<TextInputInstance>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const classId: ClassId = 'beginner';
  const [region, setRegion] = useState<RegionSelection | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<{ field?: AuthField; message: string } | null>(null);

  const errors: Record<Field, string | null> = {
    email: validateEmail(email),
    password: validatePassword(password),
    nickname: validateNickname(nickname),
    region: region ? null : 'Хот эсвэл аймгаа сонгоно уу',
    school: schoolId ? null : 'Сургуулиа сонгоно уу',
  };

  const errorFor = (field: Field) => {
    if (serverError?.field === field) return serverError.message;
    return touched[field] || submitted ? errors[field] : null;
  };

  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));
  const checkNickname = async () => {
    touch('nickname');
    if (validateNickname(nickname)) return;
    if (!(await isNicknameAvailable(nickname))) {
      setServerError({ field: 'nickname', message: 'Энэ хоч нэрийг өөр хүн авсан байна' });
    }
  };
  const clearServerError = (field: AuthField) => {
    if (serverError?.field === field) setServerError(null);
  };

  const submit = async () => {
    setSubmitted(true);
    if (!region || !schoolId || Object.values(errors).some(Boolean)) {
      haptics.error();
      if (errors.email || errors.password || errors.nickname) scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      await signUp({ email, password, nickname, classId, regionType: region.type, regionName: region.name, schoolId });
      haptics.success();
      // The auth guard swaps this screen for the hub once the session exists.
    } catch (error) {
      haptics.error();
      setServerError(
        error instanceof AuthError
          ? { field: error.field, message: error.message }
          : { message: 'Алдаа гарлаа. Дахин оролдоно уу.' },
      );
      setSubmitting(false);
    }
  };

  const strength = STRENGTH[passwordStrength(password)];

  return (
    <LabBackground bubbles={6}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title="Эрдэмтнээ бүтээ" subtitle="Нэг минут ч хүрэхгүй" />
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <AvatarPreview nickname={nickname} classId={classId} />

          <FormSection title="Бүртгэл" icon="shield-account">
            <TextField
              label="Имэйл"
              icon="email-outline"
              placeholder="example@gmail.com"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                clearServerError('email');
              }}
              onBlur={() => touch('email')}
              error={errorFor('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              submitBehavior="submit"
            />
            <TextField
              ref={passwordRef}
              label="Нууц үг"
              icon="lock-outline"
              placeholder="Дор хаяж 8 тэмдэгт"
              value={password}
              onChangeText={setPassword}
              onBlur={() => touch('password')}
              error={errorFor('password')}
              hint="Үсэг, тоо холисон 8-аас доошгүй тэмдэгт ашиглана уу"
              password
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="next"
              onSubmitEditing={() => nicknameRef.current?.focus()}
              submitBehavior="submit"
              footer={
                password ? (
                  <View style={styles.strengthRow}>
                    {[1, 2, 3].map((level) => (
                      <View
                        key={level}
                        style={[
                          styles.strengthBar,
                          { backgroundColor: passwordStrength(password) >= level ? strength.color : Colors.border },
                        ]}
                      />
                    ))}
                    <AppText variant="caption" color={strength.color} style={styles.strengthLabel}>
                      {strength.label}
                    </AppText>
                  </View>
                ) : null
              }
            />
          </FormSection>

          <FormSection title="Таны эрдэмтэн" icon="account-outline">
            <TextField
              ref={nicknameRef}
              label="Хоч нэр"
              icon="account-outline"
              placeholder="жишээ нь: AtomAce"
              value={nickname}
              onChangeText={(v) => {
                setNickname(v);
                clearServerError('nickname');
              }}
              onBlur={checkNickname}
              error={errorFor('nickname')}
              hint={`Дүрийн тань дээр болон чансаанд харагдана · ${nickname.trim().length}/${NICKNAME_MAX}`}
              maxLength={NICKNAME_MAX}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="done"
            />
          </FormSection>

          <FormSection title="Байршил" icon="map-marker">
            <LocationSchoolPicker
              region={region}
              schoolId={schoolId}
              onRegionChange={(selection) => {
                setRegion(selection);
                setSchoolId(null);
                touch('region');
              }}
              onSchoolChange={(id) => {
                setSchoolId(id);
                touch('school');
              }}
              regionError={errorFor('region')}
              schoolError={errorFor('school')}
            />
          </FormSection>

          {serverError && !serverError.field && <FormError message={serverError.message} />}

          <GameButton title="Адал явдлаа эхлүүлэх" icon="rocket-launch" loading={submitting} onPress={submit} />

          <View style={styles.switchRow}>
            <AppText variant="body">Бүртгэлтэй юу?</AppText>
            <Pressable onPress={() => router.replace('/sign-in')} hitSlop={10} accessibilityRole="link">
              <AppText variant="bodyStrong" color={Colors.lime} style={styles.link}>
                Нэвтрэх
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LabBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    gap: 26,
    paddingHorizontal: 20,
    paddingTop: 4,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  strengthBar: { flex: 1, height: 6, borderRadius: 3 },
  strengthLabel: { width: 60, textAlign: 'right' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  link: { fontFamily: Fonts.bold },
});
