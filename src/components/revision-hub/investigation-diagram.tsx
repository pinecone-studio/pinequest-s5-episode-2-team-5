import Svg,{Circle,Line,Rect,Text} from 'react-native-svg';
import { investigationDiagram } from '@/lib/investigation-diagram';
import type { InvestigationDefinition, Trial } from '@/lib/textbook-investigations';
export function InvestigationDiagram({definition,trial}:{definition:InvestigationDefinition;trial:Trial}){
 return <Svg width="100%" height={180} viewBox="0 0 280 180" accessibilityLabel="Сонгосон хэмжилтийн багажийн загвар">{investigationDiagram(definition,trial).map((s,i)=>s.kind==='circle'?<Circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.fill} stroke={s.stroke}/>:s.kind==='rect'?<Rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} fill={s.fill} stroke={s.stroke}/>:s.kind==='line'?<Line key={i} x1={s.x} y1={s.y} x2={s.x2} y2={s.y2} stroke={s.stroke}/>:<Text key={i} x={s.x} y={s.y} fill={s.fill} fontSize={11}>{s.text}</Text>)}</Svg>;
}
