/** Лабын "Туршилт" самбар доторх "Хэрхэн хийх" хэсэг — сурах бичгийн алхмууд (зөвхөн унших, ✓ явцгүй) */
import { useState } from 'react';
import { isTouchDevice } from '../utils/device';
import { procedureFor, useLaunchedProcedure } from './launchedProcedure';
import type { ProcedureGroup } from './labProcedure';

/** Цэвэр "Туршилт" картын алхмууд — шууд нээлттэй, дугаарласан. Нэгээс олон бүлэг бол туршилтын нэрээр ялгана */
export function ProcedureList({ groups }: { groups: ProcedureGroup[] }) {
  return (
    <div className="mt-2 max-h-[42dvh] space-y-3 overflow-y-auto overscroll-contain pr-1">
      {groups.map((group, g) => (
        <div key={g}>
          {groups.length > 1 && group.title && <p className="mb-1 text-[11px] font-bold leading-tight text-slate-800">{group.title}</p>}
          <ol className="space-y-1.5">
            {group.steps.map((text, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-snug text-slate-700">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800">{i + 1}</span>
                {text}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

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
