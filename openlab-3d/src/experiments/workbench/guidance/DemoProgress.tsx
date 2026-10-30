import {useEffect} from 'react';
import {StarInstructions} from '../../../ui/StarGuidance';
import {ObservationReadout} from './ObservationReadout';
import {useEquipmentTour} from './equipment-tour';
import {useDemoDone,useDemoShown} from './hud-space';
import type {Reading} from './results';

export {useDemoShown};

/** Short, readable numbers: 60 ml, 26.9 °C, pH 5.83, 0.005 mol (and 0 rather than 2.6e-10). */
const reading=(v:number)=>Math.abs(v)<1e-3?0:Math.abs(v)<.1?Number(v.toPrecision(2)):Number(v.toFixed(Math.abs(v)>=100?0:Math.abs(v)>=10?1:2));

export type DemoState='playing'|'paused'|'done'|'failed';
interface Props {state:DemoState;index:number;total:number;label:string;detail?:string;live?:string;readings?:Reading[];onPause:()=>void;onResume:()=>void;onReplay:()=>void;onClose:()=>void}

/**
 * The auto demonstration's progress on the 3D view itself: which step of how many, what is
 * happening, and a clear end card, so the learner never has to open a panel to know where it is.
 */
export function DemoProgress(props:Props){
 const touring=useEquipmentTour(s=>s.index>=0);
 if(touring)return null;
 return <StarInstructions priority="demo"><Strip {...props}/></StarInstructions>;
}

function Strip({state,index,total,label,detail,live,readings,onPause,onResume,onReplay,onClose}:Props){
 useEffect(()=>{useDemoShown.setState(true,true);return ()=>{useDemoShown.setState(false,true);useDemoDone.setState(false,true);};},[]);
 const button='min-h-9 shrink-0 rounded-lg border px-3 text-xs font-semibold';
 const done=state==='done',step=done?total:index+1;
 useEffect(()=>{useDemoDone.setState(done,true);},[done]);
 return <div>
  <div className={`w-full rounded-xl p-2 text-lab-ink ${done?'border-2 border-emerald-400 bg-emerald-50/95':'bg-amber-50/70'}`} role="status" aria-live="polite" aria-label="3D үзүүлбэрийн явц">
   <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
    <span className={done?'text-emerald-800':state==='failed'?'text-amber-700':'text-sky-800'}>{done?'✓ Үзүүлбэр дууслаа':state==='failed'?'! Үзүүлбэр зогслоо':state==='paused'?'⏸ Түр зогссон':'▶ 3D үзүүлбэр'}</span>
    <span className="tabular-nums text-slate-500">Алхам {step} / {total}</span>
   </div>
   <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-200" aria-hidden="true"><div className={`h-full transition-[width] duration-500 ${done?'bg-emerald-500':'bg-sky-600'}`} style={{width:`${step/total*100}%`}}/></div>
   {done?<>
    {detail&&<p className="mt-1.5 text-xs leading-snug">{detail}</p>}
    {!!readings?.length&&<div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-700">{readings.map((r,i)=><span key={i}>{r.label}: <b className="tabular-nums">{reading(r.value)} {r.unit}</b></span>)}</div>}
    <div className="mt-2 flex gap-2"><button type="button" className={`${button} flex-1 border-emerald-300 bg-white`} onClick={onReplay}>↻ Дахин үзэх</button><button type="button" className={button} onClick={onClose}>Хаах</button></div>
   </>:<div className="mt-1.5 flex items-start gap-3">
    <div className="min-w-0 flex-1">
     <p className="text-sm font-semibold leading-snug">{label}</p>
     {detail&&<p className="text-xs leading-relaxed text-slate-600">{detail}</p>}
     {live&&<p className="font-mono text-[11px] tabular-nums text-sky-900">{live}</p>}
    </div>
    {state==='playing'?<button type="button" className={button} onClick={onPause}>Түр зогсоох</button>:<button type="button" className={`${button} border-sky-300 text-sky-800`} onClick={onResume}>▶ Үргэлжлүүлэх</button>}
   </div>}
   <ObservationReadout/>
   {!done&&<button type="button" className={`${button} mt-2 w-full border-amber-200 bg-white`} onClick={onClose}>Өөрөө хийх</button>}
  </div>
 </div>;
}
