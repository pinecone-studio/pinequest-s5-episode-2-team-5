import { Text, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { Fonts } from '@/constants/theme';
import { chemistrySegments, chemistryText } from '@/lib/chemistry-text';

interface Presentation { color?: string; align?: 'center'; fontSize?: number }
function InlineText({ text, color, align, fontSize }: { text: string } & Presentation) {
  return <AppText color={color} align={align} style={[{ flexShrink: 1 }, fontSize ? { fontSize, lineHeight: fontSize * 1.5 } : undefined]}>{chemistryText(text).map((token, i) => (
    <Text key={i} style={token.style === 'bold' ? { fontFamily: Fonts.bold } :
      token.style === 'italic' ? { fontStyle: 'italic' } :
      token.style === 'sub' || token.style === 'sup' ? { fontSize: 12, lineHeight: 24, verticalAlign: token.style === 'sub' ? 'bottom' : 'top' } : undefined}>
      {token.text}
    </Text>
  ))}</AppText>;
}
export function RichText({ children, color, align, fontSize }: { children: string } & Presentation) {
  const segments = chemistrySegments(children);
  if (!segments.some((s) => s.kind === 'nuclide')) return <InlineText text={children} color={color} align={align} fontSize={fontSize}/>;
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: align === 'center' ? 'center' : undefined, gap: 2 }}>{segments.map((segment, i) => segment.kind === 'text' ? <InlineText key={i} text={segment.value} color={color} align={align} fontSize={fontSize}/> :
    <View key={i} accessible accessibilityLabel={`${segment.symbol}, массын тоо ${segment.mass}, дэс дугаар ${segment.atomic}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View><AppText color={color} style={{ fontSize: 10, lineHeight: 12 }} align="right">{segment.mass}</AppText><AppText color={color} style={{ fontSize: 10, lineHeight: 12 }} align="right">{segment.atomic}</AppText></View>
      <AppText color={color} variant="bodyStrong">{segment.symbol}</AppText>
    </View>)}</View>;
}
