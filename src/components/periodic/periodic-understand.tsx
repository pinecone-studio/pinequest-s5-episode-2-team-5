import { useState } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors } from '@/constants/theme';
import { getPack } from '@/data/revision-hub';
import { GROUP_GUIDES, outerElectrons } from '@/lib/periodic-learning';
import { StudyCard, ui } from '@/components/revision-hub/study-ui';
import { PeriodicGrid } from './periodic-grid';
import { ShellDiagram } from './element-visuals';

export function PeriodicUnderstand() {
  const elements = getPack('g8-chem').elements;
  const [direction, setDirection] = useState<'group' | 'period'>('group');
  const [guideIndex, setGuideIndex] = useState(0);
  const [period, setPeriod] = useState(2);
  const [selectedZ, setSelectedZ] = useState(6);
  const guide = GROUP_GUIDES[guideIndex];
  const periodElements = elements.filter((e) => e.period === period && e.z <= 20);
  return <>
    <StudyCard><AppText variant="title">Хүснэгт бол цээжлэх жагсаалтаас илүү</AppText><AppText>Элементүүдийг протоны тоо өсөх дарааллаар байрлуулсан. Байрлалаас нь атомын бүтцийн давтагдах зүй тогтлыг олж хараарай.</AppText><View style={ui.row}><GameButton title="Бүлгээр доош ↓" size="md" variant={direction === 'group' ? 'primary' : 'secondary'} onPress={() => setDirection('group')}/><GameButton title="Үеэр хөндлөн →" size="md" variant={direction === 'period' ? 'primary' : 'secondary'} onPress={() => setDirection('period')}/></View></StudyCard>
    {direction === 'group' ? <>
      <StudyCard><AppText variant="heading">Бүлэг = босоо багана</AppText><AppText>Үндсэн бүлгийн элементүүдийн гаднах электрон төстэй. Бүлгээр доошлоход эзлэгдсэн давхрааны тоо ерөнхийдөө нэмэгдэнэ.</AppText><View style={ui.row}>{GROUP_GUIDES.map((item, i) => <GameButton key={item.group} title={`${item.group}-р бүлэг`} size="sm" variant={i === guideIndex ? 'primary' : 'secondary'} onPress={() => setGuideIndex(i)}/>)}</View><AppText variant="heading">{guide.title}</AppText><AppText>{guide.text}</AppText><PeriodicGrid group={guide.group} selected={elements[guide.examples[0] - 1]} mini/></StudyCard>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>{guide.examples.map((z) => {
        const element = elements[z - 1];
        return <View key={z} style={{ flexGrow: 1, flexBasis: 260, minWidth: 0 }}><StudyCard><AppText variant="heading">{element.symbol} · {element.name}</AppText><AppText color={Colors.lime}>Гадна: {outerElectrons(element)} e⁻ · {element.shells.length} давхраа</AppText><ShellDiagram key={z} element={element}/></StudyCard></View>;
      })}</View>
      <StudyCard><AppText>3–12-р бүлгийн шилжилтийн металлууд, f-блокийн элементүүдийг энэ энгийн гаднах-электроны дүрмээр дангаар тайлбарлахгүй.</AppText></StudyCard>
    </> : <>
      <StudyCard><AppText variant="heading">Үе = хэвтээ мөр</AppText><AppText>2, 3-р үеийг харьцуулъя. Нэг үеийн эдгээр элемент ижил тооны эзлэгдсэн давхраатай; зүүнээс баруун тийш Z нэгээр нэмэгдэнэ.</AppText><View style={ui.row}>{[2, 3].map((n) => <GameButton key={n} title={`${n}-р үе`} size="sm" variant={period === n ? 'primary' : 'secondary'} onPress={() => { setPeriod(n); setSelectedZ(n === 2 ? 3 : 11); }}/>)}</View><View style={ui.row}>{periodElements.map((element) => <GameButton key={element.z} title={`${element.symbol} · ${outerElectrons(element)} e⁻`} size="sm" variant={selectedZ === element.z ? 'primary' : 'secondary'} onPress={() => setSelectedZ(element.z)}/>)}</View><AppText>Тэмдэг бүрийг дараад гаднах электрон 1-ээс 8 хүртэл нэмэгдэхийг харна уу.</AppText></StudyCard>
      <StudyCard><ShellDiagram key={selectedZ} element={elements[selectedZ - 1]}/></StudyCard>
    </>}
  </>;
}
