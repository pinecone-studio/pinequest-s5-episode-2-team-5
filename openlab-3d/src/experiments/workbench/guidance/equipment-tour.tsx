import {useRef} from 'react';
import {create} from 'zustand';
import {useReserveTop} from './hud-space';
import {CATALOG} from '../../../equipment/equipmentCatalog';
import {benchView} from '../../nacl/view';
import {gasLayout} from '../../grade9/gas-layouts';
import {useLabStore} from '../../../store/useLabStore';
import {currentSession,itemDescription,itemPosition} from '../session';

/** Seconds the camera rests on each piece. */
const STOP_MS=1400;
/** A long list is cut short rather than delaying the demo for half a minute. */
const MAX_STOPS=14;

interface TourStop {id:string;name:string;use:string}
export const useEquipmentTour=create<{stops:TourStop[];index:number}>(()=>({stops:[],index:-1}));
let timer:number|undefined,finish:(()=>void)|undefined;

/** Every piece of equipment on the bench for this experiment (not the reagent containers), in setup order. */
function stopsFor():TourStop[]{
 const seen=new Set<string>(),stops:TourStop[]=[];
 for(const [key,id] of Object.entries(currentSession()?.objects??{})){
  if(key.startsWith('reagent-')||seen.has(id))continue;
  const kind=itemDescription(id).kind,entry=kind?CATALOG[kind]:undefined;
  if(!entry||itemPosition(id).x>=900)continue;
  seen.add(id);
  // An apparatus drawn as the book's setup names the book's pieces it is made of.
  const parts=kind==='gasTrain'?gasLayout(useLabStore.getState().active??undefined)?.includes:undefined;
  stops.push({id,name:entry.name,use:parts?`Бүрэлдэхүүн: ${parts.map(k=>CATALOG[k].name).join(', ')}.`:entry.description.split(/(?<=\.)\s/)[0]});
 }
 return stops.slice(0,MAX_STOPS);
}

function show(index:number){
 const {stops}=useEquipmentTour.getState(),stop=stops[index];
 if(!stop){endEquipmentTour();return;}
 useEquipmentTour.setState({index});
 const kind=itemDescription(stop.id).kind,size=kind?CATALOG[kind]?.size:undefined,at=itemPosition(stop.id);
 const w=Math.max(size?.[0]??.08,size?.[2]??.08),h=size?.[1]??.1;
 benchView.frame([at.x,at.y+h*.5,at.z],Math.max(.18,w*2.6),Math.max(.18,h*1.8));
 timer=window.setTimeout(()=>show(index+1),STOP_MS);
}

/**
 * Before the auto demonstration, the camera stops at each piece the book lists so none of it goes
 * unseen; `done` runs when the tour ends or is skipped.
 */
export function startEquipmentTour(done:()=>void){
 cancelEquipmentTour();
 const stops=stopsFor();
 if(!stops.length){done();return;}
 finish=done;
 useEquipmentTour.setState({stops,index:0});
 show(0);
}
export function endEquipmentTour(){
 const done=finish;
 cancelEquipmentTour();
 done?.();
}
/** Stops the tour without starting the demo (leaving the bench, switching experiments). */
export function cancelEquipmentTour(){
 window.clearTimeout(timer);timer=undefined;finish=undefined;
 useEquipmentTour.setState({stops:[],index:-1});
}

export function EquipmentTourCaption(){
 const {stops,index}=useEquipmentTour(),stop=stops[index];
 return stop?<Caption stop={stop} index={index} count={stops.length}/>:null;
}
function Caption({stop,index,count}:{stop:TourStop;index:number;count:number}){
 const card=useRef<HTMLDivElement>(null);
 useReserveTop('equipment-tour',card);
 return <div className="pointer-events-none fixed inset-x-0 top-16 z-[55] flex justify-center px-3" aria-live="polite">
  <div ref={card} className="pointer-events-auto flex max-w-md items-start gap-3 rounded-xl bg-white/95 px-4 py-2 text-lab-ink shadow-hud" role="status" aria-label="Туршилтын багаж">
   <div className="min-w-0">
    <p className="text-[10px] font-bold uppercase text-slate-500">Багаж {index+1} / {count}</p>
    <p className="text-sm font-bold">{stop.name}</p>
    <p className="text-xs leading-snug text-slate-600">{stop.use}</p>
   </div>
   <button type="button" className="min-h-9 shrink-0 rounded-lg border border-slate-300 px-3 text-xs font-semibold" onClick={endEquipmentTour}>Алгасах</button>
  </div>
 </div>;
}
