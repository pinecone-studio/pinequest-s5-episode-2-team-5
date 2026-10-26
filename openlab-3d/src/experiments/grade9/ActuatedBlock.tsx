import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {MathUtils,type Mesh} from 'three';
export function ActuatedBlock({at,size,color}:{at:[number,number,number];size:[number,number,number];color:string}){
 const mesh=useRef<Mesh>(null);useFrame((_,dt)=>{if(mesh.current){mesh.current.position.x=MathUtils.damp(mesh.current.position.x,at[0],5,dt);mesh.current.position.y=MathUtils.damp(mesh.current.position.y,at[1],5,dt);mesh.current.position.z=MathUtils.damp(mesh.current.position.z,at[2],5,dt);}});
 return <mesh ref={mesh}><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.5}/></mesh>;
}
