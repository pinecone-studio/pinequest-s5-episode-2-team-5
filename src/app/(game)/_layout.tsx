import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function GameLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.night } }}>
      <Stack.Screen name="index" />
      {/* The hub plays its own door transition, so buildings just fade in. */}
      <Stack.Screen name="lessons/index" options={{ animation: 'fade' }} />
      <Stack.Screen name="ranking" options={{ animation: 'fade' }} />
      <Stack.Screen name="lessons/[lessonId]" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
    </Stack>
  );
}
