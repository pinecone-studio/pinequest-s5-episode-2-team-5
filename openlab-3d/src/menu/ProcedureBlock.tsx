/** Лабын "Туршилт" самбар доторх "Хэрхэн хийх" хэсэг — сурах бичгийн алхмууд (зөвхөн унших, ✓ явцгүй) */
import { useState } from 'react';
import { isTouchDevice } from '../utils/device';
import { procedureFor, useLaunchedProcedure } from './launchedProcedure';

export function ProcedureBlock({ labId }: { labId: string }) {
  const state = useLaunchedProcedure();
  // Утсан дээр дэлгэц бага тул анх хураасан байдалтай гарна
  const [open, setOpen] = useState(() => !isTouchDevice());
  const steps = procedureFor(labId, state);
  if (!steps.length) return null;
  return (
    <div className="mt-2 border-t border-slate-200 pt-2">
      <button type="button" className="focus-ring flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Хэрхэн хийх</span>
        <span className="text-xs text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ol className="mt-1 max-h-[36dvh] space-y-1 overflow-y-auto overscroll-contain pr-1">
          {steps.map((text, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-800">{i + 1}</span>
              {text}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
