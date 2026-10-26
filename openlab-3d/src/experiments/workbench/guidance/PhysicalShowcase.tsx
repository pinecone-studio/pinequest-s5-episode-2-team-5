import {currentSession} from '../session';
import {OperationVisual} from '../../grade9/OperationVisual';
import {useInventoryStore} from '../../../store/useInventoryStore';
import {itemPosition} from '../session';
import {isGrade9Rig} from '../../grade9/kinds';
import {bodies} from '../../../interaction/bodies';
import {Quaternion} from 'three';
import {MaterialFlow} from './MaterialFlow';
import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {CatmullRomCurve3,TubeGeometry,Vector3,type Mesh} from 'three';
import {useShowcase,tickShowcase,cancelShowcase,type Point} from './showcase';
function Hose({a,b}:{a:Point;b:Point}){
 const shape=useMemo(()=>new TubeGeometry(new CatmullRomCurve3([new Vector3(...a),new Vector3(a[0],Math.max(a[1],b[1])+.12,a[2]),new Vector3(b[0],b[1]+.09,b[2]),new Vector3(...b)]),24,.003,8,false),[...a,...b]);
 const plug=useRef<Mesh>(null);useFrame(()=>{const f=Math.min(1,useShowcase.getState().progress/.3);shape.setDrawRange(0,Math.floor((shape.index?.count??0)*f/6)*6);if(plug.current){plug.current.scale.setScalar(f);}});
 useEffect(()=>()=>shape.dispose(),[shape]);return <group><mesh geometry={shape}><meshStandardMaterial color="#84b8d1" transparent opacity={.8}/></mesh><mesh ref={plug} position={b}><cylinderGeometry args={[.005,.005,.012,10]}/><meshStandardMaterial color="#52616d"/></mesh></group>;
}
/** Animated equipment and actual stock-body motion. Material changes use the normal engine. */
export function PhysicalShowcase(){
 const s=useShowcase();
 useFrame((_,dt)=>tickShowcase(dt));
 useEffect(()=>()=>cancelShowcase(),[]);
 if(!['playing','paused'].includes(s.status))return null;
 const target=s.targetId?useInventoryStore.getState().worldItems.find(w=>w.id===s.targetId):undefined;
 const heaterTarget=target&&['heat','cool'].includes(s.operation)?currentSession()?.objects.bunsenBurner:undefined,physicalTarget=heaterTarget??target?.id;
 const position=physicalTarget?itemPosition(physicalTarget):undefined,rotation=physicalTarget?new Quaternion().copy(bodies.get(physicalTarget)?.rotation()??new Quaternion()):undefined;
 const a=s.tip,b=s.mouth;
 return <group>
  {target&&!isGrade9Rig(target.kind)&&<group position={position} quaternion={rotation}><OperationVisual id={target.id} kind={target.kind}/></group>}
  {s.cap&&<mesh position={s.cap}><cylinderGeometry args={[.016,.016,.015,16]}/><meshStandardMaterial color="#252b32"/></mesh>}
  {a&&b&&<>
   {s.tool==='hose'?<Hose a={s.toolAnchor??a} b={b}/>:s.tool==='spoon'?<group position={a} rotation={[0,0,.4]}><mesh position={[-.025,.015,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.002,.002,.06,8]}/><meshStandardMaterial color="#b7c4cc" metalness={.8} roughness={.25}/></mesh><mesh scale={[1.5,.4,1]}><sphereGeometry args={[.009,12,8]}/><meshStandardMaterial color="#aabec7" metalness={.7}/></mesh>{s.carried>0&&<mesh position={[0,.003,0]} scale={[1.3,.65,1]}><sphereGeometry args={[.005*Math.cbrt(Math.max(.01,s.carried/s.amount)),10,7]}/><meshStandardMaterial color={s.color} roughness={.85}/></mesh>}</group>:s.tool==='pipette'?<group position={a}><mesh position={[0,.045,0]}><cylinderGeometry args={[.004,.001,.09,12]}/><meshStandardMaterial color="#d2e9ed" transparent opacity={.35}/></mesh>{s.carried>0&&<mesh position={[0,.004+.035*Math.min(1,s.carried/s.amount),0]}><cylinderGeometry args={[.0025,.001,.07*Math.min(1,s.carried/s.amount),12]}/><meshStandardMaterial color={s.color} transparent opacity={.75}/></mesh>}<mesh position={[0,.098,0]}><sphereGeometry args={[.007,12,8]}/><meshStandardMaterial color="#485e70"/></mesh></group>:null}
   <MaterialFlow/>
  </>}
 </group>;
}
