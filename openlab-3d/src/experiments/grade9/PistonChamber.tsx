import {pistonPosition} from './contents-geometry';
import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {MathUtils,type Group} from 'three';
import {useGlass} from '../../materials/glass';

/** A sealed barrel: gas, seal, rod and thumb rest share one measured displacement. */
export function PistonChamber({volumeMl,capacityMl,length=.16,radius=.02,brownGas=false}:{volumeMl:number;capacityMl:number;length?:number;radius?:number;brownGas?:boolean}){
 const glass=useGlass('#e2eff5'),piston=useRef<Group>(null),gas=useRef<Group>(null);
 const left=-length/2,at=pistonPosition(volumeMl,capacityMl,length);
 useFrame((_,dt)=>{
  if(!piston.current||!gas.current)return;
  const x=MathUtils.damp(piston.current.position.x,at,8,Math.min(dt,.1));
  piston.current.position.x=x;gas.current.position.x=(left+x)/2;gas.current.scale.x=Math.max(.00001,x-left);
 });
 return <group>
  <mesh material={glass} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[radius,radius,length+.008,32,1,true]}/></mesh>
  <group ref={gas} position={[(left+at)/2,0,0]} scale={[Math.max(.00001,at-left),1,1]}><mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[radius*.87,radius*.87,1,24]}/><meshStandardMaterial color={brownGas?'#9f5b2f':'#e4f2f6'} transparent opacity={brownGas?.4:.045} depthWrite={false}/></mesh></group>
  <mesh position={[left-.004,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[radius,radius,.005,24]}/><meshStandardMaterial color="#a5bac3" metalness={.6} roughness={.3}/></mesh>
  <mesh position={[left-.014,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.003,.005,.018,12]}/><meshStandardMaterial color="#829da9"/></mesh>
  <group ref={piston} position={[at,0,0]}>
   <mesh rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[radius*.91,radius*.91,.006,24]}/><meshStandardMaterial color="#263943" roughness={.8}/></mesh>
   <mesh position={[length*.42,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.003,.003,length*.84,12]}/><meshStandardMaterial color="#b7c5cb" metalness={.65} roughness={.25}/></mesh>
   <mesh position={[length*.84,0,0]}><boxGeometry args={[.005,radius*2.2,radius*1.3]}/><meshStandardMaterial color="#405765"/></mesh>
  </group>
  {Array.from({length:11},(_,i)=><mesh key={i} position={[left+i*length/10,radius+.001,0]}><boxGeometry args={[.0008,.0015,i%5?radius*.45:radius*.9]}/><meshStandardMaterial color="#173a56"/></mesh>)}
 </group>;
}
