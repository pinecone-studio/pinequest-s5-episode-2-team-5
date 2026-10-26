import {useChemStore} from '../../../store/useChemStore';
import {portLabel,apparatusPurpose,apparatusParts} from '../../grade9/port-layout';
import {useGrade9Apparatus} from '../../grade9/store';
import type {RigState} from '../../grade9/process';
import {RIG_NAMES} from '../../grade9/kinds';
/** Touch-sized legend connects the numbered 3D parts to their purpose. */
export function ApparatusKey({rig,id}:{rig?:RigState;id?:string}){
 if(!rig||!id)return null;
 return <details className="rounded-xl border border-slate-200 bg-slate-50 text-[11px]" aria-label="Багажийн хэсгүүдийн тайлбар"><summary className="min-h-11 cursor-pointer px-3 py-2 font-semibold text-slate-700">Багажийн хэсгүүд · {rig.port+1}. {portLabel(rig.kind,rig.port)}</summary>
  <p className="px-3 text-slate-500">{RIG_NAMES[rig.kind]} · Дугаар нь 3D загвар дээрх хэсэгтэй таарна.</p>
  <p className="px-3 pt-2 leading-relaxed text-slate-700">{apparatusPurpose(rig.kind)}</p>
  <div className="grid grid-cols-2 gap-1 p-2">{rig.chambers.map((_,i)=><button key={i} className={`min-h-11 rounded-lg border px-2 py-1 text-left ${rig.port===i?'border-sky-400 bg-sky-50 text-sky-900':'border-slate-200 bg-white text-slate-600'}`} aria-pressed={rig.port===i} onClick={()=>{useGrade9Apparatus.getState().change(id,{port:i});useChemStore.getState().setMixtures({[id]:rig.chambers[i]});}}><b className="mr-1">{i+1}.</b>{portLabel(rig.kind,i)}</button>)}</div>
  <dl className="space-y-2 border-t border-slate-200 p-3 text-xs leading-relaxed">{apparatusParts(rig.kind).map(([name,description])=><div key={name}><dt className="font-semibold text-slate-800">{name}</dt><dd className="text-slate-600">{description}</dd></div>)}</dl>
 </details>;
}
