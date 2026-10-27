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
/** `wrong` shrinks when a question is answered correctly, but the server only unions it, so it stays on this device. */
export const outgoingRevision=(value:RevisionSnapshot):RevisionSnapshot=>({state:{...value.state,wrong:[]},clocks:value.clocks});
export function applyRemoteRevision(local:RevisionSnapshot,remote:RevisionSnapshot):RevisionSnapshot {
 const merged=mergeRevision(local,remote);merged.state.wrong=[...local.state.wrong];return merged;
}
export function changedRevision(before:RevisionSnapshot,state:RevisionProgress,at=Date.now()):RevisionSnapshot {
 const clocks={...before.clocks};
 for(const key of ['cards','ratings'] as const)for(const [id,value] of Object.entries(state[key]))if(before.state[key][id]!==value)clocks[`${key}.${id}`]=Math.max(at,(clocks[`${key}.${id}`]??0)+1);
 return {state,clocks};
}
export function restoreSnapshot(raw:unknown):RevisionSnapshot {
 const value=raw as Partial<RevisionSnapshot>|null;
 const clocks=value?.clocks&&typeof value.clocks==='object'?Object.fromEntries(Object.entries(value.clocks).filter(([,x])=>typeof x==='number'&&Number.isFinite(x)&&x>=0)):{};
 return {state:restoreRevision(value?.state),clocks};
}
