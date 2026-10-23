import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors } from '@/constants/theme';
import type { Block } from '@/data/revision-hub/types';
import { RichText } from './rich-text';
import { StudyFigure } from './study-figures';
import { ui } from './study-ui';

export function ReferenceTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return <ScrollView horizontal accessibilityLabel="Хүснэгтийг хөндлөн гүйлгэнэ"><View>
    {[head, ...rows].map((row, i) => <View key={i} style={{ flexDirection: 'row', backgroundColor: i === 0 ? Colors.indigo700 : Colors.input }}>{row.map((cell, j) => <View key={j} style={{ width: 190, padding: 12, borderWidth: 0.5, borderColor: Colors.border }}><RichText>{cell}</RichText></View>)}</View>)}
  </View></ScrollView>;
}
export function NoteBlock({ block, pages }: { block: Block; pages: string }) {
  const [revealed, setRevealed] = useState(false);
  if (block.t === 'table') return <ReferenceTable head={block.head} rows={block.rows}/>;
  if (block.t === 'fig') return <StudyFigure name={block.name} args={block.args} caption={block.cap}/>;
  if (block.t === 'list' || block.t === 'steps') return <View style={{ gap: 8 }}>{block.items.map((item, i) => <RichText key={i}>{`${block.t === 'steps' ? `${i + 1}.` : '•'} ${item}`}</RichText>)}</View>;
  if (block.t === 'ex') return <View style={[ui.link, { gap: 12 }]}><AppText variant="label">Жишээ</AppText><RichText>{block.q}</RichText><GameButton title={revealed ? 'Бодолт хураах' : 'Бодолт харах'} size="sm" variant="secondary" onPress={() => setRevealed(!revealed)}/>{revealed && <RichText>{block.a}</RichText>}</View>;
  if (block.t === 'p') return <RichText>{block.x}</RichText>;
  const labels = { key: 'Тодорхойлолт', eq: 'Тэгшитгэл', tip: 'Шалгалтын зөвлөгөө', warn: 'Түгээмэл алдаа', fact: 'Мэдэхэд илүүдэхгүй', errata: 'Сурах бичгийн засвар' };
  if ('x' in block) return <View style={[ui.link, { gap: 8, borderLeftWidth: 3, borderLeftColor: block.t === 'errata' || block.t === 'warn' ? Colors.gold : Colors.cyan }]}>
    <AppText variant="label" color={Colors.lime}>{block.t === 'key' ? block.term : labels[block.t]}</AppText>
    <RichText>{block.x}</RichText>{block.t === 'errata' && <AppText variant="caption">Сурах бичгийн сэдэв: х. {pages}. Дээрх засварт зураг, хүснэгтийн заалтыг харна уу.</AppText>}
  </View>;
  return null;
}
