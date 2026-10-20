import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>{'< Hub'}</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.back} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingTop: 40, paddingBottom: 12, paddingHorizontal: 12 },
  back: { width: 70 },
  backText: { color: colors.accent, fontWeight: '700' },
  title: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 18, fontWeight: '800' },
});
