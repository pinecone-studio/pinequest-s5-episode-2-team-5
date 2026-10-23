import { investigationDiagram } from '../../../../src/lib/investigation-diagram';
import type { InvestigationDefinition, Trial } from '../../../../src/lib/textbook-investigations';
export function InstrumentDiagram({definition,trial}:{definition:InvestigationDefinition;trial:Trial}){
 return <svg viewBox="0 0 280 180" role="img" aria-label="Сонгосон хэмжилтийн багажийн загвар" className="mt-2 w-full max-h-48 rounded bg-slate-900">{investigationDiagram(definition,trial).map((s,i)=>s.kind==='circle'?<circle key={i} cx={s.x} cy={s.y} r={s.r} fill={s.fill} stroke={s.stroke}/>:s.kind==='rect'?<rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} fill={s.fill} stroke={s.stroke}/>:s.kind==='line'?<line key={i} x1={s.x} y1={s.y} x2={s.x2} y2={s.y2} stroke={s.stroke}/>:<text key={i} x={s.x} y={s.y} fill={s.fill} fontSize={11}>{s.text}</text>)}</svg>;
}
