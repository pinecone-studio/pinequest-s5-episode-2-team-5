import {fallingPoint,fallTime} from './pour-physics';
import {chamberView} from '../../grade9/chamber-view';
import {useGuideCue} from './runtime';
import {interactables} from '../../../interaction/registry';
import {useGrade9Apparatus} from '../../grade9/store';
import {mixtureOf} from '../../../store/useChemStore';
import {liquidMl} from '../../../chemistry/mixture';
import {PROFILES,heightForVolume} from '../../../equipment/profiles';
import {useInventoryStore} from '../../../store/useInventoryStore';
import {portLayout} from '../../grade9/port-layout';
import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Object3D,Vector3,type InstancedMesh,type MeshStandardMaterial} from 'three';
import {useShowcase} from './showcase';
/** Bounded instanced stream: a continuous liquid jet, separate drops, grains, or gas in a hose. */
export function MaterialFlow(){
 const streamMaterial=useRef<MeshStandardMaterial>(null),dropMaterial=useRef<MeshStandardMaterial>(null);
 const stream=useRef<InstancedMesh>(null),drops=useRef<InstancedMesh>(null),time=useRef(0);
 const math=useMemo(()=>({dummy:new Object3D(),up:new Vector3(0,1,0),direction:new Vector3(),a:new Vector3(),b:new Vector3(),landing:new Vector3()}),[]);
 const color=useShowcase(s=>s.color);
 useFrame((_,dt)=>{
  const s=useShowcase.getState(),active=s.flow&&!!s.tip&&!!s.mouth;
  if(stream.current)stream.current.visible=active&&s.tool==='pour'&&s.materialPhase==='liquid';if(drops.current)drops.current.visible=active;
  if(!active||!s.tip||!s.mouth)return;if(s.status==='playing')time.current+=Math.min(dt,.1);
  const {dummy,up,direction,a,b,landing}=math;
  landing.set(...s.mouth);
  const id=useGuideCue.getState().target,entry=id?interactables.get(id):undefined,rig=id?useGrade9Apparatus.getState().rigs[id]:undefined;
  if(entry&&id&&s.tool!=='hose'){
   if(rig){const l=portLayout(rig.kind,rig.port),view=chamberView(rig,rig.port),volume=liquidMl(view.mixture);landing.set(l.x,l.bottom+.003+(volume>0?Math.min(l.height*.84,Math.max(.0025,volume/view.capacityMl*l.height*.84)):0),l.z);entry.object.localToWorld(landing);}
   else{const kind=useInventoryStore.getState().worldItems.find(w=>w.id===id)?.kind;if(kind&&kind in PROFILES){landing.set(0,heightForVolume(PROFILES[kind as keyof typeof PROFILES],liquidMl(mixtureOf(id)))+.002,0);entry.object.localToWorld(landing);}}
  }
  const origin=s.tip,opening=s.mouth,end: [number,number,number]=[landing.x,Math.min(landing.y,opening[1]-.001),landing.z];
  if(s.materialPhase!=='gas'&&origin[1]<=opening[1]){if(stream.current)stream.current.visible=false;if(drops.current)drops.current.visible=false;return;}
  const flight=fallTime(origin,opening)+fallTime(opening,end),viscous=s.viscosity>1;
  const point=(f:number,v:Vector3)=>{
   if(s.tool==='hose'){v.set(origin[0]+(opening[0]-origin[0])*f,origin[1]+(opening[1]-origin[1])*f+.05*Math.sin(Math.PI*f),origin[2]+(opening[2]-origin[2])*f);return v;}
   const split=fallTime(origin,opening)/flight;
   v.set(...(f<split?fallingPoint(origin,opening,f/split):fallingPoint(opening,end,(f-split)/(1-split))));return v;
  };
  if(dropMaterial.current)dropMaterial.current.opacity=s.materialPhase==='gas'?.08:s.materialPhase==='solid'?.95:.75;

  if(stream.current&&s.tool==='pour'){for(let i=0;i<12;i++){point(i/12,a);point((i+1)/12,b);dummy.position.copy(a).add(b).multiplyScalar(.5);direction.copy(b).sub(a);dummy.quaternion.setFromUnitVectors(up,direction.clone().normalize());dummy.scale.set((viscous?.0028:.0018)*(1-i/36),direction.length()*1.05,(viscous?.0028:.0018)*(1-i/36));dummy.updateMatrix();stream.current.setMatrixAt(i,dummy.matrix);}stream.current.instanceMatrix.needsUpdate=true;}
  if(drops.current){for(let i=0;i<24;i++){const dropCount=Math.max(1,Math.ceil(s.amount/.05)),interval=(s.amount>1?100:2)/dropCount,batch=Math.max(0,Math.floor((time.current+flight-(i+1)*interval)/(24*interval))),number=i+batch*24,age=time.current-((number+1)*interval-flight);const f=(time.current/Math.max(.12,flight)*(viscous?.4:1)+i/24)%1;point(s.tool==='pipette'?Math.max(0,Math.min(1,age/flight)):f,dummy.position);const grain=s.materialPhase==='solid',gas=s.tool==='hose';if(grain){dummy.position.x+=Math.sin(i*7)*.003*f;dummy.position.z+=Math.cos(i*9)*.003*f;}dummy.quaternion.identity();const r=grain?.0015:gas?.0013:viscous?.0007:.001;const visible=s.tool!=='pipette'||number<dropCount&&age>=0&&age<=flight;dummy.scale.set(visible?r:0,visible?r*(grain?1:gas?1:2):0,visible?r:0);dummy.updateMatrix();drops.current.setMatrixAt(i,dummy.matrix);}drops.current.instanceMatrix.needsUpdate=true;}
 });
 return <group><instancedMesh ref={stream} args={[undefined,undefined,12]} frustumCulled={false}><cylinderGeometry args={[1,1,1,8]}/><meshStandardMaterial ref={streamMaterial} color={color} transparent opacity={.62} roughness={.16} depthWrite={false}/></instancedMesh><instancedMesh ref={drops} args={[undefined,undefined,24]} frustumCulled={false}><sphereGeometry args={[1,7,5]}/><meshStandardMaterial ref={dropMaterial} color={color} transparent opacity={.8} roughness={.25} depthWrite={false}/></instancedMesh></group>;
}
