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
import { CLASSES, getClass } from '@/data/classes';
import { haptics } from '@/lib/haptics';
import { fetchLeaderboard, rankPlayers } from '@/services/leaderboard';
import type { ClassId, PublicPlayer, User } from '@/types';

type Filter = ClassId | 'all';

export default function RankingScreen() {
  const { user } = useSession();
  return user ? <Ranking user={user} /> : null;
}

function Ranking({ user }: { user: User }) {
  const insets = useSafeAreaInsets();
  const [players, setPlayers] = useState<PublicPlayer[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
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

  const ranked = players ? rankPlayers(players, filter) : [];
  const me = ranked.find((p) => p.id === user.id);

  return (
    <LabBackground bubbles={5}>
      <ScreenHeader title="Global Ranking" subtitle="Hall of Fame" />
      <FilterTabs value={filter} onChange={setFilter} />
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
                No one in this class yet.
              </AppText>
            ) : undefined
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.gold} />}
          showsVerticalScrollIndicator={false}
        />
      )}
      <MyRank user={user} rank={me?.rank ?? null} filter={filter} />
    </LabBackground>
  );
}

function FilterTabs({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  const options: { id: Filter; label: string; color: string }[] = [
    { id: 'all', label: 'All', color: Colors.gold },
    ...CLASSES.map((c) => ({ id: c.id, label: c.name, color: c.color.main })),
  ];
  return (
    <View style={styles.filters} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              haptics.select();
              onChange(o.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.filter, active && { backgroundColor: o.color, borderColor: o.color }]}>
            <AppText style={[styles.filterText, { color: active ? Colors.night : Colors.textMuted }]}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function MyRank({ user, rank, filter }: { user: User; rank: number | null; filter: Filter }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.myRank, { paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.myRankCard}>
        <PlayerPortrait nickname={user.nickname} classId={user.classId} size={44} ring={Colors.lime} />
        <View style={styles.myRankBody}>
          <AppText variant="label" color={Colors.lime}>
            Your rank
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {rank !== null
              ? `#${rank} ${filter === 'all' ? 'worldwide' : `in ${getClass(filter).name}`}`
              : `You're in ${getClass(user.classId).name}`}
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
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  filter: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.panel,
  },
  filterText: { fontFamily: Fonts.bold, fontSize: 14, lineHeight: 18 },
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
