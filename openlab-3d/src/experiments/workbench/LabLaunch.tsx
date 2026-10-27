import { restoreAttempt } from '../../../../src/lib/textbook-investigations';
import { useInquiry } from './inquiry-store';
import { useEffect, useRef } from 'react';
import { playerApi, useGameStore } from '../../store/useGameStore';
import { useExperimentCatalog } from '../../lab/experiments';
import { bench, enterBench } from '../nacl/bench';
import { selectBenchExperiment } from './session';
/** A lesson link selects a named public guide; it never accepts code or an arbitrary URL. */
export function LabLaunch() {
  const mode=useGameStore((s)=>s.mode),experiments=useExperimentCatalog((s)=>s.experiments);
  const launched=useRef(false);
  useEffect(()=>{
    const receive=(event:MessageEvent<unknown>)=>{
      if(event.origin!==window.location.origin||event.source!==window.parent)return;
      const data=event.data;
      if(!data||typeof data!=='object'||!('type' in data)||data.type!=='chemquest:investigation-load'||!('version' in data)||data.version!==1||!('id' in data)||typeof data.id!=='string'||!('attempt' in data))return;
      if(data.id!==new URLSearchParams(window.location.search).get('experiment')||!experiments.some((x)=>x.id===data.id))return;
      const incoming=restoreAttempt(data.attempt),prior=useInquiry.getState().attempts[data.id];
      // Text written in the hub must survive an empty field in the lab's own copy.
      useInquiry.getState().put(data.id,prior?{...incoming,...prior,prediction:prior.prediction||incoming.prediction,observation:prior.observation||incoming.observation,conclusion:prior.conclusion||incoming.conclusion,revealed:prior.revealed||incoming.revealed,trials:prior.trials.length>=incoming.trials.length?prior.trials:incoming.trials}:incoming);
    };
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
  },[experiments]);
  useEffect(()=>{
    const id=new URLSearchParams(window.location.search).get('experiment');
    if(launched.current||mode!=='walk'||!id||!experiments.some((x)=>x.id===id))return;
    // The bench engine mounts inside the suspended canvas and can arrive after walk mode on slow devices.
    const launch=()=>{
      if(launched.current||!bench.engine||useGameStore.getState().mode!=='walk')return false;
      launched.current=true;
      selectBenchExperiment(id);
      playerApi.teleport(8.25,-13.6,0);enterBench();
      return true;
    };
    if(launch())return;
    const timer=setInterval(()=>{if(launch())clearInterval(timer);},200);
    return()=>clearInterval(timer);
  },[mode,experiments]);
  return null;
}
