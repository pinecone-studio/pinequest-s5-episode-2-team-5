import {REAGENTS} from '../../chemistry/reagents';
import {publishReaction} from '../../lab/reaction-view';
import {physicalMixing} from '../../chemistry/reaction-view';
import {isGrade9Rig} from './kinds';
import {useGrade9Apparatus} from './store';
import {useLabStore} from '../../store/useLabStore';
import {mixtureOf,useChemStore} from '../../store/useChemStore';
import {gasMl,liquidMl,solidMassG,takeLiquid,takeSolid} from '../../chemistry/mixture';
import {recordTransfer} from '../../lab/measurements';
import type {EquipmentKind} from '../../equipment/equipmentCatalog';
import type {ItemVariant} from '../../world/itemsLayout';
interface Vessel {id:string;kind:EquipmentKind;variant?:ItemVariant}
/** Return null for normal glassware; special apparatus receive actual, depleted portions. */
export function transferToGrade9(src:Vessel,dst:Vessel,amount:number):{moved:number;overflow:boolean}|null {
 if(src.id===dst.id)return {moved:0,overflow:false};
 if(!isGrade9Rig(dst.kind))return null;
 const store=useGrade9Apparatus.getState();store.ensure(dst.id,useLabStore.getState().active??'',dst.kind);
 const sourceRig=store.rigs[src.id];
 const sm=sourceRig?.chambers[sourceRig.port]??mixtureOf(src.id,src.variant),r=useGrade9Apparatus.getState().rigs[dst.id];
 const liquid=liquidMl(sm)>.005||gasMl(sm)>.001,available=liquid?(liquidMl(sm)||gasMl(sm)):solidMassG(sm),room=Math.max(0,500-liquidMl(r.chambers[r.port])-solidMassG(r.chambers[r.port]));
 const moved=Math.min(Math.max(0,amount),available,room);if(moved<=1e-6)return {moved:0,overflow:room<=0};
 const {taken,rest}=liquid?takeLiquid(sm,moved):takeSolid(sm,moved);
 if(sourceRig)store.change(src.id,{chambers:sourceRig.chambers.map((m,i)=>i===sourceRig.port?rest:m)});
 store.load(dst.id,taken);useChemStore.getState().setMixtures({[src.id]:rest,[dst.id]:useGrade9Apparatus.getState().rigs[dst.id].chambers[r.port]});
 publishReaction(dst.id,physicalMixing(useGrade9Apparatus.getState().rigs[dst.id].chambers[r.port]),1200);
 recordTransfer(src.id,dst.id,src.variant?.reagent?REAGENTS[src.variant.reagent].name:src.kind,moved,liquid?'ml':'g');
 return {moved,overflow:amount>room};
}
