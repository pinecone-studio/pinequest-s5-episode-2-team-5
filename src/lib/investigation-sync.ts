import {restoreClocks,stampChanges,takeNewer,type Clocks} from './field-clocks';
import {restoreAttempt,type InvestigationAttempt,type Trial} from './textbook-investigations';
/** Notebook fields where the newest edit wins across devices; trials are only ever added. */
const LATEST=['prediction','observation','conclusion','revealed'] as const;
export interface AttemptSnapshot {attempt:InvestigationAttempt;clocks:Clocks}
const unionTrials=(a:Trial[],b:Trial[])=>[...new Map([...b,...a].map((t)=>[t.at,t])).values()].sort((x,y)=>x.at-y.at).slice(-30);
export function restoreAttemptSnapshot(raw:unknown):AttemptSnapshot {
 const value=raw as Partial<AttemptSnapshot>|null;
 return {attempt:restoreAttempt(value?.attempt),clocks:restoreClocks(value?.clocks,(key)=>(LATEST as readonly string[]).includes(key))};
}
/** A save on this device: changed fields get a new time and trials already stored are kept. */
export function changedAttempt(before:AttemptSnapshot,attempt:InvestigationAttempt,at=Date.now()):AttemptSnapshot {
 return {attempt:restoreAttempt({...attempt,trials:unionTrials(attempt.trials,before.attempt.trials)}),clocks:stampChanges(before.attempt,attempt,LATEST,before.clocks,at)};
}
export function mergeAttempt(local:AttemptSnapshot,remote:AttemptSnapshot):AttemptSnapshot {
 const merged=takeNewer(local.attempt,local.clocks,remote.attempt,remote.clocks,LATEST);
 return {attempt:restoreAttempt({...merged.value,trials:unionTrials(local.attempt.trials,remote.attempt.trials)}),clocks:merged.clocks};
}
