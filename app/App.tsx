import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { colors } from './src/constants/theme';
import { AuthScreen } from './src/screens/AuthScreen';
import { Destination, HubScreen } from './src/screens/HubScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { LessonScreen } from './src/screens/LessonScreen';
import { PeriodicTableScreen } from './src/screens/PeriodicTableScreen';
import { GameProvider, useGame } from './src/services/GameContext';

function Root() {
  const { user } = useGame();
  const [dest, setDest] = useState<Destination | null>(null);

  useEffect(() => {
    if (!user) setDest(null);
  }, [user]);

  if (!user) return <AuthScreen />;

  const exit = () => setDest(null);
  if (dest?.kind === 'lesson') return <LessonScreen lessonId={dest.id} onExit={exit} />;
  if (dest?.kind === 'table') return <PeriodicTableScreen onExit={exit} />;
  if (dest?.kind === 'ranking') return <LeaderboardScreen onExit={exit} />;
  return <HubScreen onEnter={setDest} />;
}

export default function App() {
  return (
    <GameProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Root />
        <StatusBar style="light" />
      </View>
    </GameProvider>
  );
}
