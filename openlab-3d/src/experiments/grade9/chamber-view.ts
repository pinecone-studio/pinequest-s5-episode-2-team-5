import {merge} from '../../chemistry/mixture';
import type {RigState} from './process';
/** Two monomer feeds occupy two phases of the same physical beaker. Engine stores stay separate. */
export function chamberView(rig:RigState,port:number){
 return {mixture:rig.kind==='interfacialBath'&&port<2?merge(rig.chambers[0],rig.chambers[1]):rig.chambers[port],capacityMl:rig.kind==='interfacialBath'?25:100};
}
