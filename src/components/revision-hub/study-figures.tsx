import { useState, type ComponentType } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { AppText } from '@/components/ui/app-text';
import { GameButton } from '@/components/ui/game-button';
import { Colors } from '@/constants/theme';
import { getPack } from '@/data/revision-hub';
import type { FigureName } from '@/data/revision-hub/types';
import { StudyChoice, ui } from './study-ui';

type Props = { args?: Record<string, unknown> };
export function BohrDiagram({ z }: { z: number }) {
  const element = getPack('g8-chem').elements.find((e) => e.z === z)!;
  return <View style={{ gap: 10 }}><Svg width="100%" height={220} viewBox="0 0 260 220" accessibilityRole="image" accessibilityLabel={`${element.name}: ${element.shells.join(', ')} электрон`}>
    <Circle cx={130} cy={110} r={15} fill={Colors.gold}/><SvgText x={130} y={115} textAnchor="middle" fill={Colors.goldInk}>{z}+</SvgText>
    {element.shells.map((count, shell) => {
      const radius = 28 + shell * (65 / Math.max(1, element.shells.length - 1));
      return <ViewlessShell key={shell} count={count} radius={radius}/>;
    })}
  </Svg><AppText align="center">{element.symbol} · {element.name} · {element.shells.join(', ')}</AppText><AppText variant="caption">Электроны давхрааны сургалтын загвар; бодит хөдөлгөөний зам биш.</AppText></View>;
}
function ViewlessShell({ count, radius }: { count: number; radius: number }) {
  return <><Circle cx={130} cy={110} r={radius} fill="none" stroke={Colors.textDim}/>{Array.from({ length: count }, (_, i) => <Circle key={i} cx={130 + radius * Math.cos(i * Math.PI * 2 / count)} cy={110 + radius * Math.sin(i * Math.PI * 2 / count)} r={3} fill={Colors.cyan}/>)}</>;
}
function Bohr({ args }: Props) { return <BohrDiagram z={typeof args?.z === 'number' && args.z >= 1 && args.z <= 118 ? args.z : 11}/>; }
export function AtomBuilder() {
  const [z, setZ] = useState(6);
  return <View style={{ gap: 12 }}><AppText variant="heading">Дэс дугаар Z = {z}</AppText><View style={ui.row}><GameButton title="Z − 1" size="sm" variant="secondary" disabled={z === 1} onPress={() => setZ(z - 1)}/><GameButton title="Z + 1" size="sm" variant="secondary" disabled={z === 20} onPress={() => setZ(z + 1)}/></View><BohrDiagram z={z}/><AppText>Саармаг атом: {z} протон, {z} электрон.</AppText></View>;
}
function FirstTwenty() {
  const [z, setZ] = useState(11);
  return <View style={{ gap: 12 }}><View style={ui.row}>{getPack('g8-chem').elements.slice(0, 20).map((e) => <GameButton key={e.z} title={e.symbol} size="sm" variant={e.z === z ? 'primary' : 'secondary'} onPress={() => setZ(e.z)}/>)}</View><BohrDiagram z={z}/></View>;
}
function Meniscus() {
  return <Svg width="100%" height={200} viewBox="0 0 320 200" accessibilityRole="image" accessibilityLabel="Менискийн доод цэгийг нүдний түвшинд унших">
    <Rect x={130} y={15} width={60} height={170} fill="none" stroke={Colors.textMuted} strokeWidth={2}/>
    <Path d="M132 100 Q160 125 188 100 L188 183 L132 183 Z" fill={Colors.cyanDark}/>
    <Path d="M132 100 Q160 125 188 100" stroke={Colors.cyan} fill="none" strokeWidth={3}/>
    {[30, 50, 70, 90, 110, 130, 150, 170].map((y) => <Line key={y} x1={130} y1={y} x2={142} y2={y} stroke={Colors.textMuted}/>)}
    <Line x1={30} y1={112} x2={285} y2={112} stroke={Colors.lime} strokeDasharray="5 4"/>
    <Circle cx={30} cy={112} r={9} fill="none" stroke={Colors.lime}/>
    <SvgText x={206} y={100} fill={Colors.lime} fontSize={12}>Доод цэг</SvgText>
  </Svg>;
}
function Flow({ steps }: { steps: string[] }) {
  return <View style={{ gap: 8 }}>{steps.map((step, i) => <View key={step} style={ui.link}><AppText>{i + 1}. {step}{i < steps.length - 1 ? ' ↓' : ' ↺'}</AppText></View>)}</View>;
}
function SaltFlow() { return <Flow steps={['Сулруулсан хүчил', 'Хатуу бодисыг илүүдлээр нэмэх', 'Илүүдлийг шүүх', 'Шүүгдсийг ууршуулах', 'Хөргөж талстжуулах', 'Талстыг шүүж хатаах']}/>; }
function Method() { return <Flow steps={['Таамаглал', 'Төлөвлөх', 'Нотолгоо гаргах', 'Үнэлэх, шинэ асуулт гаргах']}/>; }
function Models() {
  const [model, setModel] = useState(2);
  const labels = ['Томсон 1897', 'Резерфорд 1911', 'Бор 1913', 'Чедвик 1932'];
  return <View style={{ gap: 12 }}><View style={ui.row}>{labels.map((label, i) => <GameButton key={label} title={label} size="sm" variant={model === i ? 'primary' : 'secondary'} onPress={() => setModel(i)}/>)}</View>
    <Svg width="100%" height={180} viewBox="0 0 260 180">
      {model === 0 ? <Circle cx={130} cy={90} r={65} fill={Colors.goldDark} opacity={0.5}/> : <Circle cx={130} cy={90} r={9} fill={Colors.gold}/>}
      {model === 2 && <><Circle cx={130} cy={90} r={32} fill="none" stroke={Colors.textDim}/><Circle cx={130} cy={90} r={65} fill="none" stroke={Colors.textDim}/></>}
      {model === 3 && <Circle cx={142} cy={90} r={9} fill={Colors.silver}/>}
      {Array.from({ length: 6 }, (_, i) => <Circle key={i} cx={130 + (model === 0 ? 43 : 65) * Math.cos(i * Math.PI / 3)} cy={90 + (model === 0 ? 43 : 65) * Math.sin(i * Math.PI / 3)} r={4} fill={Colors.cyan}/>)}
    </Svg><AppText>{['Эерэг цэнэгтэй биет дотор электронууд байрлах түүхэн загвар.', 'Төвдөө жижиг цөмтэй; атомын ихэнх нь хоосон зай.', 'Электронууд тодорхой энергийн давхраанд байрлана.', 'Цөмд протонтой хамт нейтрон байна.'][model]}</AppText>
  </View>;
}
const SERIES = ['K', 'Na', 'Ca', 'Mg', 'Al', 'C', 'Zn', 'Fe', 'Pb', 'H', 'Cu', 'Ag', 'Au'];
function Series() {
  return <View style={{ gap: 7 }}>{SERIES.map((symbol, i) => <View key={symbol} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><AppText style={{ width: 35 }}>{symbol}</AppText><View style={{ width: `${75 - i * 5}%`, height: 12, backgroundColor: ['C', 'H'].includes(symbol) ? Colors.gold : Colors.cyan, borderRadius: 4 }}/></View>)}<AppText variant="caption">Дээрээс доош идэвх буурна. C, H нь металл биш; харьцуулахад оруулсан.</AppText></View>;
}
export function Displacer() {
  const [metal, setMetal] = useState('Zn');
  const [salt, setSalt] = useState('Cu');
  const metals = ['Mg', 'Al', 'Zn', 'Fe', 'Pb', 'Cu', 'Ag'];
  return <View style={{ gap: 12 }}><AppText>Металл сонго</AppText><View style={ui.row}>{metals.map((m) => <GameButton key={m} title={m} size="sm" variant={m === metal ? 'primary' : 'secondary'} onPress={() => setMetal(m)}/>)}</View><AppText>Давс дахь металл сонго</AppText><View style={ui.row}>{metals.map((m) => <GameButton key={m} title={m} size="sm" variant={m === salt ? 'primary' : 'secondary'} onPress={() => setSalt(m)}/>)}</View><AppText color={SERIES.indexOf(metal) < SERIES.indexOf(salt) ? Colors.success : Colors.gold}>{metal === salt ? 'Ижил металл: халах урвал явагдахгүй.' : SERIES.indexOf(metal) < SERIES.indexOf(salt) ? `${metal} илүү идэвхтэй тул ${salt}-ийг давсны уусмалаас хална.` : `${metal} идэвх багатай тул ${salt}-ийг халж чадахгүй.`}</AppText><AppText variant="caption">Идэвхийн эгнээнд суурилсан сургалтын таамаг. Бодит нөхцөл, хамгаалах ислийн үе нөлөөлж болно.</AppText></View>;
}
function RateGraph() {
  const [fast, setFast] = useState(false);
  return <View style={{ gap: 10 }}><Svg width="100%" height={200} viewBox="0 0 320 200" accessibilityRole="image" accessibilityLabel="Хийн эзлэхүүн хугацаагаар өсөж тогтворжих график">
    <Path d="M35 15 V165 H300" stroke={Colors.textMuted} fill="none"/>
    <Path d={fast ? 'M35 165 Q65 30 125 30 H295' : 'M35 165 Q150 30 260 30 H295'} fill="none" stroke={Colors.cyan} strokeWidth={4}/>
    <SvgText x={15} y={14} fill={Colors.textMuted} fontSize={11}>Хийн эзлэхүүн</SvgText><SvgText x={215} y={190} fill={Colors.textMuted} fontSize={12}>Хугацаа →</SvgText>
  </Svg><GameButton title={fast ? 'Удаан урвал' : 'Хурдан урвал'} size="sm" variant="secondary" onPress={() => setFast(!fast)}/><AppText>Налуу эгц = хурдан. Хэвтээ хэсэгт хий цааш ялгарахгүй. Ижил эцсийн хэмжээтэй урвалыг харьцуулсан бүдүүвч.</AppText></View>;
}
function Collision() {
  const [dense, setDense] = useState(false);
  return <View style={{ gap: 12 }}><Svg width="100%" height={150} viewBox="0 0 300 150"><Rect x={5} y={5} width={290} height={140} fill={Colors.input} stroke={Colors.textDim}/>{Array.from({ length: dense ? 36 : 12 }, (_, i) => <Circle key={i} cx={20 + i * 47 % 260} cy={20 + i * 31 % 110} r={5} fill={i % 2 ? Colors.cyan : Colors.gold}/>)}</Svg><GameButton title={dense ? 'Бага концентрац' : 'Их концентрац'} variant="secondary" size="sm" onPress={() => setDense(!dense)}/><AppText>Ижил эзлэхүүнд олон бөөм байх тусам нэгж хугацаан дахь мөргөлдөлт олширно.</AppText></View>;
}
function Surface() {
  const [n, setN] = useState(1);
  return <View style={{ gap: 12 }}><View style={ui.row}>{[1, 2, 10].map((v) => <GameButton key={v} title={`${v ** 3} хэсэг`} size="sm" variant={n === v ? 'primary' : 'secondary'} onPress={() => setN(v)}/>)}</View><Svg width="100%" height={160} viewBox="0 0 300 160">{Array.from({ length: Math.min(n, 10) ** 2 }, (_, i) => <Rect key={i} x={80 + (i % n) * (140 / n)} y={5 + Math.floor(i / n) * (140 / n)} width={140 / n - 2} height={140 / n - 2} fill={Colors.cyanDark} stroke={Colors.cyan}/>)}</Svg><AppText>Эхний шоо: 1 см³. {n ** 3} хэсэгт хуваавал нийт гадаргуу {6 * n} см²; эхний 6 см²-ээс {n} дахин их.</AppText></View>;
}
function ExoEndo() {
  const [exo, setExo] = useState(true);
  return <View style={{ gap: 12 }}><View style={ui.row}><GameButton title="Экзотерм" size="sm" variant={exo ? 'primary' : 'secondary'} onPress={() => setExo(true)}/><GameButton title="Эндотерм" size="sm" variant={!exo ? 'primary' : 'secondary'} onPress={() => setExo(false)}/></View><Svg width="100%" height={160} viewBox="0 0 280 160"><Rect x={75} y={15} width={22} height={110} rx={10} fill="none" stroke={Colors.textMuted}/><Rect x={81} y={exo ? 28 : 87} width={10} height={exo ? 100 : 41} fill={exo ? Colors.gold : Colors.cyan}/><Circle cx={86} cy={133} r={17} fill={exo ? Colors.gold : Colors.cyan}/><SvgText x={125} y={80} fill={Colors.text} fontSize={14}>{exo ? 'Температур ↑' : 'Температур ↓'}</SvgText></Svg><AppText>{exo ? 'Систем дулаан ялгаруулж, орчны температур өснө.' : 'Систем дулаан шингээж, орчны температур буурна.'}</AppText></View>;
}
function Particles() {
  return <View style={{ gap: 12 }}><Svg width="100%" height={180} viewBox="0 0 320 180"><Circle cx={95} cy={88} r={65} fill={Colors.textDim}/><Circle cx={220} cy={88} r={65 / 6} fill={Colors.gold}/><Circle cx={280} cy={88} r={65 / 24} fill={Colors.cyan}/><SvgText x={35} y={170} fill={Colors.textMuted}>Үс ≈60 мкм</SvgText><SvgText x={190} y={125} fill={Colors.textMuted}>PM10</SvgText><SvgText x={262} y={125} fill={Colors.textMuted}>PM2.5</SvgText></Svg><AppText>PM10 ≤ 10 мкм; PM2.5 ≤ 2.5 мкм. Диаметрийг нэг масштабаар харьцуулсан.</AppText></View>;
}
function Timeline() {
  const events = ['1669 · Фосфор · Брандт', '1766 · Устөрөгч · Кавендиш', '1774 · Хүчилтөрөгч · Пристли, Шееле', '1807 · Na, K · Дэви', '1808 · Mg, Ca · Дэви', '1869 · Үелэх хүснэгт · Менделеев', '1875 · Галли', '1894 · Аргон', '1898 · Ne, Kr, Xe'];
  const [selected, setSelected] = useState(0);
  return <View style={{ gap: 8 }}>{events.map((event, i) => <StudyChoice key={event} text={event} selected={selected === i} onPress={() => setSelected(i)}/>)}<AppText>{events[selected]}</AppText></View>;
}
export const FIGURES = {
  meniscus: Meniscus, saltflow: SaltFlow, models: Models, bohr: Bohr, atombuilder: AtomBuilder,
  pt20: FirstTwenty, timeline: Timeline, series: Series, displacer: Displacer, rategraph: RateGraph,
  collision: Collision, surface: Surface, exoendo: ExoEndo, method: Method, pm: Particles,
} satisfies Record<FigureName, ComponentType<Props>>;
export function StudyFigure({ name, args, caption }: { name: string; args?: Record<string, unknown>; caption?: string }) {
  const Figure = FIGURES[name as FigureName];
  return <View style={{ gap: 12 }}>{Figure ? <Figure args={args}/> : <AppText>Зураг: {name} — дүрслэл олдсонгүй.</AppText>}{caption && <AppText variant="caption">{caption}</AppText>}</View>;
}
