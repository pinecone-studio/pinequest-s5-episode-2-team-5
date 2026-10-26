import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PlayerPortrait } from '@/components/avatar/player-portrait';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ClassBadge } from '@/components/ui/class-badge';
import { GameButton } from '@/components/ui/game-button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { RegionPicker, type RegionSelection } from '@/components/ranking/region-picker';
import { StatTile } from '@/components/ui/stat-tile';
import { Colors } from '@/constants/theme';
import { CLASSES } from '@/data/classes';
import { levelProgress } from '@/lib/progress';
import type { RegionType, User } from '@/types';

interface ProfileSheetProps {
  user: User;
  visible: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onUpdateRegion: (regionType: RegionType, regionName: string) => Promise<void>;
}

export function ProfileSheet({ user, visible, onClose, onSignOut, onUpdateRegion }: ProfileSheetProps) {
  const [region, setRegion] = useState<RegionSelection | null>(
    user.regionType && user.regionName ? { type: user.regionType, name: user.regionName } : null,
  );
  const [savingRegion, setSavingRegion] = useState(false);
  const [regionError, setRegionError] = useState(false);
  const { level, into, needed, ratio } = levelProgress(user.xp);
  const totalLessons = CLASSES.reduce((sum, c) => sum + c.lessons.length, 0);
  const done = Object.keys(user.completed).length;

  const saveRegion = async () => {
    if (!region) return;
    setSavingRegion(true);
    setRegionError(false);
    try {
      await onUpdateRegion(region.type, region.name);
    } catch {
      setRegionError(true);
    } finally {
      setSavingRegion(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <PlayerPortrait nickname={user.nickname} classId={user.classId} size={92} />
        <AppText variant="title">{user.nickname}</AppText>
        <AppText variant="caption">{user.email}</AppText>
        <ClassBadge classId={user.classId} />
      </View>
      <View style={styles.stats}>
        <StatTile icon="star-circle" label="Level" value={level} color={Colors.gold} />
        <StatTile icon="lightning-bolt" label="Total XP" value={user.xp} />
        <StatTile icon="book-open-variant" label="Lessons" value={`${done}/${totalLessons}`} color={Colors.lime} />
      </View>
      <View style={styles.levelBox}>
        <ProgressBar progress={ratio} height={12} />
        <AppText variant="caption" align="center">
          {needed - into} XP to level {level + 1}
        </AppText>
      </View>
      <View style={styles.regionSection}>
        <AppText variant="label" color={Colors.cyan}>Чансааны байршил</AppText>
        <RegionPicker value={region} onChange={setRegion} />
        {regionError && <AppText variant="caption" color={Colors.danger}>Байршлыг хадгалж чадсангүй.</AppText>}
        <GameButton
          title="Байршил хадгалах"
          icon="map-marker-check"
          size="sm"
          loading={savingRegion}
          disabled={!region || (region.type === user.regionType && region.name === user.regionName)}
          onPress={saveRegion}
        />
      </View>
      <GameButton title="Sign out" variant="danger" icon="logout" size="md" onPress={onSignOut} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 6 },
  stats: { flexDirection: 'row', gap: 10 },
  levelBox: { gap: 6 },
  regionSection: { gap: 8 },
});
