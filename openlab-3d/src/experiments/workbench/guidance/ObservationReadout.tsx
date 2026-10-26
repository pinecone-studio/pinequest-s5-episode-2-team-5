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
 if(rig?.kind==='diffusionTube'&&(rig.chambers[2].s.NH4Cl??0)>1e-9)messages.push({color:'#f1eee2',text:'Өнгөгүй хийнүүдийн уулзах хэсэгт цагаан NH₄Cl цагираг тогтов. Энэ нь хатуу бүтээгдэхүүн; хий өөрөө цагаан биш.'});
 if(rig?.kind==='electrolysisCell'&&(rig.data.deposited??0)>1e-10)messages.push({color:(rig.chambers[1].s.Ni??0)>0?'#a8b4ac':'#c8874d',text:'Катодын гадаргуу дээр металл бүрхүүл нэмэгдэж байна. Бүрхүүлийн хэмжээ дамжуулсан цэнэг ба бодисын нөөцөөс хамаарна.'});
 if(rig?.kind==='galvanicCell'&&rig.connected&&(rig.data.cellCurrent??0)>1e-8)messages.push({color:'#c8874d',text:`Ачаалалтай хэлхээ: ${(rig.data.cellCurrent??0).toFixed(3)} A. Zn анод уусч, Cu катод дээр зэс ялгарна. Шар сум нь электронуудын гадаад хэлхээгээр шилжих чиглэлийг заана.`});
 if(rig?.kind==='gasSyringe'&&rig.gas>0)messages.push({color:'#d7e9ef',text:`Тариурт ${rig.gas.toFixed(1)} мл хий байна. Поршен, жийрэг ба бариул хамт хөдөлнө. Өнгөгүй хийг өнгөөр бус поршений шилжилтээр ажигла.`});
 if(rig?.kind==='pressureCell'&&(rig.chambers[0].g?.NO2??0)>0)messages.push({color:'#9f5b2f',text:`Бор өнгө нь NO₂. Эзлэхүүн ${rig.volumeMl.toFixed(1)} мл, даралт ${rig.pressure.toFixed(2)} bar; N₂O₄ нь өнгөгүй.`});
 if(!messages.length)return null;
 return <div className="space-y-1 rounded-lg border border-slate-200 bg-white p-2 text-[11px] leading-snug text-slate-700" aria-label="Харагдаж буй өөрчлөлтийн тайлбар">{messages.map((v,i)=><p key={i} className="flex gap-2"><span className="mt-0.5 h-3 w-3 shrink-0 rounded-full border border-slate-300" style={{background:v.color}} aria-hidden="true"/>{v.text}</p>)}</div>;
}
