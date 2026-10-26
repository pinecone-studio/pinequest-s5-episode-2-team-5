import type {InvestigationDefinition} from '../../../../../src/lib/textbook-investigations';
import {CATALOG,type EquipmentKind} from '../../../equipment/equipmentCatalog';
import {REAGENTS,type ReagentId} from '../../../chemistry/reagents';
import {useInventoryStore} from '../../../store/useInventoryStore';
import {useWorkbench} from '../session';
import {grade9SupplyPosition} from '../placement';
/** Extra demonstration equipment stays scoped to this attempt and is cleaned with it. */
export function prepareShowcaseEquipment(def:InvestigationDefinition){
 const session=useWorkbench.getState().sessions[def.id];if(!session)return;
 const objects={...session.objects},owned=[...session.owned];
 for(const [i,supply] of def.supplies.entries()){
  const reagent=supply.startsWith('reagent:')?supply.slice(8) as ReagentId:undefined,key=reagent?`reagent-${reagent}`:supply;
  if(objects[key])continue;
  const kind=reagent?REAGENTS[reagent]?.container:supply as EquipmentKind;if(!kind||!CATALOG[kind])continue;
  const id=useInventoryStore.getState().spawn(kind,grade9SupplyPosition(i),0,reagent?{reagent}:undefined);if(id){objects[key]=id;owned.push(id);}
 }
 useWorkbench.setState(s=>({sessions:{...s.sessions,[def.id]:{...s.sessions[def.id],objects,owned,ready:true}}}));
}
