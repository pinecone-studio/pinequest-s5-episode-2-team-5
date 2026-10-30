/** Grade 8 copy of ChamberContents as it was before the main reset; ChamberContents.tsx switches to it while a grade 8 lab is active. */
import {phaseHeight,bubbleActivity} from './contents-geometry';
import {appearanceOf} from '../../chemistry/appearance';
import {ReactionCloud} from '../../visuals/ReactionCloud';
import {BubbleSprites} from '../../visuals/BubbleSprites';
import {liquidUniforms,useLiquidMaterial} from '../../visuals/liquid-fx';
import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Color,MathUtils,type Mesh} from 'three';
import {mixtureLook} from '../../chemistry/color';
import {liquidMl,gasMl,type Mixture} from '../../chemistry/mixture';
const CLEAR='#edf5f7';
/** Contents follow the measured mixture; agitation never invents gas or a precipitate. */
export function ChamberContentsGrade8({mixture,radius,height,incoming=false,mixing=false,showSolid=true,liquidColor,diffusion,capacityMl=100,producedGasMl=0}:{mixture?:Mixture;radius:number;height:number;incoming?:boolean;mixing?:boolean;running?:boolean;showSolid?:boolean;liquidColor?:string;diffusion?:number;capacityMl?:number;producedGasMl?:number}){
 const previousGas=useRef((mixture?gasMl(mixture):0)+producedGasMl),bubbleLife=useRef(0),level=useRef(0);
 const liquid=useRef<Mesh>(null),surface=useRef<Mesh>(null);
 const look=useMemo(()=>mixture?mixtureLook(mixture):null,[mixture]);
 const volume=mixture?liquidMl(mixture):0;
 const target=volume>1e-6?Math.max(.001,phaseHeight(volume,capacityMl,height)):0;
 const phases=useMemo(()=>mixture?appearanceOf(mixture):null,[mixture]);
 const aqueousHeight=phases?.layered?target*phases.aqueousMl/volume:target;
 const gas=mixture?gasMl(mixture):0,boiling=!!mixture&&mixture.water>0&&mixture.temp>=99;
 const agitated=incoming||mixing;
 const precipitate=volume>0&&!!phases?.visiblePrecipitate&&(phases.suspension??0)>.01;
 const r=radius*.88;
 // Diffusion is measured by the simulation: the dye plume follows it instead of a timer.
 const liquidMat=useLiquidMaterial(liquidColor??look?.liquid??'#cde8f0',look?.turbidity??0,{agitated,pouring:incoming,fizz:()=>bubbleLife.current>0?(boiling?1:.7):0,cloud:precipitate?phases!.suspension:0,cloudColor:phases?.precipitateColor??null,bottom:0,top:1,radius:r,manual:true,progress:diffusion===undefined?undefined:Math.min(1,diffusion),from:CLEAR});
 const organicMat=useLiquidMaterial(phases?.organicColor??'#eff2e9',0,{agitated,cloud:0,cloudColor:null,bottom:aqueousHeight,top:target,radius:r});
 // Brown NO₂ deepens with its amount; colorless gases are not drawn.
 const no2=mixture?.g?.NO2??0;
 const gasMat=useLiquidMaterial(new Color('#f2f4f3').lerp(new Color('#8f4a1f'),Math.min(1,.2+no2*250)).getStyle(),0,{agitated:false,cloud:0,cloudColor:null,bottom:-height*.375,top:height*.375,radius:r});
 useFrame(({clock},dt)=>{
  const t=clock.elapsedTime,totalGas=gas+producedGasMl;if(bubbleActivity(previousGas.current,totalGas,boiling,volume>0))bubbleLife.current=.7;else bubbleLife.current=Math.max(0,bubbleLife.current-dt);previousGas.current=totalGas;
  if(liquid.current){
   const h=MathUtils.damp(liquid.current.scale.y,aqueousHeight,9,dt);level.current=h;
   liquid.current.scale.y=h;liquid.current.position.y=h/2+.002;liquid.current.visible=h>.0001;
   const u=liquidUniforms(liquidMat);
   if(u){u.uBottom.value=-h/2;u.uTop.value=h/2;u.uScale.value.set(1,h,1);}
  }
  if(surface.current){surface.current.visible=target>0;surface.current.position.y=(phases?.layered?target:(liquid.current?.scale.y??target))+.0025;surface.current.rotation.x=-Math.PI/2+(agitated||bubbleLife.current>0?Math.sin(t*8)*.055:0);surface.current.scale.setScalar(agitated?1+Math.sin(t*10)*.025:1);}
 });
 if(!mixture||volume<=1e-8&&(look?.sedimentMl??0)<=0&&gas<=0)return null;
 const sediment=showSolid&&(look?.sedimentMl??0)>1e-8?Math.max(.0003,phaseHeight(look!.sedimentMl,capacityMl,height)):0;
 return <group>
  <mesh ref={liquid} scale={[1,.0001,1]} material={liquidMat} userData={{noOutline:true,noBatch:true}}><cylinderGeometry args={[r,r,1,32]}/></mesh>
  <mesh ref={surface} rotation={[-Math.PI/2,0,0]} userData={{noOutline:true,noBatch:true}}><circleGeometry args={[radius*.87,32]}/><meshStandardMaterial color={phases?.layered?phases.organicColor:liquidColor??look?.liquid??'#cde8f0'} transparent opacity={.3} roughness={.08} depthWrite={false}/></mesh>
  {phases?.layered&&<>
   <mesh position={[0,.002+aqueousHeight+(target-aqueousHeight)/2,0]} material={organicMat} userData={{noOutline:true,noBatch:true}}><cylinderGeometry args={[r,r,Math.max(.0001,target-aqueousHeight),32]}/></mesh>
   <mesh position={[0,.002+aqueousHeight,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[radius*.82,radius*.88,32]}/><meshBasicMaterial color="#b9c4b7" side={2}/></mesh>
  </>}
  {precipitate&&<ReactionCloud radius={radius*.86} bottom={.003+sediment} top={Math.max(.006,aqueousHeight)} color={phases?.precipitateColor??'#eee'} strength={phases!.suspension} agitated={agitated}/>}
  {sediment>0&&<mesh position={[0,.003+sediment/2,0]}><cylinderGeometry args={[radius*.8,radius*.8,sediment,24]}/><meshStandardMaterial color={look?.solidColor??'#e8dfcf'} roughness={look?.solidMetal?.35:.92} metalness={look?.solidMetal?.65:0}/></mesh>}
  {(look?.foamMl??0)>.001&&volume>0&&<mesh position={[0,target+.004,0]}><cylinderGeometry args={[radius*.86,radius*.86,Math.min(height*.15,.003+(look?.foamMl??0)*.0002),20]}/><meshStandardMaterial color="#f3f4e9" roughness={.95}/></mesh>}
  {volume>0&&<BubbleSprites intensity={()=>bubbleLife.current>0?(boiling?1:.75):0} radiusAt={()=>r} bottom={.003+sediment} top={Math.max(.004,level.current||aqueousHeight)} fromSolid={sediment>0} max={40}/>}
  {no2>0&&volume<.01&&<mesh position={[0,height*.45,0]} material={gasMat} userData={{noOutline:true,noBatch:true}}><cylinderGeometry args={[radius*.86,radius*.86,height*.75,24]}/></mesh>}
 </group>;
}
