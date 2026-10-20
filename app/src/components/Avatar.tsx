import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

interface Props {
  size: number;
  color: string;
  name: string;
  isMe?: boolean;
}

export function Avatar({ size, color, name, isMe }: Props) {
  const head = size * 0.38;
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }}>
      <Text
        numberOfLines={1}
        style={[
          styles.name,
          { width: size * 4, left: -size * 1.5, top: -size * 0.45 },
          isMe && { color: colors.accent },
        ]}
      >
        {name}
      </Text>
      <View style={{ width: head, height: head, borderRadius: head, backgroundColor: '#ffd9b3', marginTop: size * 0.08 }} />
      <View style={{ width: size * 0.55, height: size * 0.34, borderRadius: size * 0.1, backgroundColor: color }} />
      <View style={{ flexDirection: 'row', gap: size * 0.08 }}>
        <View style={{ width: size * 0.18, height: size * 0.16, backgroundColor: '#1e293b' }} />
        <View style={{ width: size * 0.18, height: size * 0.16, backgroundColor: '#1e293b' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  name: {
    position: 'absolute',
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
});
