import {currentSession} from '../session';
import {OperationVisual} from '../../grade9/OperationVisual';
import {useInventoryStore} from '../../../store/useInventoryStore';
import {itemPosition} from '../session';
import {isGrade9Rig} from '../../grade9/kinds';
import {bodies} from '../../../interaction/bodies';
import {Quaternion} from 'three';
import {MaterialFlow} from './MaterialFlow';
import {Spatula} from '../../../equipment/Spatula';
import {Pipette} from '../../../equipment/Pipette';
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
   {s.tool==='hose'?<Hose a={s.toolAnchor??a} b={b}/>:s.tool==='spoon'?<group position={a} rotation={[0,0,.4]}><group rotation={[0,Math.PI/2,0]} position={[-.075,-.006,0]}><Spatula load={s.carried>0?s.color:undefined}/></group></group>:s.tool==='pipette'?<group position={a}><group rotation={[-Math.PI/2,0,0]} position={[0,.1,.0085]}><Pipette liquid={s.carried>0?s.color:undefined}/></group></group>:null}
   <MaterialFlow/>
  </>}
 </group>;
}
