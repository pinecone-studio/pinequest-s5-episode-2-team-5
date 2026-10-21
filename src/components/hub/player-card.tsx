import { StyleSheet, View } from 'react-native';

import { PlayerPortrait } from '@/components/avatar/player-portrait';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ClassBadge } from '@/components/ui/class-badge';
import { GameButton } from '@/components/ui/game-button';
import { StatTile } from '@/components/ui/stat-tile';
import { Colors } from '@/constants/theme';
import { levelForXp } from '@/lib/progress';
import type { PublicPlayer } from '@/types';

interface PlayerCardProps {
  player: PublicPlayer | null;
  /** Global rank, when the leaderboard has loaded. */
  rank?: number;
  onClose: () => void;
  onWave: () => void;
}

/** Shown when you tap another player in the hub. */
export function PlayerCard({ player, rank, onClose, onWave }: PlayerCardProps) {
  return (
    <BottomSheet visible={player !== null} onClose={onClose}>
      {player && (
        <>
          <View style={styles.header}>
            <PlayerPortrait nickname={player.nickname} classId={player.classId} size={88} />
            <AppText variant="title">{player.nickname}</AppText>
            <ClassBadge classId={player.classId} />
          </View>
          <View style={styles.stats}>
            <StatTile icon="star-circle" label="Level" value={levelForXp(player.xp)} color={Colors.gold} />
            <StatTile icon="lightning-bolt" label="Total XP" value={player.xp} />
            <StatTile icon="podium" label="Global rank" value={rank ? `#${rank}` : '–'} color={Colors.lime} />
          </View>
          <GameButton title={`Wave at ${player.nickname}`} icon="hand-wave" onPress={onWave} />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 8 },
  stats: { flexDirection: 'row', gap: 10 },
});
