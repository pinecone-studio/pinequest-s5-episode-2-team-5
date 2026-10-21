import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

import { AppText } from './app-text';
import { IconButton } from './icon-button';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
  backIcon?: 'chevron-left' | 'close';
}

export function ScreenHeader({ title, subtitle, right, onBack, backIcon = 'chevron-left' }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <IconButton
        icon={backIcon}
        accessibilityLabel={backIcon === 'close' ? 'Close' : 'Back'}
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      />
      <View style={styles.titles}>
        <AppText variant="title" align="center" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="caption" align="center" color={Colors.textMuted} numberOfLines={1}>
            {subtitle}
          </AppText>
        )}
      </View>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  titles: { flex: 1, alignItems: 'center' },
  side: { minWidth: 44, alignItems: 'flex-end' },
});
