import {ActuatedBlock} from './ActuatedBlock';
import {OperationVisual} from './OperationVisual';
import {actionVisual} from '../../interaction/actions';
import {ChamberContents} from './ChamberContents';
import {useShowcase} from '../workbench/guidance/showcase';
import {useGuideCue} from '../workbench/guidance/runtime';
import {ApparatusLabels} from './ApparatusLabels';
import { CurriculumApparatus } from '../curriculum/Apparatus';
import { isCurriculumRig } from '../curriculum/kinds';
import {phOf} from '../../chemistry/equilibrium';
import {useEffect,useRef,useMemo} from 'react';
import {useFrame,type GroupProps} from '@react-three/fiber';
import {Color,CanvasTexture,TubeGeometry,CatmullRomCurve3,Vector3,type Group} from 'three';
import {useGlass} from '../../materials/glass';
import {useGrade9Apparatus} from './store';
import {useLabStore} from '../../store/useLabStore';
import {useGameStore} from '../../store/useGameStore';
import {useChemStore} from '../../store/useChemStore';
import {type RigKind} from './kinds';
import {mixtureLook} from '../../chemistry/color';
const metal='#526474';
function Box({at,size,color}:{at:[number,number,number];size:[number,number,number];color:string}){return <mesh position={at} castShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.6}/></mesh>;}
/** Recognisable apparatus, with live contents. Every part is inside the normal pickable body. */
export function Grade9Apparatus({kind,itemId,...props}:GroupProps&{kind:RigKind;itemId?:string}){
 const rig=useGrade9Apparatus(s=>itemId?s.rigs[itemId]:undefined);
 const maxVolume=rig?.experiment==='g9-gas-expansion'?20:100;
 const hose=useMemo(()=>new TubeGeometry(new CatmullRomCurve3([new Vector3(-.065,.195,0),new Vector3(-.065,.24,0),new Vector3(0,.24,.055),new Vector3(0,.12,.055)]),24,.0025,8,false),[]);
 useEffect(()=>()=>hose.dispose(),[hose]);
 const ruler=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d');if(ctx){ctx.fillStyle='#e2edf1';ctx.fillRect(0,0,1024,128);ctx.fillStyle='#173a56';ctx.font='bold 38px sans-serif';ctx.textAlign='center';for(let i=0;i<=10;i++){ctx.fillRect(20+i*96,0,3,i%5?20:35);if(i%2===0)ctx.fillText(String(i*maxVolume/10),20+i*96,85);}ctx.font='24px sans-serif';ctx.fillText('mL',475,120);}return new CanvasTexture(canvas);},[maxVolume]);
 useEffect(()=>()=>ruler.dispose(),[ruler]);
 const glass=useGlass('#dcebf2'),acc=useRef(0),particles=useRef<Group>(null);
 useEffect(()=>{if(itemId)useGrade9Apparatus.getState().ensure(itemId,useLabStore.getState().active??'',kind);},[itemId,kind]);
 useFrame((state,dt)=>{
  if(particles.current){particles.current.children.forEach((p,i)=>{p.position.y=.09+((state.clock.elapsedTime*.025+i*.014)%.13);});}
  if(!itemId||!['bench','walk','inspect'].includes(useGameStore.getState().mode))return;
  acc.current+=Math.min(.1,dt);if(acc.current<.2)return;
  useGrade9Apparatus.getState().tick(itemId,acc.current);acc.current=0;
  const r=useGrade9Apparatus.getState().rigs[itemId];if(r?.running)useChemStore.getState().setMixtures({[itemId]:r.chambers[r.port]});
 });
 const labels=useMemo(()=>[1,2,3].map(number=>{const c=document.createElement('canvas');c.width=64;c.height=64;const ctx=c.getContext('2d');if(ctx){ctx.fillStyle='#f0f9ff';ctx.fillRect(0,0,64,64);ctx.fillStyle='#075985';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.fillText(String(number),32,51);}return new CanvasTexture(c);}),[]);
 useEffect(()=>()=>labels.forEach(label=>label.dispose()),[labels]);
 const receiving=useGuideCue(s=>s.target===itemId),flow=useShowcase(s=>s.flow),stirring=useShowcase(s=>s.targetId===itemId&&s.operation==='stir'&&s.status==='playing');
 const selectedPort=rig?.port??0;
 const well=(i:number,x:number,z=0)=>{
  const contents=rig?.chambers[i],look=contents?mixtureLook(contents):undefined;
  const litmus=contents&&((contents.s.litmus_red??0)+(contents.s.litmus_blue??0))>0;
  const ph=contents?phOf(contents):null;
  const solidColor=litmus?(ph!==null&&ph<6?'#dd5470':ph!==null&&ph>8?'#5566d9':contents?.s.litmus_red?'#dd5470':'#5566d9'):look?.solidColor??'#e3e7eb';
  return <group key={i} position={[x,.014,z]}>
   {kind==='gasTrain'&&<mesh position={[0,.057,.026]} onClick={e=>{e.stopPropagation();if(itemId){useGrade9Apparatus.getState().change(itemId,{port:i});if(contents)useChemStore.getState().setMixtures({[itemId]:contents});}}}><planeGeometry args={[.024,.024]}/><meshBasicMaterial map={labels[i]}/></mesh>}
   <mesh material={glass} position={[0,.05,0]}><cylinderGeometry args={[.025,.024,.1,24,1,true]}/></mesh>
   <ChamberContents producedGasMl={i===0&&['gasTrain','conductivityTester'].includes(kind)?rig?.gas:undefined} diffusion={kind==='diffusionCell'&&i===0?rig?.extent:undefined} liquidColor={kind==='convectionCell'&&rig?new Color(look?.liquid??'#cde8f0').lerp(new Color(mixtureLook(rig.chambers[i===0?1:0]).liquid??'#cde8f0'),rig.extent*.5).getStyle():undefined} mixture={contents} radius={.025} height={.1} incoming={selectedPort===i&&(receiving&&flow||actionVisual.targetId===itemId&&actionVisual.strength>0)} running={rig?.running} mixing={rig?.port===i&&(stirring||actionVisual.kind==='stir'&&actionVisual.targetId===itemId)} showSolid={!litmus}/>
   {litmus&&<mesh position={[0,.004,0]}><boxGeometry args={[.008,.001,.035]}/><meshStandardMaterial color={solidColor}/></mesh>}
   <mesh position={[0,.001,0]} onClick={e=>{e.stopPropagation();if(itemId)useGrade9Apparatus.getState().change(itemId,{port:i});}}><cylinderGeometry args={[.028,.028,.004,24]}/><meshStandardMaterial color={selectedPort===i?'#22a9c9':metal}/></mesh>
  </group>;
 };
 return <group {...props}>
 <OperationVisual id={itemId} kind={kind} rig={rig}/>
 <ApparatusLabels id={itemId} kind={kind} rig={rig} onSelect={port=>{if(itemId){useGrade9Apparatus.getState().change(itemId,{port});const m=rig?.chambers[port];if(m)useChemStore.getState().setMixtures({[itemId]:m});}}}/>
 <Box at={[0,.006,0]} size={[.22,.012,.15]} color="#d2dce2"/>
 {isCurriculumRig(kind)?<CurriculumApparatus kind={kind} rig={rig} itemId={itemId} onSelect={port=>{if(itemId){useGrade9Apparatus.getState().change(itemId,{port});const m=rig?.chambers[port];if(m)useChemStore.getState().setMixtures({[itemId]:m});}}}/>:kind==='diffusionTube'?<>
  <mesh material={glass} position={[0,.1,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.012,.012,.21,24,1,true]}/></mesh>
  <Box at={[-.095,.05,0]} size={[.012,.09,.03]} color={metal}/><Box at={[.095,.05,0]} size={[.012,.09,.03]} color={metal}/>
  {rig&&rig.extent>0&&<mesh position={[(rig.chambers[0].aq.NH3?1:-1)*.0195,.1,0]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.01,.0025,8,24]}/><meshStandardMaterial color="white"/></mesh>}
  {[-.105,.105].map((x,i)=><mesh key={i} position={[x,.1,0]}><sphereGeometry args={[.012,12,10]}/><meshStandardMaterial color={rig?.chambers[i].from.length?'#f5f1dc':'#d8e0e5'}/></mesh>)}
 </>:kind==='gasSyringe'?<>
  <mesh material={glass} rotation={[0,0,Math.PI/2]} position={[0,.12,0]}><cylinderGeometry args={[.02,.02,.18,24,1,true]}/></mesh>
  <ActuatedBlock at={[Math.min(.09,-.07+(rig?.gas??0)/maxVolume*.16),.12,0]} size={[.006,.036,.036]} color="#273843"/>
  <Box at={[.1,.12,0]} size={[.09,.007,.007]} color="#94a3b8"/>
  {Array.from({length:11},(_,i)=><Box key={i} at={[-.08+i*.016,.141,0]} size={[.001,.002,i%5?.009:.018]} color="#173a86"/>)}
  <mesh position={[0,.12,.022]}><planeGeometry args={[.18,.023]}/><meshBasicMaterial map={ruler} transparent/></mesh>
  <Box at={[0,.045,0]} size={[.19,.06,.08]} color="#537888"/>{well(0,-.075,.045)}
 </>:kind==='chromatographyTank'?<>
  <mesh material={glass} position={[0,.129,0]}><boxGeometry args={[.075,.23,.04]}/></mesh>
  {rig&&rig.chambers[0].water>0&&<Box at={[0,.014+Math.min(.03,rig.chambers[0].water/3000)/2,0]} size={[.07,Math.min(.03,rig.chambers[0].water/3000),.035]} color="#9ed5eb"/>}
  {(rig?.chambers[2].s.paper??0)>0&&<Box at={[0,.114,.008]} size={[.03,.2,.001]} color="#fff7df"/>}
  <Box at={[0,.034,.009]} size={[.03,.001,.001]} color="#64748b"/>
  {(rig?.chambers[2].s.paper??0)>0&&(rig?.bands.length?rig.bands:[0]).map((v,i)=><mesh key={i} position={[0,.034+v*.01,.01]}><sphereGeometry args={[.004,12,8]}/><meshStandardMaterial color={['#d44f70','#e8bc32','#4782d2'][i]}/></mesh>)}
  {rig&&<Box at={[0,.034+rig.extent*.01,.01]} size={[.03,.001,.001]} color="#55bcd6"/>}
 </>:kind==='corrosionRack'?<>
  {Array.from({length:7},(_,i)=><group key={i} position={[(i%4-1.5)*.05,0,(i<4?-.04:.035)]}>
   <mesh material={glass} position={[0,.06,0]}><cylinderGeometry args={[.019,.019,.1,18,1,true]}/></mesh>
   {((rig?.chambers[i].s.Fe??0)+(rig?.chambers[i].s.FeOH3??0))>0&&<Box at={[0,.06,0]} size={[.004,.075,.004]} color={(rig?.rust[i]??0)>.1?'#a54f26':rig?.chambers[i].from.includes('paint')?'#5092a5':rig?.chambers[i].from.includes('plastic')?'#f1f5f9':'#939fa5'}/>}
   {(rig?.rust[i]??0)>.05&&<mesh position={[0,.033,0]}><cylinderGeometry args={[.015,.015,(rig?.rust[i]??0)*.02,12]}/><meshStandardMaterial color="#a54f26"/></mesh>}
  </group>)}
 </>:kind==='fractionatingColumn'?<>
  <mesh material={glass} position={[0,.145,0]}><cylinderGeometry args={[.025,.025,.25,24,1,true]}/></mesh>
  {rig?.extent===1&&<mesh position={[0,.038,0]}><cylinderGeometry args={[.021,.021,.028,24]}/><meshStandardMaterial color="#8ed8ef" transparent opacity={.6}/></mesh>}
  {Array.from({length:6},(_,i)=><Box key={i} at={[0,.04+i*.035,0]} size={[.045,.003,.045]} color="#a3b7c3"/>)}
  <Box at={[-.07,.05,0]} size={[.07,.08,.07]} color="#5694ab"/><Box at={[.07,.05,0]} size={[.05,.07,.06]} color="#859da9"/>
 </>:kind==='reactionTile'?<>{Array.from({length:6},(_,i)=>well(i,(i%3-1)*.065,i<3?-.035:.035))}</>:<>
  <group position={[0,kind==='calorimeter'?.14:kind==='gasTrain'?.08:0,0]}>{well(0,-.065)}</group>{well(1,.065)}
  {['gasTrain','convectionCell'].includes(kind)&&<Box at={[0,.14,0]} size={[.13,.006,.006]} color="#9ac2cd"/>}
  {kind==='gasTrain'&&<><mesh geometry={hose}><meshStandardMaterial color="#90bac8" transparent opacity={.75}/></mesh>{well(2,0,.055)}<mesh material={glass} position={[0,.17,.045]}><cylinderGeometry args={[.012,.012,.08,20,1,true]}/></mesh></>}
  {kind==='conductivityTester'&&<><Box at={[-.075,.09,0]} size={[.003,.08,.008]} color={metal}/><Box at={[-.055,.09,0]} size={[.003,.08,.008]} color={metal}/><mesh position={[.06,.15,0]}><sphereGeometry args={[.012,12,10]}/><meshStandardMaterial color={(rig?.extent??0)>.5?'#f9e34e':'#5d6869'} emissive={(rig?.extent??0)>.5?'#bfa41a':'#000000'}/></mesh></>}
  {['calorimeter','heatingBath','gasTrain'].includes(kind)&&<Box at={[-.065,.025,0]} size={[.065,.028,.065]} color={rig?.heating&&(kind!=='heatingBath'||rig.port===0)?'#da713b':'#566975'}/>}
  {kind==='heatingBath'&&<Box at={[.065,.025,0]} size={[.065,.028,.065]} color={rig?.heating&&rig.port===1?'#da713b':'#566975'}/>}
  {kind==='calorimeter'&&rig?.heating&&rig.chambers[1].ethanol>0&&<mesh position={[-.065,.11,0]}><coneGeometry args={[.007,.035,12]}/><meshStandardMaterial color="#ffc45b" emissive="#da6726" transparent opacity={.85}/></mesh>}
  {kind==='gasTrain'&&rig?.heating&&<mesh position={[-.065,.065,0]}><coneGeometry args={[.006,.03,12]}/><meshStandardMaterial color="#63b8f4" emissive="#3984e2" transparent opacity={.85}/></mesh>}
  {kind==='heatingBath'&&(rig?.chambers[0].s.ice??0)>0&&<Box at={[-.065,.06,0]} size={[.024,.025,.023]} color="#e1f5ff"/>}
  {kind==='heatingBath'&&(rig?.chambers[1].s.ice??0)>0&&<Box at={[.065,.06,0]} size={[.024,.025,.023]} color="#e1f5ff"/>}
 </>}
 {!isCurriculumRig(kind)&&!['gasTrain','heatingBath','reactionTile','corrosionRack','diffusionTube','fractionatingColumn'].includes(kind)&&well(2,0,.055)}
 {rig?.running&&(rig.kind==='gasTrain'&&rig.gas>0||rig.kind==='heatingBath'&&rig.temperature>=100)&&<group ref={particles}>{Array.from({length:12},(_,i)=><mesh key={i} position={[-.065+(i%3)*.004,.09+i*.009,0]}><sphereGeometry args={[.0018,8,6]}/><meshStandardMaterial color="#e2f4f8" transparent opacity={.7}/></mesh>)}</group>}
 </group>;
}
