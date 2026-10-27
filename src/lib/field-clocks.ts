/** Per-field edit times for progress synced across devices: the newest edit of each field wins. */
export type Clocks=Record<string,number>;
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export function restoreClocks(raw:unknown,allowed:(key:string)=>boolean):Clocks {
 return raw&&typeof raw==='object'?Object.fromEntries(Object.entries(raw).filter(([key,x])=>allowed(key)&&typeof x==='number'&&Number.isFinite(x)&&x>=0)):{};
}
/** Changed fields get a new time, so this edit beats older ones from other devices. */
export function stampChanges<T extends object>(before:T,after:T,keys:readonly (keyof T&string)[],clocks:Clocks,at=Date.now()):Clocks {
 const next={...clocks};
 for(const key of keys)if(!same(before[key],after[key]))next[key]=Math.max(at,(next[key]??0)+1);
 return next;
}
/** Takes each remote field edited more recently than this device's copy. */
export function takeNewer<T extends object>(local:T,localClocks:Clocks,remote:T,remoteClocks:Clocks,keys:readonly (keyof T&string)[]):{value:T;clocks:Clocks} {
 const value={...local},clocks={...localClocks};
 for(const key of keys){
  const stamp=remoteClocks[key];
  if(stamp!==undefined&&stamp>(clocks[key]??-1)){value[key]=remote[key];clocks[key]=stamp;}
 }
 return {value,clocks};
}
