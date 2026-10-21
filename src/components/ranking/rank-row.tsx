import { StyleSheet, View } from 'react-native';

import { PlayerPortrait } from '@/components/avatar/player-portrait';
import { AppText } from '@/components/ui/app-text';
import { ClassBadge } from '@/components/ui/class-badge';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { levelForXp } from '@/lib/progress';
import type { RankedPlayer } from '@/services/leaderboard';

export function RankRow({ player, isMe }: { player: RankedPlayer; isMe: boolean }) {
  return (
    <View
      style={[styles.row, isMe && styles.me]}
      accessible
      accessibilityLabel={`Rank ${player.rank}, ${isMe ? 'you' : player.nickname}, ${player.xp} XP`}>
      <AppText style={[styles.rank, isMe && styles.meText]}>{player.rank}</AppText>
      <PlayerPortrait nickname={player.nickname} classId={player.classId} size={42} />
      <View style={styles.body}>
        <View style={styles.nameRow}>
          <AppText style={styles.name} numberOfLines={1}>
            {player.nickname}
          </AppText>
          {isMe && (
            <View style={styles.youTag}>
              <AppText style={styles.youText}>YOU</AppText>
            </View>
          )}
        </View>
        <View style={styles.metaRow}>
          <ClassBadge classId={player.classId} size="sm" />
          <AppText variant="caption" style={styles.level}>
            Lv {levelForXp(player.xp)}
          </AppText>
        </View>
      </View>
      <View style={styles.xpBox}>
        <AppText style={styles.xp}>{player.xp}</AppText>
        <AppText variant="caption" style={styles.xpLabel}>
          XP
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'rgba(34, 26, 94, 0.9)',
  },
  me: { borderColor: Colors.lime, backgroundColor: 'rgba(181, 242, 61, 0.14)' },
  rank: { width: 30, textAlign: 'center', fontFamily: Fonts.bold, fontSize: 17, color: Colors.textMuted },
  meText: { color: Colors.lime },
  body: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 20, color: Colors.text },
  youTag: { paddingHorizontal: 6, borderRadius: 6, backgroundColor: Colors.lime },
  youText: { fontFamily: Fonts.bold, fontSize: 10.5, lineHeight: 16, color: Colors.limeInk },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  level: { fontSize: 12 },
  xpBox: { alignItems: 'flex-end' },
  xp: { fontFamily: Fonts.bold, fontSize: 17, lineHeight: 21, color: Colors.gold },
  xpLabel: { fontSize: 11, lineHeight: 13 },
});
