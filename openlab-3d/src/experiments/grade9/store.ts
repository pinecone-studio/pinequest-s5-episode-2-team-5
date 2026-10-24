import {rigObservations} from './observations';
import {publishReaction} from '../../lab/reaction-view';
import {create} from 'zustand';
import {createRig,loadRig,startRig,tickRig,type RigState} from './process';
import type {RigKind} from './kinds';
import type {Mixture} from '../../chemistry/mixture';
interface ApparatusStore {rigs:Record<string,RigState>;ensure:(id:string,experiment:string,kind:RigKind)=>void;load:(id:string,portion:Mixture)=>void;change:(id:string,change:Partial<RigState>)=>void;start:(id:string)=>void;tick:(id:string,dt:number)=>void;clear:(id:string)=>void;reset:()=>void}
export const useGrade9Apparatus=create<ApparatusStore>()((set,get)=>({
 rigs:{},ensure:(id,experiment,kind)=>{if(!get().rigs[id]||get().rigs[id].experiment!==experiment||get().rigs[id].kind!==kind)set(s=>({rigs:{...s.rigs,[id]:createRig(experiment,kind)}}));},
 load:(id,portion)=>set(s=>({rigs:{...s.rigs,[id]:loadRig(s.rigs[id],portion)}})),
 change:(id,change)=>set(s=>s.rigs[id]?{rigs:{...s.rigs,[id]:{...s.rigs[id],...change}}}:s),
 start:id=>set(s=>s.rigs[id]?{rigs:{...s.rigs,[id]:startRig(s.rigs[id])}}:s),
 tick:(id,dt)=>{const r=get().rigs[id];if(r?.running){const next=tickRig(r,dt);for(const reaction of rigObservations(r,next,dt))publishReaction(id,reaction);set(s=>({rigs:{...s.rigs,[id]:next}}));}},
 clear:id=>set(s=>{const rigs={...s.rigs};delete rigs[id];return {rigs};}),reset:()=>set({rigs:{}}),
}));
