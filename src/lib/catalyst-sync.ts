import {restoreJourney,type JourneyProgress} from './catalyst-journey';
import {restoreClocks,stampChanges,takeNewer,type Clocks} from './field-clocks';
/** Every field but the best score follows the newest edit, so "start over" on one device also clears older answers on the others. */
const LATEST=['step','prediction','observation','source','reflection','revealed','marks','answers','completed'] as const;
export interface JourneySnapshot {state:JourneyProgress;clocks:Clocks}
export function restoreJourneySnapshot(raw:unknown):JourneySnapshot {
 const value=raw as Partial<JourneySnapshot>|null;
 return {state:restoreJourney(value?.state),clocks:restoreClocks(value?.clocks,(key)=>(LATEST as readonly string[]).includes(key))};
}
export const changedJourney=(before:JourneySnapshot,state:JourneyProgress,at=Date.now()):JourneySnapshot=>({state,clocks:stampChanges(before.state,state,LATEST,before.clocks,at)});
export function mergeJourney(local:JourneySnapshot,remote:JourneySnapshot):JourneySnapshot {
 const merged=takeNewer(local.state,local.clocks,remote.state,remote.clocks,LATEST);
 return {state:restoreJourney({...merged.value,best:Math.max(local.state.best,remote.state.best)}),clocks:merged.clocks};
}
