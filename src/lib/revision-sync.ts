import {emptyRevision,restoreRevision,type RevisionProgress} from './revision-progress';
export interface RevisionSnapshot {state:RevisionProgress;clocks:Record<string,number>}
export const snapshot=(state:RevisionProgress=emptyRevision()):RevisionSnapshot=>({state,clocks:{}});
export function mergeRevision(a:RevisionSnapshot,b:RevisionSnapshot):RevisionSnapshot {
 const state=restoreRevision(a.state),clocks={...a.clocks};
 for(const key of ['notes','practicals','wrong'] as const)state[key]=[...new Set([...a.state[key],...b.state[key]])];
 for(const key of ['quizBest','questionBest'] as const)for(const [id,value] of Object.entries(b.state[key]))state[key][id]=Math.max(state[key][id]??0,value);
 for(const key of ['cards','ratings'] as const)for(const id of Object.keys(b.state[key])){
  const clock=`${key}.${id}`;
  if((b.clocks[clock]??0)>(clocks[clock]??-1)){
   if(key==='cards')state.cards[id]=b.state.cards[id];else state.ratings[id]=b.state.ratings[id];
   clocks[clock]=b.clocks[clock]??0;
  }
 }
 return {state,clocks};
}
/**
 * `wrong` shrinks when a question is answered correctly, so each question follows its newest mark
 * ("wrong.<id>" clocks) and is sent as `wrongMarks`. The list itself is never sent: servers before
 * 202610270003 only add to it.
 */
const WRONG='wrong.';
export interface OutgoingRevision extends RevisionSnapshot {state:RevisionProgress&{wrongMarks:Record<string,boolean>}}
export const outgoingRevision=(value:RevisionSnapshot):OutgoingRevision=>{
 const ids=new Set([...value.state.wrong,...Object.keys(value.clocks).filter((clock)=>clock.startsWith(WRONG)).map((clock)=>clock.slice(WRONG.length))]);
 const wrongMarks=Object.fromEntries([...ids].map((id)=>[id,value.state.wrong.includes(id)]));
 return {state:{...value.state,wrong:[],wrongMarks},clocks:value.clocks};
};
export function applyRemoteRevision(local:RevisionSnapshot,remote:RevisionSnapshot):RevisionSnapshot {
 const merged=mergeRevision(local,remote),wrong=new Set(local.state.wrong);
 for(const [clock,stamp] of Object.entries(remote.clocks)){
  if(!clock.startsWith(WRONG)||stamp<=(local.clocks[clock]??-1))continue;
  const id=clock.slice(WRONG.length);
  if(remote.state.wrong.includes(id))wrong.add(id);else wrong.delete(id);
  merged.clocks[clock]=stamp;
 }
 merged.state.wrong=[...wrong];return merged;
}
export function changedRevision(before:RevisionSnapshot,state:RevisionProgress,at=Date.now()):RevisionSnapshot {
 const clocks={...before.clocks};
 for(const key of ['cards','ratings'] as const)for(const [id,value] of Object.entries(state[key]))if(before.state[key][id]!==value)clocks[`${key}.${id}`]=Math.max(at,(clocks[`${key}.${id}`]??0)+1);
 for(const id of new Set([...before.state.wrong,...state.wrong]))if(before.state.wrong.includes(id)!==state.wrong.includes(id))clocks[`${WRONG}${id}`]=Math.max(at,(clocks[`${WRONG}${id}`]??0)+1);
 return {state,clocks};
}
export function restoreSnapshot(raw:unknown):RevisionSnapshot {
 const value=raw as Partial<RevisionSnapshot>|null;
 const clocks=value?.clocks&&typeof value.clocks==='object'?Object.fromEntries(Object.entries(value.clocks).filter(([,x])=>typeof x==='number'&&Number.isFinite(x)&&x>=0)):{};
 return {state:restoreRevision(value?.state),clocks};
}
