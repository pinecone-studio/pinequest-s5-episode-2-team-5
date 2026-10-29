import {Html,Line} from '@react-three/drei';
import {Vector3,type Camera,type Object3D} from 'three';
import {hudTop} from '../workbench/guidance/hud-space';
import {useBenchView} from '../nacl/view';
import {useGuideCue} from '../workbench/guidance/runtime';
import {useShowcase} from '../workbench/guidance/showcase';
import {portLayout,portLabel} from './port-layout';
import {RIG_NAMES,type RigKind} from './kinds';
import {liquidMl,solidMassG} from '../../chemistry/mixture';
import type {RigState} from './process';
/** Half the callout's size in px (w-48, four short lines). */
const HALF_W=100,HALF_H=58;
const at=new Vector3();
/** The callout follows its opening but never leaves the screen or slides under a top overlay. */
function keepOnScreen(el:Object3D,camera:Camera,size:{width:number;height:number}){
 at.setFromMatrixPosition(el.matrixWorld).project(camera);
 const x=(at.x+1)*size.width/2,y=(1-at.y)*size.height/2;
 return [Math.min(Math.max(x,HALF_W+8),size.width-HALF_W-8),Math.max(Math.min(y,size.height-HALF_H-8),hudTop()+HALF_H+8)];
}
/** Only the active opening gets a full callout; the numbered parts stay tappable. */
export function ApparatusLabels({id,kind,rig,onSelect}:{id?:string;kind:RigKind;rig?:RigState;onSelect:(i:number)=>void}){
 const selected=useBenchView(s=>s.selected===id),target=useGuideCue(s=>s.target),flow=useShowcase(s=>s.flow);
 if(!id||!rig||!selected&&target!==id)return null;
 const port=rig.port,m=rig.chambers[port],p=portLayout(kind,port,rig.experiment).mouth;
 const anchor:[number,number,number]=[p[0],Math.max(.29,p[1]+.085),p[2]];
 const receiving=!!flow&&target===id;
 return <group>
  {rig.chambers.map((_,i)=>{const at=portLayout(kind,i,rig.experiment).mouth;return <Html key={i} position={[at[0],at[1]+.012,at[2]]} center zIndexRange={[18,12]}><button onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onSelect(i);}} aria-label={`${i+1}. ${portLabel(kind,i,rig.experiment)}`} aria-pressed={i===port} title={portLabel(kind,i,rig.experiment)} className={`flex h-9 w-9 touch-manipulation items-center justify-center rounded-full border-2 text-sm font-bold shadow-md ${i===port?'border-white bg-sky-800 text-white':'border-slate-300 bg-white text-slate-800'}`}>{i+1}</button></Html>;})}
  <Line points={[p,[p[0],anchor[1]-.018,p[2]]]} color={receiving?'#f5b800':'#42768d'} lineWidth={1.5}/>
  <Html position={anchor} center zIndexRange={[19,13]} calculatePosition={keepOnScreen} style={{pointerEvents:'none'}}>
   <div className="w-48 rounded-lg border border-slate-300 bg-white/95 p-2 text-xs leading-relaxed text-slate-800 shadow-lg" aria-label="Багажийн нэр ба идэвхтэй хэсэг">
    <p className="text-[10px] font-medium text-slate-500">{RIG_NAMES[kind]}</p><b className="block text-sky-900">{port+1}. {portLabel(kind,port,rig.experiment)}</b>
    <p className="font-mono tabular-nums">{m?`${liquidMl(m).toFixed(1)} мл · ${solidMassG(m).toFixed(2)} г · ${m.temp.toFixed(1)}°C`:''}</p>
    <p className="border-t border-slate-200 pt-1">{receiving?'↓ Бодис орох амсар':rig.heating?'Халаалт асаалттай':rig.cooling?'Хөргөлт асаалттай':rig.running?'Ажиллаж байна · заалт ба доторх өөрчлөлтийг ажигла':'Дугаараар хэсгийг сонгоно'}</p>
   </div>
  </Html>
 </group>;
}
