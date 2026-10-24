import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors } from '@/constants/theme';

/** Qualitative teaching illustration; deliberately does not fabricate measured results. */
export function CatalystFigure({ onCompare }: { onCompare: () => void }) {
  const [catalyst, setCatalyst] = useState(false);
  return <View style={styles.figure}>
    <AppText variant="heading">{catalyst ? 'Катализатор нэмсний дараа' : 'Катализатор нэмэхээс өмнө'}</AppText>
    <Svg width="100%" height={210} viewBox="0 0 320 210" accessibilityLabel={catalyst ? 'Хүчилтөрөгчийн олон бөмбөлөг, савангийн хөөс' : 'Хүчилтөрөгчийн цөөн бөмбөлөг'} accessibilityRole="image">
      <Path d="M100 30 L100 175 Q100 190 115 190 L205 190 Q220 190 220 175 L220 30" fill={Colors.input} stroke={Colors.textMuted} strokeWidth={4}/>
      <Rect x={104} y={catalyst ? 68 : 130} width={112} height={catalyst ? 116 : 54} fill={Colors.cyanDark} opacity={0.5}/>
      {Array.from({ length: catalyst ? 32 : 4 }, (_, i) => <Circle key={i} cx={113 + ((i * 29) % 91)} cy={(catalyst ? 57 : 131) + ((i * 17) % (catalyst ? 120 : 40))} r={catalyst ? 6 + (i % 4) : 4} fill={Colors.cyan} opacity={0.65}/>)}
    </Svg>
    <AppText variant="caption">Сургалтын бүдүүвч • бодит хэмжилт биш</AppText>
    <GameButton title={catalyst ? 'Өмнөх төлөвийг харах' : 'Катализатор нэмэх'} size="md" variant="secondary" onPress={() => {
      if (!catalyst) onCompare();
      setCatalyst(!catalyst);
    }}/>
    {catalyst && <RichObservation />}
  </View>;
}
function RichObservation() {
  return <AppText>Хүчилтөрөгч хурдан ялгарч, савангийн хөөс үүснэ. Катализатор урвалыг хурдасгана; хөөс нь шинэ хий үүссэнийг ажиглахад тусална.</AppText>;
}
const styles = StyleSheet.create({ figure: { gap: 12 } });
