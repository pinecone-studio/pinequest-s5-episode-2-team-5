import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {CatmullRomCurve3,LatheGeometry,TubeGeometry,Vector2,Vector3,type Group,type Mesh,type MeshBasicMaterial} from 'three';
import {ChamberContents} from './ChamberContents';
import {TestTube} from '../../equipment/TestTube';
import {GraduatedCylinder} from '../../equipment/GraduatedCylinder';
import {Beaker} from '../../equipment/Beaker';
import {VesselContents} from '../../equipment/VesselContents';
import {BubbleSprites} from '../../visuals/BubbleSprites';
import {PROFILES,heightForVolume,radiusAt,type VesselProfile} from '../../equipment/profiles';
import {liquidMl,type Mixture} from '../../chemistry/mixture';
import {mixtureLook} from '../../chemistry/color';
import {portLayout} from './port-layout';
import {gasLayout} from './gas-layouts';
import {useGlass,useLiteShading} from '../../materials/glass';
import {universalColor} from '../../chemistry/color';
import {lazy} from '../../utils/lazy';
import {sounds} from '../../utils/sounds';
import type {RigState} from './process';

const metal='#526474',rubber='#8a3b2e';
const PAPER='#efe6c9';
/** Seconds a pop's flash and the burning splint stay on screen. */
const POP_S=1.4;
const FLASK=PROFILES.roundBottomFlask;

/** Glass of the round-bottom flask: the inner wall profile plus 1.2 mm of glass and a rolled rim. */
const flaskGeometry=lazy(()=>{
 const pts=FLASK.wall.map(([r,y])=>new Vector2(r+.0012,y-.0012*(y<.03?1:0)));
 pts.unshift(new Vector2(0,0));
 const [rimR,rimY]=FLASK.wall[FLASK.wall.length-1];
 pts.push(new Vector2(rimR+.002,rimY),new Vector2(rimR-.0004,rimY));
 return new LatheGeometry(pts,32);
});

/**
 * The textbook's gas apparatus (gas-layouts.ts), built from the rig's three chambers:
 *  - 9-27: a test tube clamped to a retort stand; zinc waits on a dish; hydrogen blows soap bubbles
 *    in a trough and a burning splint pops them.
 *  - 9-28: a round-bottom flask of marble chips held at the neck; acid waits in a small beaker; the
 *    CO₂ bubbles through limewater in a cylinder, which turns milky.
 * The vessel is closed by a rubber stopper and delivery tube once the reaction is started.
 */
export function GasTubeSetup({rig,itemId,select}:{rig?:RigState;itemId?:string;select:(port:number)=>void}){
 const glass=useGlass('#dcebf2'),lite=useLiteShading();
 const experiment=rig?.experiment,book=gasLayout(experiment),flask=book?.layout==='flask',soap=book?.receiver!=='limewater';
 const vessel=portLayout('gasTrain',0,experiment),extra=portLayout('gasTrain',1,experiment),receiver=portLayout('gasTrain',2,experiment);
 const top=vessel.bottom+vessel.height,receiverTop=receiver.bottom+receiver.height;
 // Over the top of the receiver and down into its liquid (near the bottom of a limewater cylinder).
 const arc=Math.max(top+.06,receiverTop+.03),dip=soap?receiver.bottom+.02:receiver.bottom+.03;
 const delivery=useMemo(()=>new TubeGeometry(new CatmullRomCurve3([
  new Vector3(vessel.x,top+.012,vessel.z),new Vector3(vessel.x,arc-.015,vessel.z),new Vector3((vessel.x+receiver.x)/2,arc,(vessel.z+receiver.z)/2),
  new Vector3(receiver.x,arc-.015,receiver.z),new Vector3(receiver.x,dip,receiver.z),
 ]),48,.0022,8,false),[vessel.x,vessel.z,top,arc,receiver.x,receiver.z,dip]);
 useEffect(()=>()=>delivery.dispose(),[delivery]);

 const soapH2=rig?.data.soapH2??0,pops=rig?.data.pops??0;
 const bubbles=useRef<Group>(null),splint=useRef<Group>(null),flash=useRef<Mesh>(null),popAt=useRef(-1),seenPops=useRef(pops);
 useEffect(()=>{if(pops>seenPops.current){popAt.current=performance.now();sounds.play('puff',.9);}seenPops.current=pops;},[pops]);
 const count=Math.min(9,Math.ceil(soapH2/4));
 useFrame(({clock})=>{
  const t=clock.elapsedTime;
  // Soap bubbles leave the surface one after another and drift up and sideways.
  bubbles.current?.children.forEach((b,i)=>{
   const life=(t*.12+i/9)%1,visible=i<count;b.visible=visible;if(!visible)return;
   b.position.set(receiver.x+Math.sin(i*2.3+t*.6)*.018*life,receiverTop+.006+life*.26,receiver.z+Math.cos(i*1.7)*.015);
   b.scale.setScalar(.6+.4*Math.min(1,life*4));
  });
  const since=popAt.current<0?Infinity:(performance.now()-popAt.current)/1000;
  if(splint.current)splint.current.visible=since<POP_S;
  if(flash.current){const on=since<.35;flash.current.visible=on;if(on){flash.current.scale.setScalar(.4+since*5);(flash.current.material as MeshBasicMaterial).opacity=.85*(1-since/.35);}}
 });

 const phBefore=rig?.data.phBefore,phAfter=rig?.data.phAfter;
 const strip=(ph:number|undefined,x:number)=><mesh position={[x,.0135,.062]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.012,.032]}/><meshStandardMaterial color={ph===undefined?PAPER:universalColor(ph)} roughness={.9}/></mesh>;
 const reaction=rig?.chambers[0];
 // Marble is drawn as chips, so it is left out of the flask's liquid and sediment.
 const vesselLook=useMemo(()=>mixtureLook(flask&&reaction?{...reaction,s:{...reaction.s,marble:0}}:reaction),[reaction,flask]);
 const receiverLook=useMemo(()=>mixtureLook(rig?.chambers[2]),[rig?.chambers[2]]);
 const liquidIn=reaction?liquidMl(reaction):0,receiverMl=rig?liquidMl(rig.chambers[2]):0;
 // Bubbling follows how fast the rig actually makes gas (ml per simulated second).
 const fizz=useRef(0),last=useRef({gas:0,at:0});
 useEffect(()=>{if(!rig)return;const dt=rig.elapsed-last.current.at;if(dt>0){const rate=(rig.gas-last.current.gas)/dt;fizz.current=Math.min(1,Math.max(0,rate/3));}else if(!rig.running)fizz.current=0;last.current={gas:rig.gas,at:rig.elapsed};},[rig]);
 const profile:VesselProfile=flask?FLASK:PROFILES.testTube;
 // Stoppered at the start and left closed, so the delivery tube stays in the receiver afterwards.
 const closed=!!rig&&(rig.running||rig.connected);
 const clampY=flask?vessel.bottom+.082:.18,standX=vessel.x-.04,standZ=vessel.z-.025;

 return <group>
  {/* Retort stand: base, rod, boss head and a clamp holding the vessel. */}
  <mesh position={[standX+.015,.016,standZ]} castShadow><boxGeometry args={[.07,.008,.055]}/><meshStandardMaterial color="#3e4a55" roughness={.7}/></mesh>
  <mesh position={[standX,.17,standZ]} castShadow><cylinderGeometry args={[.0035,.0035,.31,12]}/><meshStandardMaterial color={metal} metalness={.7} roughness={.35}/></mesh>
  <mesh position={[standX,clampY,standZ]}><boxGeometry args={[.012,.014,.012]}/><meshStandardMaterial color="#2d3640" metalness={.6} roughness={.4}/></mesh>
  <mesh position={[(vessel.x+standX)/2,clampY,(vessel.z+standZ)/2]} rotation={[0,Math.atan2(-(vessel.z-standZ),vessel.x-standX),0]}><boxGeometry args={[Math.hypot(vessel.x-standX,vessel.z-standZ),.006,.006]}/><meshStandardMaterial color={metal} metalness={.7} roughness={.35}/></mesh>
  <mesh position={[vessel.x,clampY,vessel.z]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[(flask?.011:vessel.radius)+.0025,.0025,8,20]}/><meshStandardMaterial color="#c9a66b" roughness={.6}/></mesh>

  {/* The reaction vessel with its contents, bubbles from the solid, and the stopper once started. */}
  <group position={[vessel.x,vessel.bottom,vessel.z]} onClick={e=>{e.stopPropagation();select(0);}}>
   {flask?<>
    <mesh geometry={flaskGeometry()} material={glass} renderOrder={1} castShadow/>
    {vesselLook&&<VesselContents profile={FLASK} look={vesselLook} itemId={itemId}/>}
    <MarbleChips grams={(reaction?.s.marble??0)*100.1} radius={.02} y={.002}/>
   </>:<TestTube upright look={vesselLook} itemId={itemId}/>}
   {liquidIn>0&&<BubbleSprites intensity={()=>fizz.current} radiusAt={y=>radiusAt(profile,y)} bottom={profile.wall[0][1]+.003} top={heightForVolume(profile,liquidIn)} fromSolid max={flask?48:36}/>}
   {closed&&<mesh position={[0,vessel.height+.008,0]}><cylinderGeometry args={[(flask?.011:vessel.radius)+.0012,(flask?.011:vessel.radius)*.85,.022,20]}/><meshStandardMaterial color={rubber} roughness={.8}/></mesh>}
  </group>
  {closed&&<mesh geometry={delivery}><meshStandardMaterial color="#a9cbd6" transparent opacity={.7} roughness={.15}/></mesh>}

  {/* The second reagent until the start: zinc on a dish, or acid in a small beaker. */}
  <group position={[extra.x,extra.bottom,extra.z]} onClick={e=>{e.stopPropagation();select(1);}}>
   {book?.additive==='beaker'?<SmallBeaker mixture={rig?.chambers[1]}/>:<>
    <mesh material={glass}><cylinderGeometry args={[extra.radius,extra.radius*.8,.004,24]}/></mesh>
    <ZincGranules grams={(rig?.chambers[1].s.Zn??0)*65.38} radius={extra.radius*.6} y={.004}/>
   </>}
  </group>

  {/* The receiver: soap solution in a trough, or limewater in a cylinder with the gas bubbling through. */}
  {soap?<group position={[receiver.x,receiver.bottom,receiver.z]} onClick={e=>{e.stopPropagation();select(2);}}>
   <mesh material={glass} position={[0,receiver.height/2,0]}><cylinderGeometry args={[receiver.radius,receiver.radius*.95,receiver.height,32,1,true]}/></mesh>
   <mesh material={glass} position={[0,.001,0]}><cylinderGeometry args={[receiver.radius*.95,receiver.radius*.95,.002,32]}/></mesh>
   <group position={[0,.002,0]}><ChamberContents mixture={rig?.chambers[2]} radius={receiver.radius*.95} height={receiver.height*.95} capacityMl={250}/></group>
  </group>:<group position={[receiver.x,0,receiver.z]} onClick={e=>{e.stopPropagation();select(2);}}>
   <GraduatedCylinder look={receiverLook}/>
   {rig?.running&&receiverMl>0&&<BubbleSprites intensity={()=>fizz.current} radiusAt={y=>radiusAt(PROFILES.graduatedCylinder,y)*.5} bottom={dip-.004} top={heightForVolume(PROFILES.graduatedCylinder,receiverMl)} max={24}/>}
  </group>}

  {soap&&<>
   {/* Hydrogen-filled soap bubbles. */}
   <group ref={bubbles}>{Array.from({length:9},(_,i)=><mesh key={i} visible={false}>
    <sphereGeometry args={[.0075,16,12]}/>
    {lite?<meshStandardMaterial color="#eef6ff" transparent opacity={.35} roughness={.05}/>:<meshPhysicalMaterial color="#f4f9ff" transparent opacity={.3} roughness={0} iridescence={1} iridescenceIOR={1.3} iridescenceThicknessRange={[200,600]}/>}
   </mesh>)}</group>
   {/* The burning splint and the pop. */}
   <group ref={splint} visible={false} position={[receiver.x+.05,receiverTop+.13,receiver.z]} rotation={[0,0,.9]}>
    <mesh><boxGeometry args={[.004,.12,.004]}/><meshStandardMaterial color="#c8a46a" roughness={.9}/></mesh>
    <mesh position={[0,.066,0]}><coneGeometry args={[.006,.018,10]}/><meshBasicMaterial color="#ffb347" toneMapped={false}/></mesh>
   </group>
   <mesh ref={flash} visible={false} position={[receiver.x+.01,receiverTop+.11,receiver.z]}><sphereGeometry args={[.02,16,12]}/><meshBasicMaterial color="#ffd27a" transparent opacity={0} toneMapped={false} depthWrite={false}/></mesh>
  </>}

  {/* Universal indicator paper: before (left) and after (right). */}
  {strip(phBefore,-.03)}{strip(phAfter,-.012)}
 </group>;
}

/** BEAKER_SCALE³ of the lab's 300 mL beaker is a 50 mL one. */
const BEAKER_SCALE=.6;
/** A 50 mL beaker: the lab's glass beaker scaled down, with the level drawn for the smaller volume. */
function SmallBeaker({mixture}:{mixture?:Mixture}){
 const look=useMemo(()=>{const l=mixtureLook(mixture);return l?{...l,liquidMl:l.liquidMl/BEAKER_SCALE**3,sedimentMl:l.sedimentMl/BEAKER_SCALE**3}:l;},[mixture]);
 return <group scale={BEAKER_SCALE}><Beaker look={look}/></group>;
}

/** Zinc granules (1 g is about ten 3 mm lumps): metal is shown as loose pieces, not a thin layer. */
function ZincGranules({grams,radius,y}:{grams:number;radius:number;y:number}){
 const count=grams<.01?0:Math.max(1,Math.min(10,Math.round(grams*10)));
 const lumps=useMemo(()=>Array.from({length:10},(_,i)=>{const a=i*2.39996,r=radius*Math.sqrt((i%5)/5),layer=Math.floor(i/5);return {p:[Math.cos(a)*r,y+.0022+layer*.0032,Math.sin(a)*r] as [number,number,number],rot:[i*1.3,i*.7,i*2.1] as [number,number,number],s:.0019+(i%3)*.0004};}),[radius,y]);
 return <group>{lumps.slice(0,count).map((l,i)=><mesh key={i} position={l.p} rotation={l.rot} scale={l.s}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial color="#9aa3aa" metalness={.75} roughness={.4}/></mesh>)}</group>;
}

/**
 * Marble chips (about 1 g each, 8–10 mm) lying in the bottom of the round flask. Each chip shrinks
 * as the acid eats it. Drawn over the liquid, which is otherwise opaque to what lies in it.
 */
function MarbleChips({grams,radius,y}:{grams:number;radius:number;y:number}){
 const chips=useMemo(()=>Array.from({length:12},(_,i)=>{const a=i*2.39996,r=radius*Math.sqrt(((i*7)%12)/12)*.85;
  // Lower chips sit in the curve of the bulb, outer ones a little higher.
  const lift=.0035+(r/radius)**2*.012+Math.floor(i/7)*.005;
  return {p:[Math.cos(a)*r,y+lift,Math.sin(a)*r] as [number,number,number],rot:[i*1.1,i*.9,i*1.7] as [number,number,number],s:[1+(i%3)*.15,.75+(i%2)*.2,1-(i%4)*.08] as [number,number,number]};}),[radius,y]);
 const count=grams<.05?0:Math.max(1,Math.min(12,Math.round(grams*1.2)));
 // The chips keep their number while they shrink; the size follows the mass per chip.
 const size=grams<.05?0:.0042*Math.cbrt(Math.min(1,grams/Math.max(1,count/1.2)));
 return <group>{chips.slice(0,count).map((c,i)=><mesh key={i} position={c.p} rotation={c.rot} scale={c.s.map(v=>v*size) as [number,number,number]} renderOrder={3}><dodecahedronGeometry args={[1,0]}/><meshStandardMaterial color="#ece8e1" roughness={.75} transparent depthTest={false}/></mesh>)}</group>;
}
