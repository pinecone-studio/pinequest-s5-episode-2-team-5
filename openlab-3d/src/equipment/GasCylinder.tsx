import {useFrame} from '@react-three/fiber';
import {useShowcase} from '../experiments/workbench/guidance/showcase';
import {useMemo,useEffect,useRef} from 'react';
import {MeshStandardMaterial,type Group} from 'three';
import type {GroupProps} from '@react-three/fiber';
import {labelTexture} from '../utils/textures';
export function GasCylinder({label,name,color,itemId,...props}:GroupProps&{label:string;name:string;color:string;itemId?:string}){
 const valve=useRef<Group>(null);useFrame(()=>{if(!valve.current)return;const s=useShowcase.getState(),active=s.source===itemId&&s.tool==='hose'&&['playing','paused'].includes(s.status),f=active?Math.min(1,s.progress/.3,(1-s.progress)/.15):0;valve.current.rotation.y=-Math.max(0,f)*Math.PI*1.5;});
 const material=useMemo(()=>new MeshStandardMaterial({map:labelTexture(label,color,name,2000),roughness:.6}),[label,color,name]);
 useEffect(()=>()=>{material.map?.dispose();material.dispose();},[material]);
 return <group {...props}>
  <mesh position={[0,.073,0]} castShadow><cylinderGeometry args={[.026,.026,.14,24]}/><meshStandardMaterial color={color} metalness={.55} roughness={.35}/></mesh>
  <mesh position={[0,.144,0]}><sphereGeometry args={[.026,20,12,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color={color} metalness={.55}/></mesh>
  <mesh position={[0,.169,0]}><cylinderGeometry args={[.006,.006,.018,16]}/><meshStandardMaterial color="#bd9647" metalness={.8}/></mesh>
  <group ref={valve} position={[0,.179,0]}><mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[.012,.003,8,20]}/><meshStandardMaterial color="#374151"/></mesh><mesh><boxGeometry args={[.022,.002,.003]}/><meshStandardMaterial color="#8b9cab"/></mesh></group><mesh position={[.012,.169,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.003,.003,.025,10]}/><meshStandardMaterial color="#bd9647" metalness={.8}/></mesh>
  <mesh material={material} position={[0,.075,0]} rotation={[0,Math.PI,0]}><cylinderGeometry args={[.0265,.0265,.05,24,1,true,Math.PI*.6,Math.PI*.8]}/></mesh>
 </group>;
}
