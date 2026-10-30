/** Visual dimensions use the same capacity calibration for every phase. Metres, mL. */
export function phaseHeight(ml:number,capacityMl:number,height:number){
 return Math.max(0,Math.min(height*.84,ml/Math.max(.001,capacityMl)*height*.84));
}
export function pistonPosition(volumeMl:number,capacityMl:number,length:number){
 return -length/2+Math.max(0,Math.min(1,volumeMl/Math.max(.001,capacityMl)))*length;
}
/** Stored gas alone cannot create bubbles: require a measured increase or boiling liquid. */
export function bubbleActivity(previousMl:number,currentMl:number,boiling:boolean,liquidPresent:boolean){
 return liquidPresent&&(boiling||currentMl>previousMl+1e-9);
}
