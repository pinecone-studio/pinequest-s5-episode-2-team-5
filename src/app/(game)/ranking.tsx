import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlayerPortrait } from '@/components/avatar/player-portrait';
import { Podium } from '@/components/ranking/podium';
import { RankRow } from '@/components/ranking/rank-row';
import { AppText } from '@/components/ui/app-text';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { useSession } from '@/context/session';
import { haptics } from '@/lib/haptics';
import { fetchLeaderboard, rankPlayers } from '@/services/leaderboard';
import type { PublicPlayer, User } from '@/types';

type RankScope = 'all' | 'regional';

export default function RankingScreen() {
  const { user } = useSession();
  return user ? <Ranking user={user} /> : null;
}

function Ranking({ user }: { user: User }) {
  const insets = useSafeAreaInsets();
  const [players, setPlayers] = useState<PublicPlayer[] | null>(null);
  const [scope, setScope] = useState<RankScope>('all');
  const region = user.regionType && user.regionName ? { type: user.regionType, name: user.regionName } : null;
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchLeaderboard().then(setPlayers);
    }, []),
  );

  const refresh = async () => {
    setRefreshing(true);
    setPlayers(await fetchLeaderboard());
    setRefreshing(false);
  };

  const globalRanked = players ? rankPlayers(players, 'all') : [];
  const regionalRanked = players && region
    ? rankPlayers(
        players.filter(
          (player) =>
            !!user.subregionName?.trim() &&
            player.regionType === region.type &&
            player.regionName === region.name &&
            player.subregionName === user.subregionName,
        ),
        'all',
      )
    : [];
  const ranked = scope === 'all' ? globalRanked : regionalRanked;
  const me = ranked.find((p) => p.id === user.id);

  return (
    <LabBackground bubbles={5}>
      <ScreenHeader title="Global Ranking" subtitle="Hall of Fame" />
      <ScopeTabs value={scope} regionType={user.regionType} onChange={setScope} />
      {players === null ? (
        <ActivityIndicator color={Colors.gold} size="large" style={styles.loading} />
      ) : (
        <FlatList
          data={ranked.slice(3)}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <RankRow player={item} isMe={item.id === user.id} />}
          ListHeaderComponent={<Podium players={ranked.slice(0, 3)} userId={user.id} />}
          ListHeaderComponentStyle={styles.podium}
          ListEmptyComponent={
            ranked.length === 0 ? (
              <AppText variant="body" align="center">
                Энэ байршилд чансаанд орсон тоглогч одоогоор алга.
              </AppText>
            ) : undefined
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
          showsVerticalScrollIndicator={false}
        />
      )}
      <MyRank user={user} rank={me?.rank ?? null} region={region} scope={scope} />
    </LabBackground>
  );
}

function ScopeTabs({ value, regionType, onChange }: { value: RankScope; regionType: User['regionType']; onChange: (scope: RankScope) => void }) {
  const localLabel = regionType === 'province' ? 'Аймаг · сум' : regionType === 'city' ? 'Хот · дүүрэг' : 'Орон нутаг';
  const options: { id: RankScope; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'regional', label: localLabel },
  ];
  return (
    <View style={styles.scopeTabs} accessibilityRole="tablist">
      {options.map((option) => {
        const active = value === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptics.select();
              onChange(option.id);
            }}
            style={[styles.scopeTab, active && styles.scopeTabActive]}>
            <AppText style={[styles.scopeTabText, active && styles.scopeTabTextActive]}>{option.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function MyRank({
  user,
  rank,
  region,
  scope,
}: {
  user: User;
  rank: number | null;
  region: { type: 'city' | 'province'; name: string } | null;
  scope: RankScope;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.myRank, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.myRankCard}>
        <PlayerPortrait nickname={user.nickname} classId={user.classId} size={44} ring={Colors.lime} />
        <View style={styles.myRankBody}>
          <AppText variant="label" color={Colors.lime}>
            {scope === 'all' ? 'All rank' : region?.type === 'province' ? 'Сумын rank' : region?.type === 'city' ? 'Дүүргийн rank' : 'Орон нутгийн rank'}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {rank !== null
              ? scope === 'all'
                ? `#${rank}`
                : `#${rank} · ${region?.name}, ${user.subregionName} ${region?.type === 'province' ? 'сум' : 'дүүрэг'}`
              : scope === 'all'
                ? 'Global байр тооцоолж чадсангүй'
              : !user.regionType || !user.regionName
                ? 'Профайлдаа байршлаа сонгоно уу'
                : !user.subregionName?.trim()
                  ? `Профайлдаа ${user.regionType === 'province' ? 'сум' : 'дүүрэг'}-аа оруулна уу`
                  : `${user.regionName}, ${user.subregionName} ${user.regionType === 'province' ? 'сум' : 'дүүрэг'}-д тоглогч алга`}
          </AppText>
        </View>
        <View style={styles.myXp}>
          <MaterialCommunityIcons name="lightning-bolt" size={18} color={Colors.gold} />
          <AppText style={styles.myXpText}>{user.xp}</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: 80 },
  scopeTabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  scopeTab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingHorizontal: 10, borderRadius: 999, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.panel },
  scopeTabActive: { backgroundColor: Colors.cyan, borderColor: Colors.cyan },
  scopeTabText: { fontFamily: Fonts.bold, fontSize: 14, lineHeight: 18, color: Colors.textMuted, textAlign: 'center' },
  scopeTabTextActive: { color: Colors.night },
  list: { paddingHorizontal: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  podium: { marginBottom: 16 },
  separator: { height: 10 },
  myRank: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10 },
  myRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 2.5,
    borderColor: Colors.lime,
    backgroundColor: Colors.indigo900,
    width: '100%',
    maxWidth: 528,
    alignSelf: 'center',
  },
  myRankBody: { flex: 1 },
  myXp: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  myXpText: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.gold },
});
