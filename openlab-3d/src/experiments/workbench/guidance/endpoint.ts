import {heldHeat} from '../../../interaction/actions';
import {useExperimentStore} from '../../../store/useExperimentStore';
import {guideTargetKind} from './runtime';
import {measure,matches,type Endpoint,type Sample,type Check} from './conditions';
import {currentSession} from '../session';
import {useChemStore,mixtureOf} from '../../../store/useChemStore';
import {useGrade9Apparatus} from '../../grade9/store';
import {rigReadings} from '../../grade9/process';
import {AQ,SOLIDS,type AqId,type SolidId} from '../../../chemistry/species';
import {liquidMl,solidMassG} from '../../../chemistry/mixture';
import {phOf} from '../../../chemistry/equilibrium';
import type {GuideStep} from './plans';
import type {InvestigationDefinition} from '../../../../../src/lib/textbook-investigations';
export function protocolSample(def:InvestigationDefinition,step:GuideStep,ref?:Partial<Check>):Sample|undefined{
 const kind=ref?.target??guideTargetKind(def,step),id=currentSession()?.objects[kind];if(!id)return;
 const rig=useGrade9Apparatus.getState().rigs[id],port=ref?.port??('port' in step?step.port:undefined)??0;
 return {mixture:rig?.chambers[port]??useChemStore.getState().mixtures[id]??mixtureOf(id),rig,sample:useChemStore.getState().tools[id]?.sample};
}
export function endpointResult(def:InvestigationDefinition,step:GuideStep,endpoint:Endpoint){
 const measurements=endpoint.checks.map(c=>{const sample=protocolSample(def,step,c),value=sample?measure(sample,c):NaN;return {check:c,value,ok:matches(value,c)};});
 return {ok:measurements.length>0&&measurements.every(m=>m.ok),measurements};
}
export function protocolReadings(def:InvestigationDefinition,step:GuideStep){
 const sample=protocolSample(def,step);if(!sample)return [];
 if(sample.rig){
  const out=rigReadings(sample.rig).filter(r=>Number.isFinite(r.value));
  sample.rig.chambers.forEach((m,i)=>{if(liquidMl(m)>0||solidMassG(m)>0){out.push({label:`Үүр ${i+1}: температур`,value:m.temp,unit:'°C'},{label:`Үүр ${i+1}: шингэн`,value:liquidMl(m),unit:'мл'},{label:`Үүр ${i+1}: хатуу дээж`,value:solidMassG(m),unit:'г'});const ph=phOf(m);if(ph!==null)out.push({label:`Үүр ${i+1}: pH`,value:ph,unit:''});}});return out;
 }
 const m=sample.mixture,out=[{label:'Температур',value:m.temp,unit:'°C'},{label:'Шингэн',value:liquidMl(m),unit:'мл'},{label:'Хатуу дээж',value:solidMassG(m),unit:'г'}];
 const ph=phOf(m);if(ph!==null)out.push({label:'pH',value:ph,unit:''});
 for(const [id,n] of Object.entries(m.aq).slice(0,4))out.push({label:AQ[id as AqId].formula,value:n??0,unit:'моль'});
 for(const [id,n] of Object.entries(m.s).slice(0,4))out.push({label:SOLIDS[id as SolidId].formula,value:n??0,unit:'моль'});
 return out.filter(r=>Number.isFinite(r.value));
}

export function settleEndpoint(def:InvestigationDefinition,step:GuideStep,endpoint:Endpoint){
 if(!endpoint.stopHeat)return;const kind=endpoint.checks.find(c=>c.target)?.target??guideTargetKind(def,step),id=currentSession()?.objects[kind];if(!id)return;
 const rig=useGrade9Apparatus.getState().rigs[id];if(rig)useGrade9Apparatus.getState().change(id,{heating:false});
 const burner=currentSession()?.objects.bunsenBurner;if(burner)useExperimentStore.setState(s=>({toggles:{...s.toggles,[burner]:false}}));if(heldHeat.id===id)heldHeat.id=null;
}
