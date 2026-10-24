import type {InvestigationDefinition} from '../../../../src/lib/textbook-investigations';
import {useWorkbench} from '../workbench/session';
import {useGrade9Apparatus} from './store';
import {useChemStore,mixtureOf} from '../../store/useChemStore';
import {useInventoryStore} from '../../store/useInventoryStore';
import {useBenchView} from '../nacl/view';
import {useSandbox} from '../nacl/sandbox';
import {liquidMl,solidMassG} from '../../chemistry/mixture';
import {composition} from '../../chemistry/describe';
import {REAGENTS} from '../../chemistry/reagents';
import {transfer} from '../../interaction/actions';

/** The diagram is a working cutaway: selecting a vessel changes the actual pour destination. */
export function GasTrainGuide({definition}:{definition:InvestigationDefinition}) {
 const session=useWorkbench(s=>s.sessions[definition.id]);
 const id=session?.objects.gasTrain;
 const rig=useGrade9Apparatus(s=>id?s.rigs[id]:undefined);
 const held=useInventoryStore(s=>s.held);
 useChemStore(s=>s.mixtures);
 const lemon=definition.id==='g9-citric-endotherm';
 const button='min-h-11 rounded-lg border border-sky-300 px-3 py-2 text-left text-xs';
 if(!id||!rig)return <p className="mt-2">Багаж, бодисоо бэлтгэсний дараа угсралтын доторх төлөв энд харагдана.</p>;
 const select=(port:number)=>{useGrade9Apparatus.getState().change(id,{port});useChemStore.getState().setMixtures({[id]:rig.chambers[port]});useBenchView.setState({selected:id});useSandbox.setState({inspected:id});};
 const heldMix=held&&held.id!==id?mixtureOf(held.id,held.variant):null;
 const unit=heldMix&&liquidMl(heldMix)<=.005?'г':'мл';
 const names=['① Урвалын сав','② Нэмэх сав','③ Хий хүлээн авах сав'];
 const roles=lemon?['Ус + нимбэгний хүчил. Энд содтой холилдож урвалдана.','Содыг энд бэлтгэнэ. Холих товчоор ① рүү орно.','Эх бодис хийхгүй. ①-ээс гарсан CO₂-ийн нийт хэмжээг уншина.']:['Эх бодисууд энд холилдож урвалдана.','Дараа нэмэх бодисоо энд бэлтгэнэ. Холих товчоор ① рүү орно.','Хий дамжуулах хоолойн төгсгөл. Сорил шаардвал хүлээн авах уусмалаа энд хийнэ.'];
 const all=rig.chambers.slice(0,2),water=all.reduce((s,m)=>s+m.water,0),acid=all.reduce((s,m)=>s+(m.s.citric??0),0),soda=all.reduce((s,m)=>s+(m.s.NaHCO3??0),0);
 const next=!water?'①-ийг сонгоод усны савыг ав. Доорх мл товчоор ус нэм.':!acid?'①-ийг сонгоод нимбэгний хүчлийн савыг ав. Доорх г товчоор хүчил нэм.':!soda?'②-ыг сонгоод содын савыг ав. Доорх г товчоор хэмжиж нэм.':!rig.running?'Эхний температурыг дэвтэрт тэмдэглээд «② → ① Холих» товч дар.':'Хийн хэмжээ ба температурыг ажигла. Эцсийн заалтыг дэвтэрт бүртгэ.';
 return <section className="mt-2 space-y-3 rounded-xl border border-sky-200 bg-white p-3 text-xs" aria-label="Угсралтын дотор юу болж байна">
  <strong className="block text-sm">Угсралтын дотор юу болж байна?</strong>
  <p>Доорх сав дээр дарж цутгах байг сонгоно. Энэ нь ширээн дээрх угсралтын бодит тасалгааг сонгоно.</p>
  <svg viewBox="0 0 320 155" className="w-full rounded bg-slate-50" role="img" aria-label="Хоёрдугаар савнаас эхний сав руу бодис орно. Эхний савнаас гуравдугаар сав руу зөвхөн хий дамжина.">
   <path d="M70 45V16H180V95" fill="none" stroke="#64748b" strokeWidth="3"/><text x="120" y="12" textAnchor="middle" fontSize="10">{lemon?'CO₂ → ③':'Хий → ③'}</text>
   <path d="M250 75L110 75" stroke="#0284c7" strokeWidth="2" strokeDasharray="5 4"/><text x="210" y="60" textAnchor="middle" fontSize="10">② → ① холих</text>
   {[{x:70,y:40,i:0},{x:260,y:80,i:1},{x:180,y:98,i:2}].map(({x,y,i})=><g key={i} onClick={()=>select(i)} role="button" tabIndex={0} aria-label={names[i]} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(i);}}} style={{cursor:'pointer'}}>
    <rect x={x-28} y={y-8} width="56" height="62" rx="5" fill={rig.port===i?'#e0f2fe':'white'} stroke={rig.port===i?'#0284c7':'#94a3b8'} strokeWidth="2"/>
    {liquidMl(rig.chambers[i])>0&&<rect x={x-23} y={y+25} width="46" height="23" fill="#bae6fd"/>}
    {solidMassG(rig.chambers[i])>0&&<path d={`M${x-19} ${y+46}l19-10 19 10z`} fill="#cbd5e1"/>}
    <text x={x} y={y+12} textAnchor="middle" fontSize="16">{i+1}</text>
    {i===0&&rig.running&&rig.gas>0&&[0,1,2].map(j=><circle key={j} cx={x-12+j*12} cy={y+22-j*4} r="3" fill="none" stroke="#0284c7"/>)}
   </g>)}
  </svg>
  <p className="text-[10px] text-slate-500">Байрлал: ① зүүн өндөр сав · ② баруун сав · ③ урд сав. Зүсэлт нь бодит хэмжээний зураг биш.</p>
  {rig.chambers.map((m,i)=>{const c=composition(m);return <button key={i} className={`${button} block w-full ${rig.port===i?'bg-sky-50 border-sky-600':''}`} aria-pressed={rig.port===i} onClick={()=>select(i)}><b>{names[i]}{rig.port===i?' · ЦУТГАХ БАЙ':''}</b><span className="mt-1 block">{roles[i]}</span><span className="mt-1 block font-mono">{liquidMl(m).toFixed(1)} мл · {solidMassG(m).toFixed(2)} г · {m.temp.toFixed(1)}°C</span><span className="block text-slate-500">{[...c.dissolved,...c.solids].map(x=>x.formula).join(', ')||'Хоосон'}</span></button>;})}
  <p className="rounded-lg bg-sky-50 p-2 font-semibold">{lemon?`Дараа нь: ${next}`:'Бодисоо зөв тасалгаанд хэмжиж хий. Дараа нь ② → ① холих товчийг ашигла.'}</p>
  <div className="space-y-2 rounded-lg border p-2"><b>{held&&held.id!==id?`${held.variant?.reagent?REAGENTS[held.variant.reagent].name:held.kind} → ${names[rig.port]}`:'Эх бодисын савыг эхлээд гартаа ав.'}</b>
   {held&&held.id!==id&&<div className="flex flex-wrap gap-2">{[.1,1,5].map(amount=><button key={amount} className={button} onClick={()=>transfer(held,{id,kind:'gasTrain'},amount)}>{amount} {unit} {unit==='г'?'хийх':'цутгах'}</button>)}</div>}
  </div>
  <button className={`${button} w-full bg-sky-700 font-bold text-white`} onClick={()=>{const store=useGrade9Apparatus.getState();store.start(id);const next=useGrade9Apparatus.getState().rigs[id];if(next.running){store.change(id,{port:0});useChemStore.getState().setMixtures({[id]:next.chambers[0]});useBenchView.setState({selected:id});useSandbox.setState({inspected:id});}}}>② → ① Холих · урвалыг ажиглах</button>
  <p role="status">{rig.message}</p>
  <p className="font-mono">{rig.gas.toFixed(1)} мл хий · {rig.temperature.toFixed(1)}°C</p>
  {lemon&&<><p>Номын х.116: содыг 3 хутгуураар нэмнэ. Нэг хутгуур тогтмол грамм биш; энд нэмсэн г-аа тэмдэглэ. Ус, хүчлийн тогтмол хэмжээг ном заагаагүй.</p><details><summary className="min-h-10 cursor-pointer py-2">Урвалын тайлбар</summary><p>Нимбэгний хүчил + сод → натрийн цитрат + ус + CO₂. CO₂ өнгөгүй: хөөс бол хий гарч буй шинж, утаа биш. Урвал дулаан шингээж, температур буурна. ③ дахь заалт нь хуримтлагдсан хийн хэмжээ.</p></details></>}
  <details><summary className="min-h-10 cursor-pointer py-2">Номын аргачлал · х.{definition.bookPages}</summary>{definition.method?.filter(x=>!x.startsWith('OpenLab:')).map((x,i)=><p className="mt-2" key={i}>{x}</p>)}</details>
 </section>;
}
