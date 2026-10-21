import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'label' | 'caption' | 'button';

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function AppText({ variant = 'body', color, align, style, ...rest }: AppTextProps) {
  return (
    <Text
      style={[styles.base, styles[variant], color ? { color } : null, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { color: Colors.text },
  display: { fontFamily: Fonts.bold, fontSize: 38, lineHeight: 44 },
  title: { fontFamily: Fonts.bold, fontSize: 24, lineHeight: 30 },
  heading: { fontFamily: Fonts.semibold, fontSize: 19, lineHeight: 24 },
  body: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 23, color: Colors.textMuted },
  bodyStrong: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: Fonts.semibold, fontSize: 12.5, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' },
  caption: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18, color: Colors.textMuted },
  button: { fontFamily: Fonts.bold, fontSize: 18, lineHeight: 22, letterSpacing: 0.4 },
});
