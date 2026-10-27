import {restoreClocks,stampChanges,takeNewer,type Clocks} from './field-clocks';
import {restoreElementMemory,type ElementMemory} from './periodic-learning';
import {randomId} from './random';
const isElement=(key:string)=>/^\d{1,3}$/.test(key)&&+key>=1&&+key<=118;
/** This install's id (answer counts are kept per device on the server, so two phones add up) and when each element was last rated. */
export interface MemorySync {device:string;clocks:Clocks}
/** "Known" flags by atomic number, with the time each one was set. */
export interface KnownSnapshot {known:Record<string,boolean>;clocks:Clocks}
const flags=(memory:ElementMemory,keys:Iterable<string>)=>Object.fromEntries([...keys].map((z)=>[z,memory.known.includes(+z)]));
export function restoreMemorySync(raw:unknown):MemorySync {
 const value=raw as Partial<MemorySync>|null;
 return {device:typeof value?.device==='string'&&/^[A-Za-z0-9-]{8,64}$/.test(value.device)?value.device:randomId(),clocks:restoreClocks(value?.clocks,isElement)};
}
export function restoreKnownSnapshot(raw:unknown):KnownSnapshot {
 const value=raw as Partial<KnownSnapshot>|null;
 const known=value?.known&&typeof value.known==='object'?Object.fromEntries(Object.entries(value.known).filter(([z,k])=>isElement(z)&&typeof k==='boolean')):{};
 return {known,clocks:restoreClocks(value?.clocks,isElement)};
}
/** Flags for every element this device has rated, so un-marking one also syncs. */
export function outgoingKnown(memory:ElementMemory,clocks:Clocks):KnownSnapshot {
 return {known:flags(memory,new Set([...memory.known.map(String),...Object.keys(clocks)])),clocks};
}
export function changedKnown(before:ElementMemory,after:ElementMemory,clocks:Clocks,at=Date.now()):Clocks {
 const keys=[...new Set([...before.known,...after.known].map(String))];
 return stampChanges(flags(before,keys),flags(after,keys),keys,clocks,at);
}
export function applyRemoteKnown(memory:ElementMemory,clocks:Clocks,remote:KnownSnapshot):{memory:ElementMemory;clocks:Clocks} {
 const keys=Object.keys(remote.known);
 const merged=takeNewer(flags(memory,new Set([...memory.known.map(String),...keys])),clocks,remote.known,remote.clocks,keys);
 return {memory:restoreElementMemory({...memory,known:Object.entries(merged.value).filter(([,known])=>known).map(([z])=>+z)}),clocks:merged.clocks};
}
