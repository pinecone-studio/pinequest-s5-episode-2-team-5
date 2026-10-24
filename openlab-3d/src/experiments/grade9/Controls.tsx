import {useEffect} from 'react';
import {useGrade9Apparatus} from './store';
import {rigReadings} from './process';
import {isGrade9Rig,RIG_NAMES} from './kinds';
import {itemDescription} from '../workbench/session';
import {useLabStore} from '../../store/useLabStore';
import {useChemStore} from '../../store/useChemStore';
import {emptyMixture,liquidMl,solidMassG} from '../../chemistry/mixture';
import {emitLab} from '../../lab/events';
export function Grade9Controls({id}:{id:string}){
 const item=itemDescription(id),kind=item.kind;
 const rig=useGrade9Apparatus(s=>s.rigs[id]);
 useEffect(()=>{if(kind&&isGrade9Rig(kind))useGrade9Apparatus.getState().ensure(id,useLabStore.getState().active??'',kind);},[id,kind]);
 if(!kind||!isGrade9Rig(kind)||!rig)return null;
 const store=useGrade9Apparatus.getState(),change=(x:Parameters<typeof store.change>[1])=>store.change(id,x);
 const start=()=>{store.start(id);if(kind==='gasTrain'&&useGrade9Apparatus.getState().rigs[id].running){store.change(id,{port:0});useChemStore.getState().setMixtures({[id]:useGrade9Apparatus.getState().rigs[id].chambers[0]});}if(useGrade9Apparatus.getState().rigs[id].running)emitLab({key:`g9:${rig.experiment}:operate`,quiet:true,itemId:id});};
 const names=kind==='gasTrain'?['Урвалын сав','Нэмэх бодис','Хий хүлээн авах сав']:kind==='chromatographyTank'?['Ус / уусгагч','Бэхний толбо','Цаас']:kind==='calorimeter'?['Усны сав','Спиртэн дэн','Нөөц']:kind==='diffusionTube'?['Зүүн төгсгөл','Баруун төгсгөл','Нөөц']:kind==='diffusionCell'?['Ус / үндсэн орчин','Тархах бодис','Желатин / цаас']:kind==='conductivityTester'?['Шалгах дээж','Нөөц','Нөөц']:['Эхний сав','Хоёр дахь сав','Нөөц'];
 const button='min-h-10 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold';
 return <div className="my-3 space-y-2 border-t border-slate-200 pt-3" aria-label="IX ангийн багажийн удирдлага">
  <b className="block text-xs">{RIG_NAMES[kind]}</b>
  <p className="text-[11px]">Тасалгаагаа сонго → бодисоо авч өмнөхтэй адил цутга / халбагаар хий.</p>
  <div className="flex flex-wrap gap-1">{rig.chambers.map((m,i)=><button key={i} className={`${button} ${rig.port===i?'border-sky-600 bg-sky-100':''}`} aria-pressed={rig.port===i} onClick={()=>{change({port:i});useChemStore.getState().setMixtures({[id]:m});}}>{kind==='corrosionRack'||kind==='reactionTile'?`Үүр ${i+1}`:names[i]} · {liquidMl(m).toFixed(1)} мл / {solidMassG(m).toFixed(2)} г</button>)}</div>
  <div className="flex flex-wrap gap-1">
   <button className={button} onClick={start}>{kind==='gasTrain'?'② → ① Холих · урвалыг ажиглах':rig.running?'Ажиллаж байна · үргэлжлүүлэх':'Багажийг ажиллуулах'}</button>
   <button className={button} disabled={!rig.running} onClick={()=>change({running:false})}>Түр зогсоох</button>
   {['heatingBath','gasTrain','calorimeter','gasSyringe','fractionatingColumn'].includes(kind)&&rig.experiment!=='g9-citric-endotherm'&&<button className={button} aria-pressed={rig.heating} onClick={()=>change({heating:!rig.heating,cooling:false})}>{rig.heating?'Халаалт унтраах':'Халаалт асаах'}</button>}
   {(['gasSyringe','fractionatingColumn'].includes(kind)||kind==='gasTrain'&&rig.experiment==='g9-reaction-types')&&<><button className={button} aria-pressed={rig.cooling} onClick={()=>change({cooling:!rig.cooling,heating:false})}>Хөргөх</button><button className={button} onClick={()=>change({initialAir:rig.experiment==='g9-gas-expansion'?10:100,gas:rig.experiment==='g9-gas-expansion'?10:100,extent:0,temperature:22})}>Агаар соруулах · {rig.experiment==='g9-gas-expansion'?'10':'100'} мл</button></>}
   {kind==='gasTrain'&&<button className={button} aria-pressed={rig.closed} onClick={()=>change({closed:!rig.closed})}>{rig.closed?'Хий хураах · битүү систем':'Хий гарах · задгай систем'}</button>}
   {kind==='convectionCell'&&<button className={button} aria-pressed={rig.hotAbove} onClick={()=>change({hotAbove:!rig.hotAbove})}>{rig.hotAbove?'Эхний сав дээр':'Эхний сав доор'}</button>}
   {kind==='corrosionRack'&&<button className={button} aria-pressed={rig.scratched} onClick={()=>change({scratched:!rig.scratched})}>{rig.scratched?'Бүрхүүл сэвтэй':'Бүрхүүл бүтэн'}</button>}
   <button className={button} onClick={()=>{const chambers=rig.chambers.map((m,i)=>i===rig.port?emptyMixture():m);change({chambers,running:false});useChemStore.getState().setMixtures({[id]:emptyMixture()});}}>Сонгосон үүрийг хоослох</button>
  </div>
  <p role="status" className="rounded bg-sky-50 p-2 text-xs text-sky-900">{rig.message}</p>
  <dl className="text-[11px]">{rigReadings(rig).map((r,i)=><div key={i} className="flex justify-between gap-2"><dt>{r.label}</dt><dd className="font-mono">{r.value.toFixed(2)} {r.unit}</dd></div>)}</dl>
  <p className="text-[10px] text-slate-500">Хэмжилтээ Судалгааны дэвтэрт авна. Тээвэрлэлт, зэврэлтийн хурд нь сургалтын ойролцоо загвар; бодисын хэмжээ ба урвалын харьцаа үр дүнд нөлөөлнө.</p>
 </div>;
}
