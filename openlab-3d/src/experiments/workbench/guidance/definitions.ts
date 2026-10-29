import {operationFor} from './operation';
import {isGrade9Rig} from '../../grade9/kinds';
import {investigationById,type InvestigationDefinition} from '../../../../../src/lib/textbook-investigations';
import {experimentById} from '../../../lab/experiments';
import {suppliesFor} from '../session';
import {guidedPlan,physicalShowcasePlan} from './plans';
import {GUIDED_OVERLAYS} from './overlays';
const target:Record<string,string>={'g7-salt-evaporation':'evaporatingDish','g10-flame':'bunsenBurner','g10-titration':'erlenmeyer','g9-transition-colours':'beaker','g9-filtration':'beaker','g9-crystallisation':'beaker','g9-precipitation':'beaker','g9-thermal-pairs':'beaker','g9-ph-ranking':'beaker','g9-zinc-hcl':'testTube','g9-antacid':'beaker','g9-water-tests':'watchGlass','catalyst-reuse':'graduatedCylinder',elephant:'graduatedCylinder',titration:'erlenmeyer',fire:'evaporatingDish',boil:'beaker',crystals:'evaporatingDish',cuso4:'evaporatingDish'};
export function guideDefinition(id:string):InvestigationDefinition|undefined{
 if(!guidedPlan(id))return;
 const d=investigationById(id),lesson=experimentById(id),supplies=suppliesFor(id).map(s=>s.reagent?`reagent:${s.reagent}`:s.kind??'').filter(Boolean);
 const base=d??{id,grade:8 as const,title:lesson?.title??id,bookPages:'',mode:'bench' as const,model:'bench',practicalIds:[],prompt:lesson?.goal??'',variables:'Нэг нөхцөлийг өөрчилж харьцуул.',controls:[],supplies,safety:lesson?.safety??'',method:lesson?.steps.map(s=>s.text)??[]};
 const overlay=GUIDED_OVERLAYS[id];
 const stages=physicalShowcasePlan(id)??[];const needed=new Set(overlay?.supplies??base.supplies);for(const step of stages){if(step.type==='dose'||step.type==='flame')needed.add(`reagent:${step.reagent}`);if('target' in step&&step.target)needed.add(step.target);if('filter' in step&&step.filter)needed.add(step.filter);if(step.type==='move'){needed.add(step.from);needed.add(step.to);}if(step.type==='place'){needed.add(step.item);if(step.onto!=='table')needed.add(step.onto);}}
 if(stages.some(s=>operationFor(overlay?.labRig??base.labRig??target[id]??'beaker',s)==='stir'))needed.add('glassRod');
 if(stages.some(s=>s.type==='configure'&&s.change.heating)&&!isGrade9Rig(overlay?.labRig??base.labRig??target[id]??'beaker')){needed.add('bunsenBurner');needed.add('tripod');}
 // Liquid in a test tube needs a rack to stand in.
 const rig=overlay?.labRig??base.labRig??target[id]??'beaker';if(rig==='testTube'||stages.some(s=>'target' in s&&s.target==='testTube'))needed.add('testTubeRack');
 return {...base,mode:'bench',labRig:rig,supplies:[...needed]};
}
