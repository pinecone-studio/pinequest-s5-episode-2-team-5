import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Scientist } from '@/components/avatar/scientist';
import { AppText } from '@/components/ui/app-text';
import { ClassBadge } from '@/components/ui/class-badge';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { CLASS_TEXT_MN, getClass } from '@/data/classes';
import { lookFor } from '@/lib/avatar-look';
import type { ClassId } from '@/types';

/** Live preview of the character being created on the sign-up screen. */
export function AvatarPreview({ nickname, classId }: { nickname: string; classId: ClassId | null }) {
  const hop = useSharedValue(0);
  const glow = classId ? getClass(classId).color.main : Colors.indigo600;

  useEffect(() => {
    hop.set(withSequence(withTiming(-14, { duration: 140 }), withSpring(0, { damping: 9, stiffness: 260 })));
  }, [classId, hop]);

  const hopStyle = useAnimatedStyle(() => ({ transform: [{ translateY: hop.get() }] }));
  const name = nickname.trim();

  return (
    <View style={styles.stage}>
      <View style={[styles.spotlight, { backgroundColor: `${glow}33` }]} />
      <View style={[styles.platform, { borderColor: `${glow}AA` }]} />
      <Animated.View style={[styles.character, hopStyle]}>
        <View style={[styles.tag, name ? styles.tagFilled : null]}>
          <AppText style={[styles.tagText, !name && styles.tagPlaceholder]} numberOfLines={1}>
            {name || 'таны хоч нэр'}
          </AppText>
        </View>
        <Scientist look={lookFor(name, classId)} height={118} />
      </Animated.View>
      <View style={styles.badgeSlot}>
        {classId ? (
          <ClassBadge classId={classId} label={CLASS_TEXT_MN[classId].name} />
        ) : (
          <AppText variant="caption" color={Colors.textDim}>
            Түвшин сонгоогүй байна
          </AppText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    height: 230,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 12,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'rgba(18, 12, 51, 0.6)',
    overflow: 'hidden',
  },
  spotlight: { position: 'absolute', top: 18, width: 190, height: 190, borderRadius: 95 },
  platform: {
    position: 'absolute',
    bottom: 44,
    width: 130,
    height: 30,
    borderRadius: 65,
    borderWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  character: { alignItems: 'center', gap: 6, marginBottom: 10 },
  tag: {
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tagFilled: { backgroundColor: Colors.lime },
  tagText: { fontFamily: Fonts.bold, fontSize: 14, lineHeight: 20, color: Colors.limeInk },
  tagPlaceholder: { color: Colors.textDim, fontFamily: Fonts.medium },
  badgeSlot: { height: 24, justifyContent: 'center' },
});
