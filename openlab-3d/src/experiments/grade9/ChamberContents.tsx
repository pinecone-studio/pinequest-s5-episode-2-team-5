import {appearanceOf} from '../../chemistry/appearance';
import {ReactionCloud} from '../../visuals/ReactionCloud';
import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Color,MathUtils,type Mesh,type MeshStandardMaterial,type Group} from 'three';
import {mixtureLook} from '../../chemistry/color';
import {liquidMl,gasMl,type Mixture} from '../../chemistry/mixture';
/** Contents follow the measured mixture; agitation never invents gas or a precipitate. */
export function ChamberContents({mixture,radius,height,incoming=false,mixing=false,running=false,showSolid=true,liquidColor,diffusion,capacityMl=100,producedGasMl=0}:{mixture?:Mixture;radius:number;height:number;incoming?:boolean;mixing?:boolean;running?:boolean;showSolid?:boolean;liquidColor?:string;diffusion?:number;capacityMl?:number;producedGasMl?:number}){
 const previousGas=useRef(0),bubbleLife=useRef(0);
 const liquid=useRef<Mesh>(null),material=useRef<MeshStandardMaterial>(null),surface=useRef<Mesh>(null),particles=useRef<Group>(null);
 const look=useMemo(()=>mixture?mixtureLook(mixture):null,[mixture]);
 const color=useMemo(()=>new Color(),[]),volume=mixture?liquidMl(mixture):0;
 const target=volume>1e-6?Math.min(height*.84,Math.max(.0025,volume/capacityMl*height*.84)):0;
 const phases=useMemo(()=>mixture?appearanceOf(mixture):null,[mixture]);
 const aqueousHeight=phases?.layered?target*phases.aqueousMl/volume:target;
 const visibleColor=diffusion!==undefined?new Color('#edf5f7').lerp(new Color(look?.liquid??'#edf5f7'),Math.min(1,diffusion)).getStyle():liquidColor;
 const gas=mixture?gasMl(mixture):0,boiling=!!mixture&&mixture.water>0&&mixture.temp>=99;
 const agitated=incoming||mixing;
 useFrame(({clock},dt)=>{
  const t=clock.elapsedTime,totalGas=gas+producedGasMl;if(totalGas>previousGas.current+1e-9)bubbleLife.current=.7;else bubbleLife.current=Math.max(0,bubbleLife.current-dt);previousGas.current=totalGas;
  const bubbling=(running||incoming)&&(bubbleLife.current>0||boiling);
  if(liquid.current){const h=MathUtils.damp(liquid.current.scale.y,aqueousHeight,9,dt);liquid.current.scale.y=h;liquid.current.position.y=h/2+.002;liquid.current.visible=h>.0001;}
  if(material.current&&look){material.current.color.lerp(color.set(visibleColor??look.liquid??'#cde8f0'),1-Math.exp(-dt*5));material.current.opacity=MathUtils.damp(material.current.opacity,.55+(look.turbidity??0)*.4,5,dt);}
  if(surface.current){surface.current.visible=target>0;surface.current.position.y=(phases?.layered?target:(liquid.current?.scale.y??target))+.0025;surface.current.rotation.x=-Math.PI/2+(agitated||bubbling?Math.sin(t*8)*.055:0);surface.current.scale.setScalar(agitated?1+Math.sin(t*10)*.025:1);}
  if(particles.current)particles.current.children.forEach((p,i)=>{const f=(t*.65+i*.173)%1;p.position.set(Math.sin(i*7+t*.7)*radius*.55,.004+f*Math.max(target,.015),Math.cos(i*9+t*.7)*radius*.55);p.visible=bubbling&&target>0;});
 });
 if(!mixture||volume<=1e-8&&(look?.sedimentMl??0)<=0&&gas<=0)return null;
 return <group>
  <mesh ref={liquid} scale={[1,.0001,1]}><cylinderGeometry args={[radius*.88,radius*.88,1,24]}/><meshStandardMaterial ref={material} color={look?.liquid??'#cde8f0'} transparent opacity={.65} roughness={.23} depthWrite={false}/></mesh>
  <mesh ref={surface} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[radius*.87,24]}/><meshStandardMaterial color={phases?.layered?phases.organicColor:visibleColor??look?.liquid??'#cde8f0'} transparent opacity={.35} roughness={.15} depthWrite={false} side={2}/></mesh>
  {phases?.layered&&<>
   <mesh position={[0,.002+aqueousHeight+(target-aqueousHeight)/2,0]}><cylinderGeometry args={[radius*.88,radius*.88,target-aqueousHeight,24]}/><meshStandardMaterial color={phases.organicColor} transparent opacity={.4} roughness={.12} depthWrite={false}/></mesh>
   <mesh position={[0,.002+aqueousHeight,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[radius*.82,radius*.88,24]}/><meshBasicMaterial color="#b9c4b7" transparent opacity={.65} side={2}/></mesh>
  </>}
  {volume>0&&phases?.visiblePrecipitate&&(phases.suspension??0)>.01&&<ReactionCloud radius={radius*.86} bottom={.003} top={Math.max(.006,aqueousHeight)} color={phases?.precipitateColor??'#eee'} strength={phases!.suspension} spread={phases!.suspension} agitated={agitated}/>}
  {volume>0&&phases?.colored&&!phases.layered&&!phases.visiblePrecipitate&&diffusion===undefined&&<ReactionCloud radius={radius*.86} bottom={.003} top={Math.max(.006,aqueousHeight)} color={look?.liquid??'#edf5f7'} strength={incoming||mixing?.35:0} spread={.8} agitated={agitated} fromTop/>}
  {volume>0&&diffusion!==undefined&&diffusion<.98&&<ReactionCloud radius={radius*.86} bottom={.003} top={Math.max(.006,aqueousHeight)} color={look?.liquid??'#8e4ba8'} strength={.7*(1-diffusion)} spread={Math.max(.03,diffusion)} agitated={false}/>}
  {showSolid&&(look?.sedimentMl??0)>1e-8&&<mesh position={[0,.003+Math.min(height*.15,(look?.sedimentMl??0)*.001)/2,0]}><cylinderGeometry args={[radius*.8,radius*.8,Math.max(.002,Math.min(height*.15,(look?.sedimentMl??0)*.001)),20]}/><meshStandardMaterial color={look?.solidColor??'#e8dfcf'} roughness={.92}/></mesh>}
  {(look?.foamMl??0)>.001&&volume>0&&<mesh position={[0,target+.004,0]}><cylinderGeometry args={[radius*.86,radius*.86,Math.min(height*.15,.003+(look?.foamMl??0)*.0002),20]}/><meshStandardMaterial color="#f3f4e9" transparent opacity={.8}/></mesh>}
  <group ref={particles}>{(gas>0||producedGasMl>0||boiling)&&Array.from({length:16},(_,i)=><mesh key={i}><sphereGeometry args={[.0015+(i%4)*.00045,7,5]}/><meshStandardMaterial color="#e8f8ff" transparent opacity={.55} depthWrite={false}/></mesh>)}</group>
  {gas>0&&volume<.01&&<mesh position={[0,height*.45,0]}><cylinderGeometry args={[radius*.86,radius*.86,height*.75,18]}/><meshStandardMaterial color={(mixture.g?.NO2??0)>0?'#a56532':'#c9e7ed'} transparent opacity={(mixture.g?.NO2??0)>0?Math.min(.7,.08+(mixture.g?.NO2??0)*200):.035} depthWrite={false}/></mesh>}
 </group>;
}
