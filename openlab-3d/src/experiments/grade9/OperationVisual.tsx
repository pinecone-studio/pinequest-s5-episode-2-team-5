import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import {CatmullRomCurve3,Vector3,type Group,type Mesh} from 'three';
import {useShowcase} from '../workbench/guidance/showcase';
import {portLayout} from './port-layout';
import {useGrade8Lab} from '../workbench/guidance/grade8';
import type {RigState} from './process';
import type {Operation} from '../workbench/guidance/operation';
const smooth=(n:number)=>{const x=Math.max(0,Math.min(1,n));return x*x*(3-2*x);};
/** The operation cue moves parts on the real apparatus, not a screen-space hand. */
export function OperationVisual({id,kind,rig}:{id?:string;kind:string;rig?:RigState}){
 const operation=useShowcase(s=>s.targetId===id?s.operation:'none'),active=useShowcase(s=>s.targetId===id&&['playing','paused'].includes(s.status));
 // Grade 8 demos raise the badge clear of the taller callouts.
 const badgeY=useGrade8Lab()?.38:.29;
 const grains=useRef<Group>(null);
 const rod=useRef<Group>(null),magnet=useRef<Group>(null),reel=useRef<Group>(null),dial=useRef<Group>(null),clamps=useRef<Group>(null),gas=useRef<Group>(null),arrow=useRef<Mesh>(null);
 const port=portLayout(kind,0),target=port.mouth;
 const electric=['galvanicCell','electrolysisCell','migrationTube','conductivityTester'].includes(kind);
 const circuit=useMemo(()=>new CatmullRomCurve3([new Vector3(-.06,.15,0),new Vector3(-.06,.22,0),new Vector3(.06,.22,0),new Vector3(.06,.15,0)]),[]);
 const t=useRef(0);
 useFrame((_,dt)=>{
  const s=useShowcase.getState(),watching=s.targetId===id&&['playing','paused'].includes(s.status),p=watching?s.progress:1;
  if(!watching||s.status==='playing')t.current+=Math.min(dt,.1);
  const operating=watching?s.operation:'none';
  if(rod.current){rod.current.visible=operating==='stir'&&!s.source;rod.current.position.set(target[0]+Math.cos(t.current*5)*.008,target[1]+.018-.035*Math.sin(Math.PI*p),target[2]+Math.sin(t.current*5)*.008);rod.current.rotation.z=.15*Math.sin(t.current*5);}
  if(magnet.current){magnet.current.visible=operating==='magnet';const destination=portLayout(kind,2).mouth,start=[target[0]-.075,target[1]+.04,target[2]],sample=[target[0],target[1]-.025,target[2]];const a=p<.3?start:p<.8?sample:destination,b=p<.3?sample:p<.8?destination:start,f=smooth(p<.3?p/.3:p<.8?(p-.3)/.5:(p-.8)/.2);magnet.current.position.set(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f+(p>.3&&p<.8?.04*Math.sin(Math.PI*f):0),a[2]+(b[2]-a[2])*f);}

  if(grains.current)grains.current.visible=operating==='magnet'&&p>.3&&p<.83&&(rig?.chambers[0].s.Fe??0)>1e-9;
  if(reel.current){reel.current.visible=operating==='wind'||!!rig&&(rig.chambers[3]?.s.nylon610??0)>0;reel.current.rotation.x=operating==='wind'?-p*Math.PI*8:0;}
  if(dial.current){const controlled=['heat','cool','power','connect-electric','compress'].includes(operating);dial.current.visible=controlled||electric;const f=controlled?(s.operationValue? smooth(p):1-smooth(p)):rig?.connected||rig?.heating?1:0;dial.current.rotation.z+=(-f*Math.PI*.8-dial.current.rotation.z)*(1-Math.exp(-dt*10));}
  if(clamps.current){const f=operating==='connect-electric'?smooth(p/.65):rig?.connected||rig?.running?1:.1;clamps.current.children.forEach(c=>{c.position.y=(1-f)*.075;c.position.x=0;});}

  if(gas.current){const f=operating==='connect-gas'?smooth(p/.65):rig?.connected||rig?.running?1:0;gas.current.visible=['gasTrain','refluxReactor','refluxBath','dehydrationFlask','crackingTube','fermenter','gasWashTrain','gasSyringe'].includes(kind)&&(operating==='connect-gas'||!!rig?.running);gas.current.children.forEach((c,i)=>{c.position.y=(1-f)*.07;c.position.x=(i===0?-1:1)*(1-f)*.04;});}
  if(arrow.current){const current=(rig?.data.cellCurrent??rig?.current??0);arrow.current.visible=kind==='galvanicCell'&&!!rig?.connected&&!!rig.running&&current>1e-8;const f=(t.current*.4)%1;arrow.current.position.copy(circuit.getPoint(f));const direction=circuit.getTangent(f);arrow.current.quaternion.setFromUnitVectors(new Vector3(0,1,0),direction);}
 });
 const badge:Partial<Record<Operation,string>>={'connect-electric':'① электрод → ② утас → ③ хэлхээ','connect-gas':'Гаралт → хоолой → хүлээн авагч',stir:'Холих хөдөлгөөн',magnet:'Соронзон ялгалт',wind:'Хальс → утас → ороогч',heat:'Халаалтын удирдлага',cool:'Хөргөлтийн урсгал',compress:'Поршен / эзлэхүүн'};
 return <group>
  <group ref={rod} visible={false}><mesh position={[0,-.035,0]}><cylinderGeometry args={[.0018,.0018,.10,10]}/><meshStandardMaterial color="#d7f1f3" transparent opacity={.65}/></mesh></group>
  <group ref={magnet} visible={false}><mesh><boxGeometry args={[.038,.012,.014]}/><meshStandardMaterial color="#b52e40"/></mesh><mesh position={[.018,0,0]}><boxGeometry args={[.008,.012,.014]}/><meshStandardMaterial color="#426eb2"/></mesh><group ref={grains} visible={false}>{Array.from({length:5},(_,i)=><mesh key={i} position={[(i-2)*.004,-.01,0]}><sphereGeometry args={[.0025,7,5]}/><meshStandardMaterial color="#66727b" metalness={.5}/></mesh>)}</group></group>
  <group ref={reel} position={[.04,.19,0]} visible={false}><mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.019,.019,.05,20]}/><meshStandardMaterial color="#d9dbd5" roughness={.85}/></mesh><mesh position={[.028,0,0]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.021,.002,8,24]}/><meshStandardMaterial color="#7a8790" metalness={.5}/></mesh></group>
  {electric&&<mesh position={[.045,.21,0]}><boxGeometry args={[.026,.032,.036]}/><meshStandardMaterial color="#263c4d"/></mesh>}
  <group ref={dial} position={electric?[.045,.21,.023]:[0,.04,.083]} visible={false}><mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.012,.012,.009,20]}/><meshStandardMaterial color="#233746"/></mesh><mesh position={[0,.007,.006]}><boxGeometry args={[.002,.009,.002]}/><meshBasicMaterial color="#f8d67a"/></mesh></group>
  {electric&&<group ref={clamps}>{[-.06,.06].map((x,i)=><group key={i}><mesh position={[x,.15,0]} rotation={[0,0,i?-.25:.25]}><boxGeometry args={[.018,.008,.013]}/><meshStandardMaterial color={i?'#242f39':'#c54d4c'} metalness={.4}/></mesh></group>)}</group>}

  <group ref={gas} visible={false}>{[0,1].map((i)=><group key={i}><mesh position={i===0?[target[0],target[1],target[2]]:[.055,.115,.02]}><cylinderGeometry args={[.007,.007,.013,12]}/><meshStandardMaterial color="#424f59"/></mesh></group>)}</group>
  <mesh ref={arrow} visible={false} renderOrder={4}><coneGeometry args={[.004,.012,10]}/><meshBasicMaterial color="#f6d56f"/></mesh>
  {active&&badge[operation]&&<Html position={[0,badgeY,.035]} center zIndexRange={[18,12]} style={{pointerEvents:'none'}}><div className="whitespace-nowrap rounded-full border border-amber-200 bg-amber-50/95 px-3 py-1 text-[10px] font-semibold text-amber-950 shadow" aria-label="Хөдөлж буй багажийн үйлдэл">{badge[operation]}</div></Html>}
 </group>;
}
