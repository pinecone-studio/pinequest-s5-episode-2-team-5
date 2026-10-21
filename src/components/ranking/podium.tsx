import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { PlayerPortrait } from '@/components/avatar/player-portrait';
import { AppText } from '@/components/ui/app-text';
import { Colors, Fonts } from '@/constants/theme';
import type { RankedPlayer } from '@/services/leaderboard';

const MEDALS = {
  1: { ring: Colors.gold, block: ['#FFE27A', '#F5A623'] as const, height: 104, portrait: 80 },
  2: { ring: Colors.silver, block: ['#EEF2FA', '#AEB8CC'] as const, height: 76, portrait: 64 },
  3: { ring: Colors.bronze, block: ['#F6BE8F', '#C97A45'] as const, height: 60, portrait: 64 },
};

/** Top three, arranged 2 · 1 · 3. */
export function Podium({ players, userId }: { players: RankedPlayer[]; userId: string }) {
  const order = [players[1], players[0], players[2]];
  return (
    <View style={styles.podium}>
      {order.map((player, i) =>
        player ? (
          <Animated.View
            key={player.id}
            entering={FadeInUp.delay([150, 0, 300][i]).springify().damping(14)}
            style={styles.column}>
            <Spot player={player} isMe={player.id === userId} />
          </Animated.View>
        ) : (
          <View key={`empty${i}`} style={styles.column} />
        ),
      )}
    </View>
  );
}

function Spot({ player, isMe }: { player: RankedPlayer; isMe: boolean }) {
  const medal = MEDALS[player.rank as 1 | 2 | 3];
  return (
    <>
      <View style={styles.portraitWrap}>
        {player.rank === 1 && (
          <MaterialCommunityIcons name="crown" size={34} color={Colors.gold} style={styles.crown} />
        )}
        <PlayerPortrait nickname={player.nickname} classId={player.classId} size={medal.portrait} ring={medal.ring} />
      </View>
      <AppText style={styles.name} numberOfLines={1}>
        {isMe ? 'You' : player.nickname}
      </AppText>
      <View style={styles.xp}>
        <MaterialCommunityIcons name="lightning-bolt" size={13} color={Colors.gold} />
        <AppText style={styles.xpText}>{player.xp}</AppText>
      </View>
      <LinearGradient colors={medal.block} style={[styles.block, { height: medal.height }]}>
        <AppText style={styles.rank}>{player.rank}</AppText>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 30 },
  column: { flex: 1, alignItems: 'center', gap: 4 },
  portraitWrap: { alignItems: 'center' },
  crown: { position: 'absolute', top: -28, zIndex: 1 },
  name: { fontFamily: Fonts.bold, fontSize: 14, lineHeight: 18, maxWidth: '100%', color: Colors.text },
  xp: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  xpText: { fontFamily: Fonts.semibold, fontSize: 13, color: Colors.gold },
  block: {
    alignSelf: 'stretch',
    marginTop: 6,
    alignItems: 'center',
    paddingTop: 8,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  rank: { fontFamily: Fonts.bold, fontSize: 32, lineHeight: 38, color: 'rgba(40, 24, 0, 0.55)' },
});
