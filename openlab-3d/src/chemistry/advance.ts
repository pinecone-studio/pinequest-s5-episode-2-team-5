import {step,type StepEnv,type StepResult} from './kinetics';
import type {Mixture} from './mixture';
/** Preserve the engine's bounded substeps when a demonstration clock is accelerated. */
export function advanceChemistry(input:Mixture,dt:number,env:StepEnv,speed=1):StepResult{
 const count=Math.max(1,Math.ceil(dt*speed/.2)),h=dt*speed/count;
 let m=input,boiling=false,changed=false;const notes=new Set<string>(),formed=new Set<StepResult['formed'][number]>();
 const gas:StepResult['gas']={CO2:0,H2:0,O2:0,NH3:0,steam:0,smoke:0};
 for(let i=0;i<count;i++){const current=speed>1&&input.water>.02&&m.water<.02?{...env,heatW:0}:env;const r=step(m,h,current);m=r.m;boiling||=r.boiling;changed||=r.changed;r.notes.forEach(n=>notes.add(n));r.formed.forEach(n=>formed.add(n));for(const id of Object.keys(gas) as (keyof typeof gas)[])gas[id]+=r.gas[id]*h/Math.max(.001,dt);}
 return {m,gas,boiling,changed,notes:[...notes],formed:[...formed]};
}
