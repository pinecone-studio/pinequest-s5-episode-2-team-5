import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {AdditiveBlending,CanvasTexture,CatmullRomCurve3,Color,LatheGeometry,MeshBasicMaterial,MeshStandardMaterial,SRGBColorSpace,TubeGeometry,Vector2,Vector3,type Group} from 'three';
import {LAB_GLASS,useGlass} from '../../materials/glass';
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
 const glass=useGlass(LAB_GLASS),flame=useRef<Group>(null);
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
/** Muffle furnace: insulated steel case with a ceramic chamber whose walls glow when hot. */
export function Furnace({at,heating=false}:{at:P;heating?:boolean}){
 const chamber=useMemo(()=>new MeshStandardMaterial({color:'#3a2f2a',roughness:.95}),[]);
 useEffect(()=>()=>chamber.dispose(),[chamber]);
 const glow=useRef(0);
 useFrame((_,dt)=>{glow.current+=((heating?1:0)-glow.current)*(1-Math.exp(-Math.min(dt,.1)*(heating?.5:.3)));chamber.emissive.set('#ff5a14').multiplyScalar(glow.current*1.4);});
 return <group position={at}>
  <mesh material={plastic('#d9dde1',.45)} castShadow receiveShadow><boxGeometry args={[.17,.16,.11]}/></mesh>
  <mesh material={plastic('#2a3138',.5)} position={[0,-.068,.0552]}><boxGeometry args={[.17,.024,.001]}/></mesh>
  {/* Firebrick throat and glowing chamber. */}
  <mesh material={plastic('#e9e0cf',.95)} position={[0,.012,.054]}><boxGeometry args={[.11,.09,.004]}/></mesh>
  <mesh material={chamber} position={[0,.012,.0565]}><boxGeometry args={[.084,.066,.002]}/></mesh>
  {/* Swing door, hinged open on the left. */}
  <group position={[-.058,.012,.058]} rotation={[0,-1.9,0]}>
   <mesh material={plastic('#cfd4d9',.45)} position={[.058,0,.008]} castShadow><boxGeometry args={[.116,.096,.016]}/></mesh>
   <mesh material={plastic('#1f262c',.5)} position={[.1,0,.019]}><boxGeometry args={[.008,.03,.008]}/></mesh>
  </group>
  {[-.05,-.03,-.01].map(x=><mesh key={x} material={plastic('#9aa3ab',.6)} position={[x,.07,.0552]}><boxGeometry args={[.012,.004,.001]}/></mesh>)}
  <mesh position={[.065,-.068,.0565]}><circleGeometry args={[.003,14]}/><meshBasicMaterial color={heating?'#ff4b2b':'#3b4650'} toneMapped={false}/></mesh>
 </group>;
}
/** Thermostatic water bath: stainless tank, water with a lid of glints, front control strip. */
export function WaterBath({at,size=[.18,.055,.12],cooling=false,heating=false}:{at:P;size?:P;cooling?:boolean;heating?:boolean}){
 const [w,h,d]=size,wall=.004;
 return <group position={[at[0],at[1]-h/2,at[2]]}>
  <mesh material={metalBrushed} position={[0,.002,0]}><boxGeometry args={[w,.004,d]}/></mesh>
  {[[0,d/2-wall/2,w,wall],[0,-d/2+wall/2,w,wall]].map(([x,z,sx,sz],i)=><mesh key={i} material={metalBrushed} position={[x,h/2,z]} castShadow><boxGeometry args={[sx,h,sz]}/></mesh>)}
  {[w/2-wall/2,-w/2+wall/2].map((x,i)=><mesh key={i} material={metalBrushed} position={[x,h/2,0]} castShadow><boxGeometry args={[wall,h,d]}/></mesh>)}
  <mesh position={[0,h*.42,0]}><boxGeometry args={[w-wall*2,h*.8,d-wall*2]}/><meshPhysicalMaterial color={cooling?'#cfeaf6':'#bfe0ee'} roughness={.05} transparent opacity={.45} depthWrite={false}/></mesh>
  {cooling&&[[-.06,-.03],[.0,.035],[.065,-.02],[-.02,.02]].map(([x,z],i)=><mesh key={i} position={[x,h*.8,z]} rotation={[.3*i,.7*i,.2]}><boxGeometry args={[.016,.012,.016]}/><meshPhysicalMaterial color="#f2fbff" roughness={.15} transparent opacity={.85}/></mesh>)}
  <mesh material={plastic('#2a3138',.5)} position={[0,h*.5,d/2+.0012]}><boxGeometry args={[w*.6,h*.55,.002]}/></mesh>
  <mesh position={[w*.22,h*.5,d/2+.0026]}><circleGeometry args={[.0025,14]}/><meshBasicMaterial color={heating?'#ff4b2b':cooling?'#38bdf8':'#3b4650'} toneMapped={false}/></mesh>
 </group>;
}
/** A vertical glass thermometer with a red spirit column, reading `temp` (−10…110 °C). */
export function StandThermometer({at,length=.12,temp=22}:{at:P;length?:number;temp?:number}){
 const glass=useGlass(LAB_GLASS);
 const f=Math.max(0,Math.min(1,(temp+10)/120)),col=(length-.012)*f;
 return <group position={at}>
  <mesh material={glass} renderOrder={1}><cylinderGeometry args={[.0028,.0028,length,12]}/></mesh>
  <mesh position={[0,-length/2+.004,0]}><sphereGeometry args={[.0034,12,10]}/><meshStandardMaterial color="#d61f1f" emissive="#5a0000" emissiveIntensity={.4}/></mesh>
  <mesh position={[0,-length/2+.006+col/2,0]}><cylinderGeometry args={[.0008,.0008,Math.max(.0005,col),6]}/><meshStandardMaterial color="#d61f1f" emissive="#5a0000" emissiveIntensity={.4}/></mesh>
 </group>;
}
/** Glass column plate: a perforated sieve disc fused across the column. */
export function ColumnPlate({at,radius}:{at:P;radius:number}){
 const glass=useGlass(LAB_GLASS);
 return <group position={at}>
  <mesh material={glass} rotation={[Math.PI/2,0,0]} renderOrder={1}><torusGeometry args={[radius*.97,.0016,8,28]}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[radius*.18,radius*.96,28]}/><meshPhysicalMaterial color="#cfe3ea" roughness={.2} transparent opacity={.35} depthWrite={false} side={2}/></mesh>
 </group>;
}
const paperTexture=lazy(()=>{const c=document.createElement('canvas');c.width=64;c.height=256;const x=c.getContext('2d');if(x){x.fillStyle='#fbf8ef';x.fillRect(0,0,64,256);let s=5;const r=()=>((s=(s*16807)%2147483647)/2147483647);for(let i=0;i<500;i++){x.fillStyle=`rgba(200,190,170,${.05+r()*.08})`;x.fillRect(r()*64,r()*256,1+r()*2,1);}x.strokeStyle='rgba(90,100,110,.6)';x.lineWidth=1;x.beginPath();x.moveTo(6,232);x.lineTo(58,232);x.stroke();}const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;});
/** Chromatography strip hung from a clip on a rod: wetted below the solvent front, dye spots smeared upward. */
export function ChromaPaper({at,height=.2,width=.03,front,spots}:{at:P;height?:number;width?:number;front:number;spots:{y:number;color:string;spread:number}[]}){
 const paper=useMemo(()=>new MeshStandardMaterial({map:paperTexture(),roughness:.95,side:2}),[]);
 useEffect(()=>()=>paper.dispose(),[paper]);
 const bottom=-height/2;
 return <group position={at}>
  <mesh material={paper}><planeGeometry args={[width,height]}/></mesh>
  {front>0&&<mesh position={[0,bottom+front/2,.0004]}><planeGeometry args={[width,front]}/><meshStandardMaterial color="#d7e6ea" transparent opacity={.35} depthWrite={false}/></mesh>}
  {spots.map((s,i)=><mesh key={i} position={[0,bottom+s.y,.0007]} scale={[1,1+s.spread*1.8,1]}><circleGeometry args={[.0042,20]}/><meshStandardMaterial color={s.color} transparent opacity={.85} depthWrite={false}/></mesh>)}
  <mesh material={metalChrome} position={[0,height/2+.003,.001]}><boxGeometry args={[.012,.008,.004]}/></mesh>
 </group>;
}
const tagCache=new Map<string,CanvasTexture>();
function tagTexture(text:string,active:boolean){const k=`${text}|${active}`;let t=tagCache.get(k);if(!t){const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');if(x){x.fillStyle=active?'#0ea5c6':'#ffffff';x.beginPath();x.arc(48,48,44,0,Math.PI*2);x.fill();x.lineWidth=5;x.strokeStyle=active?'#ffffff':'#1e3a4f';x.stroke();x.fillStyle=active?'#ffffff':'#1e3a4f';x.font='bold 56px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,48,52);}t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;tagCache.set(k,t);}return t;}
/** Small round printed port tag stuck on the glass; the selected port is highlighted. */
export function PortTag({text,at,active=false,size=.011}:{text:string;at:P;active?:boolean;size?:number}){
 return <mesh position={at}><circleGeometry args={[size/2,24]}/><meshBasicMaterial map={tagTexture(text,active)} transparent alphaTest={.1} toneMapped={false}/></mesh>;
}
/** Compressor / chiller unit: cased box with a fan grille; frost-blue light while cooling. */
export function Chiller({at,size=[.07,.08,.07],cooling=false}:{at:P;size?:P;cooling?:boolean}){
 const fan=useRef<Group>(null);
 useFrame((_,dt)=>{if(fan.current&&cooling)fan.current.rotation.z+=Math.min(dt,.1)*18;});
 const [w,h,d]=size;
 return <group position={at}>
  <mesh material={plastic('#dfe4e8',.5)} castShadow><boxGeometry args={[w,h,d]}/></mesh>
  <group position={[0,h*.08,d/2+.001]}>
   {[.024,.017,.01].map(r=><mesh key={r} material={metalDark}><torusGeometry args={[r,.0011,6,28]}/></mesh>)}
   <group ref={fan}>{[0,1,2,3].map(i=><mesh key={i} material={plastic('#4b5560',.5)} rotation={[0,0,i*Math.PI/2]} position={[0,0,-.002]}><boxGeometry args={[.004,.04,.001]}/></mesh>)}</group>
  </group>
  <mesh position={[w*.32,-h*.38,d/2+.0012]}><circleGeometry args={[.0028,14]}/><meshBasicMaterial color={cooling?'#38bdf8':'#3b4650'} toneMapped={false}/></mesh>
 </group>;
}
/** Dewar flask: silvered double-walled vessel for liquefied gas. */
export function Dewar({at,height=.07,radius=.025}:{at:P;height?:number;radius?:number}){
 return <group position={at}>
  <mesh material={metalChrome} position={[0,height/2,0]} castShadow><cylinderGeometry args={[radius,radius*.96,height,28,1,true]}/></mesh>
  <mesh material={metalChrome} position={[0,height/2,0]}><cylinderGeometry args={[radius*.86,radius*.86,height*.98,28,1,true]}/></mesh>
  <mesh material={metalDark} position={[0,height,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[radius*.93,radius*.08,8,28]}/></mesh>
  <mesh material={metalDark} position={[0,.002,0]}><cylinderGeometry args={[radius,radius,.004,28]}/></mesh>
 </group>;
}
