import {PistonChamber} from '../grade9/PistonChamber';
import {HotPlate,PowerSupply,Electrode,Furnace,WaterBath,StandThermometer,ColumnPlate,PortTag} from '../grade9/RigParts';
import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type {Mesh} from 'three';
import {chamberView} from '../grade9/chamber-view';
import {actionVisual} from '../../interaction/actions';
import {portLayout} from '../grade9/port-layout';
import {ChamberContents} from '../grade9/ChamberContents';
import {useShowcase} from '../workbench/guidance/showcase';
import {useGuideCue} from '../workbench/guidance/runtime';
import {useMemo,useEffect} from 'react';
import {CanvasTexture,CatmullRomCurve3,TubeGeometry,Vector3} from 'three';
import {useGlass} from '../../materials/glass';
import {liquidMl,gasMl,solidMassG} from '../../chemistry/mixture';
import {CURRICULUM_RIGS,type CurriculumKind} from './kinds';
import type {RigState} from '../grade9/process';
function Block({at,size,color}:{at:[number,number,number];size:[number,number,number];color:string}){return <mesh position={at} castShadow><boxGeometry args={size}/><meshStandardMaterial color={color} roughness={.55}/></mesh>;}
function Label({text,at,size=[.08,.024]}:{text:string;at:[number,number,number];size?:[number,number]}){
 const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');if(x){x.fillStyle='#102f47';x.fillRect(0,0,512,128);x.fillStyle='#e6f8ff';x.textAlign='center';x.font='bold 42px sans-serif';x.fillText(text,256,80,500);}return new CanvasTexture(c);},[text]);
 useEffect(()=>()=>texture.dispose(),[texture]);return <mesh position={at}><planeGeometry args={size}/><meshBasicMaterial map={texture}/></mesh>;
}
function Pipe({points,color='#8ab1c5',motion}:{points:[number,number,number][];color?:string;motion?:{id?:string;operation:string;connected:boolean}}){
 const g=useMemo(()=>new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),24,.0025,8,false),[points.map(p=>p.join(',')).join(';')]);
 const mesh=useRef<Mesh>(null);useFrame(()=>{if(!mesh.current||!motion)return;const state=useShowcase.getState(),active=state.targetId===motion.id&&state.operation===motion.operation&&['playing','paused'].includes(state.status);const f=active?Math.min(1,state.progress/.65):motion.connected?1:0;if(motion.operation==='assemble'){const grow=active?Math.max(0,Math.min(1,(state.progress-.65)/.35)):1;g.setDrawRange(0,Math.floor((g.index?.count??0)*grow/6)*6);}else mesh.current.position.y=.075*(1-f);});
 useEffect(()=>()=>g.dispose(),[g]);return <mesh ref={mesh} geometry={g}><meshStandardMaterial color={color} transparent opacity={.75}/></mesh>;
}
export function CurriculumApparatus({kind,rig,onSelect,itemId}:{kind:CurriculumKind;rig?:RigState;itemId?:string;onSelect:(port:number)=>void}){
 const flow=useShowcase(s=>s.flow),stirring=useShowcase(s=>s.targetId===itemId&&s.operation==='stir'&&s.status==='playing'),cue=useGuideCue();
 const glass=useGlass('#e2eff5'),d=CURRICULUM_RIGS[kind],shape=d.shape;
 const well=(i:number,x:number,z=0,y=.014,radius=.025,height=.1)=>{
  const layout=portLayout(kind,i);x=layout.x;z=layout.z;y=layout.bottom;radius=layout.radius;height=shape==='volumetric'&&i===0?.13:layout.height;
  const m=rig?chamberView(rig,i).mixture:undefined;
  return <group key={i} position={[x,y,z]} onClick={e=>{e.stopPropagation();onSelect(i);}}>
   <mesh material={glass} position={[0,height/2,0]}><cylinderGeometry args={[radius,radius*.94,height,24,1,true]}/></mesh>
   <ChamberContents producedGasMl={kind==='fermenter'&&i===0?rig?.gas:rig?.data[`hydrogen${i}`]} diffusion={kind==='diffusionChamber'&&i===1?rig?.extent:undefined} mixture={m} capacityMl={shape==='polymer'?25:100} radius={radius} height={height} incoming={rig?.port===i&&(cue.target===itemId&&flow||actionVisual.targetId===itemId&&actionVisual.strength>0)} running={rig?.running} mixing={rig?.port===i&&(stirring||actionVisual.kind==='stir'&&actionVisual.targetId===itemId)}/>
   <mesh position={[0,.001,0]}><cylinderGeometry args={[radius*1.1,radius*1.1,.003,18]}/><meshStandardMaterial color={rig?.port===i?'#28b7d6':'#718596'}/></mesh>
   <PortTag text={String(i+1)} at={[0,height*.65,radius+.0012]} active={rig?.port===i}/>
  </group>;
 };
 const heater=<HotPlate at={[0,.023,0]} heating={!!rig?.heating} cooling={!!rig?.cooling}/>;
 const gauge=<Label text={`${(rig?.temperature??22).toFixed(1)}°C`} at={[0,.035,.077]}/>;
 const hasFeed=rig?.chambers.some(m=>solidMassG(m)>0||liquidMl(m)>0||gasMl(m)>0);
 return <group>
  {shape==='balance'||shape==='materials'||shape==='density'||shape==='volumetric'?<>
   <Block at={[0,.024,0]} size={[.19,.035,.12]} color="#c7d3dc"/>
   <Label text={shape==='volumetric'?`${(rig?.results.find(x=>x.label==='Концентрац')?.value??0).toFixed(3)} M`:`${(rig?.results.find(x=>x.label==='Дээжийн масс')?.value??0).toFixed(3)} g`} at={[0,.035,.063]}/>
   {shape==='volumetric'?<>{well(0,0,0,.045,.027,.13)}<mesh material={glass} position={[0,.21,0]}><cylinderGeometry args={[.009,.009,.07,18,1,true]}/></mesh><Block at={[0,.222,.01]} size={[.018,.001,.001]} color="#b33b35"/></>:shape==='density'?<>{well(0,-.045,0,.045,.021,.17)}{well(1,.06,0,.045,.025,.07)}</>:<>{well(0,-.04,0,.045,.033,.045)}{well(1,.065,0,.045,.02,.05)}</>}
   {shape==='materials'&&<><Block at={[-.055,.16,0]} size={[.005,.09,.005]} color="#b53b36"/><Block at={[-.025,.16,0]} size={[.005,.09,.005]} color="#294f9c"/><Block at={[-.04,.2,0]} size={[.035,.008,.015]} color="#adb6c2"/></>}
  </>:shape==='electrolysis'||shape==='galvanic'||shape==='migration'?<>
   {well(0,-.06)}{well(1,.06)}
   {shape==='galvanic'&&well(2,0,.045,.014,.018,.06)}
   {(shape==='galvanic'?[-.06,.06]:[-.07,-.05,.05,.07]).map((x,i)=><Electrode key={i} at={[x,.1,0]} height={.1} color={i%2?'#b97545':'#8d989f'} clip={null}/>)}
   <Pipe points={[[-.06,.15,0],[-.06,.22,0],[.06,.22,0],[.06,.15,0]]} color="#b6453d" motion={{id:itemId,operation:'connect-electric',connected:!!rig?.running}}/>
   {shape==='galvanic'&&<>
    <Pipe points={[[-.06,.075,0],[-.06,.165,0],[-.035,.18,0],[.035,.18,0],[.06,.165,0],[.06,.075,0]]} color={(rig?.chambers[2]&&liquidMl(rig.chambers[2])>0)?'#e3edf2':'#819aaa'} motion={{id:itemId,operation:'connect-electric',connected:!!rig?.running}}/>
    <Pipe points={[[0,.074,.045],[0,.16,.045],[0,.18,0]]} color="#bfd5df"/>
    <Label text="Zn −" at={[-.06,.155,.012]} size={[.03,.014]}/><Label text="Cu +" at={[.06,.155,.012]} size={[.03,.014]}/>
   </>}
   <PowerSupply at={[0,.21,0]} on={!!rig?.running} text={shape==='galvanic'?`${(rig?.data.cellVoltage??0).toFixed(2)} V`:`${rig?.voltage??3} V`}/>
   {shape==='electrolysis'&&<>{(rig?.data.deposited??0)>1e-10&&<Block at={[-.07,.082,.008]} size={[.004+Math.min(.008,(rig?.data.deposited??0)*20),.04,.012]} color={(rig?.chambers[1].s.Ni??0)>0?'#a8b4ac':'#c8874d'}/>}{well(2,.08,.045,.014,.013,.06)}</>}
   {shape==='migration'&&<Pipe points={[[-.06,.10,0],[-.06,.04,0],[.06,.04,0],[.06,.10,0]]} color={(rig?.data.migration??0)>.1?'#d8bb47':'#9cc6d5'}/>}
  </>:shape==='reflux'||shape==='fermenter'||shape==='cracking'||shape==='gaswash'?<>
   {heater}{well(0,-.045,0,.042,.03,.10)}{well(1,.07,.018,.014,.023,.09)}{well(2,.055,-.05,.014,.02,.08)}
   <mesh material={glass} position={[-.045,.19,0]}><cylinderGeometry args={[.012,.012,.10,20,1,true]}/></mesh>
   <Pipe points={[[-.045,.145,0],[-.045,.25,0],[.07,.25,0],[.07,.11,.018]]} motion={{id:itemId,operation:'connect-gas',connected:!!rig?.running}}/>
   {Array.from({length:6},(_,i)=><mesh key={i} position={[-.045,.15+i*.012,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.016,.002,6,16]}/><meshStandardMaterial color="#81b5c9" transparent opacity={.6}/></mesh>)}
   {gauge}
   {shape==='fermenter'&&<Pipe points={[[.055,.1,-.05],[.055,.17,-.05],[.09,.17,-.05],[.09,.08,-.05]]}/>}
  </>:shape==='furnace'||shape==='oven'?<>
   <Furnace at={[0,.09,-.015]} heating={!!rig?.heating}/>
   {well(0,0,.05,.052,.025,.07)}{well(1,-.085,.025,.014,.015,.06)}{well(2,.085,.025,.014,.015,.06)}
   {gauge}
  </>:shape==='bath'||shape==='optical'||shape==='equilibrium'?<>
   <WaterBath at={[0,.035,0]} cooling={!!rig?.cooling} heating={!!rig?.heating}/>
   {well(0,-.05,0,.05,.022,.13)}{well(1,.05,0,.05,.022,.13)}{well(2,.075,-.045,.02,.013,.08)}
   <StandThermometer at={[-.075,.11,.03]} length={.14} temp={rig?.temperature??22}/>{gauge}
   {shape==='optical'&&<><Block at={[-.05,.048,0]} size={[.035,.002,.003]} color="#111827"/><Block at={[-.05,.048,0]} size={[.003,.002,.035]} color="#111827"/></>}
  </>:shape==='column'||shape==='distillation'||shape==='viscometer'?<>
   {well(0,-.025,0,.014,.026,.23)}
   {shape==='distillation'?<>{[1,2,3,4].map((i)=>well(i,.065,(i-2.5)*.04,.014,.014,.06))}{[0,1,2,3,4].map(i=><ColumnPlate key={i} at={[-.025,.05+i*.04,0]} radius={.025}/>)}<Pipe points={[[-.025,.24,0],[.065,.24,0],[.065,.075,0]]}/></>:shape==='viscometer'?<>{hasFeed&&(rig?.chambers[0].s.glassBead??0)>0&&<mesh position={[-.025,.22-Math.min(.1,rig?.data.distance??0)*1.7,0]}><sphereGeometry args={[.005,12,10]}/><meshStandardMaterial color="#a7c0c8" metalness={.5}/></mesh>}<Label text={`${(rig?.data.fallTime??0).toFixed(1)} s`} at={[.067,.08,.032]} size={[.05,.025]}/></>:<>
    {(rig?.data.oil??0)>0&&<mesh position={[-.025,.10+Math.min(.06,(rig?.data.oil??0)/100),0]}><cylinderGeometry args={[.022,.022,Math.min(.08,(rig?.data.oil??0)/200),20]}/><meshStandardMaterial color="#e3c44d" transparent opacity={.75}/></mesh>}
   </>}
  </>:shape==='pressure'?<>
   <group position={[0,.12,0]}><PistonChamber volumeMl={rig?.volumeMl??250} capacityMl={500} length={.16} radius={.033} brownGas={(rig?.chambers[0].g?.NO2??0)>0}/></group>
   <Label text={`${(rig?.pressure??1).toFixed(2)} bar`} at={[0,.05,.06]}/>
   {well(0,-.07,.04,.014,.015,.06)}{well(1,.07,.04,.014,.015,.06)}
  </>:shape==='molecule'?<>
   {Array.from({length:Math.min(6,Math.floor((rig?.chambers[0].s.modelC??0)+1e-9))},(_,i)=><mesh key={i} position={[(i%3-1)*.06,.08+Math.floor(i/3)*.07,0]} onClick={e=>{e.stopPropagation();onSelect(0);}}><sphereGeometry args={[.014,16,12]}/><meshStandardMaterial color="#384859"/></mesh>)}
   {rig?.bonds.map(([a,b],i)=><Pipe key={i} points={[[ (a%3-1)*.06,.08+Math.floor(a/3)*.07,0],[(b%3-1)*.06,.08+Math.floor(b/3)*.07,0]]} color="#94a3b8" motion={{id:itemId,operation:'assemble',connected:true}}/>)}
   {Array.from({length:Math.min(14,Math.floor((rig?.chambers[1].s.modelH??0)+1e-9))},(_,i)=><mesh key={i} position={[-.09+(i%7)*.03,.035,Math.floor(i/7)*.025]}><sphereGeometry args={[.006,10,8]}/><meshStandardMaterial color="#f4f5f7"/></mesh>)}
   <Label text={rig?.data.kitComplete?'C6H14':'C / H'} at={[0,.2,.01]}/>
  </>:shape==='polymer'?<>
   {well(0,-.045,0,.014,.035,.12)}
   {rig&&(rig.chambers[2].s.nylon610??0)>1e-9&&<mesh position={[-.045,.016+Math.min(.1008,liquidMl(rig.chambers[0])/25*.1008),0]}><cylinderGeometry args={[.030,.029,.0007,32]}/><meshStandardMaterial color="#d9d6ca" transparent opacity={.72} roughness={.85}/></mesh>}
   <Block at={[.04,.19,0]} size={[.08,.008,.008]} color="#8299a9"/>
   {(rig?.chambers[3].s.nylon610??0)>0&&<><Pipe points={[[-.045,.016+Math.min(.1008,liquidMl(rig!.chambers[0])/25*.1008),0],[-.025,.14,0],[.04,.19,0]]} color="#f4edd9"/></>}
   {(rig?.chambers[3].s.nylon610??0)>0&&<Block at={[.07,.028,.05]} size={[.035,.01,.025]} color="#eee5d2"/>}
  </>:shape==='diffusion'?<>
   <mesh material={glass} position={[0,.1,0]}><boxGeometry args={[.17,.14,.1]}/></mesh>{well(1,.08,.045,.014,.02,.08)}
   <Block at={[-.07,.1,-.04]} size={[.004,.05,.05]} color="#71899a"/>
   {(rig?.chambers[0].g?.tracer??0)>0&&Array.from({length:24},(_,i)=><mesh key={i} position={[-.065+((i*13)%100)/100*(rig?.data.dispersion??0)*.13,.06+((i*17)%100)/100*.07,((i*29)%100)/100*.06-.03]}><sphereGeometry args={[.002,8,6]}/><meshStandardMaterial color="#a78bfa"/></mesh>)}
  </>:shape==='soil'?<>
   {[0,1,3].map((i,j)=>well(i,(j-1)*.065,-.025,.014,.025,.13))}{well(2,0,.05,.014,.027,.08)}
   <mesh material={glass} position={[0,.14,.05]}><coneGeometry args={[.027,.035,20,1,true]}/></mesh>
   {(rig?.data.height??0)>0&&<><Block at={[-.065,.16,0]} size={[.003,Math.min(.1,(rig?.data.height??0)*.01),.003]} color="#4f9941"/><mesh position={[-.055,.19,0]}><sphereGeometry args={[.012,10,8]}/><meshStandardMaterial color="#69a953"/></mesh></>}
  </>:<>
   {d.ports.map((_,i)=>well(i,(i%3-1)*.06,(Math.floor(i/3)-1)*.052,.014,.018,.09))}
   {shape==='exposure'&&rig?.chambers.map((m,i)=>(m.s.Fe??0)+(m.s.FeOH3??0)>0?<Block key={i} at={[(i%3-1)*.06,.065,(Math.floor(i/3)-1)*.052]} size={[.003,.065,.003]} color={(m.s.FeOH3??0)>0?'#ac582d':'#98a5b1'}/>:null)}
  </>}
  {['balance','materials','density'].includes(shape)&&well(2,0)}
  {shape==='volumetric'&&<>{well(1,0)}{well(2,0)}</>}
  {['column','viscometer'].includes(shape)&&<>{well(1,0)}{well(2,0)}</>}
  {shape==='soil'&&<>{well(4,0)}{well(5,0)}</>}
  {shape==='diffusion'&&well(2,0)}

 </group>;
}
