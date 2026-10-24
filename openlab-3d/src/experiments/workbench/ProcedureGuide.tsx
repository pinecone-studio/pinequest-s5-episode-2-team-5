import {GasTrainGuide} from '../grade9/GasTrainGuide';
import {useState} from 'react';
import type {InvestigationDefinition} from '../../../../src/lib/textbook-investigations';
import {useWorkbench} from './session';
import {useGrade9Apparatus} from '../grade9/store';
import {useMeasurements} from '../../lab/measurements';
import {useInquiry} from './inquiry-store';
import {rigReadings} from '../grade9/process';

/** A walkthrough records learner confirmations, never awards chemical completion. */
export function ProcedureGuide({definition}:{definition:InvestigationDefinition}) {
 const session=useWorkbench(s=>s.sessions[definition.id]);
 if(definition.labRig==='gasTrain')return <GasTrainGuide definition={definition}/>;
 // Remount the walkthrough when repeat/re-preparation replaces the session objects.
 return <Walkthrough key={`${definition.id}:${Object.values(session?.objects??{}).join(',')}`} definition={definition} ready={!!session?.ready}/>;
}
function Walkthrough({definition,ready}:{definition:InvestigationDefinition;ready:boolean}) {
 const methods=definition.method?.filter(text=>!text.startsWith('OpenLab:'))??[];
 const steps=['Багаж, бодисоо ширээнд бэлтгэ. Гол багажийг сонгоод хэрэгтэй тасалгааг сонго. Савны нэр, уусмалын концентрацийг шошгоос шалга.',...methods,'Судалгааны дэвтрээ нээж, багажийн заалтыг бүртгэ. Ажиглалтаа бичиж, өөрчилсөн нэг нөхцөлтэй дахин харьцуул.'];
 const [index,setIndex]=useState(0),[confirmed,setConfirmed]=useState<number[]>([]);
 const rigs=useGrade9Apparatus(s=>s.rigs);
 const rig=Object.values(rigs).find(r=>r.experiment===definition.id);
 const trials=useInquiry(s=>s.attempts[definition.id]?.trials);
 const transfers=useMeasurements(s=>s.transfers);
 const text=steps[index];
 const mode=index===0?'prepare':index===steps.length-1?'record':/хала|хайла|халуун|температур|хөрг/i.test(text)?'heat':/нэм|хий|ус ав|цутга|дусал|уусга|бэлтгэ/i.test(text)?'transfer':'observe';
 const help=mode==='prepare'?'Бэлтгэх товчоор хэрэгслээ гарга. Гол багаж дээр дарж сонго; олон тасалгаатай бол бодис хүлээн авах тасалгааг сонго.':mode==='transfer'?'Эх бодисоо ав → хүлээн авах савыг сонго → цутгах / халбагаар хийх үйлдлийг ашигла. Доорх бүртгэлээс бодисын нэр, нэмсэн г эсвэл мл-ийг заавартай харьцуул.':mode==='heat'?'Багажийг сонгоод халаалт / хөргөх удирдлагыг ашигла. Шаардлагатай бол «Багажийг ажиллуулах» дар. Эхний ба дараах температур, хугацааг тэмдэглэ.':mode==='record'?'«Судалгааны дэвтэр» → «Багажийн заалтыг бүртгэх». Өнгө, хий, тунадас, температурын өөрчлөлтөөс өөрийн ажиглалтыг бич.':'Шинэ бодис нэмэхээс өмнө зааврын нөхцөлийг шалга. Өнгө, тархалт, хий, тунадас эсвэл багажийн заалт хэрхэн өөрчлөгдөж байгааг харьцуул.';
 const isConfirmed=confirmed.includes(index);
 return <section className="mt-2 space-y-2 rounded-xl border border-sky-200 bg-white p-3 text-xs" aria-label="Туршилтын алхамчилсан заавар">
  <div className="flex items-center justify-between gap-2"><strong>Одоо хийх алхам · {index+1}/{steps.length}</strong><span className="text-slate-500">Хими {definition.grade===9?'IX':'VIII'} · х.{definition.bookPages}</span></div>
  <div className="flex gap-1" aria-label="Алхмын явц">{steps.map((_,i)=><button key={i} onClick={()=>setIndex(i)} aria-label={`${i+1}-р алхам${confirmed.includes(i)?' · өөрөө баталсан':''}`} aria-current={i===index?'step':undefined} className={`min-h-9 min-w-8 flex-1 rounded border font-bold ${i===index?'border-sky-600 bg-sky-100 text-sky-900':confirmed.includes(i)?'border-teal-200 bg-teal-50':'border-slate-200'}`}>{confirmed.includes(i)?'✓':i+1}</button>)}</div>
  <p className="text-sm font-semibold leading-relaxed">{text}</p>
  <details><summary className="min-h-9 cursor-pointer py-2 text-sky-800">Яаж хийх вэ?</summary><p className="leading-relaxed text-slate-600">{help}</p></details>
  <div className="space-y-1 rounded-lg bg-slate-50 p-2" aria-label="Одоогийн бодит төлөв">
   <b>Одоогийн төлөв</b><p>{ready?'✓ Багаж, бодис бэлтгэгдсэн.':'Багаж, бодисоо эхлээд бэлтгэнэ үү.'}</p>
   <p>Нэмэлт: {transfers.length} бүртгэл · Дэвтэр: {trials?.filter(t=>t.source==='bench').length??0} хэмжилт</p>
   {rig&&<><p>{rig.message}</p><div className="flex flex-wrap gap-x-3">{rigReadings(rig).slice(0,3).map((r,i)=><span key={i}>{r.label}: <strong>{r.value.toFixed(1)} {r.unit}</strong></span>)}</div></>}
  </div>
  <p className="text-[11px] text-slate-500">✓ нь таны баталсан алхам. Зөв тун, үр дүнг автоматаар баталсан үнэлгээ биш; зааврыг бодит хэмжилттэй харьцуул.</p>
  <div className="flex gap-2"><button disabled={index===0} onClick={()=>setIndex(i=>i-1)} className="min-h-11 rounded-lg border px-3 disabled:opacity-40">Өмнөх</button><button disabled={index===0&&!ready} onClick={()=>{setConfirmed(v=>v.includes(index)?v:[...v,index]);if(index<steps.length-1)setIndex(i=>i+1);}} className="min-h-11 flex-1 rounded-lg bg-sky-700 px-3 font-semibold text-white disabled:opacity-40">{index===steps.length-1?(isConfirmed?'Өөрөө шалгасан ✓':'Ажиглалтаа бүртгэсэн'):'Хийж, шалгасан → Дараах алхам'}</button></div>
  <details><summary className="min-h-9 cursor-pointer py-2 text-sky-800">Бүх алхмыг харах</summary><ol className="list-decimal space-y-2 pl-5">{steps.map((s,i)=><li key={i}><button className="text-left leading-relaxed" onClick={()=>setIndex(i)}>{s}</button></li>)}</ol></details>
 </section>;
}
