/**
 * «Бэлтгэлээ хийе»: лаб ширээн дээрх хэрэгслийг өөрөө хянаж чадахгүй туршилтад (лабын заавар олдоогүй,
 * эсвэл хэрэгслийн жагсаалтгүй) сурах бичгийн бодис, хэрэгслийн жагсаалтыг харуулна.
 * Сурагч бэлдсэнээ тэмдэглээд «Бэлэн боллоо» дарахад карт «Туршилт» болж алхмаа харуулна.
 * Харагдах байдал нь лабын өөрийн бэлтгэл (PreparationChecklist)-тэй адил.
 */
import { useLaunchedProcedure } from './launchedProcedure';

export function TextbookPreparation() {
  const prep = useLaunchedProcedure((s) => s.prep);
  const checked = useLaunchedProcedure((s) => s.checked);
  const toggleChecked = useLaunchedProcedure((s) => s.toggleChecked);
  const finishPrep = useLaunchedProcedure((s) => s.finishPrep);
  if (!prep) return null;
  const groups = [
    { label: 'Хэрэгсэл', items: prep.equipment.map((name) => ({ key: `e:${name}`, name })) },
    { label: 'Бодис', items: prep.substances.map((name) => ({ key: `s:${name}`, name })) },
  ].filter((group) => group.items.length > 0);
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const ready = groups.reduce((sum, group) => sum + group.items.filter((item) => checked.includes(item.key)).length, 0);
  const all = ready === total;
  return <section className="mt-2 overflow-hidden rounded-xl border-2 border-indigo-300 bg-white text-lab-ink shadow-md" aria-label="Туршилтын бэлтгэл">
    <header className="bg-indigo-800 px-3 py-2.5 text-white">
      <div className="flex items-center justify-between gap-2">
        <b className="text-sm">Бэлтгэлээ хийе</b>
        <span className="rounded-full bg-white/20 px-2 py-1 text-xs font-bold">{ready}/{total} бэлэн</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-indigo-950/50">
        <div className="h-full rounded-full bg-lime-300 transition-all" style={{ width: `${total ? ready / total * 100 : 100}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-indigo-100">Хэрэгсэл, бодисоо бэлдээд тэмдэглэ → бүгд бэлэн болмогц туршилт эхэлнэ.</p>
    </header>
    <div className="space-y-2.5 p-3">
      {groups.length === 0 && <p className="rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-700">Энэ туршилтад тусгай хэрэгсэл, бодис заагаагүй байна.</p>}
      {groups.map((group) => (
        <div key={group.label}>
          <div className="text-[10px] font-black uppercase tracking-wide text-amber-900">{group.label}</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {group.items.map((item) => {
              const on = checked.includes(item.key);
              return <button key={item.key} type="button" aria-pressed={on} onClick={() => toggleChecked(item.key)} className={`focus-ring rounded-full border px-2 py-1 text-left text-[10px] font-semibold ${on ? 'border-emerald-500 bg-emerald-100 text-emerald-900' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>
                {on ? '✓' : '○'} {item.name}
              </button>;
            })}
          </div>
        </div>
      ))}
      {prep.safety && <p className="rounded-md bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-950">⚠ {prep.safety}</p>}
      <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
        <button type="button" className="min-h-8 rounded-lg border border-indigo-700 px-2.5 text-[10px] font-bold text-indigo-800 hover:bg-indigo-50" onClick={finishPrep}>Багш: бэлтгэл алгасах</button>
        <button type="button" disabled={!all} className="focus-ring min-h-8 rounded-lg bg-indigo-700 px-3 text-[11px] font-bold text-white disabled:bg-slate-300 disabled:text-slate-500" onClick={finishPrep}>Бэлэн боллоо</button>
      </div>
    </div>
  </section>;
}
