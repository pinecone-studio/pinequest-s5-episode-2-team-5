import {emptyRevision,restoreRevision,type RevisionProgress} from './revision-progress';
export interface RevisionSnapshot {state:RevisionProgress;clocks:Record<string,number>}
export const snapshot=(state:RevisionProgress=emptyRevision()):RevisionSnapshot=>({state,clocks:{}});
/** Merge b into a: union reads, max scores, and latest-wins ratings and wrong-answer membership. */
export function mergeRevision(a:RevisionSnapshot,b:RevisionSnapshot):RevisionSnapshot {
 const state=restoreRevision(a.state),clocks={...a.clocks};
 for(const key of ['notes','practicals'] as const)state[key]=[...new Set([...a.state[key],...b.state[key]])];
 for(const key of ['quizBest','questionBest','labBest'] as const)for(const [id,value] of Object.entries(b.state[key]??{}))state[key][id]=Math.max(state[key][id]??0,value);
 for(const key of ['cards','ratings'] as const)for(const id of Object.keys(b.state[key])){
  const clock=`${key}.${id}`;
  if((b.clocks[clock]??0)>(clocks[clock]??-1)){
   if(key==='cards')state.cards[id]=b.state.cards[id];else state.ratings[id]=b.state.ratings[id];
   clocks[clock]=b.clocks[clock]??0;
  }
 }
 // A clocked entry records the latest add or removal; unclocked (legacy) entries are only ever added.
 const wrong=new Set(state.wrong),incoming=new Set(b.state.wrong);
 const ids=new Set([...incoming,...Object.keys(b.clocks).filter((k)=>k.startsWith('wrong.')).map((k)=>k.slice(6))]);
 for(const id of ids){
  const clock=`wrong.${id}`,stamp=b.clocks[clock];
  if(stamp===undefined){if(clocks[clock]===undefined)wrong.add(id);}
  else if(stamp>(clocks[clock]??-1)){if(incoming.has(id))wrong.add(id);else wrong.delete(id);clocks[clock]=stamp;}
 }
 state.wrong=[...wrong];
 return {state,clocks};
}
export function changedRevision(before:RevisionSnapshot,state:RevisionProgress,at=Date.now()):RevisionSnapshot {
 const clocks={...before.clocks};
 const stamp=(clock:string)=>{clocks[clock]=Math.max(at,(clocks[clock]??0)+1);};
 for(const key of ['cards','ratings'] as const)for(const [id,value] of Object.entries(state[key]))if(before.state[key][id]!==value)stamp(`${key}.${id}`);
 const was=new Set(before.state.wrong),now=new Set(state.wrong);
 for(const id of new Set([...was,...now]))if(was.has(id)!==now.has(id))stamp(`wrong.${id}`);
 return {state,clocks};
}
export function restoreSnapshot(raw:unknown):RevisionSnapshot {
 const value=raw as Partial<RevisionSnapshot>|null;
 const clocks=value?.clocks&&typeof value.clocks==='object'?Object.fromEntries(Object.entries(value.clocks).filter(([,x])=>typeof x==='number'&&Number.isFinite(x)&&x>=0)):{};
 return {state:restoreRevision(value?.state),clocks};
}
/** Device storage holds a snapshot; earlier builds stored the bare progress object. */
export function restoreStored(raw:unknown):RevisionSnapshot {
 return raw&&typeof raw==='object'&&'state' in raw?restoreSnapshot(raw):snapshot(restoreRevision(raw));
}
export const sameRevision=(a:RevisionSnapshot,b:RevisionSnapshot)=>JSON.stringify(a)===JSON.stringify(b);
