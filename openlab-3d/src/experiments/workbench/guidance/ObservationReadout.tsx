import {useGuideCue} from './runtime';
import {useChemStore} from '../../../store/useChemStore';
import {useGrade9Apparatus} from '../../grade9/store';
import {chamberView} from '../../grade9/chamber-view';
import {appearanceOf} from '../../../chemistry/appearance';
/** Name what is currently visible, without announcing an expected product before it exists. */
export function ObservationReadout(){
 const id=useGuideCue(s=>s.target),rig=useGrade9Apparatus(s=>id?s.rigs[id]:undefined),stored=useChemStore(s=>id?s.mixtures[id]:undefined);
 const m=rig?chamberView(rig,rig.port).mixture:stored;if(!m)return null;
 const a=appearanceOf(m),messages:{color:string;text:string}[]=[];
 if(a.visiblePrecipitate)messages.push({color:a.precipitateColor??'#eee',text:a.suspension>.25?'Тунадас: шингэнд хөвсөн жижиг бөөгнөрөл, булингар.':'Тунадас: ёроолд сууж, дээд шингэн тунарч байна.'});
 if(a.layered)messages.push({color:a.organicColor,text:'Хоёр шингэн үе: усан үе доор, тосон / органик үе дээр.'});
 if(rig?.kind==='interfacialBath'&&(rig.chambers[2].s.nylon610??0)>1e-9)messages.push({color:'#d9d6ca',text:'Хоёр үеийн заагт найлон хальс үүсэв. Татахад утас болно.'});
 if(rig?.kind==='diffusionCell'&&rig.extent<.98&&a.colored)messages.push({color:'#9b65ac',text:'Өнгөт ууссан бодис эхлээд нэг хэсэгт төвлөрч, аажмаар тархана.'});
 if(!messages.length)return null;
 return <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-[11px] leading-snug text-slate-700" aria-label="Харагдаж буй өөрчлөлтийн тайлбар">{messages.map((v,i)=><p key={i} className="flex gap-2"><span className="mt-0.5 h-3 w-3 shrink-0 rounded-full border border-slate-300" style={{background:v.color}} aria-hidden="true"/>{v.text}</p>)}</div>;
}
