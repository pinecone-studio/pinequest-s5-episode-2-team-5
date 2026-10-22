import { useEffect, useRef } from 'react';
import { useSandbox } from '../nacl/sandbox';
import { useGameStore } from '../../store/useGameStore';
import { useLabStore } from '../../store/useLabStore';
import { storedIn, useInventoryStore } from '../../store/useInventoryStore';
import { registeredHolders, STORAGE_INFO } from '../../interaction/holders';
import { interactables, isVisibleInScene } from '../../interaction/registry';
import { currentSession, demonstratePreparation, itemDescription, matchesSupply, suppliesFor, useWorkbench, type BenchSupply } from './session';

export function supplyLocation(supply: BenchSupply): string {
  const inventory = useInventoryStore.getState();
  for (const holder of registeredHolders()) {
    if (!storedIn(inventory.storage, holder.id).some((item) => matchesSupply(supply, { id: item.id, kind: item.kind, reagent: item.variant?.reagent }))) continue;
    const info = STORAGE_INFO[holder.category];
    return `${info.type === 'drawer' ? 'Шургуулга' : info.type === 'rack' ? 'Тавиур' : 'Шүүгээ'}: ${info.label}`;
  }
  const entry = [...interactables.values()].find((e) => e.enabled && isVisibleInScene(e.object) && matchesSupply(supply, itemDescription(e.id)));
  return entry ? `Тавиур / ширээ: ${entry.label}` : 'Tab → Бодис ба багаж';
}
export function PreparationChecklist() {
  const active = useLabStore((s) => s.active);
  useWorkbench((s) => s.sessions);
  const session = currentSession();
  const warning = useSandbox((s) => s.warning);
  if (!active || session?.ready) return null;
  const required = suppliesFor(active);
  const next = required.find((r) => !session?.found.includes(r.key));
  return <div className="mt-1 text-lab-ink" aria-label="Бэлтгэлийн жагсаалт">
    <b className="text-[11px]">Бэлтгэл · {session?.found.length ?? 0}/{required.length}</b>
    <div className="mt-1 flex gap-3 overflow-x-auto whitespace-nowrap pb-1 text-[10px]">{required.map((s) => <span key={s.key} data-supply={s.key} data-found={session?.found.includes(s.key) ? 'true' : 'false'} className={session?.found.includes(s.key) ? 'text-emerald-700' : 'text-slate-600'}>{session?.found.includes(s.key) ? '✓ ' : '○ '}{s.name}</span>)}</div>
    {next && <p className="text-[11px]">{supplyLocation(next)} → авч, ажлын ширээнд тавь.</p>}
    <p role="status" className="mt-1 text-[10px] text-slate-600">{warning}</p>
    <p className="mt-1 text-[10px] text-slate-500">Tab / цагаан сум: бүх бодис, багаж</p>
    <button className="mt-1 text-[10px] text-slate-500 underline" onClick={demonstratePreparation}>Алгасах (багшийн горим)</button>
  </div>;
}
export const preparationSpots: { x: number; y: number; text: string; visible: boolean }[] = [];
/** Object/holder labels, updated imperatively; no per-frame React writes. */
export function PreparationLabels() {
  const mode = useGameStore((s) => s.mode);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    if (mode !== 'walk' && mode !== 'bench') return;
    let raf = 0;
    const update = () => {
      refs.current.forEach((node, i) => {
        if (!node) return;
        const spot = preparationSpots[i];
        node.style.display = spot?.visible ? 'block' : 'none';
        if (spot) { node.style.transform = `translate(${spot.x}px,${spot.y}px) translate(-50%,-100%)`; node.textContent = spot.text; }
      });
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [mode]);
  if (mode !== 'walk' && mode !== 'bench') return null;
  return <div className="pointer-events-none fixed inset-0 z-[12] overflow-hidden" aria-label="Хэрэгтэй зүйлсийн байршил" aria-hidden>{[0, 1, 2].map((i) => <div key={i} ref={(node) => { refs.current[i] = node; }} className="absolute left-0 top-0 max-w-[160px] rounded bg-white/95 px-2 py-1 text-[10px] text-lab-ink shadow-hud" />)}</div>;
}
