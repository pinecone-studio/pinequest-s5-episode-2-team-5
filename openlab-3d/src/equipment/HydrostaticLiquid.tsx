import {useMemo,useRef,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {BufferGeometry,BufferAttribute,Plane,Vector3,Quaternion,type Group} from 'three';
import {bandGeometry,radiusAt,rimHeight,type VesselProfile} from './profiles';
import {liquidPlane,planeInterior,type Normal3} from './liquid-plane';
/** A level free surface inside a moving vessel, solved from the current finite volume. */
export function HydrostaticLiquid({profile,ml,color}:{profile:VesselProfile;ml:number;color:string}){
 const group=useRef<Group>(null);
 const state=useMemo(()=>({plane:new Plane(new Vector3(0,-1,0),0),origin:new Vector3(),q:new Quaternion(),n:new Vector3(),u:new Vector3(),v:new Vector3(),point:new Vector3(),axis:new Vector3(0,1,0),center:new Vector3()}),[]);
 const cap=useMemo(()=>{const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Float32Array(48*9),3));g.setAttribute('normal',new BufferAttribute(new Float32Array(48*9),3));return g;},[]);
 useEffect(()=>()=>cap.dispose(),[cap]);
 const full=bandGeometry(profile,profile.wall[0][1],rimHeight(profile));
 useFrame(()=>{
  if(!group.current)return;const {plane,origin,q,n,u,v,point,axis,center}=state;
  group.current.getWorldPosition(origin);group.current.getWorldQuaternion(q);n.set(0,1,0).applyQuaternion(q.clone().invert());
  const normal=n.toArray() as Normal3,h=liquidPlane(profile,normal,ml);plane.constant=origin.y+h;center.set(...planeInterior(profile,normal,h));
  u.crossVectors(n,Math.abs(n.y)<.9?axis.set(0,1,0):axis.set(1,0,0)).normalize();v.crossVectors(n,u).normalize();
  const position=cap.getAttribute('position') as BufferAttribute,normals=cap.getAttribute('normal') as BufferAttribute;
  const inside=(x:Vector3)=>x.y>=profile.wall[0][1]&&x.y<=rimHeight(profile)&&Math.hypot(x.x,x.z)<=radiusAt(profile,x.y)*.985;
  const radius=Math.max(...profile.wall.map(p=>p[0]))*2+(rimHeight(profile)-profile.wall[0][1]);
  const edge=(angle:number)=>{let lo=0,hi=radius;for(let k=0;k<16;k++){const r=(lo+hi)/2;point.copy(center).addScaledVector(u,Math.cos(angle)*r).addScaledVector(v,Math.sin(angle)*r);if(inside(point))lo=r;else hi=r;}return point.copy(center).addScaledVector(u,Math.cos(angle)*lo).addScaledVector(v,Math.sin(angle)*lo).clone();};
  for(let i=0;i<48;i++){const a=edge(i/48*Math.PI*2),b=edge((i+1)/48*Math.PI*2);[center,a,b].forEach((p,j)=>{position.setXYZ(i*3+j,p.x,p.y,p.z);normals.setXYZ(i*3+j,n.x,n.y,n.z);});}
  position.needsUpdate=true;normals.needsUpdate=true;
 });
 return <group ref={group}><mesh geometry={full} renderOrder={2}><meshStandardMaterial color={color} transparent opacity={.62} roughness={.15} side={2} depthWrite={false} clippingPlanes={[state.plane]}/></mesh><mesh geometry={cap} frustumCulled={false} renderOrder={3}><meshStandardMaterial color={color} transparent opacity={.75} roughness={.14} side={2} depthWrite={false}/></mesh></group>;
}
