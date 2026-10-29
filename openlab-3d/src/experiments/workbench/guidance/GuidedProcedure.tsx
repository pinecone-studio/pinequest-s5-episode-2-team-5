import {ObservationReadout} from './ObservationReadout';
import {ApparatusKey} from './ApparatusKey';
import {DemoProgress,type DemoState} from './DemoProgress';
import {useProtocolResults,beginProtocolResults} from './results';
import {ShowcaseLauncher} from './ShowcaseLauncher';
import {prepareShowcaseEquipment} from './prepare';
import {cancelEquipmentTour,startEquipmentTour} from './equipment-tour';
import {useShowcaseLaunch} from './launch-store';
import {useEffect,useMemo,useState,useRef} from 'react';
import type {InvestigationDefinition} from '../../../../../src/lib/textbook-investigations';
import {useWorkbench,clearExperimentSession,beginPreparation,demonstratePreparation} from '../session';
import {useGameStore} from '../../../store/useGameStore';
import {useGrade9Apparatus} from '../../grade9/store';
import {REAGENTS} from '../../../chemistry/reagents';
import {guidedPlan,physicalShowcasePlan} from './plans';
import {useShowcase,beginShowcase,pauseShowcase,cancelShowcase} from './showcase';
import {portLabel} from '../../grade9/port-layout';
import {liquidMl,solidMassG} from '../../../chemistry/mixture';
import {focusGuideStep,executeGuideStep,clearGuideCue,useGuideCue,stepLabel,portName,rigName,doseUnit} from './runtime';

/** false бол ширээний заавар самбарт «Бүтэн төлөвлөгөө ба харьцуулах арга»-аас дээших бүх хэсэг (алхамын карт, товчнууд г.м) харагдахгүй; код хэвээр, true болгоход буцаж гарна */
export const SHOW_GUIDE_STEP_BLOCKS: boolean = false;

export function GuidedProcedure({definition:def}:{definition:InvestigationDefinition}){
 const card=useRef<HTMLElement>(null);
 const launchRequest=useShowcaseLaunch();
 const [fullShowcase,setFullShowcase]=useState(false);
 const plan=useMemo(()=>(fullShowcase?physicalShowcasePlan(def.id):guidedPlan(def.id))!,[def.id,fullShowcase]);
 const showcase=useShowcase();
 const protocol=useProtocolResults();
 const session=useWorkbench(s=>s.sessions[def.id]);const mode=useGameStore(s=>s.mode);
 const [index,setIndex]=useState(0),[automatic,setAutomatic]=useState(false),[demonstrating,setDemonstrating]=useState(false),[message,setMessage]=useState(''),[completed,setCompleted]=useState<number[]>([]);
 const target=session?.objects[def.labRig??''];
 const rig=useGrade9Apparatus(s=>target?s.rigs[target]:undefined);
 const step=plan[index],last=index===plan.length-1;
 const animationKey=`${def.id}:${target}:${index}`;
 const animating=showcase.key===animationKey&&showcase.status==='playing';
 const button='min-h-11 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40';
 useEffect(()=>()=>{cancelEquipmentTour();cancelShowcase();clearGuideCue();if(useShowcaseLaunch.getState().id===def.id)useShowcaseLaunch.setState({id:null});},[def.id]);
 useEffect(()=>{const panel=card.current?.closest('aside');if(panel)panel.scrollTop=0;},[index,automatic]);
 useEffect(()=>{if(mode!=='bench'){cancelEquipmentTour();setAutomatic(false);cancelShowcase();clearGuideCue();}},[mode]);
 useEffect(()=>{if(mode==='bench'&&target&&session?.ready&&demonstrating)focusGuideStep(def,step,automatic,!(showcase.key===animationKey&&['playing','paused'].includes(showcase.status)));},[def,step,target,session?.ready,demonstrating,automatic,mode]);
 useEffect(()=>{
  if(!automatic||!target||!session?.ready||mode!=='bench')return;
  if(completed.includes(index)){if(index<plan.length-1)setIndex(i=>i+1);else setAutomatic(false);return;}
  beginShowcase(def,step,animationKey);
 },[automatic,target,session?.ready,mode,completed,index,plan.length,step,def,animationKey]);
 useEffect(()=>{
  if(showcase.key!==animationKey)return;
  if(showcase.status==='failed'){setAutomatic(false);setMessage(showcase.message);}
  if(showcase.status==='done'){
   setCompleted(v=>v.includes(index)?v:[...v,index]);setMessage(showcase.message);
  }
 },[showcase.status,showcase.key,showcase.message,animationKey,index]);
 const begin=()=>{
  cancelShowcase();beginProtocolResults(def.id);clearExperimentSession(def.id);beginPreparation();demonstratePreparation();prepareShowcaseEquipment(def);setFullShowcase(true);
  setIndex(0);setCompleted([]);setMessage('3D үзүүлбэр: савыг өргөж, хэмжиж нэмээд багажийг ажиллуулна. Дараа нь урвалын үр дүнг харуулна.');setDemonstrating(true);
  // First every piece on the bench, by name, then the procedure.
  startEquipmentTour(()=>setAutomatic(true));
 };
 useEffect(()=>{if(launchRequest.id===def.id){useShowcaseLaunch.setState({id:null});begin();}},[launchRequest.id,launchRequest.sequence,def.id]);
 const pause=()=>{pauseShowcase();setAutomatic(false);useGuideCue.setState({playing:false});};
 const stop=()=>{pause();cancelShowcase();setDemonstrating(false);clearGuideCue();};
 const finished=completed.includes(plan.length-1),failed=showcase.key===animationKey&&showcase.status==='failed';
 const demoState:DemoState=finished?'done':failed?'failed':automatic||animating?'playing':'paused';
 const lastRecord=protocol.experiment===def.id?protocol.records[protocol.records.length-1]:undefined;
 const progress=demonstrating&&mode==='bench'&&<DemoProgress state={demoState} index={index} total={plan.length} label={stepLabel(step,def.labRig!,def.id)}
  detail={finished&&protocol.experiment===def.id&&protocol.complete?'Эцсийн төлөвийг бодит хэмжилтээр шалгалаа.':finished||failed?message:`${showcase.phase}${step.type==='dose'&&showcase.key===animationKey?` · ${showcase.delivered.toFixed(1)} / ${step.amount} ${doseUnit(step.reagent)}`:''}`}
  live={rig?`${rig.port+1}. ${portLabel(rig.kind,rig.port,rig.experiment)} · ${liquidMl(rig.chambers[rig.port]).toFixed(1)} мл · ${solidMassG(rig.chambers[rig.port]).toFixed(2)} г · ${rig.temperature.toFixed(1)}°C`:undefined}
  readings={lastRecord?.readings.filter(r=>r.label!=='Хугацаа').slice(0,6)} onPause={pause} onResume={()=>setAutomatic(true)} onReplay={begin} onClose={stop}/>;
 return <>{panel()}{progress}</>;
 function panel(){
 if(!session?.ready&&!automatic&&!animating)return <ShowcaseLauncher definition={def}/>;
 if(automatic||animating)return <section ref={card} className="mt-2 space-y-2 text-xs" aria-label="Тодорхой тунтай алхамчилсан заавар">
  <div className="flex items-center justify-between"><b>▶ Бүтэн 3D үзүүлбэр</b><span>{index+1} / {plan.length}</span></div>
  <p className="font-semibold">{stepLabel(step,def.labRig!,def.id)}</p>
  <p role="status" className="rounded bg-sky-50 p-2">{showcase.phase}{step.type==='observe'&&step.until?.speed?` · Загварын хугацаа ×${step.until.speed}`:''}{step.type==='dose'?` · ${showcase.delivered.toFixed(2)} / ${step.amount} ${doseUnit(step.reagent)}`:''}</p>
  {rig?.equation&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-emerald-900"><b className="block text-[10px]">Явагдаж буй өөрчлөлт</b><p className="mt-1">{rig.equation}</p></div>}
  <ObservationReadout/>
  <ApparatusKey rig={rig} id={target}/>
  <div className="flex gap-2"><button className={`${button} flex-1 bg-amber-50`} onClick={pause}>Авто үзүүлбэрийг түр зогсоох</button><button className={button} onClick={()=>{pause();cancelShowcase();setDemonstrating(false);clearGuideCue();}}>Өөрөө хийх</button></div>
 </section>;
 return <section ref={card} className="mt-2 space-y-2 text-xs" aria-label="Тодорхой тунтай алхамчилсан заавар">
  {SHOW_GUIDE_STEP_BLOCKS&&<>
  {protocol.experiment===def.id&&protocol.complete&&<div className="rounded-xl border border-emerald-400 bg-emerald-50 p-3" role="status" aria-label="Туршилтын баталгаажсан үр дүн"><b>✓ Туршилт бүрэн дууслаа</b><p>Эцсийн төлөвийг бодит хэмжилтээр шалгалаа.</p><details><summary className="min-h-10 py-2">Үе шат бүрийн хэмжилт ({protocol.records.length})</summary>{protocol.records.map((r,i)=><div key={i} className="mb-2 border-t pt-2"><b>{r.label}</b>{r.readings.map((v,j)=><p key={j}>{v.label}: {v.value.toPrecision(4)} {v.unit}</p>)}</div>)}</details></div>}
  <ObservationReadout/>
  <ApparatusKey rig={rig} id={target}/>
  <ShowcaseLauncher definition={def}/>
  <div className="flex items-center justify-between gap-2"><strong>Алхам {index+1} / {plan.length}</strong><span className="text-slate-500">{automatic||animating?'3D үзүүлбэр':demonstrating?'Үзүүлбэр түр зогссон':'Өөрөө хийх'}</span></div>
  {(automatic||animating)&&<button className={`${button} w-full border-amber-300 bg-amber-50`} onClick={pause}>Авто үзүүлбэрийг түр зогсоох</button>}
  <div className="h-1 overflow-hidden rounded bg-slate-100" aria-hidden="true"><div className="h-full bg-sky-600" style={{width:`${(index+1)/plan.length*100}%`}}/></div>
  <div className="rounded-xl border border-sky-200 bg-sky-50 p-3" aria-live="polite" aria-atomic="true">
   <p className="text-[10px] font-bold uppercase text-sky-700">{step.type==='dose'?'Юуг · Хэдийг · Хаана':step.type==='configure'?'Тохируулах':step.type==='start'?'Ажиллуулах':'Ажиглаж хэмжих'}</p>
   {step.type==='dose'?<><strong className="mt-1 block text-sm">{REAGENTS[step.reagent].name}</strong><div className="mt-2 flex items-center gap-2"><b className="rounded-lg bg-white px-3 py-2 text-lg text-sky-950">{step.amount} {doseUnit(step.reagent)}</b><span aria-hidden="true">→</span><b>{portName(def.labRig!,step.port,def.id)}</b></div><p className="mt-2 leading-relaxed">Энэ бодисын савыг ав → {portName(def.labRig!,step.port,def.id)}-ийг сонго → хэмжсэн хэсгийг хий.</p></>:<p className="mt-1 text-sm font-semibold leading-relaxed">{step.label}</p>}
   <p className="mt-2 text-[11px] text-slate-600">Багаж: {rigName(def.labRig!)}</p>
  </div>
  <div className="flex gap-2"><button className={`${button} flex-1 border-sky-300 text-sky-800`} disabled={!session?.ready} onClick={()=>{pause();setDemonstrating(true);focusGuideStep(def,step);}}>Багаж дээр заах ↓</button>{!automatic&&!animating&&!last&&<button className={button} disabled={!session?.ready||completed.includes(index)} onClick={()=>{
   setDemonstrating(true);focusGuideStep(def,step,true);beginShowcase(def,step,animationKey);
  }}>{completed.includes(index)?'Гүйцэтгэсэн ✓':'Энэ үйлдлийг үзүүлэх'}</button>}</div>
  {showcase.key===animationKey&&['playing','paused'].includes(showcase.status)&&<p className="rounded bg-sky-100 p-2 font-semibold" role="status">{showcase.phase}{step.type==='observe'&&step.until?.speed?` · Загварын хугацаа ×${step.until.speed}`:''}{step.type==='dose'?` · ${showcase.delivered.toFixed(2)} / ${step.amount} ${doseUnit(step.reagent)}`:''}</p>}
  {rig&&<p className="text-[11px] text-slate-600" role="status">{rig.running?'● Ажиллаж байна':'○ Зогссон'} · {rig.temperature.toFixed(1)}°C · {rig.elapsed.toFixed(0)} с{rig.equation?` · ${rig.equation}`:''}</p>}
  {message&&!last&&<p className="rounded bg-amber-50 p-2 leading-relaxed" role="status">{message}</p>}
  <div className="flex gap-2"><button className={button} disabled={automatic||animating||index===0} onClick={()=>{pause();setMessage('');setIndex(i=>i-1);}}>← Өмнөх</button><button className={`${button} flex-1 bg-sky-700 text-white`} disabled={automatic||animating} onClick={()=>{pause();setMessage('');if(last){const result=executeGuideStep(def,step);setMessage(result.message);if(result.ok){cancelShowcase();setDemonstrating(false);clearGuideCue();}}else if(step.type==='record'){const result=executeGuideStep(def,step);setMessage(result.message);if(result.ok)setIndex(i=>i+1);}else setIndex(i=>i+1);}}>{last?'Эцсийн үр дүнг шалгах':completed.includes(index)?'Дараах алхам →':'Өөрөө хийсэн · Дараах →'}</button></div>
  {!automatic&&demonstrating?<div className="flex gap-2">{!last&&<button className={`${button} flex-1`} onClick={()=>setAutomatic(true)}>Авто үргэлжлүүлэх</button>}<button className={button} onClick={()=>{pause();cancelShowcase();setDemonstrating(false);clearGuideCue();setMessage('Багаж, бодис хэвээр үлдлээ. Одоо өөрөө үргэлжлүүл.');}}>Өөрөө үргэлжлүүлэх</button></div>:null}
  </>}
  <details><summary className="min-h-10 cursor-pointer py-2 text-slate-600">Бүтэн төлөвлөгөө ба харьцуулах арга</summary><p className="mb-2">Энэ нь аппын эхний жишээ туршилтын тун. Номын тогтмол тун гэж үзэхгүй; дараа нь нэг нөхцөл өөрчилж харьцуул.</p><ol className="list-decimal space-y-2 pl-5">{plan.map((s,i)=><li key={i}><button className="text-left" disabled={automatic} onClick={()=>{setIndex(i);setMessage('');}}>{stepLabel(s,def.labRig!,def.id)}</button></li>)}</ol><div className="mt-3 border-t pt-2">{def.method?.map((text,i)=><p key={i} className="mt-2">{text}</p>)}</div></details>
 </section>;
 }
}
