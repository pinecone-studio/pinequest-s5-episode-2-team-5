import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Object3D,type InstancedMesh,type MeshStandardMaterial} from 'three';
/** Macroscopic cloudy wisps/flocs, not molecules. Confined to the measured liquid. */
export function ReactionCloud({radius,bottom,top,color,strength,spread=1,agitated=false,fromTop=false}:{radius:number;bottom:number;top:number;color:string;strength:number;spread?:number;agitated?:boolean;fromTop?:boolean}){
 const mesh=useRef<InstancedMesh>(null),mat=useRef<MeshStandardMaterial>(null),clock=useRef(0);
 const dummy=useMemo(()=>new Object3D(),[]);
 useFrame((_,dt)=>{
  if(!mesh.current)return;clock.current+=Math.min(dt,.1)*(agitated?1:.15);const t=clock.current,h=Math.max(.001,top-bottom),d=Math.max(.025,Math.min(1,spread));
  mesh.current.visible=(mat.current?.opacity??0)>.001&&h>.001;
  if(mat.current)mat.current.opacity+=(Math.min(.65,strength*.65)-mat.current.opacity)*(1-Math.exp(-dt*3));
  for(let i=0;i<24;i++){
   const seed=(i*.6180339)%1,angle=i*2.399+t*(agitated?.6:.08),r=radius*.62*Math.sqrt(seed)*Math.sqrt(d);
   const level=.07+((i*.3819)%1)*.86*d;const y=bottom+h*(fromTop?1-level:level);
   dummy.position.set(Math.cos(angle)*r,y+Math.sin(i+t)*h*.025*d,Math.sin(angle)*r);
   const size=radius*(.19+.18*((i*7%11)/11))*Math.sqrt(d);dummy.scale.set(size,Math.min(h*.1,size*.55),size*.8);dummy.rotation.set(i*.4,angle,i*.2);dummy.updateMatrix();mesh.current.setMatrixAt(i,dummy.matrix);
  }mesh.current.instanceMatrix.needsUpdate=true;
 });
 return <instancedMesh ref={mesh} args={[undefined,undefined,24]} frustumCulled={false} renderOrder={2}><sphereGeometry args={[1,9,6]}/><meshStandardMaterial ref={mat} color={color} transparent opacity={0} roughness={.95} depthWrite={false}/></instancedMesh>;
}
