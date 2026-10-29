import type {EquipmentKind} from '../../equipment/equipmentCatalog';

/**
 * Gas trains drawn as the textbook's own apparatus instead of the generic three wells. Chambers keep
 * their meaning: 0 reaction vessel, 1 reagent added on start, 2 receiver. `includes` lists the book
 * items the drawing already shows, so the bench does not also hold loose copies of them.
 */
export const GAS_LAYOUTS:Record<string,{layout:'tube';ports:[string,string,string];includes:EquipmentKind[]}>={
 // 9-27: a stoppered test tube clamped in a stand; the delivery tube leads into soap solution.
 'g9-zinc-hcl':{layout:'tube',ports:['Хуруу шил','Цайрын таваг','Савангийн уусмалтай сав'],includes:['testTube','testTubeRack','corkStopper','gasDeliveryTube','retortStand','trough','splint','phPaper']},
};
export const gasLayout=(experiment:string|undefined)=>experiment?GAS_LAYOUTS[experiment]:undefined;
