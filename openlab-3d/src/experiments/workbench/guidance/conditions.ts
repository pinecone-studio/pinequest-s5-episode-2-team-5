import type {BenchKey} from '../../../equipment/equipmentCatalog';
import type {Mixture} from '../../../chemistry/mixture';
import {liquidMl,solidMassG,contentMassG} from '../../../chemistry/mixture';
import {phOf,acidityToNeutral} from '../../../chemistry/equilibrium';
import type {RigState} from '../../grade9/process';
export type Measure='solid'|'aqueous'|'gas'|'water'|'liquid'|'mass'|'solidMass'|'temperature'|'ph'|'acid'|'ethanol'|'foam'|'burning'|'sample'|'elapsed'|'volume'|'extent'|'data';
export interface Check {metric:Measure;species?:string;key?:string;port?:number;target?:BenchKey;min?:number;max?:number;}
export interface Endpoint {checks:Check[];label:string;timeout?:number;speed?:number;minimum?:number;stopHeat?:boolean;}
export interface Sample {mixture:Mixture;rig?:RigState;sample?:Record<string,number|undefined>;}
export function measure({mixture:m,rig:r,sample}:Sample,c:Check):number{
 switch(c.metric){
 case 'solid':return m.s[c.species as keyof typeof m.s]??0;
 case 'aqueous':return m.aq[c.species as keyof typeof m.aq]??0;
 case 'gas':return m.g?.[c.species as keyof NonNullable<Mixture['g']>]??0;
 case 'water':return m.water;case 'liquid':return liquidMl(m);case 'mass':return contentMassG(m);case 'solidMass':return solidMassG(m);
 case 'temperature':return r&&['gasSyringe','fractionatingColumn'].includes(r.kind)?r.temperature:m.temp;case 'ph':return phOf(m)??NaN;case 'acid':return Math.max(0,acidityToNeutral(m));case 'ethanol':return m.ethanol;case 'foam':return m.foam;case 'burning':return m.burning?1:0;
 case 'sample':return sample?.[c.species??'']??0;
 case 'elapsed':return r?.elapsed??0;case 'volume':return r?.gas??0;case 'extent':return r?.extent??0;case 'data':return r?.data[c.key??'']??0;
 }
}
export function matches(value:number,c:Check){return Number.isFinite(value)&&(c.min===undefined||value>=c.min-1e-9*Math.max(1,Math.abs(c.min)))&&(c.max===undefined||value<=c.max+1e-9*Math.max(1,Math.abs(c.max)));}
