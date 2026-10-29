import {PistonChamber} from './PistonChamber';
import {HotPlate,SpiritLamp,RigBurner,Electrode,IndicatorBulb,ColumnPlate,ChromaPaper,PortTag,Chiller,Dewar} from './RigParts';
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
 const receiving=useGuideCue(s=>s.target===itemId),flow=useShowcase(s=>s.flow),stirring=useShowcase(s=>s.targetId===itemId&&s.operation==='stir'&&s.status==='playing');
 const selectedPort=rig?.port??0;
 const well=(i:number,x:number,z=0)=>{
  const contents=rig?.chambers[i],look=contents?mixtureLook(contents):undefined;
  const litmus=contents&&((contents.s.litmus_red??0)+(contents.s.litmus_blue??0))>0;
  const ph=contents?phOf(contents):null;
  const solidColor=litmus?(ph!==null&&ph<6?'#dd5470':ph!==null&&ph>8?'#5566d9':contents?.s.litmus_red?'#dd5470':'#5566d9'):look?.solidColor??'#e3e7eb';
  return <group key={i} position={[x,.014,z]}>
   {kind==='gasTrain'&&<PortTag text={String(i+1)} at={[0,.065,.0262]} active={selectedPort===i} size={.013}/>}
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
  <group position={[0,.12,0]}><PistonChamber volumeMl={rig?.gas??0} capacityMl={maxVolume}/></group>
  <mesh position={[0,.12,.022]}><planeGeometry args={[.18,.023]}/><meshBasicMaterial map={ruler} transparent/></mesh>
  <Box at={[0,.045,0]} size={[.19,.06,.08]} color="#537888"/>{well(0,-.075,.045)}
 </>:kind==='chromatographyTank'?<>
  <mesh material={glass} position={[0,.129,0]}><boxGeometry args={[.075,.23,.04]}/></mesh>
  {rig&&rig.chambers[0].water>0&&<Box at={[0,.014+Math.min(.03,rig.chambers[0].water/3000)/2,0]} size={[.07,Math.min(.03,rig.chambers[0].water/3000),.035]} color="#9ed5eb"/>}
  {(rig?.chambers[2].s.paper??0)>0&&<>
   <ChromaPaper at={[0,.124,.004]} height={.2} front={Math.max(0,.01+(rig?.extent??0)*.01)} spots={(rig?.bands.length?rig.bands:[0]).map((v,i)=>({y:.01+v*.01,color:['#d44f70','#e8bc32','#4782d2'][i],spread:Math.min(1,v*.15)}))}/>
   <mesh position={[0,.234,.004]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.0018,.0018,.08,10]}/><meshStandardMaterial color="#c9d2d8" metalness={.8} roughness={.3}/></mesh>
  </>}
  <mesh position={[0,.246,0]}><boxGeometry args={[.081,.004,.046]}/><meshPhysicalMaterial color="#e8f2f6" roughness={.1} transparent opacity={.5} depthWrite={false}/></mesh>
 </>:kind==='corrosionRack'?<>
  {Array.from({length:7},(_,i)=><group key={i} position={[(i%4-1.5)*.05,0,(i<4?-.04:.035)]}>
   <mesh material={glass} position={[0,.06,0]}><cylinderGeometry args={[.019,.019,.1,18,1,true]}/></mesh>
   <group position={[0,.01,0]}><ChamberContents mixture={rig?.chambers[i]} radius={.018} height={.09} running={rig?.running} showSolid={false}/></group>
   {((rig?.chambers[i].s.Fe??0)+(rig?.chambers[i].s.FeOH3??0))>0&&<Box at={[0,.06,0]} size={[.004,.075,.004]} color={(rig?.rust[i]??0)>.1?'#a54f26':rig?.chambers[i].from.includes('paint')?'#5092a5':rig?.chambers[i].from.includes('plastic')?'#f1f5f9':'#939fa5'}/>}
   {(rig?.rust[i]??0)>.05&&<mesh position={[0,.033,0]}><cylinderGeometry args={[.015,.015,(rig?.rust[i]??0)*.02,12]}/><meshStandardMaterial color="#a54f26"/></mesh>}
  </group>)}
 </>:kind==='fractionatingColumn'?<>
  <mesh material={glass} position={[0,.145,0]}><cylinderGeometry args={[.025,.025,.25,24,1,true]}/></mesh>
  {rig?.extent===1&&<mesh position={[0,.038,0]}><cylinderGeometry args={[.021,.021,.028,24]}/><meshStandardMaterial color="#8ed8ef" transparent opacity={.6}/></mesh>}
  {Array.from({length:6},(_,i)=><ColumnPlate key={i} at={[0,.04+i*.035,0]} radius={.024}/>)}
  <Chiller at={[-.07,.05,0]} cooling={!!rig?.cooling}/><Dewar at={[.07,.014,0]}/>
 </>:kind==='reactionTile'?<>{Array.from({length:6},(_,i)=>well(i,(i%3-1)*.065,i<3?-.035:.035))}</>:<>
  <group position={[0,kind==='calorimeter'?.14:kind==='gasTrain'?.08:0,0]}>{well(0,-.065)}</group>{well(1,.065)}
  {['gasTrain','convectionCell'].includes(kind)&&<Box at={[0,.14,0]} size={[.13,.006,.006]} color="#9ac2cd"/>}
  {kind==='gasTrain'&&<><mesh geometry={hose}><meshStandardMaterial color="#90bac8" transparent opacity={.75}/></mesh>{well(2,0,.055)}<mesh material={glass} position={[0,.17,.045]}><cylinderGeometry args={[.012,.012,.08,20,1,true]}/></mesh></>}
  {kind==='conductivityTester'&&<><Electrode at={[-.075,.09,0]} height={.08} color="#9aa5ad" clip={null}/><Electrode at={[-.055,.09,0]} height={.08} color="#9aa5ad" clip={null}/><IndicatorBulb at={[.06,.15,0]} on={(rig?.extent??0)>.5}/></>}
  {kind==='heatingBath'&&<><HotPlate at={[-.065,.026,0]} size={[.065,.028,.065]} heating={!!rig?.heating&&rig.port===0}/><HotPlate at={[.065,.026,0]} size={[.065,.028,.065]} heating={!!rig?.heating&&rig.port===1}/></>}
  {kind==='calorimeter'&&<SpiritLamp at={[-.065,.012,0]} lit={!!rig?.heating&&(rig?.chambers[1].ethanol??0)>0} fuel={Math.min(1,(rig?.chambers[1].ethanol??0)/10)}/>}
  {kind==='gasTrain'&&<RigBurner at={[-.065,.012,0]} lit={!!rig?.heating}/>}
  {kind==='heatingBath'&&(rig?.chambers[0].s.ice??0)>0&&<Box at={[-.065,.06,0]} size={[.024,.025,.023]} color="#e1f5ff"/>}
  {kind==='heatingBath'&&(rig?.chambers[1].s.ice??0)>0&&<Box at={[.065,.06,0]} size={[.024,.025,.023]} color="#e1f5ff"/>}
 </>}
 {!isCurriculumRig(kind)&&!['gasTrain','heatingBath','reactionTile','corrosionRack','diffusionTube','fractionatingColumn'].includes(kind)&&well(2,0,.055)}
 {rig?.running&&(rig.kind==='gasTrain'&&rig.gas>0||rig.kind==='heatingBath'&&rig.temperature>=100)&&<group ref={particles}>{Array.from({length:12},(_,i)=><mesh key={i} position={[-.065+(i%3)*.004,.09+i*.009,0]}><sphereGeometry args={[.0018,8,6]}/><meshStandardMaterial color="#e2f4f8" transparent opacity={.7}/></mesh>)}</group>}
 </group>;
}
