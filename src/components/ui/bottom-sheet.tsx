import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius } from '@/constants/theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        {/* Lifts the sheet above the iOS keyboard (Android resizes the window itself). */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View
            entering={SlideInDown.springify().damping(18)}
            style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay },
  sheet: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: Colors.border,
    backgroundColor: Colors.indigo900,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
});
