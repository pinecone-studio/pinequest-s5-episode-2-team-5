import {ProcedureGuide} from './ProcedureGuide';
import {investigationById} from '../../../../src/lib/textbook-investigations';
import { ELEPHANT_AMOUNTS, amountFeedback } from '../../lab/quantity-guidance';
import { REAGENTS } from '../../chemistry/reagents';
import { currentSession } from './session';
import { useMeasurements } from '../../lab/measurements';
import { describe } from '../nacl/sandbox';

/** Use only quantities already supplied by the lesson; outcomes remain student decisions. */
const PLANS: Record<string, string> = {

  titration: 'HCl (1 М): 20 мл. Фенолфталеин: 2–3 дусал. NaOH-ийг бага багаар нэмж, зарцуулсан эзэлхүүнийг тэмдэглэ. Шаардлагатай хэмжээг эхлээд өөрөө тооцоолж үз.',
  nacl: 'Номын х.22: хүчил шилэн аяганы ⅓-ээс ихгүй. Аппын 150 мл аяганд энэ нь 50 мл-ээс ихгүй; одоогийн дадлага 50 мл хэмжихээр тохируулсан. Карбонатыг бага багаар, хутгалттай нэмээд цааш уусахгүй болохыг ажигла.',
  thermo: 'Тусдаа сав бүрт ойролцоогоор 10 мл ус. NH₄NO₃: 2–3 халбага; NaOH: 1–2 халбага. Нэмэх бүрдээ хутгаж, температурыг хэмж.',
  fire: 'Этанол: 5–10 мл. Савны эзэлхүүн болон туршилтын аюулгүй ажиллагааг шалга.',
};
export function MeasurementGuide({ experiment, target, step }: { experiment: string; target: string | null; step?: string }) {
  const transfers = useMeasurements((s) => s.transfers);
  const definition=investigationById(experiment);
  const session = currentSession();
  const cylinder = session?.objects.graduatedCylinder;
  const measuredTarget = target && transfers.some((r) => r.target === target) ? target : transfers[transfers.length - 1]?.target;
  const rows = transfers.filter((r) => r.target === measuredTarget);
  return <section className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px]" aria-label="Хэмжилтийн тэмдэглэл">
    <p className="font-bold">Хэмжиж нэм · 1 мл = 1 см³</p>
    {experiment === 'elephant' ? <div className="mt-1 space-y-1" aria-label="Тунгийн төлөвлөгөө">
      <p className="text-slate-500">Хими VIII · х.102 · Катализаторын туршилт</p>
      {ELEPHANT_AMOUNTS.map((dose) => {
        const source = session?.objects[`reagent-${dose.reagent}`];
        const added = transfers.filter((r) => (r.source === source || r.label === REAGENTS[dose.reagent].name)
          && (!cylinder || r.target === cylinder)).reduce((sum,r) => sum + r.ml, 0);
        return <div key={dose.reagent} className={`rounded border p-2 ${step === dose.step ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'}`}>
          <p>{dose.label} → цилиндр</p>
          <p className="text-sm font-bold">Нэмэх: {dose.target} <span className="font-normal">· Нэмсэн: <output className="font-mono">{added.toFixed(1)} мл</output></span></p>
          {dose.min !== null && dose.max !== null && <p>{amountFeedback(added,dose.min,dose.max)}</p>}
          <details className="mt-1"><summary className="cursor-pointer text-sky-800">Хэмжээний тайлбар</summary><p>{dose.note}</p></details>
        </div>;
      })}
    </div> : definition?.method?.length?<ProcedureGuide definition={definition}/>: PLANS[experiment] ? <><p className="mt-1">{PLANS[experiment]}</p>{experiment !== 'nacl' && <p className="text-slate-500">Аппын нэмэлт хувилбар · энэ номын шууд тун биш.</p>}</> : <p className="mt-1">Энэ зааварт тогтмол тун заагаагүй. Бага хэмжээгээр эхэлж, нэмсэн хэмжээ болон ажиглалтаа харьцуул.</p>}
    {rows.length > 0 ? <div className="mt-1" role="status" aria-live="polite">
      <p className="font-semibold">{describe(measuredTarget!).label} · Нийт нэмсэн хэмжээ</p>
      {rows.map((r) => <p key={`${r.source}:${r.unit}`}>{r.label}: <strong className="font-mono tabular-nums">{r.ml.toFixed(1)} {r.unit==='g'?'г':'мл'}</strong></p>)}
      <p className="mt-1 text-slate-500">Энэ нь юүлж нэмсэн хэмжээ; саванд одоо үлдсэн эзэлхүүнээс ялгаатай байж болно.</p>
    </div> : <p className="mt-1 text-slate-500">Юүлж эхлэхэд нэмсэн хэмжээ энд бүртгэгдэнэ.</p>}
    <details className="mt-1"><summary className="cursor-pointer text-sky-800">Нарийвчлалын санамж</summary><p className="mt-1">Савны 0.1 мл / 1 мл / 5 мл товчийг ашигла. Тэмдэглэгээнд ойртох үед 1 мл-ээр нэм; менискийн доод ирмэгийг нүдний түвшинд унш. Хэмжээ хэтэрсэн ч үйлдлийг түгжихгүй — үр дүнд хэрхэн нөлөөлснийг ажигла.</p></details>
  </section>;
}
