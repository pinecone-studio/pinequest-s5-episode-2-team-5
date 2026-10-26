import { curriculumObservations } from '../curriculum/observations';
import { isCurriculumRig } from '../curriculum/kinds';
import {ACTIVITY} from '../../chemistry/species';
import {atom,ion,solid,physicalMixing,type ReactionObservation,type MoleculeSpec} from '../../chemistry/reaction-view';
import {merge} from '../../chemistry/mixture';
import type {RigState} from './process';
/** Molecular views follow measured changes in the apparatus, never a selected recipe alone. */
export function rigObservations(before:RigState,after:RigState,dt:number):ReactionObservation[]{
 if(isCurriculumRig(after.kind))return curriculumObservations(before,after);
 const gas=(after.gas-before.gas)/24000/Math.max(dt,.001),a=before.chambers[0],b=after.chambers[0];
 const W=(n=1)=>atom('H2O','Ус','H₂O','#f16d70',n);
 const O=(n=1)=>atom('O2','Хүчилтөрөгч','O₂','#f25460',n,'gas');
 const C=(n=1)=>atom('CO2','Нүүрсхүчлийн хий','CO₂','#cad1d8',n,'gas');
 const obs=(reactants:MoleculeSpec[],products:MoleculeSpec[],rate:number,equation:string,effect:ReactionObservation['effect']='gas'):ReactionObservation=>({preset:'generic',key:`grade9:${before.experiment}:${equation}`,reactants,products,rate,temp:after.temperature,equation,sentence:after.message,effect});
 if(before.kind==='diffusionTube'&&after.extent>before.extent)return [obs([atom('NH3','Аммиак','NH₃','#9eb5d3',1,'gas'),atom('HCl','Устөрөгчийн хлорид','HCl','#a8d9b5',1,'gas')],[solid('NH4Cl')],(after.extent-before.extent)/dt,'NH₃ + HCl → NH₄Cl(s)','precipitate')];
 if(before.kind==='gasSyringe'&&after.extent>before.extent)return [obs([solid('Cu',2),O()],[solid('CuO',2)],(after.extent-before.extent)/24000/dt,'2Cu + O₂ → 2CuO','color')];
 if(before.kind==='calorimeter'&&after.extent>before.extent)return [obs([atom('ethanol','Этанол','C₂H₅OH','#dce8ef'),O(3)],[C(2),W(3)],(after.extent-before.extent)/46.07/dt,'C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O')];
 if(before.kind==='conductivityTester'&&gas>1e-10){const metal=ACTIVITY.find(m=>(a.s[m.solid]??0)>(b.s[m.solid]??0));if(metal){const count=metal.charge%2?2:1;return [{...obs([solid(metal.solid,count),atom('H','Устөрөгчийн ион','H⁺','#ffffff',metal.charge*count)],[ion(metal.ion,count),atom('H2','Устөрөгч','H₂','#ffffff',metal.charge*count/2,'gas')],gas,`${count}${metal.solid} + ${metal.charge*count}H⁺ → ${count}${metal.ion} + ${metal.charge*count/2}H₂`),preset:'metal'}];}}
 if(before.kind==='gasTrain'&&gas>1e-10){
  if((a.aq.H2O2??0)>(b.aq.H2O2??0))return [{...obs([ion('H2O2',2)],[W(2),O()],gas,'2H₂O₂ → 2H₂O + O₂'),preset:'peroxide'}];
  if((b.aq.Cit??0)>(a.aq.Cit??0))return [obs([solid('citric'),solid('NaHCO3',3)],[ion('Na',3),atom('citrate','Цитрат','C₆H₅O₇³⁻','#b4d2a4'),C(3),W(3)],gas/3,'C₆H₈O₇ + 3NaHCO₃ → Na₃C₆H₅O₇ + 3CO₂ + 3H₂O')];
  if(before.experiment==='g9-ammonia-preparation')return [obs([solid('NH4Cl',2),solid('CaOH2')],[ion('Ca'),ion('Cl',2),atom('NH3','Аммиак','NH₃','#a5bbcd',2,'gas'),W(2)],gas/2,'2NH₄Cl + Ca(OH)₂ → CaCl₂ + 2NH₃ + 2H₂O')];
  if((a.s.CuCO3??0)>(b.s.CuCO3??0)&&after.heating)return [obs([solid('CuCO3')],[solid('CuO'),C()],gas,'CuCO₃ → CuO + CO₂')];
  if((a.s.graphite??0)>(b.s.graphite??0))return [obs([solid('graphite'),O()],[C()],gas,'C + O₂ → CO₂')];
  if(a.from.some(x=>['s_caco3','s_na2co3','s_nahco3'].includes(x)))return [{...obs([ion('CO3'),atom('H','Устөрөгчийн ион','H⁺','#ffffff',2)],[W(),C()],gas,'CO₃²⁻ + 2H⁺ → CO₂ + H₂O'),preset:'acid'}];
 }
 if(['convectionCell','diffusionCell'].includes(before.kind)&&after.extent>before.extent)return [physicalMixing(merge(after.chambers[0],after.chambers[1]))];
 return [];
}
