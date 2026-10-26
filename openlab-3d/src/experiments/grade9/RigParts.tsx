import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {AdditiveBlending,CanvasTexture,CatmullRomCurve3,Color,LatheGeometry,MeshBasicMaterial,MeshStandardMaterial,TubeGeometry,Vector2,Vector3,type Group} from 'three';
import {useGlass} from '../../materials/glass';
import {metalBrushed,metalChrome,metalDark} from '../../materials/metal';
import {plastic} from '../../materials/plastic';
import {lazy} from '../../utils/lazy';
type P=[number,number,number];
/**
 * Recognisable bench hardware shared by the textbook rigs, in place of colored boxes:
 * a hot plate whose ceramic top glows when hot, a spirit lamp with a live flame, a bench
 * power supply with a readout, and electrodes held by crocodile clips on leads.
 */
const coil=new Color('#ff3b12'),cold=new Color('#2b2f33'),frost=new Color('#9fd3ea');
export function HotPlate({at,size=[.1,.035,.09],heating=false,cooling=false}:{at:P;size?:P;heating?:boolean;cooling?:boolean}){
 const top=useMemo(()=>new MeshStandardMaterial({color:'#2b2f33',roughness:.35,metalness:.1}),[]);
 useEffect(()=>()=>top.dispose(),[top]);
 const glow=useRef(0);
 useFrame((_,dt)=>{
  // The ceramic warms and cools over seconds, like the real element.
  glow.current+=((heating?1:0)-glow.current)*(1-Math.exp(-Math.min(dt,.1)*(heating?.8:.4)));
  top.color.copy(cooling?frost:cold);top.emissive.copy(coil).multiplyScalar(glow.current*glow.current*.9);
 });
 const [w,h,d]=size;
 return <group position={[at[0],at[1]-h/2,at[2]]}>
  <mesh material={plastic('#e9ecef',.5)} position={[0,h*.42,0]} castShadow receiveShadow><boxGeometry args={[w,h*.84,d]}/></mesh>
  <mesh material={plastic('#6b7782',.5)} position={[0,h*.42,d/2+.0006]}><boxGeometry args={[w*.96,h*.6,.001]}/></mesh>
  <mesh material={top} position={[0,h*.88,0]}><cylinderGeometry args={[Math.min(w,d)*.42,Math.min(w,d)*.42,h*.1,32]}/></mesh>
  <mesh material={metalBrushed} position={[0,h*.86,0]}><boxGeometry args={[w*.98,h*.06,d*.98]}/></mesh>
  <mesh material={plastic('#1f2933',.4)} position={[-w*.28,h*.42,d/2+.004]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.0065,.007,.008,18]}/></mesh>
  <mesh material={plastic('#f8fafc',.4)} position={[-w*.28,h*.42+.004,d/2+.0082]}><boxGeometry args={[.0012,.004,.001]}/></mesh>
  <mesh position={[w*.3,h*.42,d/2+.0012]}><circleGeometry args={[.0028,16]}/><meshBasicMaterial color={heating?'#ff4b2b':cooling?'#38bdf8':'#3b4650'} toneMapped={false}/></mesh>
 </group>;
}
const lampBody=lazy(()=>new LatheGeometry([new Vector2(0,0),new Vector2(.024,0),new Vector2(.026,.004),new Vector2(.026,.02),new Vector2(.02,.032),new Vector2(.008,.036),new Vector2(.008,.04),new Vector2(0,.04)],28));
const flameShape=lazy(()=>{const pts:Vector2[]=[];for(let i=0;i<=14;i++){const t=i/14;pts.push(new Vector2(Math.sin(Math.PI*Math.pow(t,.5))*(1-t*.35)*.0075+.0003,t*.042));}return new LatheGeometry(pts,18);});
const outerFlame=lazy(()=>new MeshBasicMaterial({color:'#ffb347',transparent:true,opacity:.8,blending:AdditiveBlending,depthWrite:false,toneMapped:false}));
const innerFlame=lazy(()=>new MeshBasicMaterial({color:'#4f8dff',transparent:true,opacity:.75,blending:AdditiveBlending,depthWrite:false,toneMapped:false}));
/** Spirit (alcohol) lamp: glass reservoir with fuel, brass collar, cotton wick and a soft yellow flame. */
export function SpiritLamp({at,lit=false,fuel=.6}:{at:P;lit?:boolean;fuel?:number}){
 const glass=useGlass('#eaf6f8'),flame=useRef<Group>(null);
 useFrame(({clock})=>{if(!flame.current)return;const t=clock.elapsedTime;flame.current.scale.set(1+Math.sin(t*19)*.06,1+Math.sin(t*13)*.1+Math.sin(t*41)*.04,1+Math.cos(t*17)*.06);flame.current.rotation.z=Math.sin(t*3.1)*.05;});
 const f=Math.max(.05,Math.min(1,fuel));
 return <group position={at}>
  <mesh geometry={lampBody()} material={glass} renderOrder={1} castShadow/>
  <mesh position={[0,.011*f,0]}><cylinderGeometry args={[.024,.024,.022*f,24]}/><meshStandardMaterial color="#d9ecf5" transparent opacity={.5} roughness={.1}/></mesh>
  <mesh material={metalChrome} position={[0,.043,0]}><cylinderGeometry args={[.009,.0095,.008,18]}/></mesh>
  <mesh position={[0,.0505,0]}><cylinderGeometry args={[.0022,.0024,.008,10]}/><meshStandardMaterial color={lit?'#3a2a20':'#eae4d3'} roughness={1}/></mesh>
  {lit&&<group ref={flame} position={[0,.054,0]} userData={{noOutline:true,noBatch:true}}>
   <mesh geometry={flameShape()} material={outerFlame()} raycast={()=>undefined}/>
   <mesh geometry={flameShape()} material={innerFlame()} scale={[.55,.28,.55]} raycast={()=>undefined}/>
  </group>}
 </group>;
}
/** Small gas burner for rigs: cast foot, chrome barrel, blue roaring cone when on. */
export function RigBurner({at,lit=false}:{at:P;lit?:boolean}){
 const flame=useRef<Group>(null);
 useFrame(({clock})=>{if(!flame.current)return;const t=clock.elapsedTime;flame.current.scale.set(1+Math.sin(t*31)*.04,1+Math.sin(t*23)*.08,1+Math.cos(t*29)*.04);});
 return <group position={at}>
  <mesh material={metalDark} position={[0,.003,0]} castShadow><cylinderGeometry args={[.016,.02,.006,24]}/></mesh>
  <mesh material={metalChrome} position={[0,.026,0]} castShadow><cylinderGeometry args={[.0042,.0048,.042,14]}/></mesh>
  <mesh material={metalChrome} position={[0,.012,0]}><cylinderGeometry args={[.0062,.0062,.008,14]}/></mesh>
  {lit&&<group ref={flame} position={[0,.047,0]} userData={{noOutline:true,noBatch:true}}>
   <mesh geometry={flameShape()} material={innerFlame()} scale={[.75,.75,.75]} raycast={()=>undefined}/>
   <mesh material={innerFlame()} scale={[.35,.35,.35]} raycast={()=>undefined}><coneGeometry args={[.01,.04,14]}/></mesh>
  </group>}
 </group>;
}
function useReadout(text:string,accent:string){
 const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=256;c.height=96;const x=c.getContext('2d');if(x){x.fillStyle='#0b1a14';x.fillRect(0,0,256,96);x.fillStyle=accent;x.font='bold 58px monospace';x.textAlign='center';x.fillText(text,128,68,240);}return new CanvasTexture(c);},[text,accent]);
 useEffect(()=>()=>texture.dispose(),[texture]);return texture;
}
/** Bench DC supply / meter: sloped case, LCD readout, knob and red/black terminals. */
export function PowerSupply({at,text,on=false}:{at:P;text:string;on?:boolean}){
 const readout=useReadout(text,on?'#7cfc9a':'#3f6b52');
 return <group position={at}>
  <mesh material={plastic('#dfe4e8',.5)} castShadow><boxGeometry args={[.06,.036,.04]}/></mesh>
  <mesh material={plastic('#2b3640',.5)} position={[0,0,.0202]}><boxGeometry args={[.056,.032,.001]}/></mesh>
  <mesh position={[-.008,.005,.0212]}><planeGeometry args={[.032,.012]}/><meshBasicMaterial map={readout} toneMapped={false}/></mesh>
  <mesh material={plastic('#11161b',.4)} position={[.019,.004,.0225]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.005,.0055,.005,16]}/></mesh>
  {[[-.013,'#d22c2c'],[.002,'#1b1d20']].map(([x,c],i)=><mesh key={i} material={plastic(c as string,.35)} position={[x as number,-.01,.0225]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.0028,.0028,.006,12]}/></mesh>)}
 </group>;
}
/** A flexible lead between two points, sagging a little under its own weight. */
export function Lead({from,to,color}:{from:P;to:P;color:string}){
 const g=useMemo(()=>{const a=new Vector3(...from),b=new Vector3(...to),m=a.clone().lerp(b,.5);m.y=Math.max(a.y,b.y)+.02;return new TubeGeometry(new CatmullRomCurve3([a,a.clone().lerp(m,.5).add(new Vector3(0,.012,0)),m,b.clone().lerp(m,.5).add(new Vector3(0,.012,0)),b]),32,.0016,6,false);},[from.join(','),to.join(',')]);
 useEffect(()=>()=>g.dispose(),[g]);
 return <mesh geometry={g} material={plastic(color,.45)}/>;
}
/** Metal strip electrode dipping into a vessel; `clip` adds a crocodile clip (null when the rig animates its own). */
export function Electrode({at,height=.1,color,clip='#d22c2c'}:{at:P;height?:number;color:string;clip?:string|null}){
 const metal=useMemo(()=>new MeshStandardMaterial({color,metalness:.85,roughness:.35}),[color]);
 useEffect(()=>()=>metal.dispose(),[metal]);
 return <group position={at}>
  <mesh material={metal} castShadow><boxGeometry args={[.004,height,.012]}/></mesh>
  {clip&&<group position={[0,height/2+.006,0]}>
   <mesh material={plastic(clip,.45)}><boxGeometry args={[.007,.014,.01]}/></mesh>
   {[-1,1].map(s=><mesh key={s} material={metalChrome} position={[s*.0028,-.008,0]} rotation={[0,0,s*.25]}><boxGeometry args={[.0012,.008,.008]}/></mesh>)}
  </group>}
 </group>;
}
/** Small lamp in a socket: dark when off, glowing filament when current flows. */
export function IndicatorBulb({at,on}:{at:P;on:boolean}){
 return <group position={at}>
  <mesh material={metalBrushed} position={[0,-.012,0]}><cylinderGeometry args={[.007,.008,.012,16]}/></mesh>
  <mesh><sphereGeometry args={[.012,20,16]}/><meshPhysicalMaterial color={on?'#fff3b0':'#e8eef2'} emissive={on?'#ffcc33':'#000000'} emissiveIntensity={on?2.2:0} transparent opacity={on?.95:.45} roughness={.05}/></mesh>
 </group>;
}
