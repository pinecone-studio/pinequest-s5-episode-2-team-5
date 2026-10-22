import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { Colors, Fonts, Radius } from '@/constants/theme';
import type { IconName } from '@/types';

import { AppText } from './app-text';

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon: IconName;
  error?: string | null;
  hint?: string;
  /** Adds a show/hide toggle and hides the text by default. */
  password?: boolean;
  footer?: ReactNode;
  ref?: Ref<TextInputInstance>;
}

export function TextField({ label, icon, error, hint, password, footer, ref, onFocus, onBlur, ...input }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const borderColor = error ? Colors.danger : focused ? Colors.cyan : Colors.border;
  const iconColor = error ? Colors.danger : focused ? Colors.cyan : Colors.textDim;

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" color={Colors.textMuted}>
        {label}
      </AppText>
      <View style={[styles.field, { borderColor }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
        <TextInput
          {...input}
          ref={ref}
          accessibilityLabel={label}
          secureTextEntry={password && !revealed}
          placeholderTextColor={Colors.textDim}
          selectionColor={Colors.cyan}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
        />
        {password && (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Нууц үгийг нуух' : 'Нууц үгийг харуулах'}>
            <MaterialCommunityIcons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.textDim} />
          </Pressable>
        )}
      </View>
      {footer}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 54,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 2,
    backgroundColor: Colors.input,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
