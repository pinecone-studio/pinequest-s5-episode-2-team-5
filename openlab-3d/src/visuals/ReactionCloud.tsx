import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {IcosahedronGeometry,MeshStandardMaterial,Object3D,type InstancedMesh} from 'three';
import {useSettingsStore} from '../store/useSettingsStore';
import {lazy} from '../utils/lazy';
const floc=lazy(()=>new IcosahedronGeometry(1,0));
/**
 * Macroscopic precipitate flocs, not molecules, confined to the measured liquid. They bloom
 * where the reagent lands (the surface), billow outward, swirl when stirred and sink as the
 * suspension settles. Opaque, so they stay visible (and smooth) through transmissive glass.
 */
export function ReactionCloud({radius,bottom,top,color,strength,agitated=false}:{radius:number;bottom:number;top:number;color:string;strength:number;agitated?:boolean}){
 const mesh=useRef<InstancedMesh>(null),clock=useRef(0),age=useRef(0),level=useRef(0);
 const material=useMemo(()=>new MeshStandardMaterial({color,roughness:.9}),[color]);
 useEffect(()=>()=>material.dispose(),[material]);
 const dummy=useMemo(()=>new Object3D(),[]);
 const max=56;
 useFrame((_,delta)=>{
  const m=mesh.current;if(!m)return;
  const dt=Math.min(delta,.1),reduced=useSettingsStore.getState().reducedMotion;
  const target=Math.max(0,Math.min(1,strength));
  if(level.current<.02&&target>=.02)age.current=0;
  level.current+=(target-level.current)*(1-Math.exp(-dt*3));age.current+=dt;
  const h=Math.max(.001,top-bottom),count=Math.round(Math.sqrt(level.current)*max);
  m.count=count;m.visible=count>0&&h>.002;if(!m.visible)return;
  clock.current+=dt*(reduced?.1:agitated?1:.25);
  // 0 → 1 over ~2.5 s: the cloud spreads from the entry point to the whole liquid.
  const bloom=reduced?1:Math.min(1,age.current/2.5),ease=bloom*(2-bloom);
  // Less suspended solid → the flocs sit lower.
  const settle=1-level.current;
  for(let i=0;i<count;i++){
   const a=(i*.6180339)%1,b=(i*.3819661)%1,c=(i*.2360679)%1;
   const angle=i*2.39996+clock.current*(agitated?1.4:.3)*(.6+a);
   const r=radius*.8*Math.sqrt(a)*ease;
   const fall=((b+clock.current*(.02+.03*c))%1);
   const level0=1-fall*(1-settle*.75);
   const y=bottom+h*Math.max(.04,Math.min(.97,(1-ease)*.95+ease*level0*(1-settle*.7)));
   dummy.position.set(Math.cos(angle)*r,y,Math.sin(angle)*r);
   const size=radius*(.05+.09*c)*(.5+.5*ease)*(1+(1-ease)*.8);
   dummy.scale.set(size*(1+a*.6),size*(.55+b*.4),size*(1+c*.5));
   dummy.rotation.set(i*.7+clock.current*.3,angle,i*.3);
   dummy.updateMatrix();m.setMatrixAt(i,dummy.matrix);
  }m.instanceMatrix.needsUpdate=true;
 });
 return <instancedMesh ref={mesh} args={[floc(),material,max]} frustumCulled={false} renderOrder={2} userData={{noOutline:true,noBatch:true}} raycast={()=>undefined}/>;
}
