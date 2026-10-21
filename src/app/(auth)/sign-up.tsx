import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
  type TextInputInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarPreview } from "@/components/auth/avatar-preview";
import { FormError, FormSection } from "@/components/auth/form-section";
import { AppText } from "@/components/ui/app-text";
import { ClassCard } from "@/components/ui/class-card";
import { GameButton } from "@/components/ui/game-button";
import { LabBackground } from "@/components/ui/lab-background";
import { ScreenHeader } from "@/components/ui/screen-header";
import { TextField } from "@/components/ui/text-field";
import { Colors, Fonts } from "@/constants/theme";
import { useSession } from "@/context/session";
import { CLASSES } from "@/data/classes";
import { haptics } from "@/lib/haptics";
import {
  NICKNAME_MAX,
  passwordStrength,
  validateEmail,
  validateNickname,
  validatePassword,
} from "@/lib/validation";
import { AuthError, type AuthField } from "@/services/auth";
import type { ClassId } from "@/types";

type Field = AuthField | "classId";

const STRENGTH = [
  { label: "", color: Colors.border },
  { label: "Weak", color: Colors.danger },
  { label: "Good", color: Colors.gold },
  { label: "Strong", color: Colors.success },
];

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useSession();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const nicknameRef = useRef<TextInputInstance>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [classId, setClassId] = useState<ClassId | null>(null);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<{
    field?: AuthField;
    message: string;
  } | null>(null);

  const errors: Record<Field, string | null> = {
    email: validateEmail(email),
    password: validatePassword(password),
    nickname: validateNickname(nickname),
    classId: classId ? null : "Pick the class you want to start in",
  };

  const errorFor = (field: Field) => {
    if (serverError?.field === field) return serverError.message;
    return touched[field] || submitted ? errors[field] : null;
  };

  const touch = (field: Field) => setTouched((t) => ({ ...t, [field]: true }));
  const clearServerError = (field: AuthField) => {
    if (serverError?.field === field) setServerError(null);
  };

  const submit = async () => {
    setSubmitted(true);
    if (!classId || Object.values(errors).some(Boolean)) {
      haptics.error();
      // The class picker sits right above the button; field errors are further up.
      if (errors.email || errors.password || errors.nickname)
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      await signUp({ email, password, nickname, classId });
      haptics.success();
      // The auth guard swaps this screen for the hub once the session exists.
    } catch (error) {
      haptics.error();
      setServerError(
        error instanceof AuthError
          ? { field: error.field, message: error.message }
          : { message: "Something went wrong. Please try again." },
      );
      setSubmitting(false);
    }
  };

  const strength = STRENGTH[passwordStrength(password)];

  return (
    <LabBackground bubbles={6}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScreenHeader
          title="Create your scientist"
          subtitle="It takes less than a minute"
        />
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
        >
          <AvatarPreview nickname={nickname} classId={classId} />

          <FormSection title="Account" icon="shield-account">
            <TextField
              label="Email"
              icon="email-outline"
              placeholder="you@example.com"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                clearServerError("email");
              }}
              onBlur={() => touch("email")}
              error={errorFor("email")}
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
              placeholder="At least 8 characters"
              value={password}
              onChangeText={setPassword}
              onBlur={() => touch("password")}
              error={errorFor("password")}
              hint="Use 8+ characters with letters and numbers"
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
                          {
                            backgroundColor:
                              passwordStrength(password) >= level
                                ? strength.color
                                : Colors.border,
                          },
                        ]}
                      />
                    ))}
                    <AppText
                      variant="caption"
                      color={strength.color}
                      style={styles.strengthLabel}
                    >
                      {strength.label}
                    </AppText>
                  </View>
                ) : null
              }
            />
          </FormSection>

          <FormSection title="Your scientist" icon="account-outline">
            <TextField
              ref={nicknameRef}
              label="Nickname"
              icon="account-outline"
              placeholder="e.g. AtomAce"
              value={nickname}
              onChangeText={(v) => {
                setNickname(v);
                clearServerError("nickname");
              }}
              onBlur={() => touch("nickname")}
              error={errorFor("nickname")}
              hint={`Shown above your character and on the ranking · ${nickname.trim().length}/${NICKNAME_MAX}`}
              maxLength={NICKNAME_MAX}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="done"
            />
          </FormSection>

          <FormSection title="Starting class" icon="school-outline">
            <AppText variant="caption">
              Pick where you begin. Classes below yours stay open, so you can
              always review the basics.
            </AppText>
            <View style={styles.classes} accessibilityRole="radiogroup">
              {CLASSES.map((c) => (
                <ClassCard
                  key={c.id}
                  chemClass={c}
                  selected={classId === c.id}
                  onSelect={() => {
                    setClassId(c.id);
                    touch("classId");
                  }}
                />
              ))}
            </View>
            {errorFor("classId") && (
              <AppText variant="caption" color={Colors.danger}>
                {errorFor("classId")}
              </AppText>
            )}
          </FormSection>

          {serverError && !serverError.field && (
            <FormError message={serverError.message} />
          )}

          <GameButton
            title="Start my adventure"
            icon="rocket-launch"
            loading={submitting}
            onPress={submit}
          />

          <View style={styles.switchRow}>
            <AppText variant="body">Already have an account?</AppText>
            <Pressable
              onPress={() => router.replace("/sign-in")}
              hitSlop={10}
              accessibilityRole="link"
            >
              <AppText
                variant="bodyStrong"
                color={Colors.lime}
                style={styles.link}
              >
                Sign in
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
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  strengthRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  strengthBar: { flex: 1, height: 6, borderRadius: 3 },
  strengthLabel: { width: 52, textAlign: "right" },
  classes: { gap: 12 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  link: { fontFamily: Fonts.bold },
});
