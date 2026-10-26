import { useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { cancelAnimation, Easing, withDelay, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';

/** Stable easing curves (an inline `Easing.inOut(...)` is a new function every render). */
const EASINGS = {
  linear: Easing.linear,
  sine: Easing.inOut(Easing.sin),
  quad: Easing.inOut(Easing.quad),
};

export interface ScreenLoop {
  duration: number;
  easing?: keyof typeof EASINGS;
  /** Ping-pong 0 → 1 → 0 instead of restarting at 0. */
  reverse?: boolean;
  delay?: number;
}

/**
 * Loops `value` from 0 to 1 forever, but only while its screen is focused. Stack screens
 * stay mounted underneath the one on top, so without this the hub's ambient animations
 * kept running (and taking frame time) behind the OpenLab 3D lab and other screens.
 */
export function useScreenLoop(value: SharedValue<number>, { duration, easing = 'linear', reverse = false, delay = 0 }: ScreenLoop): void {
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    const loop = withRepeat(withTiming(1, { duration, easing: EASINGS[easing] }), -1, reverse);
    value.set(delay > 0 ? withDelay(delay, loop) : loop);
    return () => cancelAnimation(value);
  }, [focused, value, duration, easing, reverse, delay]);
}
