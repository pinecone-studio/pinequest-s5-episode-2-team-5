import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import type { ClassPalette, IconName } from '@/types';

interface ClassMedallionProps {
  icon: IconName;
  color: ClassPalette;
  size?: number;
  dimmed?: boolean;
}

/** Glossy round badge used for classes and lessons. */
export function ClassMedallion({ icon, color, size = 56, dimmed = false }: ClassMedallionProps) {
  const colors = dimmed ? (['#4A4485', '#2E2963'] as const) : ([color.main, color.dark] as const);
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[styles.fill, { borderRadius: size / 2 }]}>
        <View style={[styles.gloss, { width: size * 0.5, height: size * 0.22, borderRadius: size }]} />
        <MaterialCommunityIcons name={icon} size={size * 0.5} color={dimmed ? '#9C96D3' : '#FFFFFF'} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gloss: {
    position: 'absolute',
    top: '10%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
});
