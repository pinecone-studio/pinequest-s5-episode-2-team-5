import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {CatmullRomCurve3,TubeGeometry,Vector3,type Group,type Mesh,type MeshBasicMaterial} from 'three';
import {ChamberContents} from './ChamberContents';
import {TestTube} from '../../equipment/TestTube';
import {BubbleSprites} from '../../visuals/BubbleSprites';
import {PROFILES,heightForVolume,radiusAt} from '../../equipment/profiles';
import {liquidMl} from '../../chemistry/mixture';
import {mixtureLook} from '../../chemistry/color';
import {portLayout} from './port-layout';
import {useGlass,useLiteShading} from '../../materials/glass';
import {universalColor} from '../../chemistry/color';
import {sounds} from '../../utils/sounds';
import type {RigState} from './process';

const metal='#526474',rubber='#8a3b2e';
const PAPER='#efe6c9';
/** Seconds a pop's flash and the burning splint stay on screen. */
const POP_S=1.4;

/**
 * Textbook gas apparatus (9-27): a test tube clamped to a retort stand, closed by a rubber stopper
 * whose delivery tube dips into soap solution in a trough; the zinc waits on a dish until it is
 * added. Hydrogen fills soap bubbles that float up, and a burning splint pops them.
 */
export function GasTubeSetup({rig,itemId,select}:{rig?:RigState;itemId?:string;select:(port:number)=>void}){
 const glass=useGlass('#dcebf2'),lite=useLiteShading();
 const experiment=rig?.experiment;
 const tube=portLayout('gasTrain',0,experiment),dish=portLayout('gasTrain',1,experiment),trough=portLayout('gasTrain',2,experiment);
 const top=tube.bottom+tube.height;
 const delivery=useMemo(()=>new TubeGeometry(new CatmullRomCurve3([
  new Vector3(tube.x,top+.012,tube.z),new Vector3(tube.x,top+.045,tube.z),new Vector3((tube.x+trough.x)/2,top+.06,(tube.z+trough.z)/2),
  new Vector3(trough.x,top+.04,trough.z),new Vector3(trough.x,trough.bottom+.02,trough.z),
 ]),48,.0022,8,false),[tube.x,tube.z,top,trough.x,trough.z,trough.bottom]);
 useEffect(()=>()=>delivery.dispose(),[delivery]);

 const soap=rig?.data.soapH2??0,pops=rig?.data.pops??0;
 const bubbles=useRef<Group>(null),splint=useRef<Group>(null),flash=useRef<Mesh>(null),popAt=useRef(-1),seenPops=useRef(pops);
 useEffect(()=>{if(pops>seenPops.current){popAt.current=performance.now();sounds.play('puff',.9);}seenPops.current=pops;},[pops]);
 const count=Math.min(9,Math.ceil(soap/4));
 useFrame(({clock})=>{
  const t=clock.elapsedTime;
  // Bubbles leave the soap surface one after another and drift up and sideways.
  bubbles.current?.children.forEach((b,i)=>{
   const life=(t*.12+i/9)%1,visible=i<count;b.visible=visible;if(!visible)return;
   b.position.set(trough.x+Math.sin(i*2.3+t*.6)*.018*life,trough.bottom+trough.height+.006+life*.26,trough.z+Math.cos(i*1.7)*.015);
   b.scale.setScalar(.6+.4*Math.min(1,life*4));
  });
  const since=popAt.current<0?Infinity:(performance.now()-popAt.current)/1000;
  if(splint.current)splint.current.visible=since<POP_S;
  if(flash.current){const on=since<.35;flash.current.visible=on;if(on){flash.current.scale.setScalar(.4+since*5);(flash.current.material as MeshBasicMaterial).opacity=.85*(1-since/.35);}}
 });

 const phBefore=rig?.data.phBefore,phAfter=rig?.data.phAfter;
 const strip=(ph:number|undefined,x:number)=><mesh position={[x,.0135,.062]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.012,.032]}/><meshStandardMaterial color={ph===undefined?PAPER:universalColor(ph)} roughness={.9}/></mesh>;
 const zinc=rig?.chambers[1];
 const tubeLook=useMemo(()=>mixtureLook(rig?.chambers[0]),[rig?.chambers[0]]);
 const liquidIn=rig?liquidMl(rig.chambers[0]):0;
 // Bubbling in the tube follows how fast the rig actually makes gas (ml per simulated second).
 const fizz=useRef(0),last=useRef({gas:0,at:0});
 useEffect(()=>{if(!rig)return;const dt=rig.elapsed-last.current.at;if(dt>0){const rate=(rig.gas-last.current.gas)/dt;fizz.current=Math.min(1,Math.max(0,rate/3));}else if(!rig.running)fizz.current=0;last.current={gas:rig.gas,at:rig.elapsed};},[rig]);

 return <group>
  {/* Retort stand: base, rod and a clamp holding the tube. */}
  <mesh position={[-.08,.016,-.04]} castShadow><boxGeometry args={[.06,.008,.05]}/><meshStandardMaterial color="#3e4a55" roughness={.7}/></mesh>
  <mesh position={[-.095,.17,-.04]} castShadow><cylinderGeometry args={[.0035,.0035,.31,12]}/><meshStandardMaterial color={metal} metalness={.7} roughness={.35}/></mesh>
  <mesh position={[(tube.x-.095)/2,.18,(tube.z-.04)/2]} rotation={[0,Math.atan2(-(tube.z+.04),tube.x+.095),0]}><boxGeometry args={[Math.hypot(tube.x+.095,tube.z+.04),.006,.006]}/><meshStandardMaterial color={metal} metalness={.7} roughness={.35}/></mesh>
  <mesh position={[tube.x,.18,tube.z]}><torusGeometry args={[tube.radius+.002,.002,8,20]}/><meshStandardMaterial color="#c9a66b" roughness={.6}/></mesh>

  {/* The lab's own test tube and contents renderer (granules, liquid, bubbles), plus the stopper. */}
  <group position={[tube.x,tube.bottom,tube.z]} onClick={e=>{e.stopPropagation();select(0);}}>
   <TestTube upright look={tubeLook} itemId={itemId}/>
   {liquidIn>0&&<BubbleSprites intensity={()=>fizz.current} radiusAt={y=>radiusAt(PROFILES.testTube,y)} bottom={PROFILES.testTube.wall[0][1]+.003} top={heightForVolume(PROFILES.testTube,liquidIn)} fromSolid max={36}/>}
   {rig?.running&&<mesh position={[0,tube.height+.008,0]}><cylinderGeometry args={[tube.radius+.0012,tube.radius*.85,.022,20]}/><meshStandardMaterial color={rubber} roughness={.8}/></mesh>}
  </group>
  {rig?.running&&<mesh geometry={delivery}><meshStandardMaterial color="#a9cbd6" transparent opacity={.7} roughness={.15}/></mesh>}

  {/* Zinc granules waiting on a dish until they are added and the tube is stoppered. */}
  <group position={[dish.x,dish.bottom,dish.z]} onClick={e=>{e.stopPropagation();select(1);}}>
   <mesh material={glass}><cylinderGeometry args={[dish.radius,dish.radius*.8,.004,24]}/></mesh>
   <ZincGranules grams={(zinc?.s.Zn??0)*65.38} radius={dish.radius*.6} y={.004}/>
  </group>

  {/* Trough of soap solution receiving the gas. */}
  <group position={[trough.x,trough.bottom,trough.z]} onClick={e=>{e.stopPropagation();select(2);}}>
   <mesh material={glass} position={[0,trough.height/2,0]}><cylinderGeometry args={[trough.radius,trough.radius*.95,trough.height,32,1,true]}/></mesh>
   <mesh material={glass} position={[0,.001,0]}><cylinderGeometry args={[trough.radius*.95,trough.radius*.95,.002,32]}/></mesh>
   <group position={[0,.002,0]}><ChamberContents mixture={rig?.chambers[2]} radius={trough.radius*.95} height={trough.height*.95} capacityMl={250}/></group>
  </group>

  {/* Hydrogen-filled soap bubbles. */}
  <group ref={bubbles}>{Array.from({length:9},(_,i)=><mesh key={i} visible={false}>
   <sphereGeometry args={[.0075,16,12]}/>
   {lite?<meshStandardMaterial color="#eef6ff" transparent opacity={.35} roughness={.05}/>:<meshPhysicalMaterial color="#f4f9ff" transparent opacity={.3} roughness={0} iridescence={1} iridescenceIOR={1.3} iridescenceThicknessRange={[200,600]}/>}
  </mesh>)}</group>

  {/* The burning splint and the pop. */}
  <group ref={splint} visible={false} position={[trough.x+.05,trough.bottom+trough.height+.13,trough.z]} rotation={[0,0,.9]}>
   <mesh><boxGeometry args={[.004,.12,.004]}/><meshStandardMaterial color="#c8a46a" roughness={.9}/></mesh>
   <mesh position={[0,.066,0]}><coneGeometry args={[.006,.018,10]}/><meshBasicMaterial color="#ffb347" toneMapped={false}/></mesh>
  </group>
  <mesh ref={flash} visible={false} position={[trough.x+.01,trough.bottom+trough.height+.11,trough.z]}><sphereGeometry args={[.02,16,12]}/><meshBasicMaterial color="#ffd27a" transparent opacity={0} toneMapped={false} depthWrite={false}/></mesh>

  {/* Universal indicator paper: before (left) and after (right). */}
  {strip(phBefore,-.03)}{strip(phAfter,-.012)}
 </group>;
}

/** Zinc granules (1 g is about ten 3 mm lumps): metal is shown as loose pieces, not a thin layer. */
function ZincGranules({grams,radius,y}:{grams:number;radius:number;y:number}){
 const count=grams<.01?0:Math.max(1,Math.min(10,Math.round(grams*10)));
 const lumps=useMemo(()=>Array.from({length:10},(_,i)=>{const a=i*2.39996,r=radius*Math.sqrt((i%5)/5),layer=Math.floor(i/5);return {p:[Math.cos(a)*r,y+.0022+layer*.0032,Math.sin(a)*r] as [number,number,number],rot:[i*1.3,i*.7,i*2.1] as [number,number,number],s:.0019+(i%3)*.0004};}),[radius,y]);
 return <group>{lumps.slice(0,count).map((l,i)=><mesh key={i} position={l.p} rotation={l.rot} scale={l.s}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color="#9aa3aa" metalness={.75} roughness={.4}/></mesh>)}</group>;
}
