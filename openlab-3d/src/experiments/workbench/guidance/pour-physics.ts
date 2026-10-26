import {pureReagentColor} from '../../../chemistry/real-color';
import {mixtureLook} from '../../../chemistry/color';
import {liquidMl,gasMl,type Mixture} from '../../../chemistry/mixture';
import {GASES,type GasId} from '../../curriculum/materials';
export type Vec3=[number,number,number];
/** Appearance belongs to the transferred material, never to the bottle's printed stripe. */
export function transferAppearance(m:Mixture){
 const look=mixtureLook(m),gas=gasMl(m)>0&&liquidMl(m)<1e-6;
 const viscosity=(m.aq.oilFluid??0)>0?60:(m.aq.sucrose??0)*342.3/Math.max(1,m.water)>.15?20:1;
 const coloredGas=(Object.keys(m.g??{}) as GasId[]).find(id=>id==='NO2'&&(m.g?.[id]??0)>0);
 return {phase:gas?'gas':liquidMl(m)>1e-6?'liquid':'solid',color:gas?coloredGas?GASES[coloredGas].color:'#e6eef2':(look.liquid?pureReagentColor(m)??look.liquid:null)??look.solidColor??'#eee9df',viscosity,opacity:gas?coloredGas?.45:.08:look.turbidity>.1?.85:.62};
}
/** A free fall: y depends on t². The opening and landing must be below the lip. */
export function fallingPoint(a:Vec3,b:Vec3,fraction:number):Vec3{
 const f=Math.max(0,Math.min(1,fraction));return [a[0]+(b[0]-a[0])*f,a[1]-Math.max(0,a[1]-b[1])*f*f,a[2]+(b[2]-a[2])*f];
}
export function fallTime(a:Vec3,b:Vec3){return Math.sqrt(2*Math.max(.001,a[1]-b[1])/9.81);}
