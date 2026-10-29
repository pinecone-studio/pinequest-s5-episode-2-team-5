import {PROFILES} from '../../../equipment/profiles';
import {pourTilt} from '../../../equipment/liquid-plane';
import {operationFor,operationLabel,type Operation} from './operation';
import {transferAppearance} from './pour-physics';
import {useGrade9Apparatus} from '../../grade9/store';
import {reagentMixture} from '../../../chemistry/mixture';
import {portLayout} from '../../grade9/port-layout';
import {endpointResult,settleEndpoint} from './endpoint';
import {clearProtocolClock,setProtocolClock} from './clock';
import {useChemStore,mixtureOf} from '../../../store/useChemStore';
import {liquidMl,solidMassG,takeLiquid,takeSolid,merge} from '../../../chemistry/mixture';
import {create} from 'zustand';
import {Quaternion,Vector3} from 'three';
import {bodies} from '../../../interaction/bodies';
import {interactables} from '../../../interaction/registry';
import {useGameStore} from '../../../store/useGameStore';
import {useLabStore} from '../../../store/useLabStore';
import {useInventoryStore} from '../../../store/useInventoryStore';
import {benchView} from '../../nacl/view';
import {currentSession,itemPosition} from '../session';
import {CATALOG,baseKind} from '../../../equipment/equipmentCatalog';
import {REAGENTS} from '../../../chemistry/reagents';
import {executeGuideStep,doseUnit,focusGuideStep,guideTargetKind} from './runtime';
import type {InvestigationDefinition} from '../../../../../src/lib/textbook-investigations';
import type {GuideStep} from './plans';
export type Point=[number,number,number];
export const useShowcase=create<{operationValue:number;carried:number;targetId:string|null;operation:Operation;progress:number;viscosity:number;materialPhase:string;key:string;status:'idle'|'playing'|'paused'|'done'|'failed';phase:string;delivered:number;amount:number;source:string|null;cap:Point|null;toolAnchor:Point|null;tip:Point|null;mouth:Point|null;flow:boolean;tool:'pour'|'spoon'|'pipette'|'hose'|'dial'|'magnet';color:string;message:string}>(()=>({operationValue:1,carried:0,targetId:null,operation:'none',progress:0,viscosity:1,materialPhase:'liquid',key:'',status:'idle',phase:'',delivered:0,amount:0,source:null,cap:null,toolAnchor:null,tip:null,mouth:null,flow:false,tool:'pour',color:'#87c8eb',message:''}));
export const showcasePort=(kind:string,i:number,experiment?:string):Point=>portLayout(kind,i,experiment).mouth;
export const showcaseDuration=(step:GuideStep)=>step.type==='dose'&&step.stopWhen?105:step.type==='dose'?5+Math.max(2,transferAppearance(reagentMixture(step.reagent,1)).viscosity>1?Math.min(8,step.amount/2):Math.min(5,step.amount/12.5)):step.type==='move'?7:step.type==='observe'?(step.duration??24):step.type==='record'?.4:['start','configure','portion'].includes(step.type)?6:3;
export function showcaseMotion(from:Point,to:Point,t:number):{position:Point;tilt:number;fraction:number;phase:string}{
 const smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 const lifted:Point=[from[0],Math.max(from[1]+.20,to[1]+.12),from[2]],over:Point=[to[0]-.07,to[1]+.10,to[2]];
 const lerp=(a:Point,b:Point,f:number):Point=>a.map((n,i)=>n+(b[i]-n)*smooth(f)) as Point;
 if(t<1)return {position:lerp(from,lifted,t),tilt:0,fraction:0,phase:'Бодисын савыг өргөж байна'};
 if(t<2.3)return {position:lerp(lifted,over,(t-1)/1.3),tilt:0,fraction:0,phase:'Сонгосон үүр рүү авчирч байна'};
 if(t<3)return {position:over,tilt:smooth((t-2.3)/.7)*1.1,fraction:0,phase:'Хэмжих хэрэгслийг байрлуулж байна'};
 if(t<5)return {position:over,tilt:1.1,fraction:(t-3)/2,phase:'Хэмжиж нэмж байна'};
 if(t<5.7)return {position:over,tilt:(1-smooth((t-5)/.7))*1.1,fraction:1,phase:'Савыг босгож байна'};
 return {position:lerp(over,from,(t-5.7)/1.3),tilt:0,fraction:1,phase:'Савыг байранд нь буцааж байна'};
}
type Job={def:InvestigationDefinition;step:GuideStep;key:string;time:number;source?:string;from:Point;to:Point;rotation:Quaternion;restore:()=>void;move:(p:Point,q:Quaternion)=>void;delivered:number;applied:boolean;prepared:boolean;waiting:number;focused:boolean;buffer?:string;};
let job:Job|null=null;
export function cancelShowcase(){clearProtocolClock();if(job)returnRemainder(job);job?.restore();job=null;useShowcase.setState({key:'',status:'idle',carried:0,targetId:null,operation:'none',progress:0,source:null,cap:null,toolAnchor:null,tip:null,mouth:null,flow:false,phase:'',delivered:0});}
export function pauseShowcase(){if(useShowcase.getState().status==='playing'){clearProtocolClock();useShowcase.setState({status:'paused',flow:false});}}
export function beginShowcase(def:InvestigationDefinition,step:GuideStep,key:string){
 if(job?.key===key){if(useShowcase.getState().status==='paused'){useShowcase.setState({status:'playing'});setWaitClock(job);}return;}
 cancelShowcase();if(step.type==='move'&&step.all){const source=currentSession()?.objects[step.from];if(source){const m=mixtureOf(source);step={...step,amount:liquidMl(m)||solidMassG(m),all:false};}}
 const pieceKey=guideTargetKind(def,step),kind=baseKind(pieceKey),id=currentSession()?.objects[pieceKey];
 if(!id){useShowcase.setState({key,status:'failed',message:'Багаж, бодисоо эхлээд бэлтгэ.'});return;}
 const operation=operationFor(kind,step);
 const source=step.type==='dose'?currentSession()?.objects[`reagent-${step.reagent}`]:step.type==='move'?currentSession()?.objects[step.from]:step.type==='flame'?currentSession()?.objects.wireLoop:step.type==='place'?currentSession()?.objects[step.item]:operation==='stir'?currentSession()?.objects.glassRod:undefined;
 const at=itemPosition(id),local:Point=step.type==='dose'||step.type==='move'||operation==='stir'?showcasePort(kind,step.type==='dose'?step.port:0,def.id):step.type==='configure'&&step.change.operation==='draw'?[.04,.19,.03]:step.type==='configure'&&step.change.operation==='magnet'?[-.06,.15,0]:['electrolysisCell','galvanicCell','migrationTube'].includes(def.labRig!)?[0,.21,.03]:[0,.04,.08];
 const body=bodies.get(id),rot=body?new Quaternion().copy(body.rotation()):interactables.get(id)?.object.getWorldQuaternion(new Quaternion())??new Quaternion();
 if(operation==='stir')local[1]+=.025;
 if(step.type==='flame'){local[0]=0;local[1]=.17;local[2]=0;}
 if(step.type==='place'){if(step.onto==='table'){const home=useInventoryStore.getState().worldItems.find(w=>w.id===source)?.position;if(home){at.set(...home);local[0]=0;local[1]=0;local[2]=0;}}else{local[0]=0;local[1]=(CATALOG[baseKind(step.onto)].size[1]??.12)-.035;local[2]=0;}}
 const to=new Vector3(...local).applyQuaternion(rot).add(at).toArray() as Point;
 job={def,step,key,time:0,source,from:[...to],to,rotation:new Quaternion(),restore:()=>{},move:()=>{},delivered:0,applied:false,prepared:!['dose','move','place','flame'].includes(step.type)&&!(operation==='stir'&&source),waiting:0,focused:false};
 setWaitClock(job);
 focusGuideStep(def,step,true,false);
 const gas=step.type==='dose'&&doseUnit(step.reagent)==='мл хий',stockAt=source?itemPosition(source):at;
 let center:Point=gas?[(at.x+stockAt.x)/2,at.y+.16,(at.z+stockAt.z)/2]:[at.x-.025,at.y+.15,at.z];
 let frameWidth=gas?Math.max(.46,Math.abs(stockAt.x-at.x)+.20):.34,frameHeight=.34;
 if(step.type==='observe'){
  const rig=useGrade9Apparatus.getState().rigs[id],port=rig?.port??0,location=portLayout(kind,port,rig?.experiment),electrical=['galvanicCell','electrolysisCell','migrationTube'].includes(kind);
  const point=rig?new Vector3(location.x,location.bottom+location.height*.45,location.z).applyQuaternion(rot).add(at):new Vector3(at.x,at.y+.045,at.z);
  center=point.toArray() as Point;frameWidth=electrical?.28:rig?.24:.19;frameHeight=electrical?.30:rig?.24:.20;if(electrical)center[1]=at.y+.13;
 }
 benchView.frame(center,frameWidth,frameHeight);
 const sourceMaterial=source?useGrade9Apparatus.getState().rigs[source]?.chambers[0]??mixtureOf(source,step.type==='dose'?{reagent:step.reagent}:undefined):undefined;
 const appearance=sourceMaterial?transferAppearance(sourceMaterial):{color:'#e6eef2',viscosity:1,phase:'liquid'};
 useShowcase.setState({operationValue:step.type==='configure'?(step.change.heating??step.change.cooling??step.change.connected??true)?1:0:1,carried:0,targetId:id,operation,progress:0,viscosity:appearance.viscosity,materialPhase:appearance.phase,key,status:'playing',phase:'Үзүүлбэр бэлтгэж байна',delivered:0,amount:step.type==='dose'||step.type==='move'?step.amount:0,source:source??null,cap:null,toolAnchor:null,tip:null,mouth:to,flow:false,tool:step.type==='dose'?doseUnit(step.reagent)==='г'?'spoon':doseUnit(step.reagent)==='мл хий'?'hose':step.stopWhen||step.amount<=1?'pipette':'pour':step.type==='move'?'pour':'dial',color:appearance.color,message:''});
}
function prepare(j:Job){
 if(!j.source)return false;
 const held=useInventoryStore.getState().held;if(held?.id===j.source)return false;
 const body=bodies.get(j.source),object=interactables.get(j.source)?.object;if(!object)return false;
 if(body){
  const p=body.translation(),q=body.rotation(),type=body.bodyType(),groups=Array.from({length:body.numColliders()},(_,i)=>body.collider(i).collisionGroups());
  j.from=[p.x,p.y,p.z];j.rotation.copy(q);body.setBodyType(2,true);groups.forEach((_,i)=>body.collider(i).setCollisionGroups(0));
  j.move=(point,rotation)=>{body.setTranslation({x:point[0],y:point[1],z:point[2]},true);body.setNextKinematicTranslation({x:point[0],y:point[1],z:point[2]});body.setRotation(rotation,true);body.setNextKinematicRotation(rotation);};
  j.restore=()=>{if(!bodies.has(j.source!))return;body.setTranslation(p,true);body.setRotation(q,true);body.setBodyType(type,true);groups.forEach((group,i)=>body.collider(i).setCollisionGroups(group));body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);};
 }else{
  const p=object.position.clone(),q=object.quaternion.clone();j.from=object.getWorldPosition(new Vector3()).toArray() as Point;j.rotation.copy(object.getWorldQuaternion(new Quaternion()));
  j.move=(point,rotation)=>{const world=new Vector3(...point);object.position.copy(object.parent?object.parent.worldToLocal(world):world);const local=rotation.clone();if(object.parent)local.premultiply(object.parent.getWorldQuaternion(new Quaternion()).invert());object.quaternion.copy(local);object.updateWorldMatrix(true,true);};
  j.restore=()=>{object.position.copy(p);object.quaternion.copy(q);object.updateWorldMatrix(true,true);};
 }
 j.prepared=true;return true;
}
/** Frame-driven: pause freezes time and quantity, no background timeouts or duplicate pours. */
export function tickShowcase(dt:number){
 const j=job;if(!j||useShowcase.getState().status!=='playing'||!(dt>0))return;
 if(useGameStore.getState().mode!=='bench'||useLabStore.getState().active!==j.def.id||currentSession()?.objects[guideTargetKind(j.def,j.step)]!==guideCueTarget()){cancelShowcase();return;}
 if(!j.prepared){if(!prepare(j)){j.waiting+=Math.min(dt,.1);if(j.waiting>5){j.restore();useShowcase.setState({status:'failed',message:'Бодисын сав хараахан бэлэн биш эсвэл гартаа барьж байна. Саваа тавиад дахин оролд.'});}return;}}
 j.time+=Math.min(dt,.1);
 if(useShowcase.getState().operation==='stir'&&j.source){
  const f=Math.min(1,j.time/showcaseDuration(j.step)),enter=Math.min(1,f/.2),exit=Math.max(0,(f-.8)/.2),blend=enter*(1-exit),p=j.from.map((v,i)=>v+(j.to[i]-v)*blend) as Point;
  if(f>.2&&f<.8){p[0]+=Math.cos((f-.2)*Math.PI*12)*.008;p[2]+=Math.sin((f-.2)*Math.PI*12)*.008;}
  j.move(p,j.rotation.clone().slerp(new Quaternion().setFromAxisAngle(new Vector3(1,0,0),-Math.PI/2),blend));
  if(f>.65&&!j.applied){const result=executeGuideStep(j.def,j.step);j.applied=true;if(!result.ok){j.restore();useShowcase.setState({status:'failed',message:result.message});return;}}
  useShowcase.setState({toolAnchor:null,flow:false,phase:operationLabel.stir});
 }else if(j.step.type==='place'||j.step.type==='flame'){
  const f=Math.min(1,j.time/3),e=f*f*(3-2*f),p=j.from.map((x,i)=>x+(j.to[i]-x)*e) as Point;p[1]+=.1*Math.sin(f*Math.PI);j.move(p,j.rotation);
  useShowcase.setState({phase:j.step.label,toolAnchor:null,flow:false});if(j.step.type==='flame'&&j.time>1.5&&!j.applied){const result=executeGuideStep(j.def,j.step);j.applied=true;if(!result.ok){useShowcase.setState({status:'failed',message:result.message});return;}}
 }else if(j.step.type==='dose'||j.step.type==='move'){
  const duration=showcaseDuration(j.step),pourSeconds=duration-5,motionTime=j.time<3?j.time:j.time<3+pourSeconds?3+(j.time-3)/pourSeconds*2:5+(j.time-3-pourSeconds);
  const tool=useShowcase.getState().tool,gas=tool==='hose';
  const measuringTool=tool==='spoon'||tool==='pipette',container=j.step.type==='dose'?REAGENTS[j.step.reagent].container:baseKind(j.step.from),height=container==='dropperBottle'?.068:container==='reagentJar'?.085:container==='reagentBottle'?.13:CATALOG[container].size[1];
  const toolFrom:Point=[j.from[0]-.07,j.from[1]+height+.05,j.from[2]],motion=showcaseMotion(measuringTool?toolFrom:j.from,j.to,motionTime);
  if(measuringTool&&j.step.type==='dose'&&j.source&&!j.buffer&&j.time>.65){
   const source=mixtureOf(j.source,{reagent:j.step.reagent}),portion=tool==='spoon'?takeSolid(source,j.step.amount):takeLiquid(source,j.step.amount),taken=tool==='spoon'?solidMassG(portion.taken):liquidMl(portion.taken);
   if(taken+1e-8<j.step.amount){j.restore();useShowcase.setState({status:'failed',flow:false,message:'Хэмжих хэрэгсэлд авах эх бодис хүрэлцэхгүй.'});return;}
   j.buffer=`showcase-carried-${j.key}`;useChemStore.getState().setMixtures({[j.source]:portion.rest,[j.buffer]:portion.taken});useShowcase.setState({carried:taken});
  }
  const sourceVolume=j.source?liquidMl(mixtureOf(j.source,j.step.type==='dose'?{reagent:j.step.reagent}:undefined)):0,tilt=container in PROFILES&&sourceVolume>0?pourTilt(PROFILES[container as keyof typeof PROFILES],sourceVolume)*motion.tilt/1.1:motion.tilt;
  const q=j.rotation.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0,0,1),gas||measuringTool?0:-tilt));
  const p:Point=[...(gas||measuringTool?j.from:motion.position)];
  const outlet=new Vector3(0,height,0).applyQuaternion(q),weight=motion.tilt/1.1;
  if(!gas&&!measuringTool){const over:Point=[j.to[0]-.07,j.to[1]+.10,j.to[2]];const desired=new Vector3(j.to[0],j.to[1]+.045,j.to[2]).sub(outlet);p[0]+=(desired.x-over[0])*weight;p[1]+=(desired.y-over[1])*weight;p[2]+=(desired.z-over[2])*weight;}
  j.move(p,q);
  if(j.source){const sourceRig=useGrade9Apparatus.getState().rigs[j.source],m=sourceRig?.chambers[sourceRig.port]??mixtureOf(j.source,j.step.type==='dose'?{reagent:j.step.reagent}:undefined);if(liquidMl(m)+solidMassG(m)>1e-6){const appearance=transferAppearance(m);useShowcase.setState({color:appearance.color,viscosity:appearance.viscosity,materialPhase:appearance.phase});}}
  const desired=j.step.type==='dose'&&(j.step.stopWhen||tool==='pipette')?(motion.fraction>=1?j.step.amount:Math.floor(j.step.amount*motion.fraction/.05+1e-8)*.05):j.step.amount*motion.fraction,delta=desired-j.delivered;
  if(delta>1e-7){const doseSource=j.buffer??j.source,before=doseSource?liquidMl(mixtureOf(doseSource)):0;const result=executeGuideStep(j.def,{...j.step,amount:delta},j.buffer);if(!result.ok){j.restore();returnRemainder(j);clearProtocolClock();useShowcase.setState({status:'failed',flow:false,message:result.message});return;}j.delivered=j.step.type==='dose'&&j.step.stopWhen?j.delivered+Math.max(0,before-liquidMl(mixtureOf(doseSource!))):desired;}
  if(j.step.type==='dose'&&j.step.stopWhen&&endpointResult(j.def,j.step,j.step.stopWhen).ok&&j.time<3+pourSeconds)j.time=3+pourSeconds;
  const tip:Point=measuringTool?[motion.position[0]+.07,motion.position[1]-.05,motion.position[2]]:[p[0]+outlet.x,p[1]+outlet.y,p[2]+outlet.z];
  if(measuringTool&&motionTime>=2.3&&motionTime<=5.7){tip[0]=j.to[0];tip[1]=j.to[1]+.045;tip[2]=j.to[2];}
  if(gas){tip[0]=j.from[0]+.024;tip[1]=j.from[1]+.169;tip[2]=j.from[2];}
  const toolAnchor:Point=gas?[j.from[0]+.024,j.from[1]+.169,j.from[2]]:measuringTool?[tip[0]-.04,tip[1]+.035,tip[2]]:[p[0]-.025,p[1]+.06,p[2]];
  const cap:Point|null=gas||j.step.type==='move'?null:[j.from[0]+.06,j.from[1]+.01,j.from[2]+.025];
  // Once liquid flows, push in on the receiving vessel so the mixing fills the view.
  if(!gas&&!j.focused&&motionTime>=3.2){j.focused=true;benchView.frame([j.to[0],j.to[1]-.03,j.to[2]],.2,.2);}
  useShowcase.setState({cap,toolAnchor,tip,mouth:j.to,flow:motionTime>=3&&motionTime<5&&!(j.step.type==='dose'&&j.step.stopWhen&&endpointResult(j.def,j.step,j.step.stopWhen).ok),carried:j.buffer?Math.max(0,j.step.amount-j.delivered):0,delivered:j.delivered,phase:gas?'Хийн хаалтыг нээж хоолойгоор дамжуулж байна':motion.phase});

 }else{
  const toolAnchor:Point|null=j.step.type==='observe'?null:[j.to[0]+.012*Math.sin(j.time*3),j.to[1]+.02,j.to[2]+.02];
  useShowcase.setState({toolAnchor,tip:null,flow:false,phase:j.step.type==='observe'?'Урвал ба хэмжилтийг ойроос ажиглаж байна':operationLabel[useShowcase.getState().operation]||'Багажийн удирдлагыг ажиллуулж байна'});
  if(j.time>(j.step.type==='record'?.01:showcaseDuration(j.step)*(useShowcase.getState().operation==='magnet'?.83:.65))&&!j.applied&&j.step.type!=='observe'){const result=executeGuideStep(j.def,j.step);j.applied=true;if(!result.ok){clearProtocolClock();useShowcase.setState({status:'failed',message:result.message});return;}}
 }
 const duration=showcaseDuration(j.step);
 useShowcase.setState({progress:Math.min(1,j.time/duration)});
 let done=j.time>=duration;
 if(j.step.type==='observe'&&j.step.until){
  const until=j.step.until,result=endpointResult(j.def,j.step,until);done=j.time>=Math.max(0,until.minimum??1)&&result.ok;if(done)settleEndpoint(j.def,j.step,until);
  if(!done&&j.time>(until.timeout??120)){clearProtocolClock();useShowcase.setState({status:'failed',flow:false,message:`Хүлээлт дууссан ч эцсийн төлөв батлагдсангүй: ${until.label}. Туршилт дуусаагүй.`});return;}
 }
 if(done){clearProtocolClock();returnRemainder(j);if(j.step.type==='place'||j.step.type==='flame'){j.move(j.to,j.rotation);}else j.restore();j.restore=()=>{};useShowcase.setState({status:'done',source:null,cap:null,toolAnchor:null,tip:null,flow:false,phase:'Үйлдлийг дуусгалаа',message:j.step.type==='observe'?j.step.label:'Багаж дээрх үйлдлийг дуусгалаа.'});}
}
// Read the live target without importing the rendering layer.
import {useGuideCue} from './runtime';
function guideCueTarget(){return useGuideCue.getState().target;}

function setWaitClock(j:Job){
 if(j.step.type!=='observe'||!j.step.until)return;
 const ids=Object.entries(currentSession()?.objects??{}).filter(([key])=>!key.startsWith('reagent-')&&!key.startsWith('nacl-')).map(([,id])=>id);
 setProtocolClock(ids,j.step.until.speed??1);
}

function returnRemainder(j:Job){
 if(!j.buffer)return;const chem=useChemStore.getState(),rest=chem.mixtures[j.buffer];if(rest&&j.source)chem.setMixtures({[j.source]:merge(mixtureOf(j.source),rest)});chem.removeMixture(j.buffer);j.buffer=undefined;
}
