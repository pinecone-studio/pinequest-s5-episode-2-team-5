import { useState } from 'react';
import { REAGENTS, HAZARD_LABELS } from '../../chemistry/reagents';
import { useLabStore } from '../../store/useLabStore';
import { useChemStore } from '../../store/useChemStore';
import { experimentById } from '../../lab/experiments';
import { benchView } from '../nacl/view';
import { useSandbox } from '../nacl/sandbox';
import { ALL_SUPPLIES, collectSupply, currentSession, focusSupply, suppliesFor, supplyAmount, supplySubstance, useWorkbench, type BenchSupply } from './session';
import { sounds } from '../../utils/sounds';
import { enterBench } from '../nacl/bench';
import { useGameStore } from '../../store/useGameStore';
import { supplyLocation } from './PreparationHints';

/** This drawer never touches the shared game's mode or pointer lock. */
export function BenchDrawer() {
  const open = useWorkbench((s) => s.drawer);
  useWorkbench((s) => s.sessions);
  useChemStore((s) => s.mixtures);
  const active = useLabStore((s) => s.active);
  const warning = useSandbox((s) => s.warning);
  const [search, setSearch] = useState('');
  const session = currentSession();
  const preparing = !!active && !session?.ready;
  const required = suppliesFor(active);
  const matches = (s: BenchSupply) => `${s.name} ${s.reagent ? REAGENTS[s.reagent].label : supplySubstance(s)?.formula ?? s.key}`.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  const sections = [
    { title: 'Энэ туршилтад хэрэгтэй', items: required.filter(matches) },
    { title: 'Бусад бодис / багаж', items: ALL_SUPPLIES.filter((s) => !required.some((r) => r.key === s.key)).filter(matches) },
  ];
  const close = () => { useWorkbench.setState({ drawer: false }); (document.activeElement as HTMLElement | null)?.blur(); };
  return <>
    <button type="button" aria-label={open ? 'Багажны шургуулга хаах' : 'Багажны шургуулга нээх'} aria-expanded={open}
      onClick={() => { if (useGameStore.getState().mode === 'walk') enterBench(); useWorkbench.setState({ drawer: !open }); }}
      className="focus-ring fixed right-0 top-1/2 z-[46] h-20 w-9 -translate-y-1/2 rounded-l-full bg-white/95 text-lab-ink shadow-hud">{open ? '›' : '‹'}</button>
    {open && <aside className="fixed inset-y-0 right-9 z-[45] flex w-[min(360px,calc(100vw-48px))] flex-col bg-slate-50 p-3 text-lab-ink shadow-2xl" aria-label="Ширээний багажны шургуулга">
      <header className="flex items-start justify-between gap-2"><div><h2 className="text-sm font-bold">{preparing ? 'Бэлтгэл · Багажаа ол' : 'Бодис ба багаж'}</h2><p className="mt-1 text-xs text-slate-500">{active ? experimentById(active)?.title : 'Туршилт сонгоогүй байна'}</p></div><button aria-label="Ширээний шургуулгыг хаах" onClick={close}>✕</button></header>
      <input type="search" aria-label="Бодис ба багаж хайх" placeholder="Нэр, томьёогоор хайх" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }} className="my-3 w-full rounded-lg border p-2 text-sm" />
      {preparing && <p className="mb-2 text-xs text-slate-600">Тавиур, шургуулгаас хэрэгслээ авчирч ширээнд тавь. Эндээс нэмсэн зүйлийг мөн авч, тавихад ✓ болно.</p>}
      <p role="status" className="mb-2 text-xs text-slate-700">{warning}</p>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
        {sections.map((section) => <section key={section.title} aria-label={section.title}>
          <h3 className="sticky top-0 z-10 bg-white/95 px-1 py-2 text-xs font-bold">{section.title}</h3>
          <div className="space-y-2">{section.items.map((supply) => {
          const found = !!session?.found.includes(supply.key);
          const amount = supplyAmount(supply);
          const reagent = supply.reagent ? REAGENTS[supply.reagent] : null;
          return <button key={supply.key} type="button" className="focus-ring block w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-sky-400" onClick={() => {
            if (!collectSupply(supply)) return;
            const id = focusSupply(supply);
            if (id) { benchView.focus(id); sounds.play('tick', .5); }
          }}>
            <span className="block text-xs font-bold">{found ? '✓ ' : ''}{supply.name}</span>
            {amount && <><span className="mt-1 flex items-center gap-2 text-xs"><i className="h-3 w-3 rounded-full border border-slate-300" style={{ background: amount.color }} />{amount.formula}</span><span className="mt-1 block text-[11px] text-slate-600">Саванд: {amount.current} · Ашигласан: {amount.used}</span><span className="mt-1 block text-[10px] text-slate-600">{reagent ? reagent.hazards.map((h) => HAZARD_LABELS[h].label).join(' · ') || 'Лабораторид амсахгүй' : amount.hazard}</span></>}
            <span className="mt-1 block text-[11px] text-slate-500">{supply.use}</span>
            {preparing && !found && <span className="mt-1 block text-[10px] text-slate-600">{supplyLocation(supply)}</span>}
          </button>;
        })}</div></section>)}
        {!sections.some((s) => s.items.length) && <p className="p-3 text-xs text-slate-500">Тохирох багаж олдсонгүй.</p>}
      </div>
      <button className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold" onClick={close}>Tab / Esc · Хаах</button>
    </aside>}
  </>;
}
