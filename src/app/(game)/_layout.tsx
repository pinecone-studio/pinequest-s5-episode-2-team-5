import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';

export default function GameLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, orientation: 'portrait', contentStyle: { backgroundColor: Colors.night } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chat" options={{ animation: 'slide_from_bottom' }} />
      {/* The hub plays its own door transition, so buildings just fade in. */}
      <Stack.Screen name="lessons/index" options={{ animation: 'fade' }} />
      <Stack.Screen name="ranking" options={{ animation: 'fade' }} />
      <Stack.Screen name="versus" options={{ animation: 'fade' }} />
      <Stack.Screen name="friendly" options={{ animation: 'fade' }} />
      <Stack.Screen name="openlab" options={{ animation: 'fade', gestureEnabled: false, orientation: 'landscape' }} />
      <Stack.Screen name="lessons/[lessonId]" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
    </Stack>
  );
}
