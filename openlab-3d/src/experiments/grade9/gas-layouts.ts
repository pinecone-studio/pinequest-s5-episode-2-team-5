import type {EquipmentKind} from '../../equipment/equipmentCatalog';

/**
 * Gas trains drawn as the textbook's own apparatus instead of the generic three wells. Chambers keep
 * their meaning: 0 reaction vessel, 1 reagent added on start, 2 receiver. `includes` lists the book
 * items the drawing already shows, so the bench does not also hold loose copies of them.
 */
export interface GasLayout {
 /** Reaction vessel clamped in the stand: a test tube, or a round-bottom flask held at the neck. */
 layout:'tube'|'flask';
 ports:[string,string,string];
 /** Where the second reagent waits until the start: solid on a dish, or liquid in a small beaker. */
 additive:'dish'|'beaker';
 /** The gas goes into soap solution in a trough (hydrogen bubbles), or limewater in a cylinder. */
 receiver:'soap'|'limewater';
 includes:EquipmentKind[];
}
export const GAS_LAYOUTS:Record<string,GasLayout>={
 // 9-27: a stoppered test tube clamped in a stand; the delivery tube leads into soap solution.
 'g9-zinc-hcl':{layout:'tube',ports:['Хуруу шил','Цайрын таваг','Савангийн уусмалтай сав'],additive:'dish',receiver:'soap',includes:['testTube','testTubeRack','corkStopper','gasDeliveryTube','retortStand','trough','splint','phPaper']},
 // 9-28: marble chips in a round-bottom flask; acid from a beaker, then the stopper and delivery
 // tube, which dips into limewater in a cylinder.
 'g9-carbonate-co2':{layout:'flask',ports:['Бөөрөнхий ёроолтой колбо','Хүчилтэй шилэн аяга','Шохойн устай цилиндр'],additive:'beaker',receiver:'limewater',includes:['erlenmeyer','graduatedCylinder','beaker','corkStopper','gasDeliveryTube','retortStand','phPaper']},
};
export const gasLayout=(experiment:string|undefined)=>experiment?GAS_LAYOUTS[experiment]:undefined;
