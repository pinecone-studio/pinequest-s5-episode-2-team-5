import { restoreAttempt } from '../../../../src/lib/textbook-investigations';
import { useInquiry } from './inquiry-store';
import { useEffect, useRef } from 'react';
import { playerApi, useGameStore } from '../../store/useGameStore';
import { useExperimentCatalog } from '../../lab/experiments';
import { LOAD_STEPS, useLoadingStore } from '../../store/useLoadingStore';
import { bench, enterBench } from '../nacl/bench';
import { selectBenchExperiment } from './session';
/** A lesson link selects a named public guide; it never accepts code or an arbitrary URL. */
export function LabLaunch() {
  const mode=useGameStore((s)=>s.mode),experiments=useExperimentCatalog((s)=>s.experiments);
  const labReady=useLoadingStore((s)=>LOAD_STEPS.every(step=>s.done.includes(step)));
  const launched=useRef(false);
  useEffect(()=>{
    const receive=(event:MessageEvent<unknown>)=>{
      if(event.origin!==window.location.origin||event.source!==window.parent)return;
      const data=event.data;
      if(!data||typeof data!=='object'||!('type' in data)||data.type!=='chemquest:investigation-load'||!('version' in data)||data.version!==1||!('id' in data)||typeof data.id!=='string'||!('attempt' in data))return;
      if(data.id!==new URLSearchParams(window.location.search).get('experiment')||!experiments.some((x)=>x.id===data.id))return;
      const incoming=restoreAttempt(data.attempt),prior=useInquiry.getState().attempts[data.id];
      useInquiry.getState().put(data.id,prior?{...incoming,...prior,prediction:prior.prediction||incoming.prediction,trials:prior.trials.length>=incoming.trials.length?prior.trials:incoming.trials}:incoming);
    };
    window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
  },[experiments]);
  useEffect(()=>{
    const id=new URLSearchParams(window.location.search).get('experiment');
    if(launched.current||mode!=='walk'||!labReady||!id||!experiments.some((x)=>x.id===id))return;
    let frame=0,cancelled=false;
    const launchWhenReady=()=>{
      if(cancelled||launched.current||useGameStore.getState().mode!=='walk')return;
      if(!bench.engine){frame=window.requestAnimationFrame(launchWhenReady);return;}
      launched.current=true;
      selectBenchExperiment(id);
      playerApi.teleport(8.25,-13.6,0);enterBench();
    };
    frame=window.requestAnimationFrame(launchWhenReady);
    return()=>{cancelled=true;window.cancelAnimationFrame(frame);};
  },[mode,experiments,labReady]);
  return null;
}
