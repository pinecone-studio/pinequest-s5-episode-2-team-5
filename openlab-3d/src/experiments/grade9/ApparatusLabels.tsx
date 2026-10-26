import {Html} from '@react-three/drei';
import {useBenchView} from '../nacl/view';
import {useGuideCue} from '../workbench/guidance/runtime';
import {useShowcase} from '../workbench/guidance/showcase';
import {portLayout,portLabel} from './port-layout';
import {RIG_NAMES,type RigKind} from './kinds';
import {liquidMl,solidMassG} from '../../chemistry/mixture';
import type {RigState} from './process';
/** Screen-readable labels follow the same openings that receive the actual material. */
export function ApparatusLabels({id,kind,rig,onSelect}:{id?:string;kind:RigKind;rig?:RigState;onSelect:(i:number)=>void}){
 const selected=useBenchView(s=>s.selected===id),cue=useGuideCue(),flow=useShowcase(s=>s.flow),operating=useShowcase(s=>s.targetId===id&&!['none','measure'].includes(s.operation)&&['playing','paused'].includes(s.status));
 if(!id||!rig||!selected&&cue.target!==id)return null;
 const port=rig.port,m=rig.chambers[port],p=portLayout(kind,port).mouth;
 return <group>
  {rig.chambers.map((_,i)=>{const at=portLayout(kind,i).mouth;return <Html key={i} position={[at[0],at[1]+.012,at[2]]} center zIndexRange={[18,12]}><button onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onSelect(i);}} aria-label={`${i+1}. ${portLabel(kind,i)}`} className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[11px] font-bold shadow ${i===port?'border-white bg-sky-700 text-white':'border-slate-300 bg-white text-slate-700'}`}>{i+1}</button></Html>;})}
  {!operating&&<Html position={[p[0],Math.max(.28,p[1]+.10),p[2]]} center zIndexRange={[19,13]} style={{pointerEvents:'none'}}>
   <div className="w-44 rounded-xl border border-sky-200 bg-white/95 p-2 text-[11px] leading-snug text-slate-800 shadow-lg" aria-label="Багажийн нэр ба идэвхтэй хэсэг">
    <p className="text-[9px] text-slate-500">{RIG_NAMES[kind]}</p><b className="mt-1 block text-sky-800">{port+1}. {portLabel(kind,port)}</b>
    <p className="mt-1">{m?`${liquidMl(m).toFixed(1)} мл · ${solidMassG(m).toFixed(2)} г · ${m.temp.toFixed(1)}°C`:''}</p>
    <p className="mt-1 border-t border-slate-100 pt-1">{flow&&cue.target===id?'↓ Энэ хэсэгт бодис орж байна':rig.heating?'Халааж байна':rig.cooling?'Хөргөж байна':rig.running?'Урвал / хэмжилт явагдаж байна':'Дугаарт дарж хэсгийг сонгоно'}</p>
   </div>
  </Html>}
 </group>;
}
