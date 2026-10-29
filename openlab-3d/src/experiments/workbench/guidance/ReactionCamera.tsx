import {useEffect} from 'react';
import {useReactionView} from '../../../lab/reaction-view';
import {useGameStore} from '../../../store/useGameStore';
import {useSettingsStore} from '../../../store/useSettingsStore';
import {benchView,useBenchView} from '../../nacl/view';
import {CATALOG} from '../../../equipment/equipmentCatalog';
import {itemDescription,itemPosition,isWorkbenchObject} from '../session';
import {useShowcase} from './showcase';
/**
 * Frames the vessel while something visible is happening in it (gas, a color change, a
 * precipitate). Always during the auto demonstration (except mid-pour, which has its own
 * close-up, and once each step's own camera move has settled); in free play only with
 * Settings → reaction auto-zoom, and never while inspecting.
 */
export function ReactionCamera(){
 useEffect(()=>{
  let framed='',stepKey='',stepAt=0;
  const timer=window.setInterval(()=>{
   const now=performance.now(),show=useShowcase.getState(),demo=show.status==='playing';
   if(show.key!==stepKey){stepKey=show.key;stepAt=now;}
   if(useGameStore.getState().mode!=='bench'||useBenchView.getState().inspecting)return;
   if(demo?show.flow||now-stepAt<900:!useSettingsStore.getState().reactionAutoZoom)return;
   const r=Object.values(useReactionView.getState().vessels).filter(v=>!v.info&&v.rate>0&&v.until>now&&isWorkbenchObject(v.vesselId)).sort((a,b)=>b.rate-a.rate)[0];
   // Once per reaction episode, and again after a demo step has moved the camera away.
   const key=r?`${r.episode}|${demo?stepKey:''}`:'';
   if(!r||key===framed)return;
   framed=key;
   const kind=itemDescription(r.vesselId).kind,size=kind?CATALOG[kind]?.size:undefined,at=itemPosition(r.vesselId);
   // An item that cannot be located reports a far-away point; never send the camera there.
   if(at.x>=900)return;
   const w=Math.max(size?.[0]??.08,size?.[2]??.08),h=size?.[1]??.1;
   // Room above the rim for foam, vapour and the gas label.
   benchView.frame([at.x,at.y+h*.55,at.z],Math.max(.16,w*2.2),Math.max(.16,h*1.6));
  },400);
  return()=>window.clearInterval(timer);
 },[]);
 return null;
}
