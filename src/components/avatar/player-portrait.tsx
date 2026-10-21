import { StyleSheet, View } from 'react-native';

import { getClass } from '@/data/classes';
import { lookFor } from '@/lib/avatar-look';
import type { ClassId } from '@/types';

import { Scientist } from './scientist';

interface PlayerPortraitProps {
  nickname: string;
  classId: ClassId;
  size?: number;
  /** Ring color; defaults to the class color. */
  ring?: string;
}

export function PlayerPortrait({ nickname, classId, size = 44, ring }: PlayerPortraitProps) {
  const color = getClass(classId).color;
  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: ring ?? color.main,
          backgroundColor: `${color.main}40`,
        },
      ]}>
      <Scientist look={lookFor(nickname, classId)} portrait height={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 2.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
