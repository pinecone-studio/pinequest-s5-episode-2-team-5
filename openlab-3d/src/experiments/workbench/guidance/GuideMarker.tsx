import {useShowcase} from './showcase';
import {Html} from '@react-three/drei';
import {useGuideCue} from './runtime';
/** Anchored to the apparatus itself; no screen-coordinate guessing on phones. */
export function GuideMarker({id}:{id?:string}){
 const cue=useGuideCue();
 const watching=useShowcase(s=>s.status==='playing'||s.status==='paused');
 if(watching||!id||cue.target!==id)return null;
 return <group position={[0,.06,.13]}>
  <Html center zIndexRange={[25,20]} style={{pointerEvents:'none'}}><div className="w-36 rounded-lg border-2 border-sky-400 bg-white/95 p-2 text-center text-[11px] font-bold text-sky-950 shadow-lg" aria-label="Багаж дээрх заагч"><span className="block text-base">↓ {cue.port>=0?`${cue.port+1}-р үүр`:'Энэ багаж'}</span>{cue.label}</div></Html>
  <mesh position={[0,-.035,0]} rotation={[0,0,Math.PI]}><coneGeometry args={[.012,.032,12]}/><meshBasicMaterial color="#0ea5e9" depthTest={false}/></mesh>
 </group>;
}

export function GuideStockMarker({id}:{id?:string}){
 const active=useGuideCue(s=>!!id&&s.source===id);
 const watching=useShowcase(s=>s.status==='playing'||s.status==='paused');
 if(!active||watching)return null;
 return <group position={[0,.23,0]}>
  <Html center zIndexRange={[25,20]} style={{pointerEvents:'none'}}><div className="whitespace-nowrap rounded-lg border border-amber-400 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-950" aria-label="Эх бодисын заагч">Эх бодис ↓</div></Html>
  <mesh position={[0,-.035,0]} rotation={[0,0,Math.PI]}><coneGeometry args={[.009,.025,10]}/><meshBasicMaterial color="#fbbf24" depthTest={false}/></mesh>
 </group>;
}
