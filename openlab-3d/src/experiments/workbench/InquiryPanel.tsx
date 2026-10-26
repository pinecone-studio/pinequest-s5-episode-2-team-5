import { formatMeasurement } from '../../../../src/lib/measurement-format';
import {useSandbox} from '../nacl/sandbox';
import {useGrade9Apparatus} from '../grade9/store';
import {rigReadings} from '../grade9/process';
import { InstrumentDiagram } from './InstrumentDiagram';
import { useState } from 'react';
import { requiresBenchEvidence, investigationById, newAttempt, parameterValues, runModel, measurementSeries, type InvestigationDefinition, type Trial } from '../../../../src/lib/textbook-investigations';
import { useInquiry } from './inquiry-store';
import { currentSession, itemDescription } from './session';
import { useLabStore } from '../../store/useLabStore';
import { useGameStore } from '../../store/useGameStore';
import { useBenchView } from '../nacl/view';
import { useChemStore, mixtureOf } from '../../store/useChemStore';
import { liquidMl, solidMassG } from '../../chemistry/mixture';
import { phOf } from '../../chemistry/equilibrium';
import { describe } from '../nacl/sandbox';
import { useInventoryStore } from '../../store/useInventoryStore';
import { emitLab } from '../../lab/events';
import { experimentById } from '../../lab/experiments';
import { endHeldUse } from '../../interaction/useHeld';

export function InquiryPanel() {
  const id=useLabStore((s)=>s.active),mode=useGameStore((s)=>s.mode);
  const [open,setOpen]=useState(false);
  if (!id || mode!=='bench' || !currentSession()?.ready) return null;
  return <><button className="fixed right-3 top-3 z-[54] min-h-10 rounded-full bg-white px-3 py-2 text-xs font-bold text-sky-900 shadow" onClick={()=>{endHeldUse();setOpen(!open);}}>Судалгааны дэвтэр</button>
    {open && <InquiryContents key={id} id={id} close={()=>setOpen(false)}/>}</>;
}
function InquiryContents({id,close}:{id:string;close:()=>void}) {
  const lesson=experimentById(id)!;
  const def:InvestigationDefinition=investigationById(id)??{id,title:lesson.title,mode:'bench',model:'bench',bookPages:'',practicalIds:[],controls:[],supplies:[],prompt:lesson.goal,variables:'Нэг хүчин зүйлийг өөрчилж, бусдыг тогтмол байлга. Нэмсэн хэмжээ, хугацаа, температур болон ажиглалтаа тэмдэглэ.',safety:lesson.safety};
  const stored=useInquiry((s)=>s.attempts[id]);
  const attempt=stored??newAttempt();
  const [parameters,setParameters]=useState(()=>parameterValues(def));
  const [message,setMessage]=useState('');
  const [compare,setCompare]=useState(false);
  const [metric,setMetric]=useState<string>();
  const commit=(next:typeof attempt)=>{
    useInquiry.getState().put(id,next);
    const result={type:'openlab:investigation-result',version:1,id,attempt:next};
    if(window.parent!==window)window.parent.postMessage(result,window.location.origin);
    else (window as Window & {ReactNativeWebView?:{postMessage:(value:string)=>void}}).ReactNativeWebView?.postMessage(JSON.stringify(result));
  };
  const sample=()=>{
    if(attempt.prediction.trim().length<10){setMessage('Эхлээд юу болохыг таамаглаад, шалтгаанаа бич.');return;}
    let trial:Trial;
    const measuredVessel=useBenchView.getState().selected??useSandbox.getState().inspected??(def.labRig?currentSession()?.objects[def.labRig]:undefined);
    const apparatus=useGrade9Apparatus.getState().rigs;
    const measuredRig=def.labRig?(apparatus[measuredVessel??'']??apparatus[currentSession()?.objects[def.labRig]??'']??Object.values(apparatus).find(r=>r.experiment===id&&r.kind===def.labRig)):undefined;
    if(def.mode==='model') trial=runModel(def,parameters);
    else if(measuredRig)trial={source:'bench',parameters:{},at:Date.now(),readings:rigReadings(measuredRig),observation:measuredRig.message};
    else {
      const vessel=measuredVessel;
      if(!vessel || !(describe(vessel).capacity>0)){setMessage('Хэмжих савыг эхлээд ширээн дээр сонго.');return;}
      const description=itemDescription(vessel),inv=useInventoryStore.getState();
      const variant=(inv.held?.id===vessel?inv.held:inv.worldItems.find((x)=>x.id===vessel))?.variant;
      const m=useChemStore.getState().mixtures[vessel]??mixtureOf(vessel,variant);
      const measuredPh=phOf(m);
      trial={source:'bench',parameters:{},at:Date.now(),observation:`${describe(vessel).label}${description.reagent?' · урвалжийн эх сав':''}`,readings:[{label:'Эзэлхүүн',value:liquidMl(m),unit:'мл'},{label:'Температур',value:m.temp,unit:'°C'},...(measuredPh===null?[]:[{label:'pH',value:measuredPh,unit:''}]),{label:'Хатуу бодис',value:solidMassG(m),unit:'г'},{label:'Хөөсний эзэлхүүн',value:m.foam,unit:'мл'},{label:'Эхний хэмжилтээс хойш',value:attempt.trials.length?(Date.now()-attempt.trials[0].at)/1000:0,unit:'с'}]};
    }
    const rig=useGrade9Apparatus.getState().rigs[measuredVessel??''];
    if(rig&&def.mode==='bench'&&rig.experiment===id){trial={source:'bench',parameters:{},at:Date.now(),readings:rigReadings(rig),observation:rig.message};}
    const next={...attempt,trials:[...attempt.trials,trial].slice(-30)};commit(next);setMessage('Хэмжилт нэмэгдлээ. Нөхцөлөө өөрчилж дараагийн хэмжилт ав.');
    emitLab({key:`inquiry:${id}:predict${requiresBenchEvidence(def)?'-bench':''}`,quiet:true});
    if((requiresBenchEvidence(def)?next.trials.filter(t=>t.source==='bench'):next.trials).length>=2)emitLab({key:`inquiry:${id}:measure${requiresBenchEvidence(def)?'-bench':''}`,quiet:true});
  };
  const series=measurementSeries(attempt.trials,metric);
  const readings=series.points.map((p)=>p.value),min=Math.min(0,...readings),max=Math.max(1,...readings),chartY=(v:number)=>110-(v-min)/(max-min)*90;
  return <section role="dialog" aria-modal="false" aria-label="Судалгааны дэвтэр" onPointerDown={(e)=>e.stopPropagation()} className="fixed inset-x-3 bottom-3 top-16 z-[55] overflow-auto rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-xl sm:left-auto sm:w-[min(560px,calc(100vw-24px))]">
    <header className="flex justify-between gap-2"><h2 className="font-bold">{def.title}</h2><button className="min-h-10 px-3" onClick={close} aria-label="Дэвтрийг хаах">✕</button></header>
    <p className="text-xs text-slate-500">Хими {def.grade === 7 ? 'VII' : def.grade === 10 ? 'X' : def.grade === 9 ? 'IX' : 'VIII'} · {def.bookPages ? `х.${def.bookPages} · `:''}{def.mode==='model'?'Виртуал загварын үр дүн · бодит хэмжилт биш':'Ширээн дээрх савны хэмжилт'}</p>
    <details className="my-2"><summary className="min-h-10 cursor-pointer font-semibold">Аргачлал ба хэмжээ</summary><ol className="list-inside list-decimal space-y-2">{def.method?.map((step,i)=><li key={i}>{step}</li>)}</ol></details><p className="my-2">{def.prompt}</p><p className="text-xs">{def.variables}</p>
    <p className="mt-2 rounded bg-amber-50 p-2 text-xs">{def.safety}</p>
    <label className="mt-3 block font-semibold">1. Таамаглал<textarea className="mt-1 block w-full rounded border p-2 font-normal" value={attempt.prediction} maxLength={3000} onChange={(e)=>commit({...attempt,prediction:e.target.value})} placeholder="Юу болох вэ? Яагаад?"/></label>
    <h3 className="mt-3 font-semibold">2. Нөхцөл ба хэмжилт</h3>
    {def.controls.map((c)=><label key={c.id} className="mt-2 block text-xs">{c.label}{c.options?<select className="ml-2 min-h-10 rounded border p-2" value={parameters[c.id]} onChange={(e)=>setParameters({...parameters,[c.id]:Number(e.target.value)})}>{c.options.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input className="ml-2 min-h-10 w-24 rounded border p-2" type="number" min={c.min} max={c.max} step={c.step} value={parameters[c.id]} onChange={(e)=>setParameters(parameterValues(def,{...parameters,[c.id]:Number(e.target.value)}))}/>}</label>)}
    {def.mode==='model'&&attempt.trials.length>0&&<InstrumentDiagram definition={def} trial={attempt.trials[attempt.trials.length-1]}/>}
    {def.mode==='model'&&<p className="mt-2 text-xs text-slate-500">Нэг хэмжилт нь сонгосон хугацаан дахь загварын төлөв. Өөр хугацаа / нөхцөл сонгож дахин хэмж. Бодит урвалын хурдыг урьдчилан батлахгүй.</p>}
    <button className="btn-yellow mt-3 min-h-10 px-4" onClick={sample}>{def.mode==='model'?'Загварыг ажиллуулж хэмжих':def.labRig?'Багажийн заалтыг бүртгэх':'Сонгосон савнаас хэмжилт авах'}</button>
    <p role="status" className="mt-1 text-xs text-sky-800">{message}</p>
    {attempt.trials.length>0&&<><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th>№ / нөхцөл</th><th>Хэмжилт</th></tr></thead><tbody>{attempt.trials.map((t,i)=><tr key={i} className="border-t"><td className="p-2">{i+1}. {def.controls.map((c)=>`${c.label}: ${c.options?.find((o)=>o.value===t.parameters[c.id])?.label??t.parameters[c.id]}`).join('; ')}{t.source==='bench'&&t.observation}</td><td className="p-2">{t.readings.map((r)=><p key={r.label}>{r.label}: {formatMeasurement(r.value)} {r.unit}</p>)}</td></tr>)}</tbody></table></div>
    <label className="mt-2 block text-xs">Графикт харьцуулах хэмжигдэхүүн <select className="min-h-10 rounded border p-2" value={series.selected} onChange={(e)=>setMetric(e.target.value)}>{series.options.map(([key,r])=><option key={key} value={key}>{r.label} ({r.unit})</option>)}</select></label>
    <svg viewBox="0 0 440 130" role="img" aria-label="Эхний хэмжигдэхүүний туршилт хоорондын харьцуулалт" className="mt-2 w-full rounded bg-slate-50"><line x1="15" y1={chartY(0)} x2="430" y2={chartY(0)} stroke="#94a3b8"/>{readings.map((v,i)=><g key={i}><rect x={20+i*400/readings.length} y={Math.min(chartY(v),chartY(0))} width={Math.max(2,340/readings.length)} height={Math.max(1,Math.abs(chartY(v)-chartY(0)))} fill="#38bdf8"/><text x={25+i*400/readings.length} y="125" fontSize="10">{series.points[i].trial}</text></g>)}</svg><p className="text-xs">X: хэмжилтийн дугаар · Y: {series.selected}</p></>}
    <label className="mt-3 block font-semibold">3. Өөрийн ажиглалт<textarea className="mt-1 block w-full rounded border p-2 font-normal" value={attempt.observation} maxLength={3000} onChange={(e)=>commit({...attempt,observation:e.target.value})}/></label>
    <button className="mt-2 min-h-10 rounded border px-3 text-xs" disabled={attempt.observation.trim().length<10} onClick={()=>setCompare(!compare)}>Ажигласны дараа загварын тайлбартай харьцуулах</button>
    {compare&&<p className="mt-2 rounded bg-sky-50 p-2 text-xs">{attempt.trials[attempt.trials.length-1]?.source==='model'?attempt.trials[attempt.trials.length-1].observation:lesson.explain}</p>}
    <label className="mt-3 block font-semibold">4. Нотолгоо ба дүгнэлт<textarea className="mt-1 block w-full rounded border p-2 font-normal" value={attempt.conclusion} maxLength={3000} onChange={(e)=>commit({...attempt,conclusion:e.target.value})} placeholder="Хоёр үр дүнгээ харьцуулж, шалтгаан ба хязгаарлалтыг тайлбарла."/></label>
    <button className="btn-yellow mt-3 min-h-10 px-4" disabled={(requiresBenchEvidence(def)?attempt.trials.filter(t=>t.source==='bench'):attempt.trials).length<2||attempt.observation.trim().length<10||attempt.conclusion.trim().length<10} onClick={()=>{emitLab({key:`inquiry:${id}:explain${requiresBenchEvidence(def)?'-bench':''}`,quiet:true});commit(attempt);setMessage('Судалгаа хадгалагдлаа. Энэ нь зөв хариултыг автоматаар баталгаажуулсан үнэлгээ биш.');}}>Судалгааг хадгалах</button>
    <button className="ml-2 mt-2 min-h-10 px-3 text-xs underline" onClick={()=>{const blob=new Blob([JSON.stringify({id,attempt},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`${id}-results.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Үр дүн татах</button>
  </section>;
}
