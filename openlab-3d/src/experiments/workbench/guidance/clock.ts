/** Accelerate only the selected apparatus/vessels while an endpoint wait is playing. */
const speeds=new Map<string,number>();
export function clearProtocolClock(){speeds.clear();}
export function setProtocolClock(ids:string[],speed:number){speeds.clear();for(const id of ids)speeds.set(id,Math.max(1,Math.min(16,speed)));}
export function protocolSpeed(id:string){return speeds.get(id)??1;}
