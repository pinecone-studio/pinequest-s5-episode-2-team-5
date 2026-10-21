import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/auth/form-section';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextField } from '@/components/ui/text-field';
import { Colors, Fonts } from '@/constants/theme';
import { useSession } from '@/context/session';
import { haptics } from '@/lib/haptics';
import { validateEmail } from '@/lib/validation';
import { AuthError } from '@/services/auth';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const passwordRef = useRef<TextInputInstance>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = submitted ? validateEmail(email) : null;
  const passwordError = submitted && !password ? 'Enter your password' : null;

  const submit = async () => {
    setSubmitted(true);
    if (validateEmail(email) || !password) {
      haptics.error();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
      haptics.success();
    } catch (e) {
      haptics.error();
      setError(e instanceof AuthError ? e.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <LabBackground bubbles={6}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScreenHeader title="Welcome back" subtitle="Your lab coat is waiting" />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="flask-round-bottom" size={56} color={Colors.lime} />
          </View>

          <TextField
            label="Email"
            icon="email-outline"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            error={emailError}
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
            label="Password"
            icon="lock-outline"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            password
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          {error && <FormError message={error} />}

          <GameButton title="Sign in" icon="login" loading={submitting} onPress={submit} />

          <View style={styles.switchRow}>
            <AppText variant="body">New here?</AppText>
            <Pressable onPress={() => router.replace('/sign-up')} hitSlop={10} accessibilityRole="link">
              <AppText variant="bodyStrong" color={Colors.lime} style={styles.link}>
                Create an account
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
    gap: 22,
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  badge: {
    alignSelf: 'center',
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(181, 242, 61, 0.45)',
    backgroundColor: 'rgba(181, 242, 61, 0.12)',
    marginBottom: 8,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  link: { fontFamily: Fonts.bold },
});
