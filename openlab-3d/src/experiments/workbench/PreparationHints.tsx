import { useEffect, useRef } from 'react';
import { Box3, Vector3, type Object3D } from 'three';
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
    const object = interactables.get(holder.id)?.object;
    const location = object ? roomSide(object) : 'Лабораторийн тавилга';
    return `${location} · ${info.type === 'drawer' ? 'шургуулга' : info.type === 'rack' ? 'тавцан' : 'шүүгээ'} «${info.label}»`;
  }
  const entry = [...interactables.values()].find((e) => e.enabled && isVisibleInScene(e.object) && matchesSupply(supply, itemDescription(e.id)));
  return entry ? `${roomSide(entry.object)} · ${entry.label}` : 'Tab → «Багаж» эсвэл «Бодис» хэсгээс ширээнд гарга';
}

function roomSide(object: Object3D): string {
  object.updateWorldMatrix(true, false);
  const point = new Box3().setFromObject(object).getCenter(new Vector3());
  if (point.z < -11) return 'Хойд хананд';
  if (point.x > 6) return 'Зүүн хананд';
  if (point.z > -6.5) return 'Өмнөд хананд';
  if (point.x < 0) return 'Баруун хананд';
  return 'Төвийн арлын ойролцоо';
}

export function PreparationChecklist() {
  const active = useLabStore((s) => s.active);
  useWorkbench((s) => s.sessions);
  const session = currentSession();
  const warning = useSandbox((s) => s.warning);
  if (!active || session?.ready) return null;
  const required = suppliesFor(active);
  const next = required.find((r) => !session?.found.includes(r.key));
  const unplaced = required.find((r) => !session?.placed.includes(r.key));
  const foundCount = session?.found.length ?? 0;
  const placedCount = session?.placed.length ?? 0;
  const target = next ?? unplaced;
  return <section className="mt-2 overflow-hidden rounded-xl border-2 border-indigo-300 bg-white text-lab-ink shadow-md" aria-label="Туршилтын бэлтгэл">
    <header className="bg-indigo-800 px-3 py-2.5 text-white">
      <div className="flex items-center justify-between gap-2">
        <b className="text-sm">Бэлтгэлээ хийе</b>
        <span className="rounded-full bg-white/20 px-2 py-1 text-xs font-bold">{placedCount}/{required.length} ширээн дээр</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-indigo-950/50">
        <div className="h-full rounded-full bg-lime-300 transition-all" style={{ width: `${required.length ? placedCount / required.length * 100 : 0}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-indigo-100">Хэрэгслийг ол → ажлын ширээнд тавь → бүгд бэлэн болмогц туршилт эхэлнэ.</p>
    </header>
    <div className="space-y-2.5 p-3">
      {target ? <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-2.5">
        <div className="text-[10px] font-black uppercase tracking-wide text-amber-900">{next ? 'Дараагийн хэрэгсэл · олох' : 'Олдсон · одоо ширээнд тавих'}</div>
        <div className="mt-0.5 text-sm font-extrabold">{target.name}</div>
        {next && <div className="mt-1 text-xs font-bold text-indigo-900">📍 {supplyLocation(next)}</div>}
        <p className="mt-1 text-[11px] leading-snug text-slate-700">{next ? 'Заасан талын тавилга руу оч. Шошготой шургуулга/шүүгээг нээгээд хэрэгслийг ав; дэлгэцийн доод зааврыг дага.' : 'Хэрэгслээ ажлын ширээн дээр хүргэж тавь. Байрлал зөв бол “✓ ширээнд” гэж тэмдэглэгдэнэ.'}</p>
      </div> : null}
      <div className="flex flex-wrap gap-1.5">
        {required.map((s) => {
          const isFound = !!session?.found.includes(s.key);
          const isPlaced = !!session?.placed.includes(s.key);
          return <span key={s.key} data-supply={s.key} data-placed={isPlaced ? 'true' : 'false'} data-found={isFound ? 'true' : 'false'} className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${isPlaced ? 'border-emerald-500 bg-emerald-100 text-emerald-900' : isFound ? 'border-amber-400 bg-amber-100 text-amber-950' : 'border-slate-300 bg-slate-100 text-slate-700'}`}>
            {isPlaced ? '✓ Ширээнд' : isFound ? '● Олдсон' : '○ Олоогүй'} · {s.name}
          </span>;
        })}
      </div>
      {warning && <p role="status" className="rounded-md bg-sky-50 px-2 py-1.5 text-[11px] font-semibold text-sky-900">{warning}</p>}
      <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2">
        <span className="text-[10px] font-medium text-slate-600">Олдсон {foundCount}/{required.length}</span>
        <button className="min-h-8 rounded-lg border border-indigo-700 px-2.5 text-[10px] font-bold text-indigo-800 hover:bg-indigo-50" onClick={demonstratePreparation}>Багш: бэлтгэл алгасах</button>
      </div>
    </div>
  </section>;
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
  return <div className="pointer-events-none fixed inset-0 z-[12] overflow-hidden" aria-label="Хэрэгтэй зүйлсийн байршил" aria-hidden>{[0, 1, 2].map((i) => <div key={i} ref={(node) => { refs.current[i] = node; }} className="absolute left-0 top-0 max-w-[220px] rounded-lg border-2 border-amber-300 bg-slate-950/95 px-3 py-2 text-xs font-extrabold text-white shadow-2xl" />)}</div>;
}
