import {takeLiquid,takeSolid,merge} from '../../../chemistry/mixture';
import {CATIONS,FLAME_COLORS,type Cation} from '../../../chemistry/species';
import {endpointResult,protocolReadings} from './endpoint';
import {useProtocolResults} from './results';
import {emptyMixture,solidMassG,contentMassG} from '../../../chemistry/mixture';
import {createRig} from '../../grade9/process';
import {create} from 'zustand';
import {reagentMixture,liquidMl,gasMl} from '../../../chemistry/mixture';
import type {ReagentId} from '../../../chemistry/reagents';
import {useGrade9Apparatus} from '../../grade9/store';
import {isGrade9Rig,RIG_NAMES} from '../../grade9/kinds';
import {CURRICULUM_RIGS,isCurriculumRig} from '../../curriculum/kinds';
import {useChemStore,mixtureOf} from '../../../store/useChemStore';
import {useBenchView,benchView} from '../../nacl/view';
import {useSandbox} from '../../nacl/sandbox';
import {transfer,stirUntil,heldHeat} from '../../../interaction/actions';
import {REAGENTS} from '../../../chemistry/reagents';
import {CATALOG,baseKind,type BenchKey,type EquipmentKind} from '../../../equipment/equipmentCatalog';
import {bodies} from '../../../interaction/bodies';
import {useExperimentStore} from '../../../store/useExperimentStore';
import {currentSession,itemPosition} from '../session';
import type {InvestigationDefinition} from '../../../../../src/lib/textbook-investigations';
import type {GuideStep} from './plans';
export const useGuideCue=create<{experiment:string|null;target:string|null;source:string|null;port:number;label:string;playing:boolean}>(()=>({experiment:null,target:null,source:null,port:0,label:'',playing:false}));
export function clearGuideCue(){useGuideCue.setState({experiment:null,target:null,source:null,label:'',playing:false});}
/** The worktop piece a step acts on (its BenchKey: `beaker`, or `beaker#2` for a second beaker). */
export function guideTargetKind(def:InvestigationDefinition,step:GuideStep):BenchKey{return (step.type==='place'?step.onto==='table'?step.item:step.onto:step.type==='move'?step.to:'target' in step&&step.target?step.target:def.labRig) as BenchKey;}
export function portName(kind:string,port:number){return isCurriculumRig(kind)?`${port+1}. ${CURRICULUM_RIGS[kind].ports[port]}`:kind==='gasTrain'?['1. Урвалын сав','2. Нэмэх сав','3. Хий хүлээн авагч'][port]:isGrade9Rig(kind)?`${port+1}-р үүр`:CATALOG[kind as EquipmentKind]?.name??kind;}
export function doseUnit(id:ReagentId){const m=reagentMixture(id,1);return gasMl(m)>0&&liquidMl(m)<.005?'мл хий':liquidMl(m)<.005?'г':'мл';}
export function stepLabel(step:GuideStep,kind:string){if(step.type!=='dose')return step.label;const r=REAGENTS[step.reagent];return `${r.name} · ${step.amount} ${doseUnit(step.reagent)} → ${portName(step.target??kind,step.port)}`;}
export function focusGuideStep(def:InvestigationDefinition,step:GuideStep,playing=false,frameCamera=true){
 const key=guideTargetKind(def,step),kind=baseKind(key),id=currentSession()?.objects[key];if(!id||!CATALOG[kind])return false;
 const store=useGrade9Apparatus.getState();let port=0;
 if(isGrade9Rig(kind)){store.ensure(id,def.id,kind);port='port' in step&&step.port!==undefined?step.port:(step.type==='observe'||step.type==='finish')?step.until?.checks.find(c=>c.port!==undefined&&(!c.target||c.target===kind))?.port??0:0;store.change(id,{port});const m=useGrade9Apparatus.getState().rigs[id]?.chambers[port];if(m)useChemStore.getState().setMixtures({[id]:m});}
 useBenchView.setState({selected:id});useSandbox.setState({inspected:playing?null:id});if(frameCamera)benchView.focus(id);
 useGuideCue.setState({experiment:def.id,target:id,source:step.type==='dose'?currentSession()?.objects[`reagent-${step.reagent}`]??null:step.type==='move'?currentSession()?.objects[step.from]??null:null,port:step.type==='dose'?port:-1,label:step.type==='dose'?`${REAGENTS[step.reagent].label} · ${step.amount} ${doseUnit(step.reagent)}`:step.type==='configure'?'Удирдлагыг тохируул':step.type==='start'?'Холих / ажиллуулах':'Заалтыг ажиглах',playing});return true;
}
function heatGlassware(id:string,on:boolean){
 const session=currentSession(),burner=session?.objects.bunsenBurner,tripod=session?.objects.tripod;
 if(!burner)return false;
 const p=itemPosition(id),base=itemPosition(burner).y;
 bodies.get(burner)?.setTranslation({x:p.x,y:base,z:p.z},true);
 if(tripod)bodies.get(tripod)?.setTranslation({x:p.x,y:base,z:p.z},true);
 bodies.get(id)?.setTranslation({x:p.x,y:base+.205,z:p.z},true);
 useExperimentStore.setState(s=>({toggles:{...s.toggles,[burner]:on}}));
 if(on){heldHeat.id=id;heldHeat.watts=1300;heldHeat.until=performance.now()+90000;}else if(heldHeat.id===id)heldHeat.id=null;
 return true;
}
/** Both rigs and ordinary vessels use the same finite chemical transfer operations. */
export function executeGuideStep(def:InvestigationDefinition,step:GuideStep,sourceOverride?:string):{ok:boolean;message:string}{
 const session=currentSession(),key=guideTargetKind(def,step),kind=baseKind(key),id=session?.objects[key];if(!id||!CATALOG[kind])return {ok:false,message:'Эхлээд багаж, бодисоо бэлтгэ.'};
 const store=useGrade9Apparatus.getState(),rig=isGrade9Rig(kind);if(rig)store.ensure(id,def.id,kind);
 if(step.type==='flame'){
  const source=session?.objects[`reagent-${step.reagent}`],loop=session?.objects.wireLoop;if(!source||!loop)return {ok:false,message:'Дөлний сорилын гогцоо, давсны дээж хэрэгтэй.'};
  const input=mixtureOf(source,{reagent:step.reagent});if(liquidMl(input)+1e-9<step.amount)return {ok:false,message:'Давсны нөөц хүрэлцэхгүй.'};
  const {taken,rest}=takeLiquid(input,step.amount),sample:Partial<Record<Cation,number>>={};for(const c of CATIONS)if((taken.aq[c]??0)>0)sample[c]=taken.aq[c];
  const c=CATIONS.find(c=>(sample[c]??0)>0&&FLAME_COLORS[c]);if(!c)return {ok:false,message:'Дөлний өнгө өгдөг дээж байхгүй.'};
  useChemStore.getState().setMixtures({[source]:rest});useChemStore.getState().setTool(loop,{sample});useChemStore.getState().setFlame(id,FLAME_COLORS[c]!.color,30);useExperimentStore.setState(s=>({toggles:{...s.toggles,[id]:true}}));
 }else if(step.type==='portion'){
  const r=store.rigs[id];if(!r)return {ok:false,message:'Хэсгүүдтэй багаж хэрэгтэй.'};const {taken,rest}=takeSolid(r.chambers[step.fromPort],step.grams);if(solidMassG(taken)+1e-8<step.grams)return {ok:false,message:'Хэсгийн нөөц хүрэлцэхгүй.'};
  store.change(id,{chambers:r.chambers.map((m,i)=>i===step.fromPort?rest:i===step.toPort?merge(m,taken):m)});
 }else if(step.type==='dose'||step.type==='move'){
  if(step.type==='dose'&&step.stopWhen){let used=0;while(used<step.amount&&!endpointResult(def,step,step.stopWhen).ok){const amount=Math.min(.05,step.amount-used),result=executeGuideStep(def,{...step,stopWhen:undefined,amount},sourceOverride);if(!result.ok)return result;used+=amount;}return {ok:used>0||endpointResult(def,step,step.stopWhen).ok,message:`Дуслаар нэмсэн хэмжээ: ${used.toFixed(2)} мл.`};}

  const source=sourceOverride??(step.type==='dose'?session?.objects[`reagent-${step.reagent}`]:session?.objects[step.from]);if(!source)return {ok:false,message:'Шаардлагатай эх бодис олдсонгүй. Бэлтгэлээ шалга.'};
  if(rig)store.change(id,{port:step.type==='dose'?step.port:0});
  const r=step.type==='dose'?REAGENTS[step.reagent]:null;
  const result=transfer({id:source,kind:r?r.container:step.type==='move'?baseKind(step.from):'beaker',...(step.type==='dose'?{variant:{reagent:step.reagent}}:{})},{id,kind},step.type==='move'&&step.all?(liquidMl(mixtureOf(source))||solidMassG(mixtureOf(source))):step.amount,step.filter?session?.objects[step.filter]:undefined);
  if(!(step.type==='move'&&step.all)&&Math.abs(result.moved-step.amount)>1e-6)return {ok:false,message:`${result.moved} шилжлээ; нөөц хүрэлцэхгүй эсвэл сав дүүрсэн. Үзүүлбэр зогслоо.`};
 }else if(step.type==='record'){
  const readings=protocolReadings(def,step);if(!readings.length)return {ok:false,message:'Бүртгэх хэмжилт олдсонгүй.'};
  useProtocolResults.setState(s=>({experiment:def.id,complete:false,records:[...(s.experiment===def.id?s.records:[]),{label:step.label,readings}]}));
 }else if(step.type==='reset'){
  if(heldHeat.id===id){heatGlassware(id,false);heldHeat.id=null;}
  const r=store.rigs[id],mass=r?r.chambers.reduce((sum,m)=>sum+contentMassG(m),0):contentMassG(mixtureOf(id));
  useProtocolResults.setState(s=>({wasteMass:s.wasteMass+mass}));
  if(r&&isGrade9Rig(kind))store.change(id,createRig(def.id,kind));
  useChemStore.getState().setMixtures({[id]:emptyMixture()});
 }else if(step.type==='finish'){
  const result=endpointResult(def,step,step.until);
  if(!result.ok||useProtocolResults.getState().experiment!==def.id||!useProtocolResults.getState().records.length)return {ok:false,message:'Эцсийн үр дүн хараахан баталгаажаагүй. Туршилтыг дууссан гэж тэмдэглэхгүй.'};
  for(const object of Object.values(session!.objects)){if(store.rigs[object])store.change(object,{running:false,heating:false,cooling:false,connected:false});}
  const burner=session?.objects.bunsenBurner;if(burner)useExperimentStore.setState(s=>({toggles:{...s.toggles,[burner]:false}}));
  if(heldHeat.id&&Object.values(session!.objects).includes(heldHeat.id))heldHeat.id=null;
  useProtocolResults.setState({complete:true});
 }else if(step.type==='configure'){
  if(rig){store.change(id,step.change);if(step.change.data?.grind){const r=store.rigs[id];store.change(id,{chambers:r.chambers.map((m,i)=>i===r.port?{...m,fine:true}:m)});}}
  else{
   if(step.change.heating!==undefined&&!heatGlassware(id,step.change.heating))return {ok:false,message:'Халаагуур бэлтгэгдээгүй байна.'};
   if(step.change.operation==='ignite'){const m=mixtureOf(id);useChemStore.getState().setMixtures({[id]:{...m,burning:true}});}
  }
 }else if(step.type==='start'){
  if(rig){store.start(id);if(!useGrade9Apparatus.getState().rigs[id].running)return {ok:false,message:useGrade9Apparatus.getState().rigs[id].message};}
  else stirUntil.set(id,performance.now()+15000);
 }
 return {ok:true,message:step.type==='observe'?step.label:'Үйлдлийг багаж дээр хийлээ.'};
}
export function rigName(kind:string){return isGrade9Rig(kind)?RIG_NAMES[kind]:CATALOG[kind as EquipmentKind]?.name??kind;}
