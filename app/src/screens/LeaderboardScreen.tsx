import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, levelOf } from '../constants/theme';
import { useGame } from '../services/GameContext';

export function LeaderboardScreen({ onExit }: { onExit: () => void }) {
  const { ranking } = useGame();
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Global Ranking" onBack={onExit} />
      <ScrollView contentContainerStyle={styles.body}>
        {ranking.map((p, i) => (
          <View key={p.nickname} style={[styles.row, p.me && styles.me]}>
            <Text style={styles.rank}>#{i + 1}</Text>
            <View style={[styles.dot, { backgroundColor: p.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.nickname}</Text>
              <Text style={styles.meta}>{p.tier}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.name}>Lv {levelOf(p.xp)}</Text>
              <Text style={styles.meta}>{p.xp} XP</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, gap: 8, maxWidth: 520, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.panel, padding: 12, borderRadius: 8 },
  me: { borderWidth: 2, borderColor: colors.accent },
  rank: { color: colors.warn, fontWeight: '900', width: 36 },
  dot: { width: 20, height: 20, borderRadius: 10 },
  name: { color: colors.text, fontWeight: '800' },
  meta: { color: colors.muted, fontSize: 12 },
});
