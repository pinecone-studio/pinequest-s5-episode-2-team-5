import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS !== 'web';

/** Fire-and-forget haptics that never throw (no-op on web). */
export const haptics = {
  tap() {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  select() {
    if (enabled) Haptics.selectionAsync().catch(() => {});
  },
  success() {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  error() {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
