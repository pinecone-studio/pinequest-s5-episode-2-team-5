import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
  useFonts,
} from '@expo-google-fonts/fredoka';
import { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { Colors } from '@/constants/theme';
import { SessionProvider, useSession } from '@/context/session';

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.night,
    card: Colors.indigo900,
    primary: Colors.lime,
    text: Colors.text,
    border: Colors.border,
  },
};

// Cyrillic fallback for the web only (see Fonts in constants/theme).
const CYRILLIC_FONTS = Platform.OS === 'web' ? { Nunito_400Regular, Nunito_500Medium, Nunito_600SemiBold, Nunito_700Bold } : {};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    ...CYRILLIC_FONTS,
  });

  return (
    <SessionProvider>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <RootNavigator fontsReady={fontsLoaded || fontError !== null} />
      </ThemeProvider>
    </SessionProvider>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { user, isLoading } = useSession();
  const ready = fontsReady && !isLoading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false, orientation: 'portrait', contentStyle: { backgroundColor: Colors.night } }}>
      <Stack.Protected guard={user !== null} redirectTo="/welcome">
        <Stack.Protected guard={user?.location !== null && user !== null}>
          <Stack.Screen name="(game)" />
        </Stack.Protected>
        <Stack.Protected guard={user?.location === null}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack.Protected>
      <Stack.Protected guard={user === null} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
